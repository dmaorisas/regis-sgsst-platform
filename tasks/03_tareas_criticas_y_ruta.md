# Tareas Críticas y Ruta Crítica

**Propósito:** Identificar las 7 tareas que son `make-or-break` para el concurso y la cadena de dependencias que define el cronograma mínimo.

---

## 🔥 Las 7 tareas críticas

Si alguna de estas falla, el proyecto fracasa. **Todas tienen `nivel_qa: estricto` obligatorio y atención prioritaria del PM.**

| ID | Tarea | Por qué es crítica |
|---|---|---|
| 🔥 T-F0-020 | Llamada con Regis | Sin esto no hay datos reales, sin datos reales no hay producto |
| 🔥 T-F0-022 | Empresa real comprometida + 2 backups | El principio rector requiere cliente real al 6 may |
| 🔥 T-F1-005 | Pesos Resolución 0312 seedeados correctamente | El motor entero depende de esto, error aquí = todo el % es falso |
| 🔥 T-F1-011 | RLS multi-tenant activado en todas las tablas | Sin esto, fuga de datos entre empresas = descalificación legal |
| 🔥 T-F1-016 | Lógica "No Aplica" con redistribución de pesos | Empresas Capítulo I y II calculan mal sin esto (la mayoría de Pymes) |
| 🔥 T-F5-007 | Discrepancy report empresa real | Es el "wow moment" del video, principal evidencia de funcionamiento |
| 🔥 T-F6-004 | Edición y montaje del video final | Sin video no hay submission, sin submission no hay premio |

---

## Ruta crítica del proyecto

La cadena más larga de dependencias forward-only. Atrasar cualquiera de estas atrasa el proyecto entero:

```
T-F0-003 (contacto Regis)
    ↓
T-F0-004 (agendar llamada)
    ↓
T-F0-020 🔥 (llamada Regis)
    ↓
T-F0-021 (acta llamada)
    ↓
T-F0-022 🔥 (empresa real comprometida)
    ↓
T-F0-024 (ERD v1)
    ↓
T-F1-005 🔥 (pesos 0312)
    ↓
T-F1-011 🔥 (RLS)
    ↓
T-F1-016 🔥 (lógica No Aplica)
    ↓
T-F1-017 (snapshot)
    ↓
T-F2-010 (extracción exámenes IA)
    ↓
T-F3-002 (catálogo CIIU)
    ↓
T-F3-005 (workflow matriz)
    ↓
T-F3-011 (generación acta IA)
    ↓
T-F4-007 (empresa demo lista)
    ↓
T-F5-005 (evaluaciones empresa real)
    ↓
T-F5-007 🔥 (discrepancy report)
    ↓
T-F6-001 (guion video)
    ↓
T-F6-004 🔥 (edición video)
    ↓
T-F6-011 (submission)
```

**Total ruta crítica:** ~21 tareas de 138.
**Tiempo total ruta crítica:** ~38h.
**Buffer disponible:** ~94h en tareas no críticas.

**Implicación:** las 117 tareas fuera de la ruta crítica tienen slack. Si nos atrasamos, son las primeras candidatas a Bucket B/C.

---

## Tareas con riesgo elevado (no críticas pero peligrosas)

| ID | Riesgo |
|---|---|
| T-F0-007/008 | Aprobación Wati Meta puede tardar 24-48h fuera de nuestro control |
| T-F2-011 | OCR de PDFs escaneados puede fallar con calidad baja |
| T-F4-002 | Whisper puede transcribir mal con ruido de fondo |
| T-F5-001 a 005 | Carga de datos reales depende de calidad de datos de Regis |

---

## Política para tareas críticas

1. **PM revisa el progreso** de cada tarea crítica explícitamente cada 4 horas.
2. **QA en modo estricto** sin excepciones.
3. **Doble validación**: además del QA-agent, el PM-agent verifica.
4. **Si una tarea crítica se atrasa 2x el tiempo estimado** → emergencia, escalación inmediata al supervisor humano.
5. **Backup de estado** antes de iniciar tarea crítica para poder revertir si algo se rompe.
