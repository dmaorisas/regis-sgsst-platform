/**
 * scripts/smoke_test_auth.ts
 *
 * Smoke test post-implementación Bloque 4B. Para cada usuario seedeado:
 *   1) Hace login via supabase.auth.signInWithPassword (HTTP).
 *   2) Captura las cookies de sesión.
 *   3) Hace GET a /dashboard y /regis/dashboard con esas cookies.
 *   4) Reporta los códigos HTTP y un fragmento del HTML.
 *
 * El objetivo no es UX completo — solo verificar que cada rol llega a la
 * pantalla correcta sin 500s.
 *
 * Uso:
 *   npm run dev   # en otra terminal
 *   npx tsx scripts/smoke_test_auth.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'node:path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!
const APP_URL = 'http://localhost:3000'
const PASSWORD = 'Demo2026!'

const USERS: Array<{ email: string; expectedHome: string }> = [
  { email: 'admin@regis.test', expectedHome: '/regis/dashboard' },
  { email: 'consultor@regis.test', expectedHome: '/regis/dashboard' },
  { email: 'admin@empresa1.test', expectedHome: '/dashboard' },
  { email: 'admin@empresa2.test', expectedHome: '/dashboard' },
  { email: 'admin@empresa3.test', expectedHome: '/dashboard' },
  { email: 'worker@empresa1.test', expectedHome: '/dashboard' },
]

function stringToBase64URL(s: string): string {
  return Buffer.from(s, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

async function loginAndCookies(email: string): Promise<string[]> {
  // 1) Authenticate via Supabase to get JWT.
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: PASSWORD })
  if (error || !data.session) throw new Error(`login ${email}: ${error?.message}`)

  // 2) @supabase/ssr 0.10 cookie format: nombre `sb-<ref>-auth-token`,
  //    valor `base64-<base64url(JSON)>`. JSON contiene los campos de
  //    Session + meta. Si el valor supera ~3072 bytes se chunkea con
  //    sufijo `.0`, `.1`, etc. — para tokens normales cabe en uno.
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
  const json = JSON.stringify(sessionPayload)
  const encoded = 'base64-' + stringToBase64URL(json)
  return [`${cookieName}=${encoded}`]
}

async function main() {
  console.log('=== Smoke test: auth + dashboards (Bloque 4B) ===\n')
  for (const u of USERS) {
    console.log(`--- ${u.email} (esperado: ${u.expectedHome}) ---`)
    try {
      const cookies = await loginAndCookies(u.email)

      // /dashboard
      const r1 = await fetch(`${APP_URL}/dashboard`, {
        headers: { cookie: cookies.join('; ') },
        redirect: 'manual',
      })
      console.log(`  GET /dashboard       → ${r1.status} ${r1.headers.get('location') ?? ''}`)

      // /regis/dashboard
      const r2 = await fetch(`${APP_URL}/regis/dashboard`, {
        headers: { cookie: cookies.join('; ') },
        redirect: 'manual',
      })
      console.log(`  GET /regis/dashboard → ${r2.status} ${r2.headers.get('location') ?? ''}`)

      // Si /dashboard responde 200 y el usuario no es Regis staff, capturamos snippet.
      if (u.expectedHome === '/dashboard' && r1.status === 200) {
        const html = await r1.text()
        const m = html.match(/<h1[^>]*>([^<]+)</)
        const pctMatch = html.match(/(\d+\.\d{2})\s*<\/span>\s*<span[^>]*>%/)
        console.log(`  → razón social: ${m?.[1] ?? '?'} | pct: ${pctMatch?.[1] ?? '?'}%`)
      } else if (u.expectedHome === '/regis/dashboard') {
        const r3 = await fetch(`${APP_URL}/regis/dashboard`, {
          headers: { cookie: cookies.join('; ') },
        })
        const html = await r3.text()
        // contar empresas en la tabla
        const count = (html.match(/td class="px-4 py-2.5 font-medium text-slate-900/g) ?? []).length
        const avgM = html.match(/Cumplimiento promedio[\s\S]*?(\d+\.\d)%/)
        console.log(`  → empresas en cartera: ${count} | promedio: ${avgM?.[1] ?? '?'}%`)
      }
    } catch (err) {
      console.error(`  ERROR:`, (err as Error).message)
    }
    console.log()
  }
}

main().catch((err) => {
  console.error('FATAL', err)
  process.exit(1)
})
