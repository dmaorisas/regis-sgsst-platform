"""
Paso 2: Envía texto extraído al LLM y recibe campos estructurados (JSON).
Proveedor configurable via LLM_PROVIDER en .env.local (openai, anthropic, gemini, groq).
"""

import os
import sys
import json
import argparse

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROMPT_PATH = os.path.join(SCRIPT_DIR, "prompts", "extract_fields.txt")

REQUIRED_FIELDS = ["nombre_trabajador", "cedula"]

EXPECTED_FIELDS = [
    "fecha", "nombre_trabajador", "cedula", "eps", "cargo",
    "edad", "peso", "fecha_nacimiento", "en_tratamiento_medico",
    "diagnostico", "tipo_tratamiento", "recomendaciones_medico_laborales",
]

PROVIDER_CONFIG = {
    "openai": {
        "env_key": "OPENAI_API_KEY",
        "base_url": "https://api.openai.com/v1/chat/completions",
        "default_model": "gpt-4o",
        "auth_header": lambda key: {"Authorization": f"Bearer {key}"},
        "parse_response": lambda data: data["choices"][0]["message"]["content"],
    },
    "anthropic": {
        "env_key": "ANTHROPIC_API_KEY",
        "base_url": "https://api.anthropic.com/v1/messages",
        "default_model": "claude-sonnet-4-6",
        "auth_header": lambda key: {"x-api-key": key, "anthropic-version": "2023-06-01"},
        "parse_response": lambda data: data["content"][0]["text"],
    },
    "gemini": {
        "env_key": "GEMINI_API_KEY",
        "base_url": "https://generativelanguage.googleapis.com/v1beta/chat/completions",
        "default_model": "gemini-2.5-flash",
        "auth_header": lambda key: {"Authorization": f"Bearer {key}"},
        "parse_response": lambda data: data["choices"][0]["message"]["content"],
    },
    "groq": {
        "env_key": "GROQ_API_KEY",
        "base_url": "https://api.groq.com/openai/v1/chat/completions",
        "default_model": "llama-3.3-70b-versatile",
        "auth_header": lambda key: {"Authorization": f"Bearer {key}"},
        "parse_response": lambda data: data["choices"][0]["message"]["content"],
    },
}


def get_provider():
    name = os.environ.get("LLM_PROVIDER", "openai").lower()
    if name not in PROVIDER_CONFIG:
        raise ValueError(f"LLM_PROVIDER='{name}' no soportado. Opciones: {', '.join(PROVIDER_CONFIG.keys())}")
    return name, PROVIDER_CONFIG[name]


def load_prompt(exam_text: str) -> str:
    with open(PROMPT_PATH, "r", encoding="utf-8") as f:
        template = f.read()
    return template.replace("{exam_text}", exam_text)


def call_anthropic(config, api_key, model, prompt, temperature, max_tokens):
    import urllib.request
    system_parts = prompt.split("TEXTO DEL EXAMEN MÉDICO:\n---\n")
    system_prompt = prompt[:prompt.index("TEXTO DEL EXAMEN MÉDICO:")]
    user_content = "TEXTO DEL EXAMEN MÉDICO:\n---\n" + system_parts[1] if len(system_parts) > 1 else prompt

    body = json.dumps({
        "model": model,
        "max_tokens": max_tokens,
        "temperature": temperature,
        "system": system_prompt,
        "messages": [{"role": "user", "content": user_content}],
    }).encode()

    headers = {**config["auth_header"](api_key), "Content-Type": "application/json"}
    req = urllib.request.Request(config["base_url"], data=body, headers=headers)
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read())
    return config["parse_response"](data)


def call_openai_compatible(config, api_key, model, prompt, temperature, max_tokens):
    import urllib.request

    body = json.dumps({
        "model": model,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "messages": [{"role": "user", "content": prompt}],
    }).encode()

    headers = {**config["auth_header"](api_key), "Content-Type": "application/json"}
    req = urllib.request.Request(config["base_url"], data=body, headers=headers)
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read())
    return config["parse_response"](data)


def parse_fields(exam_text: str, model: str = None) -> dict:
    provider_name, config = get_provider()
    api_key = os.environ.get(config["env_key"])

    if not api_key:
        return {"success": False, "error": f"{config['env_key']} no configurada en variables de entorno."}

    effective_model = model or config["default_model"]

    try:
        prompt = load_prompt(exam_text)

        if provider_name == "anthropic":
            raw_response = call_anthropic(config, api_key, effective_model, prompt, 0, 2000)
        else:
            raw_response = call_openai_compatible(config, api_key, effective_model, prompt, 0, 2000)

        cleaned = raw_response.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()

        fields = json.loads(cleaned)

        for field in EXPECTED_FIELDS:
            if field not in fields:
                fields[field] = None

        missing_required = [f for f in REQUIRED_FIELDS if not fields.get(f)]
        if missing_required:
            return {
                "success": False,
                "error": f"Campos obligatorios no encontrados en el examen: {', '.join(missing_required)}",
                "fields": fields,
            }

        warnings = [f for f in EXPECTED_FIELDS if fields.get(f) is None and f not in REQUIRED_FIELDS]

        return {
            "success": True,
            "fields": fields,
            "provider": provider_name,
            "model_used": effective_model,
            "warnings": warnings if warnings else None,
        }

    except json.JSONDecodeError as e:
        return {"success": False, "error": f"LLM no devolvió JSON válido: {str(e)}", "raw_response": raw_response}
    except Exception as e:
        return {"success": False, "error": f"Error llamando a {provider_name}: {str(e)}"}


def main():
    parser = argparse.ArgumentParser(description="Parsear campos del examen médico via LLM")
    parser.add_argument("--text", help="Ruta al archivo de texto extraído")
    parser.add_argument("--text-inline", help="Texto directo (para testing)")
    parser.add_argument("--model", default=None, help="Modelo (default: según proveedor activo)")
    parser.add_argument("--output", help="Ruta para guardar JSON de campos (opcional)")
    args = parser.parse_args()

    if args.text:
        with open(args.text, "r", encoding="utf-8") as f:
            exam_text = f.read()
    elif args.text_inline:
        exam_text = args.text_inline
    else:
        print("[ERROR] Debe proveer --text o --text-inline", file=sys.stderr)
        sys.exit(1)

    result = parse_fields(exam_text, model=args.model)

    if result["success"]:
        print(f"[OK] Campos extraídos con {result['provider']}:{result['model_used']}")
        if result.get("warnings"):
            print(f"[WARN] Campos no encontrados: {', '.join(result['warnings'])}")
        print(json.dumps(result["fields"], indent=2, ensure_ascii=False))

        if args.output:
            os.makedirs(os.path.dirname(args.output) or ".", exist_ok=True)
            with open(args.output, "w", encoding="utf-8") as f:
                json.dump(result["fields"], f, indent=2, ensure_ascii=False)
            print(f"[OK] JSON guardado en: {args.output}")
    else:
        print(f"[ERROR] {result['error']}", file=sys.stderr)
        sys.exit(1)

    return result


if __name__ == "__main__":
    main()
