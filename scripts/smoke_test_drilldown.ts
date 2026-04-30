/**
 * scripts/smoke_test_drilldown.ts
 * Verifica que el drill-down de un estándar carga sin error y muestra
 * el status correcto para cada empresa piloto.
 *
 * Uso:
 *   npm run dev   # otra terminal
 *   npx tsx scripts/smoke_test_drilldown.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'node:path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!
const APP_URL = 'http://localhost:3000'
const PASSWORD = 'Demo2026!'

function stringToBase64URL(s: string): string {
  return Buffer.from(s, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

async function loginAndCookies(email: string): Promise<string[]> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: PASSWORD })
  if (error || !data.session) throw new Error(`login ${email}: ${error?.message}`)
  const projectRef = SUPABASE_URL.replace('https://', '').split('.')[0]!
  const cookieName = `sb-${projectRef}-auth-token`
  const sessionPayload = {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_in: data.session.expires_in,
    expires_at: data.session.expires_at,
    token_type: data.session.token_type,
    user: data.user,
  }
  const encoded = 'base64-' + stringToBase64URL(JSON.stringify(sessionPayload))
  return [`${cookieName}=${encoded}`]
}

async function main() {
  // 1.1.1 — primer estándar Cap I (siempre aplicable a las 3 empresas).
  const STD = '870bb2bb-e9f9-411b-b045-6249b0b34c73'
  const url = `${APP_URL}/dashboard/standards/${STD}`

  for (const email of ['admin@empresa1.test', 'admin@empresa2.test', 'admin@regis.test']) {
    const cookies = await loginAndCookies(email)
    const res = await fetch(url, { headers: { cookie: cookies.join('; ') } })
    const html = await res.text()
    const title = html.match(/<h1[^>]*>([^<]+)</)?.[1] ?? '?'
    const statusM = html.match(/(Cumple|No cumple|No aplica|Pendiente)<\/span>/)?.[1] ?? '—'
    const noEval = /Sin evaluación registrada/.test(html)
    console.log(
      `[${email}] /dashboard/standards/${STD} → ${res.status} | ${title} | status: ${noEval ? 'sin evaluación' : statusM}`,
    )
  }
}

main().catch((err) => {
  console.error('FATAL', err)
  process.exit(1)
})
