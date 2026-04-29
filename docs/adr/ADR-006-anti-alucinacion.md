# ADR-006 — Anti-alucinación: 3 capas (no 7)

**Estado:** Aceptado | **Fecha:** 2026-04-29

## Decisión

Implementar anti-alucinación con **3 capas obligatorias** sobre toda extracción/generación IA:

1. **Schema validation con Zod**: todo output del router LLM se valida contra un schema; si falla, reintento con modelo más fuerte y, si vuelve a fallar, `flag_concern`.
2. **Confidence threshold + cola humana**: si `confidence < 0.90` (crítico) o `< 0.70` (medium), el output entra a `ai_outputs_pending_review` y NO se persiste como dato real hasta revisión humana.
3. **Citations obligatorias en prompts**: prompts de extracción exigen devolver el texto literal de origen (cita del PDF/audio); sin citation, el campo queda en `null`.

## Alternativas

- **A: 7 capas (versión inicial del system prompt)** — incluía cross-validation OCR vs IA, anti-invención hardcodeada, comité de validación, etc. Pros: máxima cobertura. Contras: ~70% del overhead para ~5% de mejora marginal; riesgo de no terminar a tiempo. Sobre-ingeniería para concurso.
- **B: 0 capas (confiar en el modelo)** — pros: velocidad. Contras: alucinaciones en datos médicos = riesgo legal y de credibilidad ante Regis; viola anti-invención del system prompt.
- **C: 3 capas (Zod + confidence + citations)** — escogida.

## Razón

3 capas dan ~95% de la efectividad de las 7 con ~30% del overhead. Las 3 cubren los modos de fallo más comunes: estructura inválida (Zod), baja certeza (cola humana), invención sin fuente (citations). El cross-validation OCR vs IA queda como Bucket B post-concurso si surge necesidad real. Conecta con D-ERD-06 (request_hash) y `ai_outputs_pending_review` ya modeladas en el ERD.

## Consecuencias

- **Positivas:** cobertura suficiente para datos sensibles del demo; `ai_outputs_pending_review` materializa la cola humana; trazabilidad completa via `ai_usage`.
- **Mitigaciones:** si en la fase de pruebas se detectan alucinaciones recurrentes en módulos específicos (ej: extracción de exámenes médicos OCR), se eleva la complejidad del modelo (router 06) o se sube el threshold de confidence para ese módulo, sin tocar arquitectura.

## Referencias

- `prompts/01_operador_agent_system.md` (sección Anti-alucinación)
- `docs/erd/v0.md` `ai_outputs_pending_review`, sección 4.3
- `governance/06_llm_routing_config.md`
