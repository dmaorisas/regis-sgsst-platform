"""
Orquestador: ejecuta el pipeline completo de procesamiento de examen médico.
  1. extract_text  → texto crudo del PDF
  2. parse_fields  → campos JSON via LLM
  3. generate_report → PDF final con plantilla GTH-F-56
"""

import os
import sys
import json
import argparse
import time
from datetime import datetime

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SCRIPT_DIR)

from extract_text import extract_text
from parse_fields import parse_fields
from generate_report import generate_report


def load_env():
    env_paths = [
        os.path.join(SCRIPT_DIR, "..", "..", "regis-sgsst-platform", ".env.local"),
        os.path.join(SCRIPT_DIR, "..", "..", ".env.local"),
        os.path.join(SCRIPT_DIR, "..", "..", ".env"),
    ]
    for env_path in env_paths:
        abs_path = os.path.abspath(env_path)
        if os.path.exists(abs_path):
            with open(abs_path, "r") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        key, _, value = line.partition("=")
                        key = key.strip()
                        value = value.strip()
                        if key and value and key not in os.environ:
                            os.environ[key] = value
            return abs_path
    return None


def process_exam(
    input_pdf: str,
    external_fields: dict = None,
    output_dir: str = None,
    model: str = "gpt-4o",
) -> dict:

    start_time = time.time()

    if output_dir is None:
        output_dir = os.path.join(SCRIPT_DIR, "..", "..", ".tmp", "medical_reports")
    os.makedirs(output_dir, exist_ok=True)

    results = {"steps": {}, "success": False}

    # --- Paso 1: Extraer texto ---
    print("\n[PASO 1/3] Extrayendo texto del PDF...")
    step1 = extract_text(input_pdf)
    results["steps"]["extract_text"] = {
        "success": step1["success"],
        "method": step1.get("method"),
        "char_count": step1.get("char_count"),
    }

    if not step1["success"]:
        results["error"] = f"Paso 1 falló: {step1['error']}"
        return results

    print(f"  → {step1['method']} | {step1['char_count']} caracteres extraídos")

    # --- Paso 2: Parsear campos via LLM ---
    provider_name = os.environ.get("LLM_PROVIDER", "openai")
    print(f"\n[PASO 2/3] Interpretando campos con {provider_name}:{model}...")
    step2 = parse_fields(step1["text"], model=model)
    results["steps"]["parse_fields"] = {
        "success": step2["success"],
        "model": step2.get("model_used"),
        "warnings": step2.get("warnings"),
    }

    if not step2["success"]:
        results["error"] = f"Paso 2 falló: {step2['error']}"
        if step2.get("fields"):
            results["partial_fields"] = step2["fields"]
        return results

    exam_fields = step2["fields"]
    print(f"  → Campos extraídos: {len([v for v in exam_fields.values() if v])}/{len(exam_fields)}")
    if step2.get("warnings"):
        print(f"  → Campos no encontrados: {', '.join(step2['warnings'])}")

    # --- Paso 3: Generar reporte ---
    print("\n[PASO 3/3] Generando reporte GTH-F-56...")
    if external_fields is None:
        external_fields = {}

    worker_name = exam_fields.get("nombre_trabajador", "desconocido").replace(" ", "_")
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_filename = f"GTH-F-56_{worker_name}_{timestamp}.pdf"
    output_path = os.path.join(output_dir, output_filename)

    step3 = generate_report(exam_fields, external_fields, output_path)
    results["steps"]["generate_report"] = {
        "success": step3["success"],
        "pdf_path": step3.get("pdf_path"),
        "pdf_generated": step3.get("pdf_generated"),
    }

    if not step3["success"]:
        results["error"] = f"Paso 3 falló: {step3['error']}"
        return results

    elapsed = time.time() - start_time
    results["success"] = True
    results["output"] = {
        "pdf": step3.get("pdf_path"),
    }
    results["elapsed_seconds"] = round(elapsed, 2)
    results["exam_fields"] = exam_fields
    results["external_fields"] = external_fields

    print(f"\n{'='*60}")
    print(f"[OK] Proceso completado en {elapsed:.1f}s")
    print(f"  PDF: {step3['pdf_path']}")
    print(f"{'='*60}")

    return results


def main():
    parser = argparse.ArgumentParser(description="Procesar examen médico → reporte GTH-F-56")
    parser.add_argument("--input", required=True, help="Ruta al PDF del examen médico")
    parser.add_argument("--external", default="{}", help="JSON string con campos externos")
    parser.add_argument("--external-file", help="Ruta a archivo JSON con campos externos")
    parser.add_argument("--output-dir", help="Directorio de salida (default: .tmp/medical_reports/)")
    parser.add_argument("--model", default="gpt-4o", help="Modelo LLM (default: gpt-4o)")
    args = parser.parse_args()

    env_file = load_env()
    if env_file:
        print(f"[ENV] Cargado: {os.path.basename(env_file)}")
    elif not os.environ.get("OPENAI_API_KEY"):
        print("[ERROR] OPENAI_API_KEY no encontrada. Configurar en .env.local o como variable de entorno.", file=sys.stderr)
        sys.exit(1)

    external = {}
    if args.external_file and os.path.exists(args.external_file):
        with open(args.external_file, "r", encoding="utf-8") as f:
            external = json.load(f)
    else:
        try:
            external = json.loads(args.external)
        except json.JSONDecodeError:
            print("[ERROR] --external no es JSON válido", file=sys.stderr)
            sys.exit(1)

    result = process_exam(
        input_pdf=args.input,
        external_fields=external,
        output_dir=args.output_dir,
        model=args.model,
    )

    if not result["success"]:
        print(f"\n[FAIL] {result.get('error', 'Error desconocido')}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
