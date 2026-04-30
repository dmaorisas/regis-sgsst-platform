# Workflows n8n — Regis SG-SST

Workflows n8n del proyecto. Cada `.workflow.ts` es la fuente de verdad versionada en git. Los workflows reales viven en n8n.dmaori.com (proyecto `apHolqjKxJnd6rHP`).

## Convención

- Archivo: `<workflow-name>.workflow.ts` con código TypeScript SDK n8n
- Header del archivo documenta:
  - workflow ID en n8n
  - URL en n8n.dmaori.com
  - propósito + estado (placeholder/producción)
  - credentials requeridas

## Workflows actuales

| Archivo                             | Workflow ID        | Estado      | Tarea              |
| ----------------------------------- | ------------------ | ----------- | ------------------ |
| `regis-storage-monitor.workflow.ts` | `8UxvpGlqWe1XaIT8` | Placeholder | T-F15-014 (F1.5-D) |

## Workflows planeados (T-F15-015 / F1.5-E)

- `regis-task-dispatcher` — detecta Issues GitHub `Pendiente` con deps cumplidas
- `regis-operador-executor` — invoca Anthropic API con system prompt Operador
- `regis-qa-validator` — invoca QA-Agent con system prompt QA
- `regis-pm-coordinator` — escalaciones, phase gates, snapshots cada 6h
- `regis-auditor` — cron 4h, sampling de tareas aprobadas

## Cómo crear un workflow nuevo

```bash
# 1. Escribir el archivo .workflow.ts en este directorio
# 2. Validar con MCP n8n (PM-Agent o desde Claude Code):
#    mcp__ff52e7d3...__validate_workflow con el código
# 3. Crear con MCP:
#    mcp__ff52e7d3...__create_workflow_from_code
#    projectId: apHolqjKxJnd6rHP
# 4. Verificar en https://n8n.dmaori.com/workflow/<workflow_id>
# 5. Commit + push
```

## Referencias

- D-010: MCP n8n conectado (`governance/03_log_decisiones.md`)
- T-F15-014: F1.5-D storage monitoring
- T-F15-015: F1.5-E orchestration completa de agentes
