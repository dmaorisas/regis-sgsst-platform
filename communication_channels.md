# Canales de Comunicación del Proyecto

**Tarea:** T-F0-002
**Fecha decisión:** 2026-04-29
**Decidido por:** Supervisor humano (David Maori) según consulta del PM

---

## Decisión: Email + GitHub (Opción A — sin Slack/Discord)

No se crea workspace adicional. Toda comunicación corre por canales que ya existen.

---

## Canales operativos

### 1. GitHub Issues (canal principal entre agentes)

**Quién lo usa:** Operador-Agent ↔ QA-Agent ↔ PM-Agent ↔ Auditor-Agent

**Para qué:**
- Asignación y ejecución de tareas
- Reportes de ejecución (Operador → QA)
- Veredictos QA (QA → Operador y log)
- Decisiones PM (en `governance/03_log_decisiones.md` + comentarios)
- Flag concerns
- Status snapshots cada 6h

**URL:** https://github.com/dmaorisas/regis-sgsst-platform/issues

### 2. Email vía Resend (canal supervisor humano)

**Quién lo usa:** PM-Agent → Supervisor humano (David)

**Para qué:**
- Snapshots de estado cada 6 horas (00:00, 06:00, 12:00, 18:00 hora Colombia)
- Alertas inmediatas en escalación crítica
- Notificaciones de phase gate Go/No-Go
- Email del Auditor-Agent en violaciones de regla detectadas
- Confirmaciones de cambios mayores al plan

**Configuración:**
- Provider: Resend
- From: `onboarding@resend.dev` (mientras no se verifique dominio dmaori.com)
- To: `maori.david@dmaori.com`

### 3. GitHub notifications (fallback / redundancia)

**Quién lo usa:** Cualquier evento de Issue/PR notifica al supervisor (es owner del repo).

**Para qué:**
- Backup en caso de fallo de Resend
- Notificación pasiva de actividad del proyecto

---

## Lo que NO se usa (decisión explícita)

- ❌ Slack — overhead de configuración no justificado para equipo de 4 agentes + 1 supervisor
- ❌ Discord — mismo razonamiento
- ❌ WhatsApp interno — Wati está reservado para comunicación con clientes Pyme (módulos PILA, exámenes, recordatorios), no para coordinación interna
- ❌ Telegram, Teams, otros — no agregan valor proporcional al setup

---

## Cadencia de comunicación

| Evento | Canal | Frecuencia | SLA respuesta supervisor |
|---|---|---|---|
| Snapshot rutinario | Email | Cada 6h | No requiere respuesta |
| Phase Gate Go | Email | Cierre de fase | 12h |
| Phase Gate No-Go o GO_CON_AJUSTES | Email + GitHub Issue | Cierre de fase | 6h |
| Escalación crítica | Email | Inmediato | 12h |
| Violación de regla (Auditor) | Email + sistema en pausa | Inmediato | 4h |
| Decisiones PM rutinarias | GitHub comments | Continuo | No requiere respuesta |

---

## Política de respuesta del supervisor

- Acknowledged en cualquier respuesta breve confirma recibo
- Sin respuesta > SLA → PM-Agent escala vía 2do email + comment en `#status-dashboard` Issue
- Sin respuesta > 24h en crítico → PM pausa el sistema y espera

---

## Equivalencia entre los 3 canales por urgencia

```
URGENCIA            CANAL PRIMARIO       CANAL SECUNDARIO
═══════════════════════════════════════════════════════
Crítico (Auditor)   Email Resend         GitHub @mention
Alto (Phase Gate)   Email Resend         Status Issue
Medio (Decisiones)  GitHub comment       Email digest
Bajo (Snapshots)    GitHub Issue + Email -
```

---

## Firma

- **Decidido por:** David Maori (supervisor humano)
- **Fecha:** 2026-04-29
- **Documentado por:** PM-Agent en sesión de orquestación conversacional
- **Tarea:** T-F0-002 (Bucket A, nivel QA: ligero)
