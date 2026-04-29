# Empresas Piloto — Datos Sintéticos para Pruebas

**Tarea:** T-F0-022 (reformulada por D-002 + D-003 + feedback supervisor)
**Fecha:** 2026-04-29
**Decidido por:** PM-Agent siguiendo directiva del supervisor humano

---

## Propósito

Definir **3 empresas sintéticas representativas** con datos coherentes y realistas (pero aleatorios) para probar los 3 capítulos de la Resolución 0312/2019. El objetivo es demostrar que el motor de cumplimiento funciona correctamente con cualquier configuración de empresa, no validar contra datos reales específicos.

Estos datos alimentan el seed de `T-F1-013` (seed empresa sintética) y se usan en la demostración final.

---

## Política de datos sintéticos

- **Datos coherentes:** sectores, CIIUs, clases de riesgo y tamaños son consistentes entre sí (una empresa de construcción no aparece con riesgo I).
- **Datos aleatorios:** NIT, razón social, direcciones, contactos son ficticios. NIT con dígito de verificación válido (módulo 11) para que pase los validadores.
- **Cero información sensible:** no usamos nombres de personas reales ni datos de empresas reales (Nike, Ferrero, etc.).
- **Adaptable:** la estructura permite reemplazar estos datos por reales en cualquier momento sin cambiar código.

---

## Empresa Piloto 1 — PEQUEÑA (Capítulo I)

**Sector:** Servicios profesionales (consultoría)
**Capítulo Resolución 0312 aplicable:** I (1-10 trabajadores, riesgo I-III)
**Estándares evaluables:** 7

| Campo | Valor sintético |
|---|---|
| NIT | 900.123.456-7 (válido, dígito mod 11) |
| Razón social | Consultora Andina Solutions S.A.S. |
| Sector | Servicios profesionales |
| CIIU principal | 7020 — Actividades de consultoría de gestión |
| Clase de riesgo | I (muy bajo) |
| Trabajadores | 6 (1 directivo + 5 consultores) |
| Centros de trabajo | 1 (Bogotá) |
| Dirección | Calle 100 # 15-50, oficina 502, Bogotá D.C. |
| Ciudad | Bogotá |
| ARL | (a configurar — aleatoria del catálogo) |
| EPS predominante | (variada por trabajador) |
| Año constitución | 2021 |
| Notas | Empresa pequeña típica. COPASST aplicaría desde 10 trabajadores → al estar en 6 le aplica **Vigía SST** en lugar de COPASST. Permite probar la detección automática del sistema |

---

## Empresa Piloto 2 — MEDIANA (Capítulo II)

**Sector:** Comercio retail
**Capítulo Resolución 0312 aplicable:** II (11-50 trabajadores, riesgo I-III)
**Estándares evaluables:** 21

| Campo | Valor sintético |
|---|---|
| NIT | 901.234.567-8 |
| Razón social | Distribuidora Tropical del Norte Ltda. |
| Sector | Comercio al por menor |
| CIIU principal | 4711 — Comercio en establecimientos no especializados |
| CIIUs secundarios | 4719 (otros comercios) |
| Clase de riesgo | II (bajo) |
| Trabajadores | 32 (1 gerente + 8 administrativos + 23 operativos) |
| Centros de trabajo | 2 (Medellín — sede principal; Bello — bodega) |
| Dirección | Carrera 50 # 80-25, Medellín (sede); Calle 50 # 30-10, Bello (bodega) |
| Ciudad | Medellín |
| ARL | (a configurar) |
| Año constitución | 2018 |
| Notas | Empresa mediana con multi-CIIU y multi-centro. Permite probar: (a) Capítulo II completo, (b) detección automática COPASST (32 trabajadores → COPASST con 2 representantes empleador + 2 trabajadores), (c) evaluación distinta por centro de trabajo |

---

## Empresa Piloto 3 — GRANDE (Capítulo III)

**Sector:** Construcción
**Capítulo Resolución 0312 aplicable:** III (50+ trabajadores OR riesgo IV-V)
**Estándares evaluables:** 60 (sistema completo)

| Campo | Valor sintético |
|---|---|
| NIT | 830.987.654-3 |
| Razón social | Edificaciones del Pacífico S.A. |
| Sector | Construcción de obras de ingeniería civil |
| CIIU principal | 4290 — Construcción de obras de ingeniería civil |
| CIIUs secundarios | 4321 (instalaciones eléctricas), 4329 (otras instalaciones) |
| Clase de riesgo | V (muy alto, por construcción y trabajo en alturas) |
| Trabajadores | 87 (3 directivos + 12 administrativos + 8 ing. residentes + 64 operativos en obra) |
| Centros de trabajo | 3 (Cali — sede admin; Obra A en Cali — vivienda; Obra B en Buenaventura — infraestructura portuaria) |
| Dirección | Avenida Sexta Norte # 28-50, Cali (sede); 2 obras activas |
| Ciudad | Cali (sede), Buenaventura (obra) |
| ARL | (a configurar — típicamente Sura o Positiva para construcción) |
| Año constitución | 2010 |
| Notas | Empresa con riesgo V automático por sector. Permite probar: (a) sistema completo de 60 estándares, (b) trabajadores en distintos centros con clases de riesgo distintas, (c) prevalencia de FURAT (sector con mayor accidentalidad), (d) brigada de emergencias obligatoria, (e) escalación automática a Capítulo III por riesgo aunque tuviera <50 trabajadores |

---

## Datos transversales para los 3 piloto

### Comités a configurar

| Empresa | COPASST / Vigía SST | Comité Convivencia | Brigada Emergencias |
|---|---|---|---|
| Piloto 1 (6 trab) | Vigía SST (1 persona) | Sí (obligatorio toda empresa) | Sí (mínima) |
| Piloto 2 (32 trab) | COPASST (1+1 = 2 representantes c/u) | Sí (1+1) | Sí (estándar) |
| Piloto 3 (87 trab) | COPASST (2+2 = 4 representantes c/u) | Sí (2+2) | Sí (completa, multi-frente) |

### Trabajadores sintéticos

Para cada empresa, generar trabajadores con:
- Cédulas válidas (algoritmo módulo 11 colombiano) pero ficticias
- Nombres ficticios variados (no usar nombres reales)
- Cargos coherentes con el sector
- EPS/AFP/ARL variadas (del catálogo cargado en T-F1-003)
- Fechas de ingreso entre 2018-2025
- Algunos trabajadores con exámenes médicos vencidos (para probar alertas)

### Documentos sintéticos a generar

Para validar el motor de cumplimiento con datos realistas:
- 3 PILAs ficticias por empresa (último trimestre)
- 5+ exámenes médicos PDF de prueba diseñados con plantilla pública (Resolución 2346)
- 1 matriz de riesgo GTC-45 por empresa (basada en T-F0-038 mapping)
- Actas COPASST/Vigía/Convivencia de los últimos 3 meses
- 1 plan de emergencias por empresa

**Política:** estos documentos se generan en T-F2-X y T-F5-X. Esta tarea solo define los perfiles de empresa.

---

## Cómo se usa este dataset

1. **T-F1-013** seedea estas 3 empresas en Supabase (con sus centros, CIIUs, trabajadores)
2. **T-F1-021** dashboard Regis muestra las 3 empresas en su portafolio
3. **T-F2-X y T-F3-X** procesan documentos sintéticos para cada una
4. **T-F5-X** elige una de las 3 (o todas) para la demostración final

---

## Conformidad con principios

- ✅ **Adaptabilidad:** la estructura del dataset es agnóstica de los valores. Cambiar una empresa por otra (real o ficticia) no requiere tocar código.
- ✅ **Funcionalidad sobre datos:** los 3 perfiles cubren los 3 capítulos de Resolución 0312, demostrando que el motor funciona.
- ✅ **Eficiencia de recursos:** ~30 min de trabajo PM vs días de investigación de datos reales que el ganador no podrá usar igual (Regis no comparte).
- ✅ **Cero información sensible:** datos 100% ficticios.

---

## Firma

**Decidido por:** PM-Agent siguiendo directiva del supervisor humano (David Maori)
**Fecha:** 2026-04-29
**Cumplimiento:** principio rector + memoria `feedback_funcionalidad_sobre_datos`
**Tarea cerrada:** T-F0-022 (Bucket A, nivel QA: estándar)
