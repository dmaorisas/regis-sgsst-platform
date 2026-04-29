# ADR-001 — Stack Frontend: Next.js 14 directo

**Estado:** Aceptado
**Fecha:** 2026-04-29
**Decidido por:** PM-Agent + supervisor humano (David Maori)

## Contexto

La plataforma SG-SST de Regis es multi-tenant (consultoras → empresas → centros de trabajo), con RBAC granular, RLS de Supabase, audit trail desde la Fase 1 y un motor de cumplimiento que exige cálculo determinista de %. El demo del 6 de mayo necesita correr sobre Next.js (App Router) con Server Components y Server Actions para tocar Supabase con seguridad. El equipo evaluó si arrancar con un acelerador de UI (Lovable, v0.dev) o ir directo al stack productivo.

## Alternativas evaluadas

### Alternativa A: Lovable
- Pros: prototipado conversacional muy rápido para landings y CRUD simple; preview hosteado out-of-the-box.
- Contras: opinionado en estructura de proyecto; no encaja con Clean Architecture multi-tenant; difícil meter middleware de RBAC y RLS sin pelearse con su scaffolding; export a Next.js puro requiere refactor extenso. Riesgo de tirar el código de UI en F1.

### Alternativa B: v0.dev (Vercel)
- Pros: excelente generación de componentes shadcn/ui copiables; integración natural con Next.js 14.
- Contras: solo cubre componentes aislados (no app completa); habría que orquestar manualmente App Router, Server Actions, RLS y pg-boss → no ahorra trabajo de arquitectura, solo de UI.

### Alternativa C: Next.js 14 directo (App Router + TypeScript + Tailwind + shadcn/ui)
- Pros: control total sobre middleware, layouts, RSC, Server Actions, integración nativa con Supabase Auth/RLS; alineado con ADR-003 (audit trail F1) y ADR-004 (Supabase Storage); v0.dev sigue disponible como generador puntual de componentes.
- Contras: menos velocidad en pantallas triviales; obliga a escribir boilerplate de scaffolding inicial.

## Decisión

Construir el frontend directamente sobre **Next.js 14 (App Router, TypeScript, Tailwind, shadcn/ui)**, usando v0.dev solo como generador puntual de componentes copiables cuando convenga.

## Razón

El principio rector exige una **arquitectura adaptable que el ganador del concurso pueda alimentar con documentos oficiales el día 1**. Eso requiere control fino sobre RBAC (ADR-007), RLS multi-tenant, audit trail (ADR-003) y storage seguro (ADR-004) — todos son terreno fuera del sweet spot de Lovable. Tirar UI hecha en Lovable a mitad de F1 sería más caro que arrancar directo en Next.js.

## Consecuencias

### Positivas
- Una sola codebase desde día 1 hasta entrega; sin migración intermedia.
- Server Actions + RLS dan seguridad end-to-end con poco código.
- Compatible directamente con ADR-003, ADR-004, ADR-005 y ADR-007.

### Negativas
- Mayor boilerplate inicial (layouts, providers, middleware).
- Requiere disciplina del Operador-Agent para no sobreingenierizar componentes.

### Mitigaciones
- shadcn/ui + plantillas Tailwind aceleran las pantallas más comunes.
- v0.dev se usa puntualmente para componentes complejos (tablas, charts) sin acoplar el proyecto.
- ADR-009 (testing minimal) evita gastar tiempo en pirámide de tests innecesaria mientras se construye UI.

## Referencias

- `docs/erd/v0.md` (modelo multi-tenant)
- `governance/06_llm_routing_config.md`
- `governance/01_roles_y_reglas.md` (principio rector)
