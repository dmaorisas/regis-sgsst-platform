# ADR-002 — Centros de trabajo como entidad de primera clase + multi-CIIU N:M

**Estado:** Aceptado
**Fecha:** 2026-04-29
**Decidido por:** PM-Agent + supervisor humano (David Maori)

## Contexto

La Resolución 0312 de 2019 (Estándares Mínimos del SG-SST) evalúa cumplimiento **por centro de trabajo**, no por NIT. En Colombia es habitual que una sola empresa tenga centros con realidades operativas y de riesgo muy distintas (oficina administrativa con riesgo I + planta de producción con riesgo V, o sede principal urbana + obra de construcción temporal). Además, una empresa puede declarar varios CIIU ante la ARL: uno principal y otros secundarios, cada uno con su propia clase de riesgo según el Decreto 1607/2002.

Modelar la unidad evaluable a nivel de empresa (1 empresa = 1 fila de cumplimiento, 1 CIIU, 1 clase de riesgo) sería más simple, pero no refleja la realidad regulatoria que el motor de cumplimiento debe calcular ni permite el caso multi-sede que existe en al menos una de las tres empresas piloto sintéticas (D-004). El equipo necesita decidir explícitamente cómo se modelan estas dos dimensiones (centros de trabajo + CIIU múltiples) antes de que el motor de cumplimiento y los reportes se construyan sobre supuestos errados.

## Alternativas evaluadas

### Alternativa A: 1 empresa = 1 unidad evaluable (modelo plano)

- **Pros:** modelo más simple; queries directos sin joins; fácil de entender para usuarios pequeños con un único centro.
- **Contras:** no refleja la Resolución 0312 (Art. 8) que evalúa por centro de trabajo; imposible representar empresas con clases de riesgo heterogéneas; obligaría a duplicar la empresa para representar centros distintos, rompiendo la noción de "una empresa = un NIT"; bloquea la firma de evaluaciones diferenciadas que la ARL exige.

### Alternativa B: `centros_de_trabajo` como atributo embebido en `companies` (campo `location[]` o JSONB)

- **Pros:** simplificación leve respecto a entidad separada; menos joins en queries triviales.
- **Contras:** rompe normalización 3NF; impide FK desde `standard_evaluations`, `risk_matrices`, `committees`, `furat_reports`, `documents`, `worker_company`, `evaluation_snapshots` y `emergency_plans` hacia un centro específico; consultas de cumplimiento por centro se vuelven ad-hoc sobre JSON; pierde flexibilidad para auditar cambios de un centro individual; los índices y RLS sobre campos JSON son más frágiles.

### Alternativa C: `centros_de_trabajo` como entidad de primera clase + `empresa_ciiu` como tabla N:M (ELEGIDA)

- **Pros:** refleja exactamente la realidad regulatoria; soporta multi-CIIU por empresa y multi-sede con clases de riesgo distintas; permite que `standard_evaluations.centro_id` sea opcional (evaluación a nivel empresa o por centro), habilitando agregación flexible; ya está materializado en el ERD v0 (D-ERD-02) y validado por QA; cada centro tiene su propio `ciiu_centro` y `clase_riesgo_centro` independiente del CIIU principal de la empresa; conecta con D-003 (multi-empresa adaptable) y con el principio rector de adaptabilidad a cualquier estructura empresarial.
- **Contras:** ligeramente más complejo de modelar y consultar (joins adicionales para resolver "centros de la empresa X con CIIU Y"); la UX debe cuidar no exponer la jerarquía a empresas pequeñas con un único centro. **Mitigación:** la decisión ya está aplicada en `docs/erd/v0.dbml` y los joins están cubiertos por índices en FKs.

## Decisión

`centros_de_trabajo` es **entidad de primera clase** con FK `company_id` hacia `companies`, y campos propios `ciiu_centro` (FK a `ciiu_codes`), `clase_riesgo_centro`, `n_trabajadores`, `es_principal`, dirección/ciudad/departamento. `empresa_ciiu` es la tabla pivote **N:M** entre `companies` y `ciiu_codes`, con `es_principal` y vigencia (`valid_from`/`valid_to`) para soportar cambios históricos del CIIU declarado ante la ARL. `standard_evaluations.centro_id` es **opcional** para permitir evaluaciones a nivel empresa o por centro según el caso.

## Razón

- **Resolución 0312 de 2019, Artículo 8:** "Los Estándares Mínimos del SG-SST se aplicarán por **centro de trabajo**". La unidad evaluable definida por la norma es el centro, no el NIT.
- Una misma empresa puede tener centros con clases de riesgo distintas (oficina riesgo I + obra riesgo V), y la ARL cobra y exige medidas diferenciadas por centro.
- Permite **evaluación diferenciada de cumplimiento por centro** y agregación a nivel empresa/regis_org sin perder granularidad.
- Conecta con el **principio rector**: un sistema demostrablemente adaptable a cualquier formato y estructura empresarial debe modelar la realidad regulatoria, no una simplificación que el ganador del concurso tendría que rehacer en F1.
- Soporta multi-CIIU N:M, frecuente en empresas que declaran un CIIU principal y secundarios ante la ARL.
- Ya está materializado y validado en el ERD v0 (D-ERD-02); este ADR formaliza la decisión que el modelo físico ya refleja.

## Consecuencias

### Positivas

- Cumplimiento legal exacto con Resolución 0312 Art. 8 desde el día 1.
- Flexibilidad arquitectónica para empresas con cualquier estructura (1 centro o N centros, 1 CIIU o N CIIU).
- Soporte natural para empresas grandes con múltiples sedes/operaciones y para D-003 (multi-empresa adaptable).
- El motor de cumplimiento puede calcular % por centro y agregado por empresa con la misma estructura de datos.
- FKs explícitas desde `standard_evaluations`, `risk_matrices`, `committees`, `documents`, `furat_reports`, `worker_company`, `evaluation_snapshots` y `emergency_plans` hacia `centros_de_trabajo` permiten consultas y auditoría por centro.

### Negativas

- Queries más complejos: agregar cumplimiento "de la empresa" requiere joins adicionales con `centros_de_trabajo`.
- La UX debe ser cuidadosa para no abrumar al usuario en empresas pequeñas (1 centro = 1 empresa visible); no toda pantalla debe exponer la jerarquía.
- Mayor número de tablas a mantener en migraciones y seeds.

### Mitigaciones

- **Vista UX:** si la empresa tiene un único centro (caso más frecuente en pyme), la interfaz lo trata como si fuera la empresa misma y no expone la jerarquía; la jerarquía aparece sólo cuando hay 2+ centros.
- Índices apropiados en FKs (`centros_de_trabajo.company_id`, `empresa_ciiu.company_id`, `empresa_ciiu.ciiu_codigo`) para mantener performance de los joins.
- `standard_evaluations.centro_id` opcional permite arrancar con evaluación a nivel empresa y refinar por centro cuando los datos estén disponibles, sin migrar datos.
- Helpers de query (vistas o funciones) para los patrones más comunes (cumplimiento agregado, centro principal de la empresa) se documentarán en la fase de motor de cumplimiento.

## Referencias

- `docs/erd/v0.md` D-ERD-02 (línea 511) — decisión ya materializada en el ERD.
- `docs/erd/v0.dbml` — tablas `centros_de_trabajo` (líneas 57-72) y `empresa_ciiu` (líneas 97-111).
- Resolución 0312 de 2019, Artículo 8 — Estándares Mínimos por centro de trabajo.
- Decreto 1607 de 2002 — Tabla de clases de riesgo por CIIU.
- `governance/03_log_decisiones.md` D-003 — multi-empresa adaptable.
- `docs/adr/ADR-007-rbac-4-roles.md` — RBAC alineado con la jerarquía multi-tenant que este ADR habilita.
