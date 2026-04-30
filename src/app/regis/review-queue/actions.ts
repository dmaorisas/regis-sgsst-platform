'use server'

// =========================================================
// Server Actions — review-queue (T-F15-003)
// =========================================================
// approveItem / rejectItem / correctItem invocadas desde la página de
// detalle. Validan rol regis_admin/regis_consultant y mutan el estado.
//
// Decisión técnica (R7): usamos getSupabaseAdminClient (bypass RLS)
// porque la migration tiene una política UPDATE estricta que exige que
// `reviewer_id = current_app_user_id()`, lo cual depende de la sesión
// del usuario corriendo el SQL. Como el server action ya validó el rol
// con getUserWithRoles, mutamos directo y persistimos manualmente
// reviewer_id = user.app_user_id. Esto centraliza la auditoría en un
// solo punto y evita la dependencia frágil de la sesión Supabase
// dentro de la transacción.
// =========================================================

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getUserWithRoles } from '@/lib/auth/get-user-with-roles'
import { getSupabaseAdminClient } from '@/lib/supabase-admin'

async function requireRegisStaffOrRedirect() {
  const user = await getUserWithRoles()
  if (!user) redirect('/login')
  if (!user.isRegisStaff) redirect('/dashboard')
  return user
}

type ActionResult = { ok: true } | { ok: false; error: string }

export async function approveItem(itemId: string): Promise<ActionResult> {
  const user = await requireRegisStaffOrRedirect()
  const admin = getSupabaseAdminClient()

  const { error } = await admin
    .from('ai_outputs_pending_review')
    .update({
      status: 'approved',
      reviewer_id: user.app_user_id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', itemId)
    .eq('status', 'pending') // guarda contra doble click

  if (error) return { ok: false, error: error.message }

  revalidatePath('/regis/review-queue')
  revalidatePath(`/regis/review-queue/${itemId}`)
  return { ok: true }
}

export async function rejectItem(itemId: string, notes: string): Promise<ActionResult> {
  const user = await requireRegisStaffOrRedirect()
  const trimmed = notes.trim()
  if (trimmed.length === 0) return { ok: false, error: 'Las notas de rechazo son obligatorias.' }

  const admin = getSupabaseAdminClient()
  const { error } = await admin
    .from('ai_outputs_pending_review')
    .update({
      status: 'rejected',
      reviewer_id: user.app_user_id,
      reviewed_at: new Date().toISOString(),
      notes: trimmed,
    })
    .eq('id', itemId)
    .eq('status', 'pending')

  if (error) return { ok: false, error: error.message }

  revalidatePath('/regis/review-queue')
  revalidatePath(`/regis/review-queue/${itemId}`)
  return { ok: true }
}

export async function correctItem(
  itemId: string,
  correctionsJson: string,
  notes: string,
): Promise<ActionResult> {
  const user = await requireRegisStaffOrRedirect()
  let corrections: unknown
  try {
    corrections = JSON.parse(correctionsJson)
  } catch {
    return { ok: false, error: 'El JSON de correcciones no es válido.' }
  }

  const admin = getSupabaseAdminClient()
  const { error } = await admin
    .from('ai_outputs_pending_review')
    .update({
      status: 'corrected',
      reviewer_id: user.app_user_id,
      reviewed_at: new Date().toISOString(),
      corrections,
      notes: notes.trim() || null,
    })
    .eq('id', itemId)
    .eq('status', 'pending')

  if (error) return { ok: false, error: error.message }

  revalidatePath('/regis/review-queue')
  revalidatePath(`/regis/review-queue/${itemId}`)
  return { ok: true }
}
