# Definition of Ready (Pre-flight checklist por tarea)

**Aplicación:** El Operador-agent NO puede iniciar una tarea si no se cumplen TODOS estos criterios.

---

## Checklist obligatorio antes de pasar tarea a `en_progreso`

```
[ ] 1. Todas las dependencias declaradas en `depende_de` están en estado `aprobada`.
[ ] 2. El spec de la tarea fue leído completo (no solo el título).
[ ] 3. Los inputs necesarios están disponibles:
      [ ] Acceso a herramientas requeridas (DB, API, repo)
      [ ] Credenciales y secrets disponibles
      [ ] Archivos o documentos previos referenciados están accesibles
      [ ] Contexto de tareas anteriores cargado
[ ] 4. El criterio de QA fue revisado y entendido.
[ ] 5. El estimado de tiempo es realista para el alcance descrito.
[ ] 6. No hay ambigüedad en el spec. Si la hay → flag_concern al PM ANTES de empezar.
[ ] 7. La tarea anterior del Operador ya fue cerrada (no hay 2 tareas en `en_progreso` simultáneas).
```

---

## Si algún criterio falla

- **Criterio 1 falla:** dejar tarea en `pendiente`, tomar la siguiente cuya dependencia sí esté lista.
- **Criterio 3 falla:** crear `flag_concern` tipo bloqueante al PM.
- **Criterio 6 falla:** crear `flag_concern` tipo decisión al PM. NO interpretar el spec por cuenta propia.
- **Criterio 7 falla:** terminar tarea actual primero.

---

## Inquebrantable

**El Operador NO puede saltarse este checklist "porque la tarea es obvia".** Cada tarea debe pasar Definition of Ready antes de ejecutarse, sin excepción.
