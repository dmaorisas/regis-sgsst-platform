# ADR-010 — Resend como provider de email transaccional

**Estado:** Aceptado | **Fecha:** 2026-04-29

## Decisión

Usar **Resend** como provider de emails transaccionales: PM snapshots cada 6h, alertas del Cost Circuit Breaker y del Loop Detector, hallazgos críticos del Auditor-Agent, recordatorios de compromisos COPASST, y fallback de notificaciones PILA cuando WhatsApp/Wati no esté disponible.

## Alternativas

- **A: SendGrid** — pros: maduro, free tier de 100 emails/día. Contras: DX más anticuada; UI menos amigable; setup de DKIM más friccionado.
- **B: AWS SES** — pros: barato a escala. Contras: requiere cuenta AWS y verificación manual; sandbox inicial limita destinatarios; setup engorroso para un sprint.
- **C: Mailgun** — pros: API decente. Contras: free tier inexistente desde 2023; precio por email mayor que Resend.
- **D: Resend** — escogida.

## Razón

Resend tiene free tier suficiente para concurso (3.000 emails/mes), DX excelente (SDK TypeScript-first encaja con stack Next.js de ADR-001), dominio `dmaori.com` ya verificable post-concurso, y soporte para React Email para templates ricos. Suficiente para el volumen del demo y de la operación inicial. Migración a SES o SendGrid en el futuro es trivial (interfaz de email se abstrae detrás del módulo `notifications`).

## Consecuencias

- **Positivas:** integración rápida en F1 (sin configuración compleja); cero costo en concurso; templates con React Email permiten branding consistente; tabla `notifications` ya modelada cubre el log.
- **Mitigaciones:** si el free tier se agota, upgrade Resend cuesta ~$20/mes o se migra a SES con cambio mínimo en el adaptador `notifications.channel`. WhatsApp (Wati) sigue siendo el canal primario para notificaciones a trabajadores; email es para administradores y agentes humanos del sistema.

## Referencias

- `docs/erd/v0.md` (`notifications`, canal email)
- ADR-001 (stack Next.js)
- `security/01_cost_circuit_breaker.md` (alertas por email)
- `security/02_loop_detector.md` (alertas por email)
