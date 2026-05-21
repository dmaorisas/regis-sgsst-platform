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

export type TemplateName =
  | 'welcome'
  | 'score_alert'
  | 'pm_snapshot'
  | 'equipment_expiry'
  | 'consultant_weekly_pending'
  | 'consultant_weekly_summary'

type TemplateMap = {
  welcome: { user_name: string; login_url: string; email: string; password?: string }
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
  equipment_expiry: {
    consultant_name: string
    company_name: string
    centro_name: string
    equipment_type: string
    equipment_code: string
    expiry_date: string
    days_left: number
    action_url: string
  }
  consultant_weekly_pending: {
    consultant_name: string
    companies_table_html: string
    dashboard_url: string
  }
  consultant_weekly_summary: {
    consultant_name: string
    companies_table_html: string
    dashboard_url: string
  }
}

export type RenderResult = { subject: string; html: string }

const TEMPLATES: { [K in TemplateName]: (vars: TemplateMap[K]) => RenderResult } = {
  welcome: ({ user_name, login_url, email, password }) => ({
    subject: 'Bienvenido a Regis SG-SST',
    html: layout(
      'Bienvenido a Regis SG-SST',
      `
      <h1 style="margin:0 0 16px;font-size:20px;color:#0f172a">Hola ${esc(user_name)},</h1>
      <p style="margin:0 0 12px;color:#334155;line-height:1.5">
        Tu cuenta en la plataforma de cumplimiento SG-SST de Regis ya está activa.
      </p>
      <div style="margin:20px 0;padding:16px;background:#f8fafc;border-left:4px solid #0284c7;border-radius:0 8px 8px 0">
        <p style="margin:0 0 8px;color:#475569">
          <strong>Usuario (Email):</strong> ${esc(email)}
        </p>
        <p style="margin:0;color:#475569">
          <strong>Contraseña Temporal:</strong> <code style="background:#e2e8f0;padding:2px 6px;border-radius:4px;font-family:monospace">${password ? esc(password) : '*(Establecida por el administrador)*'}</code>
        </p>
      </div>
      <p style="margin:0 0 24px;color:#334155;line-height:1.5">
        Al ingresar por primera vez, te recomendamos cambiar tu contraseña desde tu perfil de usuario.
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
  equipment_expiry: ({
    consultant_name,
    company_name,
    centro_name,
    equipment_type,
    equipment_code,
    expiry_date,
    days_left,
    action_url,
  }) => {
    const isOverdue = days_left <= 0
    const color = isOverdue ? '#dc2626' : '#d97706'
    const statusText = isOverdue ? 'ha vencido' : `vencerá en ${days_left} días`

    return {
      subject: `Alerta de Vencimiento: ${equipment_type.toUpperCase()} - ${company_name}`,
      html: layout(
        'Alerta de Vencimiento de Equipo de Emergencia',
        `
        <h1 style="margin:0 0 16px;font-size:20px;color:#0f172a">Hola ${esc(consultant_name)},</h1>
        <p style="margin:0 0 12px;color:#334155;line-height:1.5">
          Te notificamos que el siguiente equipo de emergencia de la empresa <strong>${esc(company_name)}</strong> (Centro de Trabajo: ${esc(centro_name)}) requiere atención:
        </p>
        <div style="margin:20px 0;padding:16px;background:#f8fafc;border-left:4px solid ${color};border-radius:0 8px 8px 0">
          <p style="margin:0 0 8px;color:#475569">
            <strong>Tipo de Equipo:</strong> ${esc(equipment_type.toUpperCase())}
          </p>
          <p style="margin:0 0 8px;color:#475569">
            <strong>Código Interno:</strong> ${esc(equipment_code)}
          </p>
          <p style="margin:0 0 8px;color:#475569">
            <strong>Fecha de Vencimiento:</strong> <span style="color:${color};font-weight:bold">${esc(expiry_date)}</span>
          </p>
          <p style="margin:0;color:${color};font-weight:bold">
            Estado: El equipo ${statusText}.
          </p>
        </div>
        <p style="margin:0 0 24px;color:#334155;line-height:1.5">
          Por favor, coordina la revisión o recarga correspondiente con el cliente y registra la actualización en la plataforma.
        </p>
        ${button(action_url, 'Ver Inventario de Equipos')}
        `,
      ),
    }
  },
  consultant_weekly_pending: ({ consultant_name, companies_table_html, dashboard_url }) => ({
    subject: 'Resumen Semanal de Pendientes - Regis SG-SST',
    html: layout(
      'Resumen Semanal de Pendientes',
      `
      <h1 style="margin:0 0 16px;font-size:20px;color:#0f172a">Hola ${esc(consultant_name)},</h1>
      <p style="margin:0 0 16px;color:#334155;line-height:1.5">
        A continuación, te presentamos el estado de pendientes para tus clientes asignados de esta semana. 
        Úsalo para organizar tus prioridades y evitar retrasos en el cumplimiento legal.
      </p>
      <div style="margin:20px 0;overflow-x:auto">
        ${companies_table_html}
      </div>
      <p style="margin:24px 0 24px;color:#334155;line-height:1.5">
        Recuerda ingresar a la plataforma para gestionar estas tareas y subir las evidencias correspondientes.
      </p>
      ${button(dashboard_url, 'Ir al Panel Regis')}
      `,
    ),
  }),
  consultant_weekly_summary: ({ consultant_name, companies_table_html, dashboard_url }) => ({
    subject: 'Balance Semanal de Tareas - Regis SG-SST',
    html: layout(
      'Balance Semanal de Cumplimiento',
      `
      <h1 style="margin:0 0 16px;font-size:20px;color:#0f172a">Hola ${esc(consultant_name)},</h1>
      <p style="margin:0 0 16px;color:#334155;line-height:1.5">
        Aquí tienes el balance de tareas completadas esta semana y lo que aún permanece abierto con cada uno de tus clientes.
      </p>
      <div style="margin:20px 0;overflow-x:auto">
        ${companies_table_html}
      </div>
      <p style="margin:24px 0 24px;color:#334155;line-height:1.5">
        Buen fin de semana. El lunes a primera hora recibirás la lista actualizada de prioridades.
      </p>
      ${button(dashboard_url, 'Ir al Panel Regis')}
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
