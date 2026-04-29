# Política de Almacenamiento — Plataforma Regis SG-SST

> **Tarea:** T-F0-039 (documentación)
> **Issue:** [#17](https://github.com/dmaorisas/regis-sgsst-platform/issues/17)
> **Decisión origen:** D-005 (`governance/03_log_decisiones.md`) — política de almacenamiento, archivos basura y limpieza periódica.
> **Split documentación / implementación:** D-007 (`governance/03_log_decisiones.md`) — esta política documenta el contrato. La implementación técnica de Capas 3 y 4 se hace en **T-F15-014** (Fase 1.5: workflows n8n cleanup + tabla `storage_metrics` + alertas).
> **Audiencia:** Operador-Agent, QA-Agent, PM-Agent, Auditor-Agent, supervisor humano.

---

## 0. Resumen ejecutivo

La plataforma opera durante 11 días en modo desarrollo intensivo (4 agentes IA + supervisor) con un Supabase free tier limitado a **500 MB DB + 1 GB storage**. Esta política define cuatro capas para garantizar que ese límite no se rompa, que el repositorio Git no se infle con archivos basura, y que la operación post-demo (cuando el ganador alimente datos reales) parta de una base limpia y auditable.

| Capa | Quién la opera | Cuándo se ejecuta | Estado actual |
|---|---|---|---|
| **1 — Prevención** (`.gitignore` robusto) | desarrollador / agente al hacer commit | continuo | implementada (`.gitignore` actualizado con D-005) |
| **2 — Limpieza inmediata** | Operador-Agent | después de cada tarea | implementada (operativa hoy) |
| **3 — Limpieza programada** | n8n cron diario | 02:00 COT diario | **a implementar en T-F15-014** |
| **4 — Monitoreo y alertas** | n8n cron 24h | continuo | **a implementar en T-F15-014** |

---

## 1. Capa 1 — Prevención (`.gitignore` robusto)

**Principio:** archivos generados por agentes durante ejecución NO entran al repositorio. El repo es la fuente de verdad de **diseño y código**, no de **subproductos operativos**.

### 1.1 Patrones obligatorios en `.gitignore`

Los siguientes patrones deben estar presentes en `.gitignore` (verificable con `grep`):

```gitignore
# Logs y diagnósticos
*.log
logs/
report.[0-9]*.[0-9]*.[0-9]*.[0-9]*.json

# Caches y builds
node_modules/
coverage/
.nyc_output
*.tsbuildinfo
.next/
.turbo/

# Backups y temporales
*.bak
*.tmp
*.swp
tmp/
backups/

# Outputs operativos de agentes
flows/*.archive.json
.agents-cache/
.qa-cache/

# Datos sensibles que jamás van al repo
.env
.env.local
.env.*.local
*.pem
*.key

# Documentos binarios fuera de docs/test-data/
*.pdf
*.docx
*.xlsx
*.mp3
*.mp4
*.wav
!docs/test-data/**/*.pdf
!docs/test-data/**/*.docx
!docs/test-data/**/*.xlsx
!docs/test-data/**/*.mp3
!docs/test-data/**/*.mp4
!docs/test-data/**/*.wav

# OS metadata
.DS_Store
Thumbs.db
```

### 1.2 Verificación

- En cada PR el QA-Agent ejecuta `git ls-files | grep -E '\.(log|pdf|docx|xlsx|mp3|mp4|tmp|bak)$'` (excluyendo `docs/test-data/`). Si hay matches → rechaza el PR.
- El Auditor-Agent (`governance/07_auditor_agent_spec.md`) puede listarlo como hallazgo si detecta archivos basura commiteados.

### 1.3 Política sobre `docs/test-data/`

Es la **única excepción** controlada para datos binarios. Reglas:

- Solo PDFs/audios de prueba diseñados explícitamente para casos de uso del demo (ej: examen médico ficticio, audio de visita simulada).
- Tamaño máximo recomendado: 5 MB por archivo.
- Si el directorio supera 50 MB total → flagear y mover archivos a Supabase Storage en lugar del repo.

---

## 2. Capa 2 — Limpieza inmediata (durante operación)

**Principio:** todo subproducto de una tarea se elimina al cierre de esa tarea. La memoria a largo plazo vive en GitHub Issues, en el modelo de datos (Supabase) o en `governance/`.

### 2.1 Procedimientos al cierre de tarea (Operador-Agent)

Al finalizar cualquier tarea, el Operador-Agent debe ejecutar:

| Acción | Comando / criterio |
|---|---|
| Borrar `/tmp/` del proyecto | `rm -rf /tmp/regis-* /tmp/sgsst-*` |
| Borrar archivos `*.tmp` y `*.bak` del workspace | `find . -name '*.tmp' -o -name '*.bak' -delete` |
| Cerrar conexiones a Supabase | sesiones SQL terminan al final del run del agente |
| Vaciar caches de tests (si aplicó tests) | `rm -rf coverage/ .nyc_output/` |

> Nota operativa: D-005 ya ejecutó una limpieza de 7 archivos en `/tmp/*.md` y `/tmp/regis-clone`. La política mantiene el estado post-D-005 como baseline.

### 2.2 Reportes de agentes — viven en GitHub Issues, NO en filesystem

Los `Reporte de Ejecución JSON` (Operador) y los veredictos QA se persisten **como comentarios en GitHub Issues** (políticas R6 y R7 del system prompt del Operador). Está prohibido crear archivos `.md` o `.json` adicionales con esos reportes en el filesystem del repo.

### 2.3 Outputs de tests al cierre del día

- Cobertura, snapshots de Jest, screenshots de Playwright → eliminados al cerrar la jornada de desarrollo.
- Si un test falla y la evidencia es necesaria, se sube como **adjunto al GitHub Issue** correspondiente, no al repo.

---

## 3. Capa 3 — Limpieza programada (a implementar en T-F15-014)

**Principio:** un cron diario en n8n garantiza que recursos vivos (Supabase Storage, particiones de DB, logs) no crezcan sin control.

### 3.1 Workflow `cleanup_daily` (n8n)

| Paso | Acción | Frecuencia | Detalle técnico |
|---|---|---|---|
| 1 | Borrar `/tmp/` del worker n8n | diaria 02:00 COT | `rm -rf /tmp/regis-* /tmp/sgsst-*` ejecutado en nodo "Execute Command" |
| 2 | Borrar archivos `flows/*.archive.json` antiguos (>7 días) | diaria | n8n node `Read/Write Files` con filter por `mtime` |
| 3 | Borrar logs de aplicación >30 días | diaria | rotación a Supabase Storage tier frío o eliminación según retención (ver §3.4) |
| 4 | Archivar particiones `audit_log` >12 meses | mensual día 1 | `DETACH PARTITION` + dump a archivo de respaldo (Supabase Storage tier frío) |

### 3.2 Lifecycle Supabase Storage

Para los buckets `documents`, `medical_exams_secure`, `templates_public`:

| Edad del objeto | Acción |
|---|---|
| 0–90 días | Hot tier (lectura inmediata) |
| 91–365 días | Cold tier (lectura con latencia, costo menor) cuando llegue al plan Pro de Supabase |
| >365 días | Mantener mientras la retención por tipo lo exija (ver §5); si se vence → eliminar con confirmación humana |

> En Supabase free tier no existen tiers diferenciados. La política se activa cuando el supervisor humano apruebe el upgrade a Pro (ver §6 matriz de responsabilidades).

### 3.3 Particiones `audit_log` mensuales

- La tabla `audit_log` está particionada por mes (`PARTITION BY RANGE (created_at)`) según D-ERD-05 (`docs/erd/v0.md`).
- Migración inicial crea las primeras 12 particiones; un job cron crea la siguiente cada mes.
- Particiones >12 meses se archivan: `pg_dump` + upload a `archive_audit_log/YYYY-MM.dump` en Supabase Storage + `DETACH PARTITION`.
- Particiones >5 años → eliminación tras confirmación humana (la Capa 4 alerta al supervisor antes de borrar).

### 3.4 Logs de aplicación

- Rotación diaria con timestamp en el nombre.
- Retención 30 días en almacenamiento caliente.
- Posterior: descarte (no se archivan; los eventos críticos se duplican a `audit_log` que sí persiste).

---

## 4. Capa 4 — Monitoreo y alertas (a implementar en T-F15-014)

**Principio:** medir es la única forma de garantizar que las tres capas anteriores funcionan.

### 4.1 Tabla `storage_metrics`

Estructura propuesta (a crear en T-F15-014 con migration):

```sql
CREATE TABLE storage_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  measured_at timestamptz NOT NULL DEFAULT now(),
  db_size_mb numeric NOT NULL,
  storage_size_mb numeric NOT NULL,
  audit_log_partitions_count int NOT NULL,
  oldest_audit_partition_month date,
  by_bucket jsonb NOT NULL,        -- { "documents": 120.4, "medical_exams_secure": 50.2, ... }
  by_table_top10 jsonb NOT NULL,   -- top 10 tablas por tamaño
  notes text
);

CREATE INDEX storage_metrics_measured_at_idx ON storage_metrics (measured_at DESC);
```

### 4.2 Workflow `monitor_storage` (n8n)

| Paso | Frecuencia | Acción |
|---|---|---|
| 1 | cada 24h | Ejecuta queries SQL: `pg_database_size(current_database())`, `SELECT bucket_id, sum(metadata->>'size')::numeric / 1024 / 1024 FROM storage.objects GROUP BY bucket_id;` |
| 2 | cada 24h | Persiste en `storage_metrics` |
| 3 | cada 24h | Evalúa thresholds y dispara alertas (ver §4.3) |
| 4 | semanal (domingos 08:00 COT) | Genera reporte semanal y lo envía al supervisor (canal Resend email) |

### 4.3 Thresholds de alerta

| Métrica | Umbral | Acción |
|---|---|---|
| `db_size_mb` | >400 (80% de 500 MB free tier) | Email al supervisor: "DB al 80% — considerar upgrade Pro o cleanup adicional" |
| `db_size_mb` | >475 (95%) | Email + alerta crítica + bloqueo de jobs no esenciales en pg-boss |
| `storage_size_mb` | >800 (80% de 1 GB free tier) | Email al supervisor: "Storage al 80%" |
| `storage_size_mb` | >950 (95%) | Email + alerta crítica + pausa de uploads no críticos |
| `audit_log_partitions_count` | >18 (>1.5 años de datos) | Email: "considerar archivado de particiones antiguas" |
| Crecimiento DB últimos 7 días | >50 MB/semana sostenido | Investigar tabla con mayor crecimiento (`by_table_top10`) |

### 4.4 Reporte semanal

Cada domingo el workflow genera un email al supervisor con:

- DB size actual y delta vs. semana anterior.
- Storage size por bucket.
- Top 10 tablas por tamaño.
- N° de particiones de `audit_log` y partición más antigua.
- Alertas activas.
- Sugerencias de acción (si aplica).

---

## 5. Tabla de retention schedules (por tipo de dato)

| Tipo de dato | Tabla / Bucket | Retención | Razón normativa / operativa |
|---|---|---|---|
| Historia clínica ocupacional | `medical_exams` + bucket `medical_exams_secure` | **20 años post-egreso** | Resolución 2346/2007 (modificada por Resolución 1918/2009 en custodia); Ley 1562/2012. |
| Audit log | `audit_log` (particionado mensual) | **5 años** | Ley 1581/2012 (Habeas Data, conservación trazabilidad razonable) + práctica contable estándar. |
| Documentos SG-SST aprobados | `documents` | **5 años** | Decreto 1072/2015 Art. 2.2.4.6.13 (conservación documental); algunos documentos exigen más (matriz IPER conservación 5 años post-actualización). |
| Consentimientos Habeas Data | `consents` | **vida del titular + 5 años post-revocación** | Ley 1581/2012 Art. 12 y Decreto 1377/2013. |
| Logs de aplicación | rotación filesystem | **30 días** | Operación; eventos críticos se duplican a `audit_log`. |
| Reportes IA (`ai_outputs_pending_review`) | tabla + Supabase Storage | **90 días** | Trazabilidad razonable; tras 90 días los outputs revisados se compactan en `ai_usage` (sin payload completo). |
| `ai_usage` (tracking de tokens/costo) | tabla | **5 años** | Auditoría financiera del servicio. |
| Archivos `/tmp/` del worker | filesystem n8n | **24 horas** | Solo durante ejecución de tarea. |
| FURAT/FUREL | `furat_reports` | **mientras dure la empresa + 20 años** | Resolución 1401/2007 + práctica de litigios laborales. |
| Snapshots evaluación 0312 | `evaluation_snapshots` | **permanente** (append-only) | Auditoría histórica de cumplimiento (D-ERD-03). |
| Backups DB completos | Supabase Storage tier frío | **30 días** rolling | Recuperación operativa razonable. |

> **Importante:** la retención de **historia clínica (20 años)** prima sobre cualquier otro criterio. El borrado físico de `medical_exams` requiere job dedicado y aprobación humana. El borrado lógico (`deleted_at`) NO purga el archivo del bucket — solo marca el registro como inactivo.

---

## 6. Matriz de responsabilidades

| Rol | Responsabilidad sobre storage |
|---|---|
| **Operador-Agent** | Limpia `/tmp/` después de cada tarea (Capa 2). NO commitea archivos basura. Reportes en GitHub Issues, no en filesystem. |
| **QA-Agent** | NO toca filesystem (solo lee). Verifica en cada PR que no se cuelen archivos prohibidos por `.gitignore`. Rechaza si detecta. |
| **PM-Agent** | Revisa `storage_metrics` en snapshots cada 6 horas (cuando esté operativo en F1.5+). Decide si solicitar upgrade de tier al supervisor. |
| **Auditor-Agent** | Detecta crecimiento anormal (Capa 4 alimenta sus hallazgos). Reporta en `auditor_findings` cuando una tabla crece fuera de tendencia. |
| **Supervisor humano** | Aprueba upgrades de tier (free → Pro). Aprueba borrado de particiones >5 años. Aprueba excepciones a la política de retención si las exige el cliente final. |

---

## 7. Coherencia con `.gitignore` actual y D-005

Esta política refleja el estado del `.gitignore` actualizado en D-005. Si en el futuro se modifica `.gitignore` (agregar/quitar patrones), debe actualizarse §1.1 de este documento en la misma operación. Inversamente, cualquier ajuste a §1.1 debe propagarse al `.gitignore`.

**Verificación rápida (manual):**

```bash
# Lista patrones esperados que deben estar
for pattern in '*.log' '*.bak' '*.tmp' 'tmp/' 'coverage/' 'flows/*.archive.json' '.env' '*.pdf'; do
  grep -F "$pattern" .gitignore >/dev/null && echo "OK: $pattern" || echo "FALTA: $pattern"
done
```

---

## 8. Implementación pendiente — Referencia explícita a T-F15-014

Las **Capas 3 y 4** están **documentadas pero no implementadas** en F0. Su implementación técnica es la tarea **T-F15-014** ("Implementación de cleanup automatizado y monitoreo de storage") en Fase 1.5, con los siguientes entregables:

1. Migration que crea la tabla `storage_metrics` (§4.1).
2. Workflow n8n `cleanup_daily` (§3.1).
3. Workflow n8n `monitor_storage` (§4.2).
4. Workflow n8n `archive_audit_log_partition_monthly` (§3.3).
5. Plantillas de email (Resend) para alertas (§4.3).
6. Tests E2E que validen al menos 1 ciclo completo de cleanup + monitoreo.

> Razón del split (D-007): la documentación define el contrato. Los 4 agentes pueden alinearse a este contrato durante F0 (limpiando manualmente, evitando archivos basura) sin necesidad de la infraestructura técnica activa todavía.

---

## 9. Excepciones y procedimiento de cambio

- Cualquier excepción a esta política debe registrarse como decisión PM en `governance/03_log_decisiones.md` con un nuevo identificador `D-NNN`.
- Cambios sustantivos a §5 (retention schedules) requieren validación legal por el supervisor (no son ajustables por agentes IA).
- El Auditor-Agent puede emitir hallazgos cuando un agente intenta crear un patrón prohibido por §1.1 sin actualización previa de esta política.

---

## 10. Cumplimiento de Reglas Inquebrantables (R1–R7)

- **R1:** documento producido en una única tarea consolidada T-F0-030/031/032/039doc.
- **R2:** sin dependencias declaradas (Issue #17 declara ninguna).
- **R3:** este archivo no se autoaprueba; espera veredicto QA-Agent.
- **R5:** no se modifican ADRs ni el ERD; este archivo es nuevo entregable en `governance/`. La referencia a D-005 y D-007 es de lectura, no de modificación.
- **R7:** decisiones técnicas no especificadas (umbrales 80%/95%, retención 30 días para logs aplicación, agrupación de Capas 3-4 en T-F15-014) están documentadas explícitamente arriba.

---

**Última actualización:** 2026-04-28 — versión inicial T-F0-039 (documentación). Próxima actualización esperada al cierre de T-F15-014 con detalles de implementación.
