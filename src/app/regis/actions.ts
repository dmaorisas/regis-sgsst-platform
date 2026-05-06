'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function selectCompanyAction(formData: FormData) {
  const companyId = formData.get('companyId')?.toString()
  if (companyId) {
    cookies().set('selected_company_id', companyId, { path: '/' })
  }
  redirect('/dashboard')
}
