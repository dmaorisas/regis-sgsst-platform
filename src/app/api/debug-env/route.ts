import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const maskKey = (key?: string) => {
    if (!key) return 'MISSING'
    if (key.length < 10) return 'TOO_SHORT'
    return `${key.substring(0, 5)}...${key.substring(key.length - 5)} (length: ${key.length})`
  }

  return NextResponse.json({
    status: 'ok',
    environment: process.env.NODE_ENV,
    keys: {
      SUPABASE_URL: process.env.SUPABASE_URL ?? 'MISSING',
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'MISSING',
      SUPABASE_SERVICE_ROLE_KEY: maskKey(process.env.SUPABASE_SERVICE_ROLE_KEY),
      SUPABASE_ANON_KEY: maskKey(process.env.SUPABASE_ANON_KEY),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: maskKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      RESEND_API_KEY: maskKey(process.env.RESEND_API_KEY),
    },
  })
}
