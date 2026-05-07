import { getSupabaseAdminClient } from './src/lib/supabase-admin.ts'

async function run() {
  const adminSupabase = getSupabaseAdminClient()
  const { data: company, error } = await adminSupabase
    .from('companies')
    .select('name, razon_social, ciiu_principal')
    .limit(1)
  console.log({ company, error })
}
run()
