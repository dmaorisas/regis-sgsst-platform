# Configuración de Routing de LLMs por Complejidad

**Propósito:** Asignar el LLM correcto a cada tarea según su complejidad, sin tocar código. Cambiar de proveedor o modelo = editar este archivo.

---

## Niveles de complejidad

| Nivel | Definición | Ejemplos en el proyecto |
|---|---|---|
| **trivial** | Validación de formato, parsing simple, clasificación binaria, formateo | Validar que un email es válido; clasificar PDF como "examen" o "no examen"; convertir formato de fecha |
| **simple** | Extracción de datos estructurados de texto claro, transformaciones determinísticas | Extraer cédula y nombre de un texto plano; resumir un párrafo; traducir |
| **medium** | Extracción con razonamiento, generación de texto corto con contexto, decisiones binarias con justificación | Extraer recomendaciones de un examen médico (con campos múltiples); decidir si un PDF tiene calidad suficiente; generar título de un documento |
| **complex** | Generación de documentos estructurados con contexto, razonamiento multi-paso, comprensión de dominio | Generar acta de COPASST a partir de puntos tratados; sugerir peligros adicionales para una matriz; estructurar plan de emergencias desde audio transcrito |
| **critical** | Generación de documentos con implicación legal, razonamiento crítico, calidad alta no negociable | Generación final de matriz de riesgo aprobable por gerencia; cálculo final de discrepancy report; análisis de cumplimiento normativo |

---

## Configuración de routing (archivo `config/llm_routing.yaml`)

```yaml
# Cambiar este archivo NO requiere modificar código.
# Reload automático cada 5 min o por endpoint admin /api/admin/reload-config

defaults:
  timeout_seconds: 30
  max_retries: 3
  retry_backoff_multiplier: 2

complexity_levels:

  trivial:
    primary:
      provider: groq
      model: llama-3.1-8b-instant
      max_tokens: 500
      temperature: 0
    fallback_chain:
      - provider: gemini
        model: gemini-1.5-flash-8b
        max_tokens: 500
      - provider: groq
        model: llama-3.3-70b-versatile
    cost_cap_per_request_usd: 0.001

  simple:
    primary:
      provider: groq
      model: llama-3.3-70b-versatile
      max_tokens: 1500
      temperature: 0
    fallback_chain:
      - provider: gemini
        model: gemini-1.5-flash
      - provider: anthropic
        model: claude-haiku-4-5-20251001
    cost_cap_per_request_usd: 0.005

  medium:
    primary:
      provider: anthropic
      model: claude-haiku-4-5-20251001
      max_tokens: 3000
      temperature: 0
    fallback_chain:
      - provider: groq
        model: llama-3.3-70b-versatile
      - provider: gemini
        model: gemini-1.5-pro
    cost_cap_per_request_usd: 0.02

  complex:
    primary:
      provider: anthropic
      model: claude-sonnet-4-6
      max_tokens: 8000
      temperature: 0
    fallback_chain:
      - provider: gemini
        model: gemini-1.5-pro
      - provider: groq
        model: llama-3.3-70b-versatile
    cost_cap_per_request_usd: 0.10

  critical:
    primary:
      provider: anthropic
      model: claude-sonnet-4-6
      max_tokens: 12000
      temperature: 0
      use_extended_thinking: true   # razonamiento profundo
    fallback_chain:
      - provider: anthropic
        model: claude-opus-4-7
      - provider: gemini
        model: gemini-1.5-pro
    cost_cap_per_request_usd: 0.50
    require_human_review_if_confidence_below: 0.90

# Mapeo de módulos a complejidad por defecto
module_complexity_defaults:
  pila_parsing: simple
  medical_exam_extraction: medium
  medical_exam_extraction_ocr: complex   # OCR + IA es más demandante
  ciiu_hazard_suggestion: medium
  risk_matrix_enrichment: complex
  acta_generation: complex
  plan_emergencias_structuring: critical
  discrepancy_report_analysis: critical
  audit_log_anomaly_detection: simple
  task_classification: trivial

# Override por agente del sistema (los 4 agentes Claude del proyecto)
agent_complexity_defaults:
  operador_agent: medium      # ejecuta tareas variadas
  qa_agent: complex            # debe razonar profundo para validar
  pm_agent: complex            # decisiones estratégicas
  auditor_agent: simple        # detección de anomalías, batch

# Política de cost circuit breaker
cost_caps:
  per_hour_total_usd: 5.00
  per_day_total_usd: 30.00
  per_module_per_day_usd:
    plan_emergencias_structuring: 5.00
    discrepancy_report_analysis: 3.00
  on_breach: pause_and_notify_human

# Política de fallback automático
fallback_triggers:
  - http_status: [429, 500, 502, 503, 504]
  - timeout: true
  - rate_limit_exceeded: true
  - cost_cap_exceeded: true
  - confidence_below_threshold: 0.5   # output de baja calidad → reintentar con modelo más fuerte
```

---

## Cómo se usa en código

```typescript
// Una sola línea para cualquier tarea de IA en cualquier módulo:
const result = await llm.invoke({
  complexity: 'medium',
  prompt: '...',
  schema: MedicalExamSchema,
  context: { module: 'medical_exam_extraction', task_id: 'T-F2-010' }
})

// El router elige provider/model según config, maneja fallbacks,
// trackea costo, valida schema, persiste en ai_usage.
// Cero conocimiento del provider en el código del módulo.
```

---

## Sobre-escritura puntual

Si una tarea específica necesita un LLM distinto al default de su módulo, se puede sobre-escribir:

```typescript
// Caso especial: este examen requiere análisis profundo
const result = await llm.invoke({
  complexity: 'critical',  // override explícito
  override_reason: 'Examen con restricciones complejas detectadas por pre-check',
  // ...
})
```

El `override_reason` queda en el audit log para trazabilidad.

---

## Cómo el sistema se adapta a documentos variables

Esto se conecta con el requerimiento del brief: **el sistema debe adaptarse a formatos variables.**

**Patrón:** los prompts de extracción **no asumen formato específico**. Están diseñados para describir QUÉ extraer, no DÓNDE buscarlo:

```typescript
// Mal (asume formato):
"Extrae el nombre del trabajador del campo Nombre: ..."

// Bien (formato-agnóstico):
"Identifica al trabajador examinado. Suele aparecer como 'paciente',
'trabajador', 'evaluado', o 'colaborador'. Devuelve nombre completo
y cédula si están disponibles."
```

Esto permite que el mismo prompt funcione con documentos de Compensar, Colmédica, Coomeva, IPS independientes, etc. La complejidad del modelo se ajusta al desafío del documento.

---

## Política de elección de modelo "por preferencia"

Si en algún momento se quiere forzar un proveedor específico (preferencia del usuario, prueba A/B, restricción de costo), se cambia en la config:

```yaml
# Forzar todo a Groq (modo gratis total)
override_global:
  force_provider: groq
  force_model: llama-3.3-70b-versatile
  active: false  # cambiar a true para activar
```

Cuando `active: true`, todas las llamadas van a Groq, sin tocar código. Útil para test, demo, o si Anthropic se cae.
