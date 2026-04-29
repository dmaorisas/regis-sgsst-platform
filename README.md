# Concurso Regis Colombia — SG-SST

**Proyecto:** Plataforma de automatización SG-SST para Regis Colombia
**Premio:** $2,200 USD
**Vigencia:** 29 abril – 9 mayo 2026
**Estado:** En Fase 0

---

## Estructura del proyecto

```
.
├── README.md                          ← este archivo
├── governance/                        ← gobernanza y reglas operativas
│   ├── 01_roles_y_reglas.md          ← roles, comunicación, reglas inquebrantables
│   ├── 03_log_decisiones.md          ← decisiones del PM (append-only)
│   └── 04_log_qa.md                  ← validaciones del QA por tarea
├── tasks/
│   └── 02_lista_maestra_tareas.md    ← 138 tareas atómicas secuenciales
├── docs/                              ← (a crear durante ejecución)
│   ├── adr/                          ← Architecture Decision Records
│   ├── erd/                          ← modelo de datos
│   ├── prompts/                      ← prompts versionados
│   └── glossary.md                   ← glosario SG-SST
├── legal/                             ← (a crear)
│   ├── aviso_privacidad.md
│   └── autorizacion_tratamiento.md
├── meetings/                          ← actas de reuniones con Regis
├── phases/                            ← gates de fase firmados
├── evidence/                          ← capturas, logs, evidencia de tareas
└── (proyecto Next.js cuando inicie F1)
```

---

## Cómo usar este sistema

### Para el Operador
1. Abrir `tasks/02_lista_maestra_tareas.md`.
2. Buscar la siguiente tarea pendiente cuyas dependencias estén `aprobada`.
3. Ejecutar exactamente como está descrita.
4. Documentar en formato del template (sección 7.1 de `governance/01_roles_y_reglas.md`).
5. Entregar a QA.
6. Esperar veredicto. Corregir si rechaza. Avanzar si aprueba.

### Para el QA
1. Recibir entrega del Operador.
2. Verificar criterio por criterio según el `criterio_qa` de la tarea.
3. Emitir veredicto en formato del template (sección 7.2).
4. Registrar en `governance/04_log_qa.md`.
5. Si segundo rechazo o disagreement → escalar al PM.

### Para el PM
1. Daily standup 09:00, mid-day 14:00, closing 18:00.
2. Phase gate review al cierre de cada fase.
3. Revisar `governance/04_log_qa.md` para detectar patrones.
4. Resolver escalaciones inmediatamente.
5. Registrar decisiones en `governance/03_log_decisiones.md`.
6. Defender el principio rector activamente.

---

## Principio rector

> **"Un cliente real con datos reales mostrando un % calculado el 6 de mayo vale más que 6 módulos sintéticos perfectos."**

Cuando exista duda, este principio gana sobre cualquier regla.

---

## Hitos clave

| Fecha | Hito |
|---|---|
| 29 abr | Cierre Fase 0 (cimientos + camino crítico) |
| 30 abr – 1 may | Cierre Fase 1 + 1.5 (motor + plumbing) |
| 2-3 may | Cierre Fase 2 (PILA + Exámenes) |
| 3-4 may | Cierre Fase 3 (Matrices + Actas) |
| **4 may** | **Checkpoint con Regis** |
| 5-6 may | Cierre Fase 5 (cliente real + hardening) |
| 7-9 may | Cierre Fase 6 (video + submission) |
| **9 may** | **ENTREGA FINAL** |

---

## Contactos

_(Llenar durante T-F0-001 y T-F0-003)_

- **Regis Colombia:** [Pendiente — T-F0-003]
- **Equipo del proyecto:** [Pendiente — T-F0-001]

---

## Comando de arranque

Lee primero (en este orden):
1. `governance/01_roles_y_reglas.md` — entender el sistema
2. `tasks/02_lista_maestra_tareas.md` — ver lista completa
3. Comenzar con `T-F0-001` y avanzar secuencialmente

**Próxima tarea:** `T-F0-001 — Confirmar disponibilidad de equipo`
