// =====================================================================
// T-F15-015 — Workflow #1/5: regis-task-dispatcher
// Generado por PM-Agent vía MCP n8n (D-010 + D-011)
// Validado con validate_workflow → 10 nodos, OK
// =====================================================================
//
// Función: cron 10min. Detecta Issues abiertas en GitHub con labels
// agent:operador + bucket:A. Filtra por orden fase/ID. Encola la primera
// candidata en agent_tasks como status='queued', assigned_to='operador'.
// Comenta en el Issue. Respeta system_state.paused.
//
// Credenciales requeridas en n8n web UI:
//   - 'Supabase Postgres' (n8n credential type: postgres)
//   - 'GitHub PAT (Header)' (n8n credential type: httpHeaderAuth)
//       header name: Authorization
//       header value: Bearer ghp_xxxxx (PAT con repo scope)
//
// Tablas Supabase requeridas (migration 20260501140000_system_state.sql):
//   - public.system_state (singleton id=1)
//   - public.agent_tasks (cola de orquestación)
// =====================================================================

import { workflow, node, trigger, ifElse, expr, newCredential } from '@n8n/workflow-sdk'

const cronTrigger = trigger({
  type: 'n8n-nodes-base.scheduleTrigger',
  version: 1.3,
  config: {
    name: 'Cron 10min',
    parameters: { rule: { interval: [{ field: 'minutes', minutesInterval: 10 }] } },
    position: [240, 300],
  },
  output: [{}],
})

const checkPause = node({
  type: 'n8n-nodes-base.postgres',
  version: 2.6,
  config: {
    name: 'Check Pause State',
    parameters: {
      operation: 'executeQuery',
      query: 'SELECT paused, pause_reason FROM public.system_state WHERE id = 1',
    },
    credentials: { postgres: newCredential('Supabase Postgres') },
    position: [440, 300],
  },
  output: [{ paused: false, pause_reason: null }],
})

const isPausedCheck = ifElse({
  type: 'n8n-nodes-base.if',
  version: 2.3,
  config: {
    name: 'Is Paused?',
    parameters: {
      conditions: {
        combinator: 'and',
        conditions: [
          {
            id: 'paused-check',
            leftValue: expr('{{ $json.paused }}'),
            operator: { type: 'boolean', operation: 'true' },
            rightValue: '',
          },
        ],
      },
    },
    position: [640, 300],
  },
})

const logPaused = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Log Paused',
    parameters: {
      mode: 'manual',
      assignments: {
        assignments: [
          { id: '1', name: 'action', type: 'string', value: 'skipped_paused' },
          { id: '2', name: 'reason', type: 'string', value: expr('{{ $json.pause_reason }}') },
        ],
      },
    },
    position: [840, 200],
  },
  output: [{ action: 'skipped_paused', reason: 'manual' }],
})

const listIssues = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: 'List Open Issues',
    parameters: {
      method: 'GET',
      url: 'https://api.github.com/repos/dmaorisas/regis-sgsst-platform/issues',
      sendQuery: true,
      queryParameters: {
        parameters: [
          { name: 'state', value: 'open' },
          { name: 'labels', value: 'agent:operador,bucket:A' },
          { name: 'sort', value: 'created' },
          { name: 'direction', value: 'asc' },
          { name: 'per_page', value: '50' },
        ],
      },
      sendHeaders: true,
      headerParameters: {
        parameters: [{ name: 'Accept', value: 'application/vnd.github+json' }],
      },
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth',
    },
    credentials: { httpHeaderAuth: newCredential('GitHub PAT (Header)') },
    position: [840, 400],
  },
  output: [
    {
      number: 13,
      title: '[T-F2-001] ...',
      labels: [],
      body: '',
      html_url: 'https://github.com/dmaorisas/regis-sgsst-platform/issues/13',
    },
  ],
})

const filterEligible = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Pick Next Task',
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode:
        "const items = $input.all();\nconst list = items.map(i => i.json).filter(Boolean);\nconst candidates = list.filter(i => {\n  const t = (i && i.title) || '';\n  if (!t.match(/\\[T-(F\\d+(?:\\.\\d+)?-\\d+)\\]/)) return false;\n  const labels = ((i && i.labels) || []).map(l => l.name || l);\n  if (!labels.includes('agent:operador')) return false;\n  return true;\n});\ncandidates.sort((a, b) => {\n  const ma = a.title.match(/\\[T-F(\\d+(?:\\.\\d+)?)-(\\d+)\\]/);\n  const mb = b.title.match(/\\[T-F(\\d+(?:\\.\\d+)?)-(\\d+)\\]/);\n  const pa = parseFloat(ma[1]); const pb = parseFloat(mb[1]);\n  if (pa !== pb) return pa - pb;\n  return parseInt(ma[2]) - parseInt(mb[2]);\n});\nconst next = candidates[0];\nif (!next) return [{ json: { found: false } }];\nconst m = next.title.match(/\\[(T-F\\d+(?:\\.\\d+)?-\\d+)\\]/);\nconst phaseLabel = ((next.labels) || []).map(l => l.name || l).find(n => n.startsWith('phase:')) || 'phase:unknown';\nreturn [{ json: { found: true, task_id: m[1], github_issue_number: next.number, github_issue_url: next.html_url, title: next.title, body: next.body || '', phase: phaseLabel.replace('phase:', '') } }];",
    },
    position: [1040, 400],
  },
  output: [
    {
      found: true,
      task_id: 'T-F2-001',
      github_issue_number: 13,
      github_issue_url: 'https://github.com/dmaorisas/regis-sgsst-platform/issues/13',
      title: '[T-F2-001] ...',
      body: '',
      phase: 'F2',
    },
  ],
})

const isFoundCheck = ifElse({
  type: 'n8n-nodes-base.if',
  version: 2.3,
  config: {
    name: 'Found Eligible?',
    parameters: {
      conditions: {
        combinator: 'and',
        conditions: [
          {
            id: 'found-check',
            leftValue: expr('{{ $json.found }}'),
            operator: { type: 'boolean', operation: 'true' },
            rightValue: '',
          },
        ],
      },
    },
    position: [1240, 400],
  },
})

const upsertQueue = node({
  type: 'n8n-nodes-base.postgres',
  version: 2.6,
  config: {
    name: 'Enqueue (skip if exists)',
    parameters: {
      operation: 'executeQuery',
      query:
        "INSERT INTO public.agent_tasks (task_id, github_issue_number, github_issue_url, phase, status, assigned_to, started_at) VALUES ($1, $2, $3, $4, 'queued', 'operador', NOW()) ON CONFLICT (task_id) DO NOTHING RETURNING id, task_id, status",
      options: {
        queryReplacement: expr(
          '{{ $json.task_id }},{{ $json.github_issue_number }},{{ $json.github_issue_url }},{{ $json.phase }}',
        ),
      },
    },
    credentials: { postgres: newCredential('Supabase Postgres') },
    position: [1440, 300],
  },
  output: [{ id: 'uuid', task_id: 'T-F2-001', status: 'queued' }],
})

const commentOnIssue = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: 'Comment Dispatch',
    parameters: {
      method: 'POST',
      url: expr(
        'https://api.github.com/repos/dmaorisas/regis-sgsst-platform/issues/{{ $("Pick Next Task").item.json.github_issue_number }}/comments',
      ),
      sendBody: true,
      contentType: 'json',
      specifyBody: 'json',
      jsonBody: expr(
        '{"body": "task-dispatcher: encolada en agent_tasks como queued para Operador-Agent. {{ $now.toISO() }}"}',
      ),
      sendHeaders: true,
      headerParameters: {
        parameters: [{ name: 'Accept', value: 'application/vnd.github+json' }],
      },
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth',
    },
    credentials: { httpHeaderAuth: newCredential('GitHub PAT (Header)') },
    position: [1640, 300],
  },
  output: [{ id: 0 }],
})

const logNoTask = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Log No Task',
    parameters: {
      mode: 'manual',
      assignments: {
        assignments: [{ id: '1', name: 'action', type: 'string', value: 'no_eligible_task' }],
      },
    },
    position: [1440, 500],
  },
  output: [{ action: 'no_eligible_task' }],
})

export default workflow('regis-task-dispatcher', 'regis-task-dispatcher (T-F15-015 #1/5)')
  .add(cronTrigger)
  .to(checkPause)
  .to(
    isPausedCheck
      .onTrue(logPaused)
      .onFalse(
        listIssues
          .to(filterEligible)
          .to(isFoundCheck.onTrue(upsertQueue.to(commentOnIssue)).onFalse(logNoTask)),
      ),
  )
