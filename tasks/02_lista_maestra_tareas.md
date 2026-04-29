# Lista Maestra de Tareas — Concurso Regis Colombia
**Versión:** 1.0 | **Total tareas:** 142 | **Fechas:** 29 abr – 9 may 2026

---

## Cómo leer esta lista

**Convención de IDs:** `T-FX-NNN` donde `FX` es la fase (F0, F1, F1.5, F2, F3, F4, F5, F6) y `NNN` es el número correlativo dentro de la fase.

**Cada tarea tiene:**
- `tiempo`: estimación
- `depende_de`: tareas previas que deben estar `aprobada` (FORWARD-ONLY: solo IDs menores)
- `nivel_qa`: estricto / estándar / ligero
- `bucket`: A (must-do) / B (declarado roadmap) / C (post) / D (descarte) — solo Bucket A en esta lista
- `operador_hace`: pasos exactos
- `entregable`: qué debe existir al terminar
- `criterio_qa`: lista verificable de qué chequea el QA
- `done`: definición inequívoca de "listo"

**Reglas de orden:**
- Las tareas se ejecutan en orden numérico estricto dentro de cada fase.
- Una tarea no puede iniciar si sus `depende_de` no están en estado `aprobada`.
- Si una tarea `entregada_qa` está pendiente de validación, el Operador puede tomar la siguiente tarea cuyas dependencias ya estén `aprobadas` (paralelización ligera).

---

# FASE 0 — Cimientos + camino crítico

**Días:** 29 abr (todo el día) | **Objetivo:** Disparar latencias externas + diseño cerrado antes de escribir migrations.

---

### T-F0-001 — Confirmar disponibilidad de equipo
- **tiempo:** 15 min
- **depende_de:** ninguna
- **nivel_qa:** ligero
- **operador_hace:** Confirmar disponibilidad full-time del equipo (1-2 personas) entre 29 abr y 9 may. Documentar nombres, contactos, horarios disponibles.
- **entregable:** Documento `team_availability.md` en repo con disponibilidad confirmada.
- **criterio_qa:** Existe documento con al menos 1 persona FT confirmada para los 11 días.
- **done:** Documento creado y firmado por participantes.

### T-F0-002 — Acordar canal principal de comunicación interna
- **tiempo:** 10 min
- **depende_de:** T-F0-001
- **nivel_qa:** ligero
- **operador_hace:** Decidir canal (Slack/Discord/WhatsApp) y crear espacio. Compartir invites.
- **entregable:** Canal creado, todos los miembros adentro.
- **criterio_qa:** Canal existe, todos los miembros pueden enviar mensaje de prueba.
- **done:** Mensaje "estoy aquí" de cada miembro.

### T-F0-003 — Verificar contacto activo con Regis
- **tiempo:** 15 min
- **depende_de:** ninguna
- **nivel_qa:** estricto
- **operador_hace:** Identificar al contacto principal de Regis (nombre, cargo, teléfono, email, WhatsApp). Validar que está activo y enterado del concurso.
- **entregable:** Tarjeta de contacto en `contacts/regis.md`.
- **criterio_qa:** Tarjeta tiene nombre + cargo + 2 canales de contacto + última conversación con timestamp.
- **done:** Mensaje de prueba enviado y respondido por Regis.

### T-F0-004 — Agendar llamada de 60 min con Regis
- **tiempo:** 15 min
- **depende_de:** T-F0-003
- **nivel_qa:** estricto
- **operador_hace:** Proponer 3 horarios para llamada antes de las 13:00 del 29 abr o primera hora del 30 abr. Confirmar 1.
- **entregable:** Confirmación escrita con fecha, hora, link/teléfono.
- **criterio_qa:** Confirmación existe; fecha es ≤ 30 abr 13:00; lista de participantes Regis incluye al menos 1 consultor SST con experiencia.
- **done:** Invitación de calendario aceptada.

### T-F0-005 — Preparar lista de preguntas para llamada Regis
- **tiempo:** 60 min
- **depende_de:** T-F0-004
- **nivel_qa:** estándar
- **operador_hace:** Redactar lista de preguntas que cubra: (a) validación pesos Resolución 0312, (b) confirmación frecuencias documentales, (c) baseline de tiempos actuales por módulo (cuánto tarda un consultor hoy en cerrar PILA, examen, matriz, acta), (d) empresa cliente real comprometible para piloto + 2 backups, (e) acceso a 5+ PDFs de exámenes de muestra, (f) plantillas legales que ya usan, (g) restricciones culturales/operativas, (h) preferencia de canal (correo vs WhatsApp).
- **entregable:** `regis_call_questions.md` con mínimo 20 preguntas estructuradas por bloques.
- **criterio_qa:** Cubre los 8 bloques mencionados; preguntas son específicas (no abiertas vagas); incluye preguntas de cierre tipo "¿qué temimos olvidar preguntar?".
- **done:** Lista revisada y compartida en canal interno.

### T-F0-006 — Crear cuenta organizacional de Wati (si no existe)
- **tiempo:** 30 min
- **depende_de:** ninguna
- **nivel_qa:** estándar
- **operador_hace:** Verificar si existe cuenta Wati. Si no, crearla. Conectar número de WhatsApp Business. Asegurar acceso del equipo.
- **entregable:** Cuenta Wati activa con número conectado.
- **criterio_qa:** Login exitoso desde 2 dispositivos; número WA Business conectado y verificado.
- **done:** Captura del dashboard activo.

### T-F0-007 — Redactar 3 templates de WhatsApp para Wati/Meta
- **tiempo:** 60 min
- **depende_de:** T-F0-006
- **nivel_qa:** estricto
- **operador_hace:** Redactar templates: (1) recordatorio mensual PILA, (2) solicitud documento (genérico, parametrizado), (3) alerta de vencimiento. Cada uno con variables claras `{{cliente}}`, `{{fecha}}`, etc. Tono profesional Regis.
- **entregable:** `whatsapp_templates.md` con los 3 templates listos para enviar a Wati.
- **criterio_qa:** Cada template cumple políticas WhatsApp Business (no spam, valor para receptor); variables marcadas correctamente; longitud razonable; aprobables por Meta.
- **done:** Templates revisados y aprobados internamente.

### T-F0-008 — Enviar templates a Wati para aprobación
- **tiempo:** 30 min
- **depende_de:** T-F0-007
- **nivel_qa:** estricto
- **operador_hace:** Cargar los 3 templates en Wati y enviarlos para aprobación de Meta. Documentar IDs y timestamp de envío.
- **entregable:** 3 templates en estado "Pending Review" en Wati.
- **criterio_qa:** Captura del dashboard mostrando los 3 templates en revisión; timestamp registrado para tracking de SLA.
- **done:** Captura archivada en `evidence/wati/`.

### T-F0-009 — Redactar carta de intención con Regis
- **tiempo:** 60 min
- **depende_de:** ninguna
- **nivel_qa:** estricto
- **operador_hace:** Redactar carta de 1 página que cubra: propósito (concurso), IP del código (quién es dueño, condiciones de uso), NDA mutuo, alcance del entregable, intención post-concurso (sin obligar pero declarado).
- **entregable:** `letter_of_intent.md` listo para enviar.
- **criterio_qa:** Cubre los 5 puntos; lenguaje claro; firmable; protege ambos lados; no bloquea relación si Regis no contrata después.
- **done:** Documento revisado.

### T-F0-010 — Enviar carta de intención a Regis para firma
- **tiempo:** 15 min
- **depende_de:** T-F0-009
- **nivel_qa:** estándar
- **operador_hace:** Enviar carta a contacto Regis con solicitud de firma antes del 30 abr 18:00.
- **entregable:** Email/mensaje enviado con confirmación de recepción.
- **criterio_qa:** Mensaje enviado, recepción confirmada, deadline solicitado.
- **done:** Confirmación de recepción guardada.

### T-F0-011 — Crear repositorio Git del proyecto
- **tiempo:** 20 min
- **depende_de:** T-F0-001
- **nivel_qa:** estándar
- **operador_hace:** Crear repo en GitHub (privado), agregar miembros del equipo, configurar branch protection en `main`, agregar `.gitignore` para Node/Next.js, README inicial.
- **entregable:** Repo accesible para todo el equipo.
- **criterio_qa:** Repo existe; miembros tienen acceso; branch protection activa; clone funciona.
- **done:** Clone exitoso por todos los miembros.

### T-F0-012 — Inicializar Next.js 14 con tooling base
- **tiempo:** 60 min
- **depende_de:** T-F0-011
- **nivel_qa:** estándar
- **operador_hace:** `npx create-next-app@latest` con TypeScript, Tailwind, App Router, ESLint. Agregar Prettier, Husky, lint-staged. Configurar tsconfig estricto. Commit inicial.
- **entregable:** Proyecto Next.js corriendo localmente con `npm run dev`.
- **criterio_qa:** `npm run dev` levanta sin errores; `npm run lint` pasa; `npm run typecheck` pasa; commit en `main`.
- **done:** URL local responde 200.

### T-F0-013 — Crear proyecto Supabase
- **tiempo:** 30 min
- **depende_de:** T-F0-001
- **nivel_qa:** estándar
- **operador_hace:** Crear proyecto Supabase (plan Pro, $25/mes desde día 1 por backups y RLS performance). Región más cercana (us-east). Configurar Auth providers (email + magic link). Generar y guardar API keys.
- **entregable:** Proyecto Supabase activo con keys disponibles.
- **criterio_qa:** Proyecto creado; URL y anon/service keys guardadas en gestor seguro; conexión de prueba exitosa.
- **done:** `psql` o cliente conecta sin error.

### T-F0-014 — Configurar dotenv-vault y crear .env.example
- **tiempo:** 30 min
- **depende_de:** T-F0-012, T-F0-013
- **nivel_qa:** estricto
- **operador_hace:** Instalar dotenv-vault. Crear `.env.local` con keys de Supabase. Crear `.env.example` sin valores. Verificar que `.env.local` está en `.gitignore`. Push del vault encriptado a Vault.
- **entregable:** `.env.local` funcional + `.env.example` documentado + vault subido.
- **criterio_qa:** App lee env vars correctamente; `.env.local` NO en repo; `.env.example` sí en repo; vault sincronizado.
- **done:** `git status` no muestra `.env.local`.

### T-F0-015 — Configurar n8n self-hosted
- **tiempo:** 90 min
- **depende_de:** T-F0-001
- **nivel_qa:** estándar
- **operador_hace:** Levantar n8n en Hetzner/Railway/Fly.io (preferencia: Railway por simplicidad). Configurar dominio y SSL. Configurar credenciales de admin. Crear primer workflow de prueba "hello world".
- **entregable:** n8n accesible vía URL HTTPS con login funcional.
- **criterio_qa:** URL responde con SSL válido; login funciona; workflow de prueba ejecuta correctamente.
- **done:** Workflow ejecutado al menos 1 vez con éxito.

### T-F0-016 — Configurar Sentry para error tracking
- **tiempo:** 30 min
- **depende_de:** T-F0-012
- **nivel_qa:** estándar
- **operador_hace:** Crear proyecto Sentry. Integrar SDK en Next.js. Hacer deploy a un endpoint de prueba que genera error intencional. Verificar que Sentry capture.
- **entregable:** Sentry capturando errores del proyecto Next.js.
- **criterio_qa:** Error generado intencionalmente aparece en dashboard de Sentry; alertas configuradas a email del PM.
- **done:** Captura del error en Sentry archivada.

### T-F0-017 — Configurar Resend para emails transaccionales
- **tiempo:** 30 min
- **depende_de:** T-F0-012
- **nivel_qa:** estándar
- **operador_hace:** Crear cuenta Resend, verificar dominio (o usar dominio Resend de prueba). Generar API key. Crear endpoint `/api/test-email` que envía email de prueba.
- **entregable:** Endpoint funcional enviando emails.
- **criterio_qa:** Email de prueba llega a buzón del operador; tracking visible en Resend.
- **done:** Email recibido confirmado.

### T-F0-018 — Borrador ERD v0 en dbdiagram.io
- **tiempo:** 90 min
- **depende_de:** ninguna
- **nivel_qa:** estricto
- **operador_hace:** Crear ERD en dbdiagram.io con entidades core: `regis_orgs`, `companies` (con FK a regis_org), `centros_de_trabajo` (FK a company), `empresa_ciiu` (N:M company↔ciiu), `ciiu_codes`, `workers`, `worker_company` (N:M con fechas), `users`, `roles`, `user_company_role`, `standards_0312`, `standard_evaluations`, `evaluation_snapshots`, `documents`, `document_types`, `committees`, `committee_members`, `meeting_actas`, `compromisos`, `medical_exams`, `risk_matrices`, `audit_log`, `consents`, `notifications`, `ai_usage`, `pg_boss_jobs`. Cada entidad con campos esenciales y relaciones.
- **entregable:** ERD compartido como link público + export PDF en `docs/erd/v0.pdf`.
- **criterio_qa:** Cubre las 25+ entidades listadas; relaciones FK correctas; tablas N:M tienen sus pivot tables; campos de auditoría (created_at, updated_at) presentes; campo `regis_org_id` y/o `company_id` en tablas que requieren tenancy.
- **done:** Link compartido en canal y PDF en repo.

### T-F0-019 — Lista de preguntas finales antes de llamada Regis
- **tiempo:** 30 min
- **depende_de:** T-F0-005, T-F0-018
- **nivel_qa:** estándar
- **operador_hace:** Revisar `regis_call_questions.md` con base en el ERD. Agregar preguntas que el ERD provoque (ej: "¿una empresa puede tener centros de trabajo en distintas ciudades con clases de riesgo diferentes?").
- **entregable:** `regis_call_questions.md` v2 actualizada.
- **criterio_qa:** Versión 2 incluye al menos 5 preguntas nuevas derivadas del ERD; preguntas de modelo de datos están claramente marcadas.
- **done:** v2 commiteada.

### T-F0-020 — Ejecutar llamada con Regis
- **tiempo:** 75 min (60 llamada + 15 buffer)
- **depende_de:** T-F0-004, T-F0-019
- **nivel_qa:** estricto
- **operador_hace:** Llamar a Regis. Grabar (con permiso). Cubrir todas las preguntas de la lista v2. Tomar notas en vivo. Agendar sesión adicional si quedan temas pendientes.
- **entregable:** Grabación + notas crudas en `meetings/regis_2025-04-29.md`.
- **criterio_qa:** Grabación existe; notas cubren los 8 bloques de preguntas; al menos 1 empresa real comprometida confirmada por nombre.
- **done:** Notas archivadas + grabación respaldada.

### T-F0-021 — Transcribir y estructurar acta de llamada Regis
- **tiempo:** 60 min
- **depende_de:** T-F0-020
- **nivel_qa:** estricto
- **operador_hace:** Procesar grabación con Whisper o transcribir manualmente. Estructurar en `meetings/regis_2025-04-29_acta.md`: decisiones tomadas, datos validados (pesos, frecuencias), empresa real + backups, baseline de tiempos, restricciones, próximas acciones.
- **entregable:** Acta estructurada y compartida con Regis para validación.
- **criterio_qa:** Acta tiene secciones: decisiones, datos validados, empresa piloto + backups, baseline tiempos, próximas acciones, asistentes. Compartida con Regis con solicitud de validación.
- **done:** Regis confirma o corrige el acta.

### T-F0-022 — Confirmar empresa cliente real para piloto + 2 backups
- **tiempo:** 30 min
- **depende_de:** T-F0-021
- **nivel_qa:** estricto
- **operador_hace:** Documentar formalmente: empresa A (piloto principal), empresa B (backup 1), empresa C (backup 2). Para cada una: NIT, contacto, # trabajadores aproximado, CIIU, comités existentes, disponibilidad. Solicitar a Regis su consentimiento para uso en demo.
- **entregable:** `pilot_companies.md` con las 3 empresas documentadas.
- **criterio_qa:** Las 3 empresas documentadas con datos completos; al menos 1 tiene consentimiento explícito de Regis para usar en demo.
- **done:** Consentimiento de empresa A confirmado por escrito.

### T-F0-023 — Agendar sesión 2h con Regis para mapeo CIIU→peligros
- **tiempo:** 15 min
- **depende_de:** T-F0-021
- **nivel_qa:** estándar
- **operador_hace:** Coordinar sesión de trabajo de 2 horas con consultor sénior de Regis para definir el catálogo CIIU→peligros típicos. Idealmente entre 30 abr y 1 may.
- **entregable:** Sesión confirmada en calendario.
- **criterio_qa:** Sesión agendada antes del 1 may 18:00; consultor sénior confirmado.
- **done:** Confirmación recibida.

### T-F0-024 — Refinar ERD a v1 con base en llamada Regis
- **tiempo:** 90 min
- **depende_de:** T-F0-018, T-F0-021
- **nivel_qa:** estricto
- **operador_hace:** Actualizar ERD aplicando aprendizajes de la llamada. Casos típicos: ajustar entidades, agregar campos faltantes, refinar relaciones. Documentar cambios respecto a v0.
- **entregable:** ERD v1 + changelog en `docs/erd/changelog.md`.
- **criterio_qa:** Cambios documentados con razón; ERD v1 publicado; v0 archivado para referencia.
- **done:** v1 compartida en canal.

### T-F0-025 — Escribir ADR-01: Lovable vs Next.js
- **tiempo:** 30 min
- **depende_de:** ninguna
- **nivel_qa:** estándar
- **operador_hace:** Crear `docs/adr/ADR-001-stack-frontend.md` con secciones: contexto, alternativas (Lovable, v0, Next.js directo), decisión (Next.js 14 directo), consecuencias (positivas y negativas).
- **entregable:** ADR-001 commiteado.
- **criterio_qa:** Tiene las 4 secciones; alternativas con pros/contras; decisión justificada en ≤ 200 palabras.
- **done:** Archivo en `docs/adr/`.

### T-F0-026 — Escribir ADR-02: centros de trabajo + multi-CIIU
- **tiempo:** 30 min
- **depende_de:** T-F0-024
- **nivel_qa:** estricto
- **operador_hace:** Crear `docs/adr/ADR-002-centros-trabajo-multi-ciiu.md` documentando la decisión de modelar `centros_de_trabajo` como entidad de primera clase y CIIU como N:M.
- **entregable:** ADR-002.
- **criterio_qa:** Justificación legal (Resolución 0312 evalúa por centro); diagrama de relación incluido; consecuencias en motor de cumplimiento explicadas.
- **done:** Archivo commiteado.

### T-F0-027 — Escribir ADR-03: audit trail desde Fase 1
- **tiempo:** 30 min
- **depende_de:** ninguna
- **nivel_qa:** estándar
- **operador_hace:** Documentar decisión de inyectar audit trail desde Fase 1 (no Fase 5), implementación con triggers Postgres + middleware app, tabla particionada por mes.
- **entregable:** ADR-003.
- **criterio_qa:** Implementación técnica especificada; trade-offs evaluados; razón documentada.
- **done:** Archivo commiteado.

### T-F0-028 — Escribir ADR-04: storage primario
- **tiempo:** 30 min
- **depende_de:** ninguna
- **nivel_qa:** estándar
- **operador_hace:** Documentar decisión Supabase Storage primario + Drive como espejo opcional. Tratamiento especial para historia clínica ocupacional (bucket separado, retención 20 años flag).
- **entregable:** ADR-004.
- **criterio_qa:** Justificación de Supabase sobre Drive; mención al tratamiento especial de datos sensibles; estrategia de espejo a Drive documentada.
- **done:** Archivo commiteado.

### T-F0-029 — Escribir ADR-05: job queue (pg-boss)
- **tiempo:** 30 min
- **depende_de:** ninguna
- **nivel_qa:** estándar
- **operador_hace:** Documentar decisión pg-boss sobre Postgres existente, NO Redis/BullMQ. n8n queda solo para integraciones externas.
- **entregable:** ADR-005.
- **criterio_qa:** Justificación de no agregar infra Redis; mención a procesos largos (Whisper); separación n8n vs pg-boss clarificada.
- **done:** Archivo commiteado.

### T-F0-030 — Escribir glosario SG-SST v1
- **tiempo:** 60 min
- **depende_de:** T-F0-021
- **nivel_qa:** estándar
- **operador_hace:** Crear `docs/glossary.md` con términos clave: peligro vs riesgo, accidente vs incidente, ATEL, COPASST, Vigía SST, GTC-45, FURAT, FUREL, profesiograma, PHVA, ARL, EPS, AFP, CIIU, PILA, etc. Cada término con definición + fuente normativa.
- **entregable:** Glosario v1.
- **criterio_qa:** Mínimo 25 términos; definiciones con fuente normativa cuando aplica; lenguaje claro.
- **done:** Archivo commiteado.

### T-F0-031 — Escribir diccionario de prompts base
- **tiempo:** 60 min
- **depende_de:** T-F0-030
- **nivel_qa:** estándar
- **operador_hace:** Crear `docs/prompts/base.md` con templates parametrizados de prompts para Claude: extracción de examen médico, generación de matriz, generación de acta, estructuración de plan emergencias. Cada uno con: variables, schema de output (Zod), instrucción de citations, manejo de baja confianza.
- **entregable:** `docs/prompts/base.md` con 4 prompts.
- **criterio_qa:** Cada prompt tiene: variables claras, schema esperado en JSON, instrucción de fuente/citation, manejo de incertidumbre.
- **done:** Archivo commiteado.

### T-F0-032 — Redactar aviso de privacidad y autorización de tratamiento
- **tiempo:** 90 min
- **depende_de:** T-F0-021
- **nivel_qa:** estricto
- **operador_hace:** Basándose en plantilla SIC, redactar (a) aviso de privacidad de la plataforma, (b) texto de autorización expresa de tratamiento de datos personales (incluyendo datos sensibles de salud). Aplica Ley 1581/2012 + Decreto 1377/2013.
- **entregable:** `legal/aviso_privacidad.md` y `legal/autorizacion_tratamiento.md`.
- **criterio_qa:** Cubre finalidad, derechos del titular, identidad del responsable, vigencia; mención específica a datos sensibles de salud; redacción aceptable para checkbox en UI.
- **done:** Ambos documentos commiteados.

### T-F0-033 — Redactar 5 ADRs adicionales menores en formato resumido
- **tiempo:** 60 min
- **depende_de:** T-F0-029
- **nivel_qa:** ligero
- **operador_hace:** Documentar en formato breve: ADR-006 (anti-alucinación 3 capas), ADR-007 (RBAC 4 roles concurso), ADR-008 (pg-boss para Whisper), ADR-009 (testing minimal: unit motor + e2e demo), ADR-010 (Resend para email).
- **entregable:** 5 ADRs en `docs/adr/`.
- **criterio_qa:** Los 5 archivos existen con contexto + decisión + consecuencias (formato corto, ≤ 100 palabras cada uno).
- **done:** Commits.

### T-F0-034 — Verificar respuesta de Wati y dar seguimiento
- **tiempo:** 30 min
- **depende_de:** T-F0-008
- **nivel_qa:** estricto
- **operador_hace:** Revisar estado de los 3 templates en Wati. Si alguno fue rechazado, ajustar y reenviar. Si llevan más de 24h sin respuesta, contactar soporte Wati.
- **entregable:** Estado actualizado en `evidence/wati/status.md`.
- **criterio_qa:** Estado de los 3 templates documentado; acciones tomadas si hay rechazos.
- **done:** Status actualizado.

### T-F0-035 — Sesión de mapeo CIIU→peligros con Regis (parte 1)
- **tiempo:** 120 min
- **depende_de:** T-F0-023
- **nivel_qa:** estricto
- **operador_hace:** Conducir sesión 2h con consultor sénior. Cubrir los 5 CIIUs prioritarios (los de la empresa piloto + 4 más comunes en el portafolio Regis). Para cada CIIU: peligros físicos, químicos, biológicos, ergonómicos, psicosociales, mecánicos, eléctricos, locativos. Documentar en formato estructurado.
- **entregable:** `docs/ciiu_hazard_mapping.md` con 5 CIIUs cubiertos.
- **criterio_qa:** Mínimo 5 CIIUs; cada uno con las 8 categorías de peligro; al menos 4-6 peligros por categoría; lenguaje técnico SG-SST correcto.
- **done:** Documento revisado por consultor Regis.

### T-F0-036 — Hito de validación Fase 0 (Phase Gate)
- **tiempo:** 60 min
- **depende_de:** T-F0-001 hasta T-F0-035 (todas)
- **nivel_qa:** estricto
- **operador_hace:** Reunión de los 3 roles. Verificar checklist completo: ERD v1 publicado, 10 ADRs escritos, glosario + prompts listos, aviso privacidad + autorización listos, llamada Regis hecha y acta firmada, empresa piloto confirmada, mapeo CIIU iniciado, repos y servicios externos configurados, templates Wati en revisión.
- **entregable:** `phases/fase_0_gate.md` firmado.
- **criterio_qa:** Los 9 items del checklist verificados con evidencia; firma del PM presente; lecciones documentadas.
- **done:** Gate aprobado por PM.

### T-F0-037 — Construir orquestación autónoma de agentes en n8n (Camino C)
- **tiempo:** 240 min
- **depende_de:** T-F0-036
- **nivel_qa:** estricto
- **bucket:** A
- **operador_hace:** Construir workflows en n8n self-hosted que orquesten los 4 agentes (Operador, QA, PM, Auditor) de forma autónoma a partir de Fase 1. Componentes: (1) workflow "task-dispatcher" que detecta Issues con status `Pendiente` cuyas dependencias están `Aprobada` y los asigna al Operador-Agent; (2) workflow "operador-executor" que invoca a Anthropic API con el system prompt del Operador, persiste output en GitHub Issue, y pasa control a QA; (3) workflow "qa-validator" que invoca a QA-Agent y aprueba/rechaza; (4) workflow "pm-coordinator" que se invoca en escalaciones, phase gates, y snapshots cada 6h; (5) workflow "auditor" cron cada 4h. Todos los workflows deben implementar: cost circuit breaker (`security/01_cost_circuit_breaker.md`), loop detector (`security/02_loop_detector.md`), backup automático (`security/03_backup_automatico.md`). Routing de LLMs según `governance/06_llm_routing_config.md`.
- **entregable:** 5 workflows n8n exportados en `flows/`, documentación de cada uno en `flows/README.md`, test E2E de 1 tarea ficticia procesada autónomamente.
- **criterio_qa:** Los 5 workflows existen y son ejecutables; test E2E corre sin error; cost circuit breaker probado; loop detector probado; orquestación toma el relevo del Camino A a partir de Fase 1.
- **done:** El Operador-Agent ejecuta T-F1-001 sin intervención del orquestador conversacional.

---

# FASE 1 — Motor de cumplimiento + audit + dashboard base

**Días:** 30 abr + 1 may am | **Objetivo:** Corazón funcionando: empresa, evaluación estándar, snapshot, % calculado, audit trail.

---

### T-F1-001 — Configurar migrations con Supabase CLI
- **tiempo:** 45 min
- **depende_de:** T-F0-013, T-F0-036
- **nivel_qa:** estándar
- **operador_hace:** Instalar Supabase CLI. Inicializar `supabase/migrations/`. Configurar conexión local + remoto. Crear migration vacía de prueba y aplicarla.
- **entregable:** Pipeline de migrations funcional.
- **criterio_qa:** `supabase db push` funciona; migration de prueba aplicada en remoto.
- **done:** Migration aplicada confirmada.

### T-F1-002 — Migration: schema base de tenancy
- **tiempo:** 60 min
- **depende_de:** T-F1-001, T-F0-024
- **nivel_qa:** estricto
- **operador_hace:** Crear migration `001_tenancy.sql`: tablas `regis_orgs`, `companies` (FK regis_org_id), `centros_de_trabajo` (FK company_id), `users`, `roles`, `user_company_role`. Con UUIDs, created_at, updated_at, soft_delete flag.
- **entregable:** Migration aplicada.
- **criterio_qa:** Tablas existen en Supabase; FKs correctas; índices en columnas FK.
- **done:** Verificar en dashboard Supabase.

### T-F1-003 — Migration: catálogos base
- **tiempo:** 60 min
- **depende_de:** T-F1-002
- **nivel_qa:** estándar
- **operador_hace:** Crear migration `002_catalogs.sql`: tablas `ciiu_codes` (con clase de riesgo I-V), `eps_catalog`, `afp_catalog`, `arl_catalog`. Seed con datos reales de Colombia (ciiu desde DANE, EPS/AFP/ARL desde lista oficial Mintrabajo).
- **entregable:** Migration aplicada con seeds.
- **criterio_qa:** Mínimo 100 CIIU codes; mínimo 8 EPS, 4 AFP, 10 ARL en seed.
- **done:** Conteos verificados.

### T-F1-004 — Migration: trabajadores y relaciones
- **tiempo:** 45 min
- **depende_de:** T-F1-002
- **nivel_qa:** estándar
- **operador_hace:** Crear migration `003_workers.sql`: tablas `workers` (con cédula, datos personales, EPS/AFP/ARL FK), `worker_company` (N:M con fechas inicio/fin, cargo), `empresa_ciiu` (N:M).
- **entregable:** Migration aplicada.
- **criterio_qa:** Tablas existen con FKs; constraint de unique en cédula global; trigger para validar dígito verificación NIT cuando se inserte company.
- **done:** Migration verificada.

### T-F1-005 — Migration: estándares Resolución 0312
- **tiempo:** 90 min
- **depende_de:** T-F1-001
- **nivel_qa:** estricto
- **operador_hace:** Crear migration `004_standards_0312.sql`: tabla `standards_0312` con campos: standard_number, name, description, weight (decimal), cycle (PHVA enum), chapter (1/2/3), is_critical (bool), document_types (array), frequency_days, applies_when_workers_min, applies_when_workers_max, applies_when_risk_min, applies_when_risk_max. Seed con los 60 estándares con sus pesos validados con Regis.
- **entregable:** Migration con 60 estándares seedeados.
- **criterio_qa:** 60 filas exactas; suma de weights del Capítulo III = 100.0; estándares 1-7 con pesos 10/15/20/30/10/5/10; estándares Capítulo I y II marcados correctamente.
- **done:** Query de validación de pesos pasa.

### T-F1-006 — Migration: evaluaciones y snapshots
- **tiempo:** 60 min
- **depende_de:** T-F1-005
- **nivel_qa:** estricto
- **operador_hace:** Crear migration `005_evaluations.sql`: tabla `standard_evaluations` (centro_de_trabajo_id, standard_id, status enum cumple/no_cumple/no_aplica/pendiente, justification, evidence_id, evaluator_id, evaluated_at). Tabla `evaluation_snapshots` (centro_id, snapshot_date, total_percentage, by_cycle JSON, by_standard JSON, hash). Constraint: snapshot inmutable (no UPDATE permitido).
- **entregable:** Migration aplicada.
- **criterio_qa:** Tablas existen; trigger que prohíbe UPDATE en evaluation_snapshots; índice en (centro_id, snapshot_date).
- **done:** Test de UPDATE en snapshot lanza error.

### T-F1-007 — Migration: documentos y comités
- **tiempo:** 45 min
- **depende_de:** T-F1-002
- **nivel_qa:** estándar
- **operador_hace:** Crear migration `006_documents_committees.sql`: tablas `document_types` (catálogo), `documents` (centro_id, type, file_url, status, version, valid_from, valid_until), `committees` (centro_id, type COPASST/Convivencia, election_date, term_end_date), `committee_members` (committee_id, worker_id, role, is_principal, term_start, term_end).
- **entregable:** Migration aplicada.
- **criterio_qa:** FKs correctas; índice en valid_until para queries de vencimiento.
- **done:** Verificado.

### T-F1-008 — Migration: audit log
- **tiempo:** 45 min
- **depende_de:** T-F1-002
- **nivel_qa:** estricto
- **operador_hace:** Crear migration `007_audit.sql`: tabla `audit_log` particionada por mes (regis_org_id, company_id, actor_id, actor_type, action, entity_type, entity_id, before_state JSONB, after_state JSONB, metadata JSONB, created_at). Función trigger genérica `fn_audit_changes()`.
- **entregable:** Migration aplicada con función trigger.
- **criterio_qa:** Tabla particionada por mes (al menos 12 particiones futuras); trigger function existe; INSERT a tabla auditada genera entrada en audit_log.
- **done:** Test de trigger pasa.

### T-F1-009 — Migration: consents y notificaciones
- **tiempo:** 45 min
- **depende_de:** T-F1-002
- **nivel_qa:** estándar
- **operador_hace:** Crear migration `008_consents_notifications.sql`: tabla `consents` (user_id, consent_type, version, accepted_at, ip, user_agent), tabla `notifications` (recipient_id, channel, template, payload, status, sent_at).
- **entregable:** Migration aplicada.
- **criterio_qa:** Tablas existen con FKs.
- **done:** Verificado.

### T-F1-010 — Migration: ai_usage tracking
- **tiempo:** 30 min
- **depende_de:** T-F1-002
- **nivel_qa:** estándar
- **operador_hace:** Crear migration `009_ai_usage.sql`: tabla `ai_usage` (request_id, module, prompt_version, model, input_tokens, output_tokens, cost_usd, latency_ms, confidence, created_at).
- **entregable:** Migration aplicada.
- **criterio_qa:** Tabla existe con índice en (module, created_at).
- **done:** Verificado.

### T-F1-011 — Activar RLS en todas las tablas multi-tenant
- **tiempo:** 90 min
- **depende_de:** T-F1-002 hasta T-F1-010
- **nivel_qa:** estricto
- **operador_hace:** Crear migration `010_rls.sql` que ENABLE RLS en todas las tablas con regis_org_id o company_id. Crear policies por tabla: SELECT/INSERT/UPDATE/DELETE basadas en `current_setting('app.current_user_id')`. Función helper `current_user_companies()` para subquery.
- **entregable:** Migration aplicada con policies.
- **criterio_qa:** Todas las tablas tenant-scoped tienen RLS activado; policies definidas para CRUD; query SQL como service_role bypassa RLS, como anon respeta RLS.
- **done:** Test manual de aislación.

### T-F1-012 — Test de aislación multi-tenant (RLS)
- **tiempo:** 60 min
- **depende_de:** T-F1-011
- **nivel_qa:** estricto
- **operador_hace:** Crear test que: (a) inserta 2 regis_orgs con 1 company cada uno, (b) crea 1 user en cada org, (c) verifica que user_A no puede ver companies de regis_org_B vía RLS. Test automatizado en `tests/rls.test.ts`.
- **entregable:** Test pasando.
- **criterio_qa:** Test ejecuta verde; cubre los 4 verbos CRUD; falla si se desactiva RLS.
- **done:** `npm test rls.test.ts` pasa.

### T-F1-013 — Seed de empresa sintética verosímil
- **tiempo:** 90 min
- **depende_de:** T-F1-011
- **nivel_qa:** estándar
- **operador_hace:** Crear seed que inserta: 1 regis_org "Regis Colombia Demo", 1 company sintética con 2 centros de trabajo (Bogotá y Medellín), 2 CIIUs distintos, 15 workers (con cédulas válidas generadas, datos plausibles), 2 committees (COPASST + Convivencia) con sus members, evaluaciones iniciales en estado "pendiente" para los 60 estándares.
- **entregable:** Seed reproducible en `seeds/synthetic_company.sql`.
- **criterio_qa:** Seed corre sin errores; resultado: 1 org + 1 company + 2 centros + 15 workers + 2 committees + 60 evaluaciones pendientes.
- **done:** Conteos verificados.

### T-F1-014 — Aplicar triggers de audit a tablas críticas
- **tiempo:** 45 min
- **depende_de:** T-F1-008, T-F1-013
- **nivel_qa:** estricto
- **operador_hace:** Aplicar trigger `fn_audit_changes()` en tablas: companies, centros_de_trabajo, workers, standard_evaluations, documents, committee_members, evaluation_snapshots. Verificar que cada UPDATE/INSERT genera registro en audit_log.
- **entregable:** Triggers activos en 7 tablas.
- **criterio_qa:** UPDATE de prueba en cada tabla genera entrada en audit_log con before/after state.
- **done:** Test manual de cada tabla.

### T-F1-015 — Implementar motor de clasificación de capítulo
- **tiempo:** 60 min
- **depende_de:** T-F1-005
- **nivel_qa:** estricto
- **operador_hace:** En el Domain layer, implementar función `getApplicableStandards(workers, riskClass)` que retorna los estándares aplicables según las reglas: I (1-10 trab + riesgo I-III → 7 std), II (11-50 + riesgo I-III → 21 std), III (50+ o riesgo IV-V → 60 std). Tests unitarios.
- **entregable:** Función + 6 tests unitarios cubriendo todos los casos.
- **criterio_qa:** Tests pasan; cubre casos límite (10, 11, 50, 51 trabajadores; riesgo III, IV).
- **done:** `npm test` pasa.

### T-F1-016 — Implementar lógica "No Aplica" con redistribución de pesos
- **tiempo:** 90 min
- **depende_de:** T-F1-015
- **nivel_qa:** estricto
- **operador_hace:** Implementar `calculateScore(evaluations[], applicableStandards[])` que: cuenta puntos de "Cumple", trata "No Aplica" como cumplido (suma su peso al numerador), suma peso de "Cumple" + "No Aplica" al numerador y peso total de aplicables al denominador. Resultado en %. Tests unitarios con casos: todos cumplen, ninguno cumple, mezcla, todos no aplica, mezcla con no aplica.
- **entregable:** Función + 8 tests.
- **criterio_qa:** Tests pasan; función pura sin I/O; casos extremos cubiertos.
- **done:** `npm test` pasa.

### T-F1-017 — Implementar generador de snapshot mensual
- **tiempo:** 75 min
- **depende_de:** T-F1-016, T-F1-006
- **nivel_qa:** estricto
- **operador_hace:** Función `generateSnapshot(centro_id, date)` que: lee evaluaciones vigentes a esa fecha, calcula score global + by_cycle + by_standard, calcula hash del resultado, inserta en evaluation_snapshots. Job manual ejecutable desde admin endpoint.
- **entregable:** Función + endpoint `/api/admin/snapshots/:centro_id`.
- **criterio_qa:** Endpoint genera snapshot correctamente; hash es determinístico (mismo input → mismo hash); snapshot es inmutable (test de UPDATE falla).
- **done:** Snapshot generado para empresa sintética.

### T-F1-018 — Configurar autenticación Supabase Auth
- **tiempo:** 60 min
- **depende_de:** T-F1-002, T-F0-012
- **nivel_qa:** estándar
- **operador_hace:** Integrar Supabase Auth en Next.js: middleware, helpers de server/client, signin/signout pages. Magic link como método primario. Crear helper `getCurrentUser()` que retorna usuario + roles + company.
- **entregable:** Auth funcional, magic link enviado y login exitoso.
- **criterio_qa:** Usuario puede loguearse vía magic link; sesión persiste; logout funciona.
- **done:** Login E2E manual exitoso.

### T-F1-019 — Implementar 4 roles funcionales
- **tiempo:** 60 min
- **depende_de:** T-F1-018, T-F1-002
- **nivel_qa:** estricto
- **operador_hace:** Seedear roles: regis_admin, regis_consultant, client_admin, worker. Crear helper `hasRole(user, role)` y middleware Next.js `requireRole(role)`. Crear 4 usuarios de prueba en seed (uno por rol).
- **entregable:** Roles funcionando + 4 usuarios de prueba.
- **criterio_qa:** Cada usuario solo ve su scope correspondiente; middleware bloquea acceso no autorizado con 403.
- **done:** Test E2E manual de cada rol.

### T-F1-020 — Crear página dashboard cliente (vista por empresa)
- **tiempo:** 90 min
- **depende_de:** T-F1-017, T-F1-019
- **nivel_qa:** estándar
- **operador_hace:** Crear `/dashboard` para client_admin. Muestra: nombre empresa, centros de trabajo, % cumplimiento global, % por ciclo PHVA, % por estándar (top), próximos vencimientos. Diseño limpio Tailwind. Mobile responsive.
- **entregable:** Página accesible y funcional.
- **criterio_qa:** Muestra datos reales del seed sintético; mobile responsive verificado en breakpoints 375/768/1024; loading states.
- **done:** Captura archivada.

### T-F1-021 — Crear página dashboard Regis (vista portafolio)
- **tiempo:** 90 min
- **depende_de:** T-F1-020
- **nivel_qa:** estándar
- **operador_hace:** Crear `/regis/dashboard` para regis_admin/regis_consultant. Muestra: tabla de todas sus companies con % cumplimiento, semáforo (rojo <60, amarillo 60-89, verde ≥90), tendencia, próximo vencimiento crítico. Filtros por status.
- **entregable:** Página accesible.
- **criterio_qa:** Lista companies del regis_org actual; semáforo correcto; filtro funciona.
- **done:** Captura archivada.

### T-F1-022 — Implementar drill-down de estándar
- **tiempo:** 60 min
- **depende_de:** T-F1-020
- **nivel_qa:** estándar
- **operador_hace:** Click en estándar del dashboard cliente → muestra detalle: descripción, peso, status actual, evidencias asociadas, historial de cambios desde audit_log.
- **entregable:** Modal o página de detalle.
- **criterio_qa:** Click navega correctamente; muestra audit history; cierre funciona.
- **done:** Test manual.

### T-F1-023 — Hito de validación Fase 1 (Phase Gate)
- **tiempo:** 60 min
- **depende_de:** T-F1-001 hasta T-F1-022
- **nivel_qa:** estricto
- **operador_hace:** Reunión 3 roles. Verificar: (1) login como cada rol, (2) RLS test pasa, (3) dashboard cliente muestra empresa sintética con % calculado correctamente, (4) dashboard Regis muestra portafolio, (5) snapshot generado e inmutable, (6) audit log registra cambios, (7) drill-down funciona, (8) responsive mobile OK.
- **entregable:** `phases/fase_1_gate.md` firmado.
- **criterio_qa:** 8 puntos verificados con evidencia (capturas o video).
- **done:** Gate aprobado por PM.

---

# FASE 1.5 — Plumbing transversal

**Días:** 1 may pm | **Objetivo:** Inyectar capacidades cross-cutting antes de los módulos.

---

### T-F15-001 — Instalar y configurar pg-boss
- **tiempo:** 45 min
- **depende_de:** T-F1-023
- **nivel_qa:** estándar
- **operador_hace:** Instalar `pg-boss` en el proyecto Next.js. Configurar conexión al Postgres de Supabase. Crear instancia singleton. Crear job de prueba "hello world" que se encola y ejecuta.
- **entregable:** pg-boss funcional con job de prueba ejecutándose.
- **criterio_qa:** Job de prueba se encola; worker lo procesa; resultado en log.
- **done:** Log confirmado.

### T-F15-002 — Crear cola de revisión humana (ai_outputs_pending_review)
- **tiempo:** 60 min
- **depende_de:** T-F1-001
- **nivel_qa:** estándar
- **operador_hace:** Migration `011_review_queue.sql`: tabla `ai_outputs_pending_review` (id, module, request_id, ai_output JSONB, confidence, status enum pending/approved/rejected, reviewer_id, reviewed_at, corrections JSONB).
- **entregable:** Migration aplicada.
- **criterio_qa:** Tabla existe; índice en (module, status); RLS aplicada.
- **done:** Verificado.

### T-F15-003 — UI lista de revisión humana
- **tiempo:** 75 min
- **depende_de:** T-F15-002
- **nivel_qa:** estándar
- **operador_hace:** Crear `/regis/review-queue`: lista paginada de outputs pendientes con módulo, fecha, confidence. Click → vista detalle con AI output editable + botones approve/reject + textarea de correcciones.
- **entregable:** UI funcional.
- **criterio_qa:** Lista carga; aprobar/rechazar actualiza status; correcciones se guardan; auditable.
- **done:** Test manual con item dummy.

### T-F15-004 — Sistema de notificaciones in-app
- **tiempo:** 60 min
- **depende_de:** T-F1-009
- **nivel_qa:** estándar
- **operador_hace:** Crear servicio `NotificationService` con métodos `notifyUser(user_id, template, payload)`. Implementar canal in-app (insert en tabla notifications). UI: bell icon en navbar con dropdown de notificaciones no leídas.
- **entregable:** Notificaciones in-app funcionando.
- **criterio_qa:** Notificación insertada aparece en bell dropdown; marcar como leída persiste.
- **done:** Test manual.

### T-F15-005 — Implementar canal email en NotificationService
- **tiempo:** 45 min
- **depende_de:** T-F15-004, T-F0-017
- **nivel_qa:** estándar
- **operador_hace:** Extender NotificationService para que `notifyUser` con channel='email' use Resend. Templates HTML básicos en `lib/email-templates/`.
- **entregable:** Email enviado vía servicio.
- **criterio_qa:** Email llega correctamente; HTML render OK; tracking en Resend.
- **done:** Email recibido.

### T-F15-006 — Stub de canal WhatsApp (preparado para Wati)
- **tiempo:** 30 min
- **depende_de:** T-F15-004
- **nivel_qa:** ligero
- **operador_hace:** Implementar canal whatsapp en NotificationService con stub que loguea (sin enviar realmente). Si Wati ya aprobó templates, reemplazar stub por llamada real a API Wati.
- **entregable:** Canal whatsapp implementado (stub o real).
- **criterio_qa:** Llamada al servicio con channel=whatsapp ejecuta sin error.
- **done:** Verificado.

### T-F15-007 — Implementar Habeas Data: modal de consentimiento
- **tiempo:** 75 min
- **depende_de:** T-F0-032, T-F1-009
- **nivel_qa:** estricto
- **operador_hace:** Crear modal que aparece en primer login solicitando aceptar aviso de privacidad + autorización de tratamiento. Si rechaza, no puede continuar. Si acepta, registra en tabla `consents` con IP, user_agent, timestamp.
- **entregable:** Modal funcional.
- **criterio_qa:** Modal aparece en primer login; rechazar bloquea uso; aceptar registra en tabla con metadata completa.
- **done:** Test manual con usuario nuevo.

### T-F15-008 — Endpoint de derechos ARCO (stub mínimo)
- **tiempo:** 30 min
- **depende_de:** T-F15-007
- **nivel_qa:** ligero
- **operador_hace:** Crear `/legal/arco` con formulario: tipo de solicitud (acceso/rectificación/cancelación/oposición), descripción. Guarda en tabla `arco_requests` y notifica al PM por email. Sin workflow completo (declarado en Bucket B).
- **entregable:** Formulario funcional.
- **criterio_qa:** Submit guarda en DB; email al PM enviado.
- **done:** Test manual.

### T-F15-009 — Validador de NIT colombiano (módulo 11)
- **tiempo:** 30 min
- **depende_de:** T-F0-012
- **nivel_qa:** estándar
- **operador_hace:** Implementar función `validateNIT(nit: string)` con algoritmo de dígito de verificación módulo 11. Tests unitarios con NITs reales válidos e inválidos.
- **entregable:** Función + 8 tests.
- **criterio_qa:** Tests pasan; función exportada y usable en validación de companies.
- **done:** `npm test nit.test.ts` pasa.

### T-F15-010 — Calendario hábil colombiano
- **tiempo:** 45 min
- **depende_de:** T-F0-012
- **nivel_qa:** estándar
- **operador_hace:** Implementar utility `colombianBusinessDays`: tabla estática de festivos hasta 2030 + función `addBusinessDays(date, n)`. Tests para 2026 con casos típicos.
- **entregable:** Utility + tests.
- **criterio_qa:** Festivos correctos para 2026 (ej: 6 ene, lunes Pascua, primer lunes de junio); función calcula correctamente saltando fines de semana y festivos.
- **done:** Tests pasan.

### T-F15-011 — Tracking de uso de IA
- **tiempo:** 45 min
- **depende_de:** T-F1-010
- **nivel_qa:** estándar
- **operador_hace:** Crear wrapper `claudeClient` que ante cada llamada a Claude API registre en tabla `ai_usage` el módulo, request_id, tokens, costo (calculado por modelo), latencia, confidence retornada.
- **entregable:** Wrapper funcional.
- **criterio_qa:** Llamada de prueba registra entrada en ai_usage con todos los campos; suma de costos calculable por SQL.
- **done:** Query de costo total funciona.

### T-F15-012 — Setup de logging estructurado (Pino)
- **tiempo:** 30 min
- **depende_de:** T-F0-012
- **nivel_qa:** ligero
- **operador_hace:** Instalar Pino. Configurar logger con niveles + output JSON en producción + pretty en dev. Reemplazar console.log existentes por logger.
- **entregable:** Logger funcional.
- **criterio_qa:** Logs en formato JSON en prod; correlation_id por request.
- **done:** Verificado.

### T-F15-013 — Hito de validación Fase 1.5 (Phase Gate)
- **tiempo:** 30 min
- **depende_de:** T-F15-001 hasta T-F15-012
- **nivel_qa:** estricto
- **operador_hace:** Verificar checklist: (1) job pg-boss ejecutado, (2) cola revisión humana funcional, (3) notificación in-app + email enviadas, (4) modal Habeas Data activo, (5) validador NIT pasa tests, (6) calendario hábil correcto, (7) AI usage tracking activo, (8) logger Pino integrado.
- **entregable:** `phases/fase_15_gate.md` firmado.
- **criterio_qa:** 8 puntos verificados.
- **done:** Gate aprobado.

---

# FASE 2 — PILA + Exámenes médicos

**Días:** 2 may + 3 may am | **Objetivo:** Dos módulos verticales completos con IA real y cola de revisión.

---

### T-F2-001 — Diseñar flujo PILA en n8n (envío automático mensual)
- **tiempo:** 60 min
- **depende_de:** T-F1-23, T-F0-015
- **nivel_qa:** estándar
- **operador_hace:** Crear workflow n8n que: cron primer día hábil del mes → para cada company activa → enviar email + WhatsApp con solicitud PILA. Integración con Resend y Wati (o stub).
- **entregable:** Workflow n8n exportado en `flows/pila_request_monthly.json`.
- **criterio_qa:** Workflow ejecuta sin errores; emails se envían correctamente; logs visibles.
- **done:** Ejecución manual exitosa.

### T-F2-002 — Endpoint para recibir PILA por email
- **tiempo:** 75 min
- **depende_de:** T-F2-001
- **nivel_qa:** estándar
- **operador_hace:** Configurar webhook entrante en n8n que recibe email con adjunto. Workflow extrae adjunto, identifica empresa por sender o subject, encola job de procesamiento PILA.
- **entregable:** Workflow funcional.
- **criterio_qa:** Email enviado a alias dedicado dispara webhook; adjunto extraído; job encolado en pg-boss.
- **done:** Test E2E con email real.

### T-F2-003 — Watcher de Drive para carpeta PILA
- **tiempo:** 60 min
- **depende_de:** T-F2-001
- **nivel_qa:** estándar
- **operador_hace:** Workflow n8n con trigger "Drive: file created" en carpeta `/regis/pila/incoming/`. Identifica empresa por nombre de archivo o subcarpeta. Encola job.
- **entregable:** Workflow funcional.
- **criterio_qa:** Subir archivo a carpeta dispara workflow; job encolado.
- **done:** Test con archivo real.

### T-F2-004 — Procesador de PILA (parser básico)
- **tiempo:** 90 min
- **depende_de:** T-F2-002, T-F2-003, T-F15-001
- **nivel_qa:** estricto
- **operador_hace:** Implementar job pg-boss `process_pila` que: descarga archivo, identifica formato (Asopagos/SOI/manual), parsea trabajadores reportados, cruza con tabla workers de la empresa, detecta novedades (alta, baja, cambio salario). Resultado va a cola de revisión humana.
- **entregable:** Job + tests con archivo de prueba.
- **criterio_qa:** Procesa formato Asopagos correctamente; detecta novedades; resultado en cola revisión con confidence > 0.7.
- **done:** Test con PILA real ofuscada.

### T-F2-005 — Recordatorio PILA por no respuesta
- **tiempo:** 45 min
- **depende_de:** T-F2-001
- **nivel_qa:** estándar
- **operador_hace:** Workflow n8n: cron diario verifica si companies que recibieron solicitud no han respondido en X días hábiles → enviar recordatorio. Escalar a regis_consultant después de 2 recordatorios.
- **entregable:** Workflow funcional.
- **criterio_qa:** Recordatorio se envía en día correcto; escalación funciona.
- **done:** Test simulado.

### T-F2-006 — Archivar PILA aprobada en Drive
- **tiempo:** 45 min
- **depende_de:** T-F2-004, T-F15-003
- **nivel_qa:** estándar
- **operador_hace:** Cuando PILA se aprueba en cola revisión, archivar archivo en `/regis/pila/archive/{empresa}/{año}/{mes}/`. Marcar estándar correspondiente como cumplido.
- **entregable:** Flujo de archivado funcional.
- **criterio_qa:** Archivo aparece en ubicación correcta de Drive; estándar marcado en evaluations; audit log registra.
- **done:** Test E2E.

### T-F2-007 — UI: vista PILA por empresa
- **tiempo:** 60 min
- **depende_de:** T-F2-006
- **nivel_qa:** estándar
- **operador_hace:** Página `/dashboard/pila` para client_admin: histórico de PILAs subidas, novedades detectadas en cada una, status de archivado. Filtros por mes/año.
- **entregable:** Página funcional.
- **criterio_qa:** Muestra datos reales; filtros funcionan; mobile responsive.
- **done:** Captura archivada.

### T-F2-008 — Migration: tablas de exámenes médicos
- **tiempo:** 45 min
- **depende_de:** T-F1-023
- **nivel_qa:** estándar
- **operador_hace:** Migration `012_medical_exams.sql`: tabla `medical_exams` con campos: worker_id, type enum (ingreso/periódico/egreso/post_incidente/reintegro), exam_date, ips_name, concept enum (apto/apto_con_restricciones/no_apto/aplazado), restrictions JSONB, recommendations JSONB, next_exam_date, file_url, extraction_confidence, retention_until. Bucket separado `medical_records` con RLS estricta.
- **entregable:** Migration aplicada.
- **criterio_qa:** Bucket separado en Supabase Storage; RLS de medical_records solo permite acceso a regis_admin + worker dueño.
- **done:** Test de aislación.

### T-F2-009 — Watcher de exámenes médicos (Drive + email)
- **tiempo:** 75 min
- **depende_de:** T-F2-008
- **nivel_qa:** estándar
- **operador_hace:** Workflow n8n similar a PILA pero apuntando a carpeta `/regis/medical/incoming/` y alias de email dedicado. Detecta PDFs y encola job de extracción.
- **entregable:** Workflow funcional.
- **criterio_qa:** Subida a carpeta dispara job; email a alias también.
- **done:** Test E2E.

### T-F2-010 — Pipeline de extracción IA de examen médico
- **tiempo:** 120 min
- **depende_de:** T-F2-008, T-F15-011
- **nivel_qa:** estricto
- **operador_hace:** Job pg-boss `extract_medical_exam`: descarga PDF, llama Claude con prompt versionado de `docs/prompts/base.md`, valida output con Zod schema, calcula confidence, si >0.85 inserta directo en medical_exams, si <0.85 envía a cola revisión humana.
- **entregable:** Job funcional con anti-alucinación 3 capas (schema + confidence + citations).
- **criterio_qa:** Procesa PDF de prueba correctamente; baja confidence va a cola; alta confidence persiste directo; citations registradas.
- **done:** Test con 3 PDFs distintos.

### T-F2-011 — Fallback OCR para PDFs escaneados
- **tiempo:** 75 min
- **depende_de:** T-F2-010
- **nivel_qa:** estándar
- **operador_hace:** Si PDF tiene poco texto extraíble (heurística: < 100 caracteres), correr OCR con Tesseract. Pasar texto OCR a Claude. Marcar metadata como `extracted_with_ocr: true`.
- **entregable:** Fallback funcional.
- **criterio_qa:** PDF escaneado de prueba se procesa con OCR; texto extraído coherente.
- **done:** Test con PDF escaneado.

### T-F2-012 — UI: registro y gestión de exámenes médicos
- **tiempo:** 90 min
- **depende_de:** T-F2-010
- **nivel_qa:** estándar
- **operador_hace:** Página `/dashboard/medical` (regis_consultant scope): lista de exámenes por empresa, filtros (tipo, fecha, status), drill-down a detalle. Ver concepto, restricciones, recomendaciones, próximo examen.
- **entregable:** Página funcional.
- **criterio_qa:** Muestra datos extraídos; navegación funciona; respeta scope de RLS.
- **done:** Captura.

### T-F2-013 — Recordatorio automático de exámenes próximos a vencer
- **tiempo:** 45 min
- **depende_de:** T-F2-008
- **nivel_qa:** estándar
- **operador_hace:** Cron diario en n8n: query medical_exams donde next_exam_date - 30 días = hoy → notificar a regis_consultant + client_admin. Email + WhatsApp si aprobó.
- **entregable:** Workflow funcional.
- **criterio_qa:** Notificación dispara en fecha correcta.
- **done:** Test simulado.

### T-F2-014 — Hito de validación Fase 2 (Phase Gate)
- **tiempo:** 60 min
- **depende_de:** T-F2-001 hasta T-F2-013
- **nivel_qa:** estricto
- **operador_hace:** Verificar checklist: (1) PILA solicitud → respuesta → archivado E2E con archivo real, (2) recordatorio dispara correctamente, (3) examen médico extraído y persistido con datos correctos, (4) cola revisión humana usable, (5) bucket medical aislado, (6) UI ambos módulos funcional.
- **entregable:** `phases/fase_2_gate.md` firmado.
- **criterio_qa:** 6 puntos verificados con evidencia (videos cortos preferiblemente).
- **done:** Gate aprobado.

---

# FASE 3 — Matrices de riesgo + Actas de comités

**Días:** 3 may pm + 4 may am | **Objetivo:** Diferenciador CIIU→peligros + tracker de compromisos.

---

### T-F3-001 — Migration: matrices de riesgo y peligros
- **tiempo:** 60 min
- **depende_de:** T-F1-023
- **nivel_qa:** estándar
- **operador_hace:** Migration `013_risk_matrices.sql`: tabla `risk_matrices` (centro_id, version, status enum, created_by, approved_by, valid_from, valid_until, content JSONB con estructura GTC-45). Tabla `ciiu_hazard_mapping` (ciiu_code, hazard_category, hazard_name, sources, possible_effects, suggested_controls).
- **entregable:** Migration aplicada.
- **criterio_qa:** Tablas existen; FKs correctas.
- **done:** Verificado.

### T-F3-002 — Seed del catálogo CIIU→peligros (de la sesión Regis)
- **tiempo:** 75 min
- **depende_de:** T-F3-001, T-F0-035
- **nivel_qa:** estricto
- **operador_hace:** Tomar `docs/ciiu_hazard_mapping.md` y convertir a SQL seed. Insertar en ciiu_hazard_mapping. Validar conteo: 5 CIIUs × 8 categorías × 4-6 peligros ≈ 160-240 filas.
- **entregable:** Seed aplicado.
- **criterio_qa:** Conteo cuadra con documento; query por CIIU retorna peligros correctos.
- **done:** Conteo verificado.

### T-F3-003 — UI: formulario de creación de matriz de riesgo
- **tiempo:** 90 min
- **depende_de:** T-F3-002
- **nivel_qa:** estándar
- **operador_hace:** Página `/dashboard/matrices/new` para regis_consultant: selector de centro de trabajo, multi-select de CIIUs aplicables, botón "Pre-llenar con catálogo". Pre-llenado trae los hazards del catálogo y los muestra en tabla editable (estructura GTC-45 simplificada: peligro, fuente, efectos, controles existentes, valoración prob×consec).
- **entregable:** Formulario funcional.
- **criterio_qa:** Pre-llenado trae datos del catálogo; tabla es editable; agregar/eliminar fila funciona.
- **done:** Captura.

### T-F3-004 — Enriquecimiento IA de matriz (Claude sugiere ajustes)
- **tiempo:** 75 min
- **depende_de:** T-F3-003
- **nivel_qa:** estándar
- **operador_hace:** Botón "Sugerencias IA" en formulario: envía descripción de la empresa + matriz actual a Claude con prompt versionado, recibe sugerencias de peligros adicionales o controles. Consultor decide si las acepta. Sugerencias van a cola de revisión humana implícitamente (visualmente marcadas).
- **entregable:** Funcionalidad de sugerencias.
- **criterio_qa:** Llamada IA exitosa; sugerencias visibles claramente diferenciadas; aceptar sugerencia las integra a la matriz.
- **done:** Test E2E.

### T-F3-005 — Workflow de aprobación de matriz
- **tiempo:** 60 min
- **depende_de:** T-F3-003
- **nivel_qa:** estricto
- **operador_hace:** Estados de matriz: borrador → revisión consultor → pendiente_aprobación_gerente → vigente → archivada. Acciones por rol: regis_consultant puede mover de borrador a revisión; client_admin (gerente) puede mover a vigente. Cada cambio en audit_log.
- **entregable:** State machine implementada.
- **criterio_qa:** Transiciones respetan permisos; rechazo retorna a borrador con comentario; audit registra.
- **done:** Test E2E con 2 usuarios.

### T-F3-006 — Versionamiento de matriz
- **tiempo:** 45 min
- **depende_de:** T-F3-005
- **nivel_qa:** estándar
- **operador_hace:** Cuando una matriz vigente se modifica, crear versión nueva (incrementar version, valid_until de anterior = now, valid_from de nueva = now). Histórico consultable.
- **entregable:** Versionamiento funcional.
- **criterio_qa:** Modificar matriz vigente crea nueva versión; ambas accesibles; histórico muestra changelog.
- **done:** Test manual.

### T-F3-007 — Export PDF de matriz
- **tiempo:** 75 min
- **depende_de:** T-F3-005
- **nivel_qa:** estándar
- **operador_hace:** Implementar export con `react-pdf` o `puppeteer`. Plantilla con header empresa, tabla GTC-45, footer con firmantes y fecha. Botón "Descargar PDF" en vista detalle.
- **entregable:** PDF generable.
- **criterio_qa:** PDF abre correctamente; estructura legible; datos correctos.
- **done:** PDF de prueba archivado.

### T-F3-008 — Vinculación matriz ↔ COPASST (orden del día automático)
- **tiempo:** 45 min
- **depende_de:** T-F3-005
- **nivel_qa:** estándar
- **operador_hace:** Cuando una matriz se mueve a "vigente", crear automáticamente un ítem en próximo orden del día del COPASST de ese centro: "Revisión y validación de matriz de riesgo v{X}".
- **entregable:** Vinculación funcional.
- **criterio_qa:** Aprobar matriz dispara creación de ítem COPASST visible.
- **done:** Test E2E.

### T-F3-009 — Migration: actas de comité y compromisos
- **tiempo:** 45 min
- **depende_de:** T-F1-023
- **nivel_qa:** estándar
- **operador_hace:** Migration `014_actas.sql`: tabla `meeting_actas` (committee_id, meeting_date, type ordinaria/extraordinaria, topics JSONB, attendees JSONB, content TEXT, status enum, signed_by). Tabla `compromisos` (acta_id, description, responsible_user_id, due_date, status enum, completed_at, evidence_id).
- **entregable:** Migration aplicada.
- **criterio_qa:** Tablas correctas con FKs.
- **done:** Verificado.

### T-F3-010 — UI: crear acta de comité
- **tiempo:** 90 min
- **depende_de:** T-F3-009
- **nivel_qa:** estándar
- **operador_hace:** Página `/dashboard/committees/:id/actas/new`: formulario con fecha, tipo, integrantes (pre-cargados desde committee_members con checkbox de asistencia), orden del día (lista editable con ítems heredados del COPASST si aplica), área de texto para puntos tratados.
- **entregable:** Formulario funcional.
- **criterio_qa:** Carga integrantes correctos; permite registrar asistencia; orden del día con ítems automáticos heredados.
- **done:** Test manual.

### T-F3-011 — Generación IA del acta completa
- **tiempo:** 90 min
- **depende_de:** T-F3-010
- **nivel_qa:** estricto
- **operador_hace:** Botón "Generar acta": envía a Claude (prompt versionado) los puntos tratados + integrantes asistentes + orden del día. Claude estructura acta formal completa con: introducción, desarrollo por punto, conclusiones, compromisos. Resultado editable en plataforma.
- **entregable:** Generación funcional.
- **criterio_qa:** Output cumple schema esperado; lenguaje formal y correcto; compromisos extraídos como entidad estructurada.
- **done:** Test con caso real.

### T-F3-012 — Tracker de compromisos como entidad
- **tiempo:** 60 min
- **depende_de:** T-F3-011
- **nivel_qa:** estándar
- **operador_hace:** Página `/dashboard/compromisos`: lista de compromisos abiertos, vencidos, completados. Filtros por responsable, fecha, status. Click → detalle + posibilidad de marcar completo + adjuntar evidencia.
- **entregable:** Página funcional.
- **criterio_qa:** Filtros funcionan; cambio de status persiste; evidencia se sube correctamente.
- **done:** Captura.

### T-F3-013 — Asistencia digital simple (link de confirmación)
- **tiempo:** 60 min
- **depende_de:** T-F3-010
- **nivel_qa:** estándar
- **operador_hace:** Cuando se programa reunión: enviar email/WhatsApp a cada integrante con link único (`/attendance/{token}`). Página simple muestra: "Confirmo asistencia a reunión COPASST del {fecha}" + botón confirmar. Registra timestamp + IP.
- **entregable:** Funcional.
- **criterio_qa:** Link único funciona; click registra; expira en 48h.
- **done:** Test con 2 integrantes.

### T-F3-014 — Cálculo automático de quórum
- **tiempo:** 30 min
- **depende_de:** T-F3-013
- **nivel_qa:** estándar
- **operador_hace:** Función que calcula si una reunión cumple quórum (regla: mayoría simple de integrantes principales O suplentes equivalentes). Si no hay quórum, marcar acta como no_válida.
- **entregable:** Función + indicador en UI.
- **criterio_qa:** Cálculo correcto en casos límite.
- **done:** Tests pasan.

### T-F3-015 — Export PDF/DOCX de acta
- **tiempo:** 60 min
- **depende_de:** T-F3-011
- **nivel_qa:** estándar
- **operador_hace:** Botón "Descargar acta": genera DOCX con plantilla legal estándar (header, integrantes, desarrollo, compromisos, firmantes, footer). Usar librería `docx` de Node.
- **entregable:** Export funcional.
- **criterio_qa:** DOCX abre correctamente en Word; formato legible; datos correctos.
- **done:** Archivo de prueba archivado.

### T-F3-016 — Hito de validación Fase 3 (Phase Gate)
- **tiempo:** 60 min
- **depende_de:** T-F3-001 hasta T-F3-015
- **nivel_qa:** estricto
- **operador_hace:** Verificar: (1) matriz creada con pre-llenado CIIU funcional, (2) IA enriquece con sugerencias, (3) workflow aprobación funciona, (4) PDF matriz exportable, (5) acta creada con generación IA, (6) compromisos extraídos y rastreables, (7) asistencia digital + quórum correcto, (8) DOCX acta exportable.
- **entregable:** `phases/fase_3_gate.md` firmado.
- **criterio_qa:** 8 puntos verificados con evidencia.
- **done:** Gate aprobado.

---

# FASE 4 — Plan emergencias (recortado) + checkpoint

**Días:** 4 may pm | **Objetivo:** Módulo 5 honesto + preparación checkpoint Regis.

---

### T-F4-001 — Migration: planes de emergencia y brigadas
- **tiempo:** 30 min
- **depende_de:** T-F1-23
- **nivel_qa:** estándar
- **operador_hace:** Migration `015_emergency.sql`: `emergency_plans` (centro_id, version, content JSONB, audio_url, transcription_text, status, valid_from, valid_until). `brigades` (centro_id, name, members JSONB, last_training, declared_only flag).
- **entregable:** Migration aplicada.
- **criterio_qa:** Tablas existen.
- **done:** Verificado.

### T-F4-002 — Endpoint de upload de audio + procesamiento Whisper
- **tiempo:** 75 min
- **depende_de:** T-F4-001, T-F15-001
- **nivel_qa:** estándar
- **operador_hace:** Endpoint que recibe audio (mp3/m4a) + centro_id. Sube a Supabase Storage. Encola job pg-boss `transcribe_audio` que llama Whisper API. Resultado se guarda en emergency_plans.transcription_text.
- **entregable:** Pipeline funcional.
- **criterio_qa:** Audio de 2 min se transcribe correctamente; texto en español colombiano legible.
- **done:** Test con audio real.

### T-F4-003 — Estructuración IA del plan a partir de transcripción
- **tiempo:** 90 min
- **depende_de:** T-F4-002
- **nivel_qa:** estricto
- **operador_hace:** Job pg-boss `structure_emergency_plan`: pasa transcripción a Claude con prompt versionado. Output schema: amenazas identificadas (lista), brigadistas mencionados (lista de nombres), recursos disponibles (lista), vulnerabilidades, estructura básica. Result va a cola revisión humana.
- **entregable:** Job funcional.
- **criterio_qa:** Output respeta schema Zod; amenazas claramente identificadas; brigadistas extraídos.
- **done:** Test con audio de 3 min.

### T-F4-004 — UI: editor de plan de emergencia
- **tiempo:** 75 min
- **depende_de:** T-F4-003
- **nivel_qa:** estándar
- **operador_hace:** Página `/dashboard/emergency-plans/:id`: muestra plan estructurado en secciones editables: amenazas, brigadas, recursos. Cada sección expandible. Botón guardar persiste cambios. Botón "exportar borrador" genera PDF simple.
- **entregable:** Editor funcional.
- **criterio_qa:** Edita sin perder datos; guardar persiste; PDF exportable.
- **done:** Captura.

### T-F4-005 — UI: FURAT mínimo (formulario)
- **tiempo:** 60 min
- **depende_de:** T-F1-023
- **nivel_qa:** estándar
- **operador_hace:** Migration `016_furat.sql` con tabla `furat_reports` (worker_id, accident_date, location, description, severity, reported_to_arl_at). Página `/dashboard/furat/new` con formulario de los campos legales mínimos. Persistencia + listado.
- **entregable:** Formulario y listado funcionales.
- **criterio_qa:** Campos legales mínimos cubiertos; persiste correctamente.
- **done:** Test manual.

### T-F4-006 — Indicadores SST básicos en dashboard
- **tiempo:** 60 min
- **depende_de:** T-F4-005, T-F1-021
- **nivel_qa:** estándar
- **operador_hace:** Calcular y mostrar en dashboard: frecuencia de accidentalidad (#accidentes / #horas_hombre × 200000), severidad (días perdidos / horas trabajadas), prevalencia (sintética). Usar datos de furat + datos manuales declarados de horas trabajadas.
- **entregable:** Sección de indicadores en dashboard.
- **criterio_qa:** Cálculos correctos; visible en vista cliente y Regis.
- **done:** Captura.

### T-F4-007 — Preparación de empresa demo para checkpoint
- **tiempo:** 60 min
- **depende_de:** T-F4-006
- **nivel_qa:** estricto
- **operador_hace:** Asegurar que la empresa sintética tenga datos verosímiles en los 4-5 módulos del checkpoint: dashboard con % calculado, 1 PILA procesada, 1 examen médico extraído, 1 matriz de riesgo aprobada, 1 acta COPASST generada con compromisos.
- **entregable:** Empresa demo lista.
- **criterio_qa:** Cada módulo muestra dato real navegable; nada parece dummy.
- **done:** Demo run interna exitosa.

### T-F4-008 — Demo run interna (ensayo de checkpoint)
- **tiempo:** 60 min
- **depende_de:** T-F4-007
- **nivel_qa:** estricto
- **operador_hace:** Los 3 roles ejecutan recorrido completo de la plataforma como si fuera la presentación a Regis. Identificar bugs, demoras, puntos confusos. Lista de quick fixes.
- **entregable:** Lista de issues + capturas.
- **criterio_qa:** Recorrido completado sin caídas críticas; lista de bugs priorizada.
- **done:** Lista archivada.

### T-F4-009 — Quick fixes derivados del demo run
- **tiempo:** 90 min
- **depende_de:** T-F4-008
- **nivel_qa:** estándar
- **operador_hace:** Resolver los issues críticos detectados en el demo run interno. Time-box estricto.
- **entregable:** Issues marcados como resueltos.
- **criterio_qa:** Issues críticos cerrados; demo run repetido sin esos issues.
- **done:** Demo run 2 exitoso.

### T-F4-010 — Documento de avances para Regis
- **tiempo:** 45 min
- **depende_de:** T-F4-009
- **nivel_qa:** estándar
- **operador_hace:** Redactar `checkpoint_2025-05-04.md` con: módulos funcionales, módulos parciales, módulos declarados, próximos hitos, pregunta a Regis. 1 página máx.
- **entregable:** Documento.
- **criterio_qa:** Conciso; honesto; con preguntas claras a Regis.
- **done:** Compartido con Regis.

### T-F4-011 — Hito de validación Fase 4 (Phase Gate + checkpoint Regis)
- **tiempo:** 60 min
- **depende_de:** T-F4-001 hasta T-F4-010
- **nivel_qa:** estricto
- **operador_hace:** Reunión con Regis para presentar avances. Recoger feedback. Documentar.
- **entregable:** `phases/fase_4_gate.md` con feedback Regis incorporado.
- **criterio_qa:** Reunión hecha; feedback documentado; ajustes para Fase 5 priorizados.
- **done:** Gate aprobado por PM con notas.

---

# FASE 5 — Cliente real + hardening + discrepancy report

**Días:** 5-6 may | **Objetivo:** 1 cliente real con datos reales mostrando % calculado validable.

---

### T-F5-001 — Onboarding empresa real (NIT + datos básicos)
- **tiempo:** 60 min
- **depende_de:** T-F4-011, T-F0-022
- **nivel_qa:** estricto
- **operador_hace:** Crear empresa piloto en plataforma con datos reales: NIT validado, razón social, CIIU(s), centros de trabajo, # trabajadores, ARL. Asignar regis_consultant.
- **entregable:** Empresa real en sistema.
- **criterio_qa:** Datos correctos validados con Regis; capítulo aplicable correcto (7/21/60).
- **done:** Confirmación de Regis.

### T-F5-002 — Carga inicial de trabajadores reales
- **tiempo:** 75 min
- **depende_de:** T-F5-001
- **nivel_qa:** estándar
- **operador_hace:** Importar listado de trabajadores de la empresa piloto. Si <50, manual. Si más, importador Excel ad-hoc (sin polish).
- **entregable:** Trabajadores cargados.
- **criterio_qa:** Cédulas válidas; datos personales completos; conteo cuadra con # declarado.
- **done:** Verificado por Regis.

### T-F5-003 — Carga inicial de comités reales
- **tiempo:** 45 min
- **depende_de:** T-F5-002
- **nivel_qa:** estándar
- **operador_hace:** Crear COPASST y Comité de Convivencia de empresa piloto con sus integrantes reales (datos provistos por Regis). Definir fechas de elección.
- **entregable:** Comités cargados.
- **criterio_qa:** Composición paritaria correcta; integrantes coinciden con realidad.
- **done:** Validación Regis.

### T-F5-004 — Carga de documentos históricos (último año)
- **tiempo:** 90 min
- **depende_de:** T-F5-003
- **nivel_qa:** estándar
- **operador_hace:** Subir documentos del último año de empresa piloto a sus carpetas/buckets correspondientes. Procesar PILAs (al menos 3 meses), exámenes médicos disponibles, matriz vigente, actas recientes. Solo el subset suficiente para que el % sea representativo.
- **entregable:** Datos cargados.
- **criterio_qa:** Mínimo 3 PILAs, 5 exámenes, 1 matriz, 3 actas reales en sistema.
- **done:** Conteos verificados.

### T-F5-005 — Marcado de evaluaciones de estándares vigentes
- **tiempo:** 60 min
- **depende_de:** T-F5-004
- **nivel_qa:** estricto
- **operador_hace:** Junto con consultor Regis: revisar estándar por estándar y marcar status real (cumple/no cumple/no aplica) basado en evidencias reales de la empresa.
- **entregable:** Evaluaciones marcadas.
- **criterio_qa:** Todos los estándares aplicables tienen status definido (no "pendiente"); evidencias linkeadas.
- **done:** Acta de sesión Regis.

### T-F5-006 — Generar snapshot inicial empresa real
- **tiempo:** 30 min
- **depende_de:** T-F5-005
- **nivel_qa:** estricto
- **operador_hace:** Disparar generación de snapshot inmediato. Verificar que % global está calculado.
- **entregable:** Snapshot creado.
- **criterio_qa:** Snapshot inmutable existe; % > 0; by_cycle y by_standard poblados.
- **done:** Verificado en DB.

### T-F5-007 — Discrepancy report (% sistema vs % conocido por Regis)
- **tiempo:** 90 min
- **depende_de:** T-F5-006
- **nivel_qa:** estricto
- **operador_hace:** Página dedicada que muestra split-screen: izquierda nuestro cálculo desde datos reales, derecha número que Regis ya conocía manualmente. Marcar diferencias con explicación posible.
- **entregable:** Reporte de discrepancia.
- **criterio_qa:** Diferencia ≤ 5% O explicación clara de por qué difiere; reporte exportable.
- **done:** Validación Regis.

### T-F5-008 — Dashboard de salud del sistema
- **tiempo:** 60 min
- **depende_de:** T-F2-014
- **nivel_qa:** estándar
- **operador_hace:** Página `/regis/system-health`: muestra uptime básico (último error en Sentry), jobs procesados últimas 24h, errores, queue size, AI usage cost del mes.
- **entregable:** Dashboard visible.
- **criterio_qa:** Datos reales; queries no rompen si no hay datos.
- **done:** Captura.

### T-F5-009 — Verificación mobile responsive en dispositivo real
- **tiempo:** 60 min
- **depende_de:** T-F5-007
- **nivel_qa:** estricto
- **operador_hace:** Probar en iPhone real + Android real: login, dashboard cliente, formulario asistencia, formulario acta, ver compromisos. Capturar lo que se rompa.
- **entregable:** Lista de issues mobile + fixes aplicados.
- **criterio_qa:** Flujos críticos funcionan en mobile sin bugs visuales graves.
- **done:** Capturas mobile archivadas.

### T-F5-010 — Modo offline lectura básica
- **tiempo:** 60 min
- **depende_de:** T-F5-009
- **nivel_qa:** estándar
- **operador_hace:** Service worker simple que cachea última versión del dashboard cliente para lectura offline. No edición offline (declarado en Bucket B).
- **entregable:** Funcional.
- **criterio_qa:** Cargar dashboard online → desconectar internet → recargar → dashboard sigue visible.
- **done:** Test manual.

### T-F5-011 — Auditoría de seguridad básica (RLS + secrets)
- **tiempo:** 90 min
- **depende_de:** T-F5-010
- **nivel_qa:** estricto
- **operador_hace:** Revisar: (1) RLS en TODAS las tablas multi-tenant, (2) ningún .env en repo, (3) keys rotables disponibles, (4) RBAC enforced en cada endpoint, (5) audit log capturando todas las operaciones críticas.
- **entregable:** Reporte de auditoría.
- **criterio_qa:** 5 puntos verificados; issues críticos cerrados.
- **done:** Reporte archivado.

### T-F5-012 — UI polish (loading states, empty states, error messages)
- **tiempo:** 90 min
- **depende_de:** T-F5-009
- **nivel_qa:** estándar
- **operador_hace:** Pasar por las 5 pantallas más visitadas. Asegurar: skeleton loaders en cargas, empty states con CTA, mensajes de error humanos (no "error 500").
- **entregable:** Polish aplicado.
- **criterio_qa:** Cargas se sienten suaves; errores son comprensibles.
- **done:** Captura.

### T-F5-013 — Hito de validación Fase 5 (Phase Gate)
- **tiempo:** 60 min
- **depende_de:** T-F5-001 hasta T-F5-012
- **nivel_qa:** estricto
- **operador_hace:** Verificar: (1) empresa real cargada con datos completos, (2) % calculado y validado por Regis, (3) discrepancy report ≤5% o explicado, (4) mobile responsive verificado en device real, (5) RLS auditada, (6) UI pulido, (7) sistema estable últimas 24h sin crashes.
- **entregable:** `phases/fase_5_gate.md` firmado.
- **criterio_qa:** 7 puntos verificados con evidencia.
- **done:** Gate aprobado por PM.

---

# FASE 6 — Video + SOP + submission

**Días:** 7-9 may | **Objetivo:** Contar la historia.

---

### T-F6-001 — Guion segundo a segundo del video
- **tiempo:** 180 min
- **depende_de:** T-F5-013
- **nivel_qa:** estricto
- **operador_hace:** Redactar guion detallado con timestamps cada 10s: hook (0-30), problema (30-90), solución módulo por módulo (90-390), prueba con cliente real (390-480), roadmap (480-540), cierre (540-570). Cada bloque con: lo que se ve en pantalla, voz en off, transición.
- **entregable:** `video/guion_v1.md`.
- **criterio_qa:** Total ≤ 9:30 minutos; cada bloque tiene visual + audio especificados; cubre los 8 criterios del concurso.
- **done:** Revisión final.

### T-F6-002 — Captura de pantalla por módulo (sin edición)
- **tiempo:** 180 min
- **depende_de:** T-F6-001
- **nivel_qa:** estándar
- **operador_hace:** Grabar 6 segmentos separados, uno por módulo, mostrando flujo principal con datos reales de empresa piloto. Loom o OBS. Sin voz aún.
- **entregable:** 6 archivos de video crudo.
- **criterio_qa:** Cada video < 90s; resolución 1080p; sin bugs visibles.
- **done:** Archivos archivados.

### T-F6-003 — Grabación voice-over completo
- **tiempo:** 120 min
- **depende_de:** T-F6-001
- **nivel_qa:** estricto
- **operador_hace:** Grabar audio del guion completo en sala silenciosa con micrófono de solapa. Tono cálido pero profesional. Pacing claro.
- **entregable:** Audio MP3 del guion.
- **criterio_qa:** Audio limpio sin ecos; pacing correcto; total ≤ 9:30.
- **done:** Audio archivado.

### T-F6-004 — Edición y montaje del video
- **tiempo:** 240 min
- **depende_de:** T-F6-002, T-F6-003
- **nivel_qa:** estricto
- **operador_hace:** Editar en CapCut/Premiere/DaVinci: ensamblar segmentos, sincronizar con voice-over, agregar transiciones suaves, lower-thirds con números clave (ej: "100 empresas", "4 horas/mes ahorradas"), música de fondo discreta, subtítulos en español.
- **entregable:** Video v1 ≤ 10 min.
- **criterio_qa:** Audio + video sincronizados; subtítulos legibles; calidad 1080p; ≤ 10 min.
- **done:** Render exitoso.

### T-F6-005 — Revisión interna del video v1
- **tiempo:** 60 min
- **depende_de:** T-F6-004
- **nivel_qa:** estricto
- **operador_hace:** Los 3 roles + 1 persona externa al proyecto ven el video. Anotar issues. Lista de cambios.
- **entregable:** Lista de cambios v2.
- **criterio_qa:** Persona externa entiende qué hace el producto en 30s; lista de cambios priorizada.
- **done:** Lista archivada.

### T-F6-006 — Re-grabación de segmentos débiles + edición v2
- **tiempo:** 180 min
- **depende_de:** T-F6-005
- **nivel_qa:** estricto
- **operador_hace:** Re-grabar segmentos identificados, re-editar. Render v2.
- **entregable:** Video v2 final.
- **criterio_qa:** Issues de v1 resueltos; calidad mantenida; ≤ 10 min estricto.
- **done:** Render v2.

### T-F6-007 — Grabación de respaldo en segundo dispositivo
- **tiempo:** 30 min
- **depende_de:** T-F6-006
- **nivel_qa:** estándar
- **operador_hace:** Copia del archivo final en: (1) cloud Drive, (2) disco externo, (3) email a sí mismo. Verificar que abren.
- **entregable:** 3 copias accesibles.
- **criterio_qa:** Cada copia abre y reproduce correctamente.
- **done:** Verificado.

### T-F6-008 — SOP escrito (4-5 páginas)
- **tiempo:** 180 min
- **depende_de:** T-F5-013
- **nivel_qa:** estándar
- **operador_hace:** Documento `SOP.md` con secciones: arquitectura overview (1 diagrama), ADRs clave (resumen), módulos y cómo usarlos, decisiones de scope (Bucket B/C/D), métricas de éxito, equipo y contactos, roadmap declarado.
- **entregable:** SOP final.
- **criterio_qa:** 4-5 páginas A4; lenguaje claro; sirve a Regis para operar.
- **done:** Revisado por PM.

### T-F6-009 — Documento "Out of Scope" público
- **tiempo:** 60 min
- **depende_de:** T-F6-008
- **nivel_qa:** estándar
- **operador_hace:** Documento honesto listando todo lo que no se hizo en concurso pero está declarado: Habeas Data avanzado, comercial/legal, integraciones específicas, módulos SG-SST adicionales, escalabilidad, importación masiva. Cada uno con razón.
- **entregable:** `OUT_OF_SCOPE.md`.
- **criterio_qa:** Sincero; estructurado por categorías; acompaña al SOP.
- **done:** Commit.

### T-F6-010 — Revisión final completa antes de submission
- **tiempo:** 60 min
- **depende_de:** T-F6-007, T-F6-008, T-F6-009
- **nivel_qa:** estricto
- **operador_hace:** Checklist final: video v2 listo, SOP listo, OUT_OF_SCOPE listo, repos accesibles, demo URL funcional, todos los 8 criterios del concurso cubiertos en video.
- **entregable:** Checklist firmado.
- **criterio_qa:** 8 criterios del concurso visibles en video con timestamp; entregables completos.
- **done:** Firma PM.

### T-F6-011 — Submission del concurso
- **tiempo:** 30 min
- **depende_de:** T-F6-010
- **nivel_qa:** estricto
- **operador_hace:** Subir video al canal indicado por concurso. Enviar SOP, OUT_OF_SCOPE, link al demo. Esperar confirmación.
- **entregable:** Submission confirmada.
- **criterio_qa:** Confirmación recibida con timestamp; todos los entregables aceptados por la plataforma del concurso.
- **done:** Captura de confirmación archivada.

### T-F6-012 — Hito de validación Fase 6 (Phase Gate final)
- **tiempo:** 30 min
- **depende_de:** T-F6-011
- **nivel_qa:** estricto
- **operador_hace:** Reunión final 3 roles. Documentar lecciones, métricas finales, próximos pasos si Regis contrata.
- **entregable:** `phases/fase_6_gate.md` + `lecciones_aprendidas.md`.
- **criterio_qa:** Submission exitosa documentada; lecciones capturadas.
- **done:** PROYECTO ENTREGADO.

---

# RESUMEN EJECUTIVO DE LA LISTA

| Fase | Tareas | Tiempo total estimado | Fechas |
|---|---|---|---|
| F0 | 36 | ~22h | 29 abr |
| F1 | 23 | ~24h | 30 abr – 1 may am |
| F1.5 | 13 | ~9h | 1 may pm |
| F2 | 14 | ~14h | 2 may – 3 may am |
| F3 | 16 | ~16h | 3 may pm – 4 may am |
| F4 | 11 | ~12h | 4 may pm |
| F5 | 13 | ~14h | 5-6 may |
| F6 | 12 | ~21h | 7-9 may |
| **TOTAL** | **138** | **~132h** | **11 días** |

Con 2 personas FT (16h/día efectivas combinadas × 11 días = 176h disponibles), hay buffer del ~25% para imprevistos.

---

## REGLA DE ORO PARA EL OPERADOR

> **No empieces la siguiente tarea hasta que la actual esté en estado `aprobada`.** Si una dependencia no está cumplida, la tarea no se ejecuta. Si tienes dudas, levanta `flag_concern`. Si crees que el orden está mal, elévalo al PM.

> **El sistema funciona mientras los 3 roles respeten las reglas. La disciplina del proceso ES el proyecto.**
