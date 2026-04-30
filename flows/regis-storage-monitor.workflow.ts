/**
 * regis-storage-monitor — workflow n8n (placeholder T-F15-014, F1.5-D)
 *
 * Creado vía MCP n8n el 2026-04-30 — primer uso real del MCP (D-010).
 *
 * n8n workflow ID: 8UxvpGlqWe1XaIT8
 * n8n URL: https://n8n.dmaori.com/workflow/8UxvpGlqWe1XaIT8
 *
 * NOTA: Este workflow es PLACEHOLDER. Demuestra que el MCP n8n puede crear
 * workflows en n8n.dmaori.com end-to-end. La versión productiva (T-F15-015,
 * F1.5-E) reemplazará el Set node por:
 *   - Postgres node ejecutando SELECT pg_database_size + counts
 *   - IF node con threshold 80%
 *   - Send Email vía Resend si alert
 *
 * Antes de promover a producción:
 *   1. Configurar credentials Postgres en n8n web UI (apuntando a DB Supabase)
 *   2. Configurar credentials SMTP/Resend para email
 *   3. Cambiar workflow a active=true
 *   4. Verificar primera medición en tabla storage_metrics
 */

import { workflow, trigger, node, sticky } from '@n8n/workflow-sdk'

const cronTrigger = trigger({
  type: 'n8n-nodes-base.scheduleTrigger',
  version: 1.3,
  config: {
    name: 'Cada 6 horas',
    parameters: {
      rule: {
        interval: [{ field: 'hours', hoursInterval: 6, triggerAtMinute: 0 }],
      },
    },
    position: [240, 300],
  },
  output: [{ triggered_at: '2026-04-30T18:00:00Z' }],
})

const setMetadata = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Set Project Metadata',
    parameters: {
      assignments: {
        assignments: [
          { id: '1', name: 'project', type: 'string', value: 'regis-sgsst' },
          { id: '2', name: 'task_id', type: 'string', value: 'T-F15-014' },
          { id: '3', name: 'phase', type: 'string', value: 'F1.5-D' },
          { id: '4', name: 'mcp_validated', type: 'boolean', value: true },
        ],
      },
    },
    position: [540, 300],
  },
  output: [{ project: 'regis-sgsst', task_id: 'T-F15-014', phase: 'F1.5-D', mcp_validated: true }],
})

const note = sticky({
  content:
    'regis-storage-monitor (placeholder T-F15-014). Reemplazar Set por Postgres node + IF + Send Email en T-F15-015. Configurar credentials Postgres manualmente en n8n web UI antes de promover a producción. D-010 / dmaorisas/regis-sgsst-platform',
  position: [240, 500],
  width: 700,
  height: 200,
})

export default workflow('regis-storage-monitor', 'regis-storage-monitor (placeholder T-F15-014)')
  .add(cronTrigger)
  .to(setMetadata)
  .add(note)
