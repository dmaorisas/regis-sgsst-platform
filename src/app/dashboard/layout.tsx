import Header from '@/components/dashboard/Header'
import { getUserWithRoles } from '@/lib/auth/get-user-with-roles'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getUserWithRoles()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-[#fbf8fa] flex flex-col">
      <Header user={user} />
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}
