#!/usr/bin/env bash
# Crea los 14 Issues de Fase 2 (PILA + Exámenes médicos) en GitHub
# Pre-arma la cola para el sistema autónomo n8n (T-F15-015) cuando se active
# Generado por PM-Agent — 2026-05-01

set -euo pipefail

REPO="dmaorisas/regis-sgsst-platform"
COMMON_LABELS="agent:operador,bucket:A,phase:F2"

create_issue() {
  local task_id="$1"
  local title="$2"
  local priority="$3"
  local nivel_qa="$4"
  local body="$5"
  local labels="${COMMON_LABELS},priority:${priority},nivel_qa:${nivel_qa}"

  echo "→ Creando ${task_id}..."
  gh issue create \
    --repo "$REPO" \
    --title "[${task_id}] ${title}" \
    --label "$labels" \
    --body "$body"
}

# ============== MÓDULO PILA (7 tareas) ==============

create_issue "T-F2-001" "Diseñar flujo PILA en n8n (envío automático mensual)" "high" "standard" "$(cat <<'EOF'
## Spec

**Tiempo estimado:** 60 min
**Depende de:** T-F1-23 (gate F1, ya firmado), T-F0-015 (n8n self-hosted, hecho)
**Nivel QA:** estándar
**Bucket:** A

## Operador hace

Crear workflow n8n que: cron primer día hábil del mes → para cada company activa → enviar email + WhatsApp con solicitud PILA. Integración con Resend y Wati (o stub WhatsApp per D-008).

## Entregable

- Workflow n8n en project `apHolqjKxJnd6rHP` (Dmaori SAS)
- Export JSON en `flows/regis-pila-request-monthly.workflow.ts`

## Criterio QA

- [ ] Workflow ejecuta sin errores
- [ ] Emails se envían correctamente vía Resend
- [ ] Logs visibles en `ai_usage` (si usa IA) o en n8n executions
- [ ] Cron correcto (primer día hábil del mes, calendar hábil colombiano per T-F15-010)

## Done

Ejecución manual exitosa con 1 empresa de test.
EOF
)"

create_issue "T-F2-002" "Endpoint para recibir PILA por email" "normal" "standard" "$(cat <<'EOF'
## Spec

**Tiempo estimado:** 75 min
**Depende de:** T-F2-001
**Nivel QA:** estándar
**Bucket:** A

## Operador hace

Configurar webhook entrante en n8n que recibe email con adjunto. Workflow extrae adjunto, identifica empresa por sender o subject, encola job de procesamiento PILA en pg-boss.

## Entregable

- Workflow n8n con webhook trigger
- Export JSON en `flows/regis-pila-email-receiver.workflow.ts`

## Criterio QA

- [ ] Email enviado a alias dedicado dispara webhook
- [ ] Adjunto extraído correctamente
- [ ] Job encolado en pg-boss queue `process_pila`
- [ ] Manejo de errores: emails sin adjunto, formato no PILA

## Done

Test E2E con email real conteniendo PILA de prueba.
EOF
)"

create_issue "T-F2-003" "Watcher de Drive para carpeta PILA" "normal" "standard" "$(cat <<'EOF'
## Spec

**Tiempo estimado:** 60 min
**Depende de:** T-F2-001
**Nivel QA:** estándar
**Bucket:** A

## Operador hace

Workflow n8n con trigger "Drive: file created" en carpeta `/regis/pila/incoming/`. Identifica empresa por nombre de archivo o subcarpeta. Encola job en pg-boss.

## Entregable

- Workflow n8n con Google Drive trigger
- Export JSON en `flows/regis-pila-drive-watcher.workflow.ts`

## Criterio QA

- [ ] Subir archivo a carpeta dispara workflow
- [ ] Identificación de empresa correcta (por convención de nombre)
- [ ] Job encolado en pg-boss queue `process_pila`

## Done

Test con archivo PILA real subido a Drive.
EOF
)"

create_issue "T-F2-004" "Procesador de PILA (parser básico)" "high" "strict" "$(cat <<'EOF'
## Spec

**Tiempo estimado:** 90 min
**Depende de:** T-F2-002, T-F2-003, T-F15-001 (pg-boss)
**Nivel QA:** estricto
**Bucket:** A

## Operador hace

Implementar job pg-boss `process_pila` que:
1. Descarga archivo (Drive o adjunto email)
2. Identifica formato (Asopagos / SOI / manual)
3. Parsea trabajadores reportados
4. Cruza con tabla `workers` de la empresa
5. Detecta novedades (alta, baja, cambio salario)
6. Resultado va a cola revisión humana (`ai_outputs_pending_review`)

## Entregable

- Job pg-boss en `lib/jobs/process_pila.ts`
- Tests con archivo de prueba (al menos formato Asopagos)
- Schema Zod para validar output

## Criterio QA

- [ ] Procesa formato Asopagos correctamente
- [ ] Detecta novedades (alta/baja/cambio salario)
- [ ] Resultado en cola revisión con `confidence > 0.7`
- [ ] Tests automatizados verde
- [ ] Anti-alucinación 3 capas (Zod schema + confidence + citations)

## Done

Test con PILA real ofuscada procesada sin errores.
EOF
)"

create_issue "T-F2-005" "Recordatorio PILA por no respuesta" "normal" "standard" "$(cat <<'EOF'
## Spec

**Tiempo estimado:** 45 min
**Depende de:** T-F2-001
**Nivel QA:** estándar
**Bucket:** A

## Operador hace

Workflow n8n: cron diario verifica si companies que recibieron solicitud no han respondido en X días hábiles → enviar recordatorio. Escalar a `regis_consultant` después de 2 recordatorios.

## Entregable

- Workflow n8n con cron diario
- Export JSON en `flows/regis-pila-reminder.workflow.ts`

## Criterio QA

- [ ] Recordatorio se envía en día correcto (calendario hábil colombiano)
- [ ] Escalación funciona después de 2 recordatorios sin respuesta
- [ ] Notificación llega vía email Resend

## Done

Test simulado con company sin respuesta por 5 días hábiles.
EOF
)"

create_issue "T-F2-006" "Archivar PILA aprobada en Drive" "normal" "standard" "$(cat <<'EOF'
## Spec

**Tiempo estimado:** 45 min
**Depende de:** T-F2-004, T-F15-003 (UI revisión humana)
**Nivel QA:** estándar
**Bucket:** A

## Operador hace

Cuando PILA se aprueba en cola revisión, archivar archivo en `/regis/pila/archive/{empresa}/{año}/{mes}/`. Marcar estándar correspondiente como cumplido en `evaluations`.

## Entregable

- Workflow n8n disparado por approval en review queue
- Update en `evaluations` table

## Criterio QA

- [ ] Archivo aparece en ubicación correcta de Drive
- [ ] Estándar marcado en `evaluations`
- [ ] `audit_log` registra el cambio

## Done

Test E2E: PILA → review → approve → archivado verificado.
EOF
)"

create_issue "T-F2-007" "UI: vista PILA por empresa" "normal" "standard" "$(cat <<'EOF'
## Spec

**Tiempo estimado:** 60 min
**Depende de:** T-F2-006
**Nivel QA:** estándar
**Bucket:** A

## Operador hace

Página `/dashboard/pila` para `client_admin`: histórico de PILAs subidas, novedades detectadas en cada una, status de archivado. Filtros por mes/año.

## Entregable

- Página Next.js en `app/dashboard/pila/page.tsx`
- RLS scope: solo el `client_admin` ve sus propias PILAs

## Criterio QA

- [ ] Muestra datos reales (no mock)
- [ ] Filtros mes/año funcionan
- [ ] Mobile responsive (Tailwind)
- [ ] Respeta scope RLS

## Done

Captura de pantalla en el Issue + login test verificado.
EOF
)"

# ============== MÓDULO EXÁMENES MÉDICOS (6 tareas) ==============

create_issue "T-F2-008" "Migration: tablas de exámenes médicos" "high" "standard" "$(cat <<'EOF'
## Spec

**Tiempo estimado:** 45 min
**Depende de:** T-F1-023 (gate F1, ya firmado)
**Nivel QA:** estándar
**Bucket:** A

## Operador hace

Migration `012_medical_exams.sql`:
- Tabla `medical_exams` con campos:
  - `worker_id` (FK)
  - `type` enum: ingreso/periódico/egreso/post_incidente/reintegro
  - `exam_date`, `ips_name`
  - `concept` enum: apto/apto_con_restricciones/no_apto/aplazado
  - `restrictions` JSONB
  - `recommendations` JSONB
  - `next_exam_date`
  - `file_url`, `extraction_confidence`
  - `retention_until` (compliance Habeas Data)
- Bucket separado en Supabase Storage: `medical_records` (scope estricto)

## Entregable

- Migration SQL aplicada
- RLS policies para `medical_exams` (regis_admin + worker dueño)
- Bucket `medical_records` configurado en Supabase Storage

## Criterio QA

- [ ] Tabla existe con FKs correctas
- [ ] Bucket separado en Supabase Storage
- [ ] RLS de `medical_records` solo permite acceso a `regis_admin` + worker dueño
- [ ] Test de aislación (similar a T-F1-012): worker A no ve exámenes de worker B

## Done

Test de aislación verde + bucket creado verificado en Supabase web UI.
EOF
)"

create_issue "T-F2-009" "Watcher de exámenes médicos (Drive + email)" "normal" "standard" "$(cat <<'EOF'
## Spec

**Tiempo estimado:** 75 min
**Depende de:** T-F2-008
**Nivel QA:** estándar
**Bucket:** A

## Operador hace

Workflow n8n similar a PILA pero apuntando a:
- Carpeta `/regis/medical/incoming/` (Google Drive trigger)
- Alias de email dedicado (webhook trigger)

Detecta PDFs y encola job `extract_medical_exam` en pg-boss.

## Entregable

- 2 workflows n8n (drive + email)
- Export JSON en `flows/regis-medical-watcher-*.workflow.ts`

## Criterio QA

- [ ] Subida a carpeta dispara job
- [ ] Email a alias también dispara job
- [ ] PDFs detectados (filtros de tipo MIME)

## Done

Test E2E con PDF de examen médico real ofuscado.
EOF
)"

create_issue "T-F2-010" "Pipeline de extracción IA de examen médico" "critical" "strict" "$(cat <<'EOF'
## Spec

**Tiempo estimado:** 120 min
**Depende de:** T-F2-008, T-F15-011 (AI tracking)
**Nivel QA:** estricto
**Bucket:** A
**🔥 Hito crítico del proyecto** (ruta crítica para el video del concurso)

## Operador hace

Job pg-boss `extract_medical_exam`:
1. Descarga PDF
2. Llama Claude con prompt versionado de `docs/prompts/base.md` (complexity=medium per `governance/06_llm_routing_config.md`)
3. Valida output con Zod schema
4. Calcula confidence
5. Si `confidence > 0.85` → inserta directo en `medical_exams`
6. Si `confidence < 0.85` → envía a cola revisión humana (`ai_outputs_pending_review`)

## Entregable

- Job en `lib/jobs/extract_medical_exam.ts`
- Schema Zod en `lib/schemas/medical_exam.ts`
- Prompt versionado en `docs/prompts/medical_exam_v1.md`
- Tests con 3 PDFs distintos (formatos diferentes)

## Criterio QA

- [ ] Procesa PDF de prueba correctamente
- [ ] Baja confidence (<0.85) va a cola revisión
- [ ] Alta confidence (>0.85) persiste directo
- [ ] Citations registradas (qué texto del PDF respalda cada campo)
- [ ] Anti-alucinación 3 capas: schema + confidence + citations
- [ ] Cost tracking en `ai_usage` (por T-F15-011)
- [ ] Tests con 3 PDFs de distintas IPS (Compensar, Colmédica, IPS independiente)

## Done

Test verde con 3 PDFs reales ofuscados + costo IA por extracción <$0.05.
EOF
)"

create_issue "T-F2-011" "Fallback OCR para PDFs escaneados" "normal" "standard" "$(cat <<'EOF'
## Spec

**Tiempo estimado:** 75 min
**Depende de:** T-F2-010
**Nivel QA:** estándar
**Bucket:** A

## Operador hace

Si PDF tiene poco texto extraíble (heurística: `< 100 caracteres`):
1. Correr OCR con Tesseract
2. Pasar texto OCR a Claude (complexity=complex per `06_llm_routing_config.md` → `medical_exam_extraction_ocr`)
3. Marcar metadata: `extracted_with_ocr: true`

## Entregable

- Función fallback OCR en `lib/jobs/extract_medical_exam.ts`
- Tesseract instalado vía Docker o package npm

## Criterio QA

- [ ] PDF escaneado de prueba se procesa con OCR
- [ ] Texto extraído coherente
- [ ] Flag `extracted_with_ocr` correctamente marcado
- [ ] Cost mayor que extracción normal (esperado por complexity=complex)

## Done

Test con PDF escaneado real (foto de papel).
EOF
)"

create_issue "T-F2-012" "UI: registro y gestión de exámenes médicos" "normal" "standard" "$(cat <<'EOF'
## Spec

**Tiempo estimado:** 90 min
**Depende de:** T-F2-010
**Nivel QA:** estándar
**Bucket:** A

## Operador hace

Página `/dashboard/medical` (scope `regis_consultant`):
- Lista de exámenes por empresa
- Filtros: tipo, fecha, status
- Drill-down a detalle: concepto, restricciones, recomendaciones, próximo examen

## Entregable

- Página Next.js en `app/dashboard/medical/page.tsx`
- Componente detalle en `app/dashboard/medical/[id]/page.tsx`

## Criterio QA

- [ ] Muestra datos extraídos por T-F2-010
- [ ] Navegación drill-down funciona
- [ ] Respeta scope RLS (consultant solo ve empresas asignadas)
- [ ] Mobile responsive

## Done

Captura de pantalla + login test con consultor.
EOF
)"

create_issue "T-F2-013" "Recordatorio automático de exámenes próximos a vencer" "normal" "standard" "$(cat <<'EOF'
## Spec

**Tiempo estimado:** 45 min
**Depende de:** T-F2-008
**Nivel QA:** estándar
**Bucket:** A

## Operador hace

Cron diario en n8n:
1. Query `medical_exams` donde `next_exam_date - 30 días = hoy`
2. Notificar a `regis_consultant` + `client_admin`
3. Email vía Resend (WhatsApp si Wati activo per D-008)

## Entregable

- Workflow n8n cron diario
- Export JSON en `flows/regis-medical-reminder.workflow.ts`

## Criterio QA

- [ ] Notificación dispara en fecha correcta (30 días antes)
- [ ] Múltiples destinatarios (consultor + admin)
- [ ] No duplica si se ejecuta 2 veces el mismo día (idempotencia)

## Done

Test simulado con worker cuyo `next_exam_date` = hoy + 30 días.
EOF
)"

# ============== PHASE GATE F2 ==============

create_issue "T-F2-014" "Hito de validación Fase 2 (Phase Gate)" "high" "strict" "$(cat <<'EOF'
## Spec

**Tiempo estimado:** 60 min
**Depende de:** T-F2-001 a T-F2-013
**Nivel QA:** estricto
**Bucket:** A

## Operador hace

Verificar checklist:
1. PILA solicitud → respuesta → archivado E2E con archivo real
2. Recordatorio dispara correctamente
3. Examen médico extraído y persistido con datos correctos
4. Cola revisión humana usable
5. Bucket `medical_records` aislado (RLS verificada)
6. UI ambos módulos funcional (PILA + médicos)

## Entregable

- `phases/fase_2_gate.md` firmado por PM-Agent
- Videos cortos (preferentemente) o capturas de cada flujo E2E

## Criterio QA

- [ ] 6 puntos verificados con evidencia
- [ ] PM-Agent firma con veredicto GO o GO_CON_AJUSTES
- [ ] Lista de tareas F3 revisada y ajustada según aprendizajes

## Done

Gate aprobado y commiteado.
EOF
)"

echo ""
echo "✅ 14 Issues de F2 creados en $REPO"
echo ""
gh issue list --repo "$REPO" --state open --label "phase:F2" --limit 20
