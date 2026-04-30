-- =========================================================
-- Migration: 014_auth_users_sync
-- Tasks: T-F1-018 / T-F1-019 — Auth Supabase + RBAC 4 roles
-- Issue: https://github.com/dmaorisas/regis-sgsst-platform/issues/24
-- Author: Operador-Agent (Bloque 4B)
-- =========================================================
-- Sincroniza auth.users (gestionado por Supabase Auth) con public.users
-- (modelo de dominio del SG-SST).
--
-- Implementamos DOS mecanismos complementarios (R7):
--   1) Trigger AFTER INSERT en auth.users → fn_sync_auth_user_to_public.
--      Sirve para los flujos donde Supabase crea el usuario fuera de
--      nuestra app (signup self-service, invite por email, magic-link).
--   2) RPC public.ensure_user_synced(auth_uid, email, nombre_completo).
--      SECURITY DEFINER, idempotente. La llamamos desde:
--        - scripts/seed_test_users.ts tras admin.createUser (para que
--          el seed pueda fijar nombre_completo explícito).
--        - src/lib/auth/get-user-with-roles.ts en el primer login,
--          como red de seguridad si el trigger no corrió.
--
-- Idempotencia: ambos caminos usan ON CONFLICT (auth_uid) DO UPDATE,
-- por lo que reejecutar (incluso ambos consecutivamente) no rompe.
-- =========================================================

CREATE OR REPLACE FUNCTION public.ensure_user_synced(
  p_auth_uid UUID,
  p_email TEXT,
  p_nombre_completo TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_nombre TEXT;
BEGIN
  -- Resolución de nombre: parámetro explícito → prefijo del email.
  v_nombre := COALESCE(NULLIF(p_nombre_completo, ''), split_part(p_email, '@', 1));

  -- Upsert por auth_uid. Si ya existe, devolvemos el id existente y
  -- (suavemente) actualizamos email si cambió.
  INSERT INTO public.users (auth_uid, email, nombre_completo, is_active)
  VALUES (p_auth_uid, p_email, v_nombre, TRUE)
  ON CONFLICT (auth_uid) DO UPDATE
    SET email = EXCLUDED.email,
        updated_at = NOW()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

COMMENT ON FUNCTION public.ensure_user_synced(UUID, TEXT, TEXT)
  IS 'Idempotente. UPSERT public.users por auth_uid. SECURITY DEFINER.';

-- Permitir que clientes autenticados puedan invocarla (necesario para
-- la sincronización lazy en el primer login).
GRANT EXECUTE ON FUNCTION public.ensure_user_synced(UUID, TEXT, TEXT)
  TO authenticated, service_role;

-- =========================================================
-- Trigger AFTER INSERT ON auth.users
-- =========================================================
-- Disparador: cualquier inserción en auth.users (signup público,
-- admin.createUser, magic-link) crea automáticamente la fila pública.
-- Si la fila ya existe (por ej. el seed la creó vía RPC), el ON CONFLICT
-- la deja intacta.
-- =========================================================

CREATE OR REPLACE FUNCTION public.fn_sync_auth_user_to_public()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nombre TEXT;
BEGIN
  v_nombre := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'name', ''),
    split_part(NEW.email, '@', 1)
  );

  INSERT INTO public.users (auth_uid, email, nombre_completo, is_active)
  VALUES (NEW.id, NEW.email, v_nombre, TRUE)
  ON CONFLICT (auth_uid) DO NOTHING;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.fn_sync_auth_user_to_public()
  IS 'Auto-crea public.users cuando se crea un auth.users. SECURITY DEFINER.';

DROP TRIGGER IF EXISTS trg_auth_users_sync ON auth.users;
CREATE TRIGGER trg_auth_users_sync
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_sync_auth_user_to_public();

-- Nota R7: COMMENT ON TRIGGER … ON auth.users requiere ser owner del
-- objeto, lo que el rol `postgres` del pooler no es. La descripción
-- del trigger queda en este comentario SQL en lugar de pg_description.
