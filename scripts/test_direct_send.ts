import { Resend } from 'resend'
import { renderTemplate } from '@/lib/notifications/templates'

async function run() {
  const apiKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL

  if (!apiKey || !fromEmail) {
    console.error('No api key or from email')
    process.exit(1)
  }

  const resend = new Resend(apiKey)

  const payload = {
    consultant_name: 'Valeria',
    companies_table_html: `
      <table style="width: 100%; border-collapse: collapse; margin-top: 16px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
        <thead>
          <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0">
            <th style="padding: 12px; text-align: left; font-size: 13px; font-weight: 600; color: #475569">Empresa Cliente</th>
            <th style="padding: 12px; text-align: center; font-size: 13px; font-weight: 600; color: #475569">Autoevaluación</th>
            <th style="padding: 12px; text-align: center; font-size: 13px; font-weight: 600; color: #475569">Gestión Documental</th>
            <th style="padding: 12px; text-align: center; font-size: 13px; font-weight: 600; color: #475569">Equipos Emergencia</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom: 1px solid #f1f5f9">
            <td style="padding: 14px 12px; font-size: 14px; font-weight: 500; color: #1e293b">Consultora Andina Solutions</td>
            <td style="padding: 14px 12px; text-align: center"><span style="display:inline-block; padding:4px 10px; background-color:#fef3c7; color:#d97706; border-radius:12px; font-weight:600; font-size:12px">2 pendientes</span></td>
            <td style="padding: 14px 12px; text-align: center"><span style="display:inline-block; padding:4px 10px; background-color:#e0f2fe; color:#0369a1; border-radius:12px; font-weight:600; font-size:12px">1 revisiones</span></td>
            <td style="padding: 14px 12px; text-align: center"><span style="display:inline-block; padding:4px 10px; background-color:#dcfce7; color:#15803d; border-radius:12px; font-weight:600; font-size:12px">Al día</span></td>
          </tr>
        </tbody>
      </table>
    `,
    dashboard_url: 'https://ltitkmipilzzuvomtlqf.supabase.co/regis/dashboard',
  }

  const rendered = renderTemplate('consultant_weekly_pending', payload as unknown)

  console.log('Enviando a dmaori.if@gmail.com...')
  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to: 'dmaori.if@gmail.com',
    subject: rendered.subject,
    html: rendered.html,
  })

  if (error) {
    console.error('Error de Resend:', error)
  } else {
    console.log('Enviado correctamente!', data)
  }
  process.exit(0)
}
run()
