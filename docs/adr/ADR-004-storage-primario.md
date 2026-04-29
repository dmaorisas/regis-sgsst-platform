# ADR-004 — Storage Primario: Supabase Storage + Drive como espejo opcional

**Estado:** Aceptado
**Fecha:** 2026-04-29
**Decidido por:** PM-Agent + supervisor humano (David Maori)

## Contexto

La plataforma maneja documentos de SG-SST: actas, matrices de riesgo, exámenes médicos ocupacionales, planes de emergencia, evidencias de capacitación, etc. Algunos archivos son sensibles (Habeas Data Ley 1581/2012; Resolución 2346/2007 exige retención mínima de 20 años en historias clínicas ocupacionales). El equipo necesitaba decidir el "source of truth" del storage: ¿Supabase Storage, Google Drive (familiar para consultores SG-SST), S3, o un híbrido?

## Alternativas evaluadas

### Alternativa A: Google Drive primario
- Pros: familiar para consultores; UI conocida para clientes; colaboración humana fácil.
- Contras: sin RLS por fila; permisos por carpeta no escalan a multi-tenant; signed URLs limitadas; auditoría de accesos pobre; integración con Auth requiere OAuth complejo; mover datos médicos a Drive viola best practices de Habeas Data sin consentimiento explícito.

### Alternativa B: S3 propio (AWS) + CloudFront
- Pros: estándar de la industria; políticas de retención maduras; costos predecibles a escala.
- Contras: infra adicional + IAM separado de Supabase Auth; signed URLs cuestan más boilerplate; sobreingeniería para el concurso (no hay tráfico que justifique); rompe el "stack único" del proyecto.

### Alternativa C: Supabase Storage primario + Drive espejo opcional
- Pros: RLS nativa idéntica a la de tablas; signed URLs out-of-the-box; integrado con Supabase Auth (mismo JWT); buckets separados con políticas distintas (bucket `medical_exams_secure` privado con retención 20 años, ver D-ERD-04); Drive sigue disponible para colaboración humana del consultor cuando el cliente lo prefiera.
- Contras: bucket histórico no nativo; hay que manejar versiones y retención manualmente (jobs pg-boss).

### Alternativa D: Supabase Storage primario sin Drive
- Pros: simplicidad máxima.
- Contras: ignora flujo real de consultoras SG-SST que ya viven en Drive; rozamiento con clientes que esperan compartir vía Drive.

## Decisión

**Supabase Storage es el storage primario y source of truth**. Google Drive queda como **espejo opcional** activable por consultora para colaboración humana, no como fuente de verdad.

## Razón

El principio rector exige adaptabilidad a documentos reales el día 1. Supabase Storage da: (1) RLS por bucket alineada con la del resto de tablas, (2) signed URLs con expiración para datos médicos, (3) integración nativa con Supabase Auth (mismo JWT), (4) buckets separados con políticas de retención distintas (ver D-ERD-04: bucket `medical_exams_secure` con `retention_years=20`). Drive es útil para humanos pero malo como source of truth (auditoría débil, sin RLS por fila, permisos por carpeta no escalan a multi-tenant). El espejo opcional de Drive cubre el flujo de consultoría sin comprometer la integridad del modelo.

## Consecuencias

### Positivas
- Un solo modelo de seguridad (RLS) para tablas y storage.
- Habeas Data y Resolución 2346/2007 cumplibles con bucket privado dedicado.
- Signed URLs con TTL corto para datos sensibles.
- Cero infra adicional.

### Negativas
- Versionado de archivos hay que diseñarlo (tabla `documents.version`).
- Retención de 20 años requiere job de ciclo de vida (pg-boss).
- El espejo a Drive (cuando se active) duplica estado y debe mantenerse consistente.

### Mitigaciones
- `documents` ya modela versión (ver ERD v0).
- Job pg-boss (ADR-005) maneja retención y purga programada.
- El espejo Drive es one-way (Supabase → Drive) para evitar conflictos; nunca lectura desde Drive como verdad.

## Referencias

- `docs/erd/v0.md` D-ERD-04, sección 4.5
- `governance/01_roles_y_reglas.md` R6.5
- ADR-003 (audit trail captura accesos a archivos sensibles)
