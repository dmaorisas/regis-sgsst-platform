// =========================================================
// / — Home: redirige según el estado de sesión
// =========================================================
// Para el demo del concurso la home no muestra landing — va directo
// al dashboard apropiado o al login. Cualquier landing/marketing se
// añadiría en otro Bucket.
// =========================================================

import { redirect } from 'next/navigation'
import { getUserWithRoles } from '@/lib/auth/get-user-with-roles'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const user = await getUserWithRoles()
  if (!user) redirect('/login')
  if (user.isRegisStaff) redirect('/regis/dashboard')
  redirect('/dashboard')
}
