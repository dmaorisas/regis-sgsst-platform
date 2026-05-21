# Directiva: Procesamiento de Exámenes Médicos Laborales

**Código:** DIR-MED-001  
**Módulo:** Médico  
**Plantilla de salida:** GTH-F-56 — Seguimiento a Recomendaciones Médico Laborales (Versión 3.0)  
**Última actualización:** 2026-05-21

---

## Objetivo

Recibir un examen médico ocupacional (PDF digital o escaneado), extraer automáticamente los datos del trabajador y su diagnóstico, complementar con datos administrativos externos, y generar un PDF final usando exclusivamente la plantilla oficial GTH-F-56 de REGIS Colombia.

---

## Flujo completo

```
[1] Input: PDF del examen médico
         │
[2] Detección de tipo (digital vs escaneado)
         │
    ┌────┴────┐
    │ Digital │ Escaneado │
    │ PyMuPDF │ EasyOCR   │
    └────┬────┘
         │
[3] Texto extraído (crudo)
         │
[4] LLM interpreta → extrae campos estructurados (JSON)
         │
[5] Merge: campos del examen + campos externos (JSON)
         │
[6] Validación de campos obligatorios
         │
[7] Inyección en plantilla .docx (python-docx)
         │
[8] Conversión a PDF final (docx2pdf / LibreOffice)
         │
[9] Output: PDF listo en .tmp/medical_reports/
```

---

## Campos a extraer del examen médico (Paso 4)

El LLM debe devolver un JSON con esta estructura exacta:

```json
{
  "fecha": "YYYY-MM-DD",
  "nombre_trabajador": "string",
  "cedula": "string",
  "eps": "string",
  "cargo": "string",
  "edad": "integer",
  "peso": "string (ej: 75 kg)",
  "fecha_nacimiento": "YYYY-MM-DD",
  "en_tratamiento_medico": "SI | NO",
  "diagnostico": "string (texto libre, puede ser largo)",
  "tipo_tratamiento": "string (texto libre)",
  "recomendaciones_medico_laborales": "string (texto libre)"
}
```

### Reglas de extracción

- Si un campo no se encuentra en el examen, devolver `null` (no inventar datos).
- Nombres en MAYÚSCULAS tal como aparecen en el documento.
- Cédula solo dígitos, sin puntos ni guiones.
- Fechas normalizadas a `YYYY-MM-DD` independientemente del formato original.
- El campo `diagnostico` debe capturar TODO el texto del diagnóstico, sin resumir.
- El campo `tipo_tratamiento` incluye medicamentos, terapias, controles, etc.
- El campo `recomendaciones_medico_laborales` captura las recomendaciones del médico para el entorno laboral.

---

## Campos externos (no vienen del examen)

Estos campos se reciben como parámetro aparte (JSON, formulario, o argumento CLI):

```json
{
  "dependencia": "string — área, grupo o dependencia del trabajador",
  "sede": "string — sede donde está ubicado",
  "tipo_vinculacion_laboral": "string — planta, contrato, prestación de servicios, etc.",
  "nombre_jefe_inmediato": "string",
  "funciones_cargo": "string (texto libre) — funciones del cargo actual",
  "compromiso_funcionario": "string (texto libre) — compromiso del trabajador",
  "compromiso_entidad": "string (texto libre) — compromiso de la entidad y áreas afines",
  "observaciones": "string (texto libre) — observaciones adicionales"
}
```

### Reglas de campos externos

- Si no se proveen, dejar el campo vacío en la plantilla (no inventar).
- `compromiso_funcionario` y `compromiso_entidad` pueden quedar vacíos si se van a llenar a mano después de imprimir.

---

## Plantilla de salida: GTH-F-56

**Ubicación del archivo .docx base:** `execution/templates/GTH-F-56_template.docx`

### Estructura de la plantilla (4 páginas)

**Página 1 — Datos del trabajador + Diagnóstico:**

| Campo plantilla             | Fuente                           |
| --------------------------- | -------------------------------- |
| FECHA                       | examen.fecha                     |
| NOMBRE DEL TRABAJADOR       | examen.nombre_trabajador         |
| CÉDULA                      | examen.cedula                    |
| EPS                         | examen.eps                       |
| CARGO                       | examen.cargo                     |
| EDAD                        | examen.edad                      |
| PESO                        | examen.peso                      |
| FECHA DE NACIMIENTO         | examen.fecha_nacimiento          |
| DEPENDENCIA                 | externo.dependencia              |
| EN TRATAMIENTO MÉDICO       | examen.en_tratamiento_medico     |
| SEDE                        | externo.sede                     |
| TIPO DE VINCULACIÓN LABORAL | externo.tipo_vinculacion_laboral |
| NOMBRE DEL JEFE INMEDIATO   | externo.nombre_jefe_inmediato    |
| Diagnóstico:                | examen.diagnostico               |
| Tipo de tratamiento:        | examen.tipo_tratamiento          |
| Funciones del cargo:        | externo.funciones_cargo          |

**Página 2 — Seguimiento y compromisos:**

| Campo plantilla                                                | Fuente                                  |
| -------------------------------------------------------------- | --------------------------------------- |
| Estado y cumplimiento de las recomendaciones médico laborales: | examen.recomendaciones_medico_laborales |
| Observaciones:                                                 | externo.observaciones                   |
| Compromiso de funcionario:                                     | externo.compromiso_funcionario          |
| Compromiso de la entidad y áreas afines:                       | externo.compromiso_entidad              |

**Página 3 — Firma:** Espacio para nombre, cargo y firma (se deja vacío para firma manual).

**Página 4 — Pasos de diligenciamiento:** No se modifica, es informativa.

---

## Scripts de ejecución

| Script                                 | Responsabilidad                                                  |
| -------------------------------------- | ---------------------------------------------------------------- |
| `execution/medical/extract_text.py`    | Recibe PDF, detecta tipo (digital/escaneado), extrae texto crudo |
| `execution/medical/parse_fields.py`    | Envía texto al LLM, recibe JSON estructurado de campos           |
| `execution/medical/generate_report.py` | Merge campos + plantilla .docx → PDF final                       |
| `execution/medical/process_exam.py`    | Orquestador: ejecuta los 3 pasos en secuencia                    |

---

## Configuración

**El proveedor LLM es dinámico.** Se selecciona con UNA variable en `.env.local`:

```
# Proveedor activo: openai | anthropic | gemini | groq
LLM_PROVIDER=openai
```

Solo necesitas configurar la API key del proveedor seleccionado:

| Proveedor   | Variable            | Modelo por defecto        |
| ----------- | ------------------- | ------------------------- |
| `openai`    | `OPENAI_API_KEY`    | `gpt-4o`                  |
| `anthropic` | `ANTHROPIC_API_KEY` | `claude-sonnet-4-6`       |
| `gemini`    | `GEMINI_API_KEY`    | `gemini-2.5-flash`        |
| `groq`      | `GROQ_API_KEY`      | `llama-3.3-70b-versatile` |

**Para cambiar de proveedor:** modifica `LLM_PROVIDER` y asegúrate de tener la API key correspondiente. No se requiere cambiar código.

**Arquitectura agnóstica:**

- **Webapp (Next.js):** `src/lib/ai/llm-provider.ts` — factory que crea el proveedor según `LLM_PROVIDER`
- **Scripts (Python):** `execution/medical/parse_fields.py` — lee `LLM_PROVIDER` de `.env.local`

Ambos sistemas (webapp y scripts locales) respetan la misma variable de configuración.

---

## Dependencias Python

```
pymupdf>=1.25.0       # Extracción texto de PDFs digitales + generación PDF
easyocr>=1.7.0        # OCR para PDFs escaneados
pdf2image>=1.17.0     # Conversión PDF→imagen para OCR
Pillow>=10.0.0        # Procesamiento de imágenes
```

> **Nota:** No se requiere SDK de ningún LLM. Las llamadas se hacen via `urllib` (Python) o `fetch` (TypeScript) directamente a las APIs REST. Esto mantiene las dependencias al mínimo.

---

## Manejo de errores

| Error                                        | Acción                                                                                       |
| -------------------------------------------- | -------------------------------------------------------------------------------------------- |
| PDF corrupto o ilegible                      | Retornar error claro: "No se pudo leer el PDF. Verificar archivo."                           |
| OCR no detecta texto                         | Retornar error: "No se detectó texto en el documento escaneado. Verificar calidad del scan." |
| LLM no encuentra campo obligatorio           | Marcar campo como `null` en JSON, NO inventar. Incluir warning en log.                       |
| Campo `nombre_trabajador` o `cedula` es null | Abortar: no se puede generar informe sin identificación del trabajador.                      |
| API key inválida o rate limit                | Retornar error con mensaje claro. No reintentar sin consultar.                               |
| Plantilla .docx no encontrada                | Abortar con ruta esperada del archivo.                                                       |

---

## Prompt para el LLM (Paso 4)

Ubicación: `execution/medical/prompts/extract_fields.txt`

El prompt debe:

1. Recibir el texto crudo extraído del examen
2. Indicar al LLM que extraiga SOLO los campos listados
3. Forzar respuesta en JSON estricto (sin markdown, sin explicaciones)
4. Incluir instrucción explícita: "Si no encuentras un dato, usa null. NO inventes información."

---

## Ejemplo de uso (CLI)

```bash
# Procesamiento completo
python execution/medical/process_exam.py \
  --input "examen_juan_perez.pdf" \
  --external '{"dependencia":"Talento Humano","sede":"Bogotá","tipo_vinculacion_laboral":"Planta","nombre_jefe_inmediato":"María García","funciones_cargo":"Coordinación de nómina y prestaciones sociales","compromiso_funcionario":"","compromiso_entidad":"","observaciones":""}' \
  --output ".tmp/medical_reports/"

# Solo extracción (sin generar PDF)
python execution/medical/extract_text.py --input "examen.pdf"
python execution/medical/parse_fields.py --text "texto_extraido.txt"
```

---

## Criterios de éxito

- [ ] Extrae correctamente nombre, cédula, EPS, diagnóstico de un PDF digital de prueba
- [ ] Extrae correctamente los mismos campos de un PDF escaneado
- [ ] Genera PDF final visualmente idéntico a la plantilla GTH-F-56
- [ ] Campos no encontrados quedan vacíos (nunca datos inventados)
- [ ] Campos externos se inyectan correctamente
- [ ] El proceso completo tarda < 30 segundos por examen
- [ ] La API key no aparece en logs ni en archivos de salida

---

## Aprendizajes

<!-- Agregar aprendizajes del módulo aquí conforme se descubran -->
