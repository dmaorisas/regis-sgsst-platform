// =========================================================
// Email templates registry (T-F15-005)
// =========================================================
// Renderizado simple por sustitución de placeholders {{var}}.
// No usamos un engine completo (handlebars, mjml) para mantener el
// stack mínimo durante F1.5 — F2 puede migrar a MJML si los emails
// crecen en complejidad.
//
// Cada template declara el shape de variables que requiere; los
// llamadores fallan en TypeScript si pasan un payload incompleto.
// =========================================================

export type TemplateName = 'welcome' | 'score_alert' | 'pm_snapshot'

type TemplateMap = {
  welcome: { user_name: string; login_url: string }
  score_alert: {
    company_name: string
    centro_name: string
    previous_pct: string
    new_pct: string
    delta: string
    dashboard_url: string
  }
  pm_snapshot: {
    period: string
    tasks_aprobada: string
    tasks_en_progreso: string
    blockers: string
    cost_24h_usd: string
  }
}

export type RenderResult = { subject: string; html: string }

const TEMPLATES: { [K in TemplateName]: (vars: TemplateMap[K]) => RenderResult } = {
  welcome: ({ user_name, login_url }) => ({
    subject: 'Bienvenido a Regis SG-SST',
    html: layout(
      'Bienvenido a Regis SG-SST',
      `
      <h1 style="margin:0 0 16px;font-size:20px;color:#0f172a">Hola ${esc(user_name)},</h1>
      <p style="margin:0 0 12px;color:#334155;line-height:1.5">
        Tu cuenta en la plataforma de cumplimiento SG-SST de Regis ya está activa.
      </p>
      <p style="margin:0 0 24px;color:#334155;line-height:1.5">
        Desde tu panel podrás ver el estado de cumplimiento de tu empresa, las
        evaluaciones por estándar y los hallazgos pendientes.
      </p>
      ${button(login_url, 'Entrar al panel')}
      `,
    ),
  }),
  score_alert: ({ company_name, centro_name, previous_pct, new_pct, delta, dashboard_url }) => ({
    subject: `Cambio de cumplimiento — ${company_name}`,
    html: layout(
      'Alerta de cumplimiento',
      `
      <h1 style="margin:0 0 16px;font-size:20px;color:#0f172a">${esc(company_name)}</h1>
      <p style="margin:0 0 12px;color:#334155;line-height:1.5">
        Centro <strong>${esc(centro_name)}</strong> — el porcentaje pasó de
        <strong>${esc(previous_pct)}%</strong> a <strong>${esc(new_pct)}%</strong>
        (Δ ${esc(delta)} pts).
      </p>
      ${button(dashboard_url, 'Ver detalle')}
      `,
    ),
  }),
  pm_snapshot: ({ period, tasks_aprobada, tasks_en_progreso, blockers, cost_24h_usd }) => ({
    subject: `PM snapshot — ${period}`,
    html: layout(
      'Snapshot del proyecto',
      `
      <h1 style="margin:0 0 16px;font-size:20px;color:#0f172a">Snapshot ${esc(period)}</h1>
      <ul style="margin:0;padding:0 0 0 16px;color:#334155;line-height:1.7">
        <li>Aprobadas: <strong>${esc(tasks_aprobada)}</strong></li>
        <li>En progreso: <strong>${esc(tasks_en_progreso)}</strong></li>
        <li>Bloqueadores: <strong>${esc(blockers)}</strong></li>
        <li>Costo IA 24h: <strong>USD ${esc(cost_24h_usd)}</strong></li>
      </ul>
      `,
    ),
  }),
}

export function renderTemplate<K extends TemplateName>(
  name: K,
  vars: TemplateMap[K],
): RenderResult {
  const fn = TEMPLATES[name]
  if (!fn) throw new Error(`unknown template: ${String(name)}`)
  return fn(vars)
}

// ---------- helpers ----------
function esc(v: string): string {
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function button(href: string, label: string): string {
  return `
    <a href="${esc(href)}" style="display:inline-block;padding:10px 18px;background:#0284c7;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px">
      ${esc(label)}
    </a>
  `
}

function layout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr><td align="center" style="padding:32px 16px">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="background:#fff;border-radius:12px;border:1px solid #e2e8f0">
        <tr><td style="padding:32px">
          <div style="font-size:12px;color:#64748b;margin-bottom:24px">Regis SG-SST</div>
          ${body}
          <hr style="border:0;border-top:1px solid #e2e8f0;margin:24px 0">
          <p style="margin:0;font-size:12px;color:#64748b">Este correo es automático; no respondas.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}
