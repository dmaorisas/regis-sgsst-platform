# Pre-Flight Checklist (Antes de T-F0-001)

**Tiempo total:** ~2 horas | **Ejecuta:** Supervisor humano

---

## Bloque A: Cuentas y servicios (45 min)

```
[ ] A1. Verificar Node 20 LTS instalado:
        $ node --version  # debe ser v20.x
        Si no: instalar nvm + node 20

[ ] A2. Instalar VS Code + extensiones:
        - TypeScript and JavaScript
        - Tailwind CSS IntelliSense
        - ESLint
        - Prettier
        - GitLens
        - Supabase

[ ] A3. Crear cuenta Supabase free tier
        - https://supabase.com → New Project
        - Region: us-east-1 (Virginia, más cercano a Colombia)
        - Guardar URL + anon key + service role key

[ ] A4. Crear cuenta Groq (free, primary LLM)
        - https://console.groq.com
        - Generar API key
        - Verificar acceso a llama-3.3-70b-versatile

[ ] A5. Crear cuenta Anthropic (free credit $5)
        - https://console.anthropic.com
        - Generar API key
        - Verificar acceso a claude-sonnet-4-6

[ ] A6. Crear cuenta Google AI Studio (Gemini free)
        - https://aistudio.google.com
        - Generar API key

[ ] A7. Crear cuenta Resend (email free tier)
        - https://resend.com
        - Verificar dominio o usar dominio Resend de pruebas
        - Generar API key

[ ] A8. Crear cuenta Wati (free trial)
        - https://wati.io
        - Conectar número WhatsApp Business
        - Generar API key

[ ] A9. Verificar n8n self-hosted operativo
        - Login funcional
        - URL HTTPS válida
        - Crear workflow "hello world" de prueba

[ ] A10. Configurar dotenv-vault o .env.local con todas las keys
        - Plantilla en `.env.example` (sin valores)
        - .env.local en .gitignore (verificar)
```

---

## Bloque B: Repositorio y estructura (20 min)

```
[ ] B1. Verificar repo GitHub creado y accesible
        - Branch protection en main
        - Templates de Issue creados (4 tipos)

[ ] B2. Crear GitHub Project (board)
        - Columnas: Pendiente | En progreso | Entregada QA | Aprobada | Escalada PM | Cancelada
        - Labels: phase:F0..F6, priority:critical, nivel_qa:strict|standard|light, bucket:A
        - Configurar automatizaciones simples (mover a "En progreso" cuando se asigna)

[ ] B3. Crear Issues iniciales para Fase 0 (las primeras 10)
        - Copiar de tasks/02_lista_maestra_tareas.md
        - Asignar labels correctos
        - Marcar las críticas con 🔥
```

---

## Bloque C: Templates en blanco (15 min)

```
[ ] C1. Crear directorio `templates/` con archivos:
        - reporte_ejecucion_template.md
        - veredicto_qa_template.md
        - flag_concern_template.md
        - decision_pm_template.md

[ ] C2. Crear directorio `reports/`, `phases/`, `meetings/`, `evidence/` (vacíos)

[ ] C3. Verificar que README.md está actualizado con la nueva estructura
```

---

## Bloque D: System prompts de los agentes (45 min)

Crear los archivos en `prompts/`:

```
[ ] D1. operador_agent_system.md
        - Misión + 7 reglas inquebrantables del Operador
        - Política de citation
        - Formato de output esperado (JSON schema)
        - Política ante ambigüedad (flag_concern, no inventar)

[ ] D2. qa_agent_system.md
        - Misión + reglas QA
        - Niveles de rigor
        - Formato de veredicto
        - Política anti-loop (escalar al PM en 2da iteración)

[ ] D3. pm_agent_system.md
        - Misión + autoridad exclusiva
        - Política de modificación de plan
        - Formato de decisión
        - Phase gate go/no-go

[ ] D4. auditor_agent_system.md
        - Misión + 5 reglas inquebrantables
        - Estrategias de optimización
        - Formato de findings
        - Política de escalación al humano
```

---

## Bloque E: Mecanismos de seguridad (20 min)

```
[ ] E1. Cost circuit breaker
        - Variable hard cap diario en config: $30 USD
        - Endpoint que verifica suma del día antes de cada llamada
        - Si excede: pausa total + email a supervisor

[ ] E2. Loop detector
        - Trigger automático: 3+ rechazos misma tarea → pausa
        - Trigger automático: 2× tiempo estimado → pausa
        - Pausa = no nuevas invocaciones, espera input humano

[ ] E3. Backup automático
        - Script diario que: dump Supabase → zip repo → sube a Drive personal
        - Cron en n8n cada 24h

[ ] E4. Configurar email de supervisor
        - SUPERVISOR_EMAIL en env vars
        - Test de envío vía Resend
```

---

## Bloque F: Validación final (10 min)

```
[ ] F1. Test de invocación de cada LLM provider:
        - Groq: prueba simple
        - Anthropic: prueba simple
        - Gemini: prueba simple
        - Whisper Groq: prueba con audio corto

[ ] F2. Test de fallback automático:
        - Forzar error en provider primario
        - Verificar que cae al fallback

[ ] F3. Test de circuit breaker de costo:
        - Simular sobrepaso de cap
        - Verificar pausa + email

[ ] F4. Test de circuit breaker de loops:
        - Simular 3 rechazos
        - Verificar pausa + email

[ ] F5. Verificar que GitHub Issues + Projects está funcional
        - Crear issue de prueba T-F0-001
        - Asignar label
        - Mover entre columnas

[ ] F6. Probar 1 ciclo completo end-to-end:
        - PM-agent define T-F0-001
        - Operador-agent ejecuta
        - QA-agent valida
        - Tarea cierra con todos los estados correctos
```

---

## Cuando todo lo anterior esté ✓

**Iniciar formalmente con T-F0-001.**

Antes de eso: NO se ejecuta ninguna tarea del plan.

---

## Resumen de la pre-flight

- Costo total esperado durante 11 días: **$5-15 USD** (vs $200 originales)
- Setup pre-flight: **2 horas one-time**
- Riesgos cubiertos: cost overrun, agent loops, API outage, data loss, rule violation
- Visibilidad para supervisor: **dashboard 24/7 + email cada 6h + alertas inmediatas en críticos**

---

**Cuando termines este checklist, comenta en este archivo "PRE-FLIGHT COMPLETO" + fecha. Solo entonces se asigna T-F0-001 al Operador-agent.**
