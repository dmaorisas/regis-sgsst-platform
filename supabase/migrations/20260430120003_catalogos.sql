-- =========================================================
-- Migration: 003_catalogos
-- Task: T-F1-003 — Catálogos públicos (ciiu_codes, eps/afp/arl_catalog, ciiu_hazard_mapping, document_frequencies)
-- Issue: https://github.com/dmaorisas/regis-sgsst-platform/issues/20
-- Author: Operador-Agent
-- =========================================================
-- ERD v1 · D-002 (peligros típicos GTC-45 por CIIU) · D-006 (26 documentos)
-- T-F0-038 seeds: standards_0312_seed.json, ciiu_hazard_mapping_seed.json, frequencies_seed.json
-- =========================================================

-- =========================================================
-- ciiu_codes: códigos CIIU oficiales DANE
-- =========================================================
CREATE TABLE IF NOT EXISTS public.ciiu_codes (
  codigo TEXT PRIMARY KEY,
  descripcion TEXT NOT NULL,
  clase_riesgo INT NOT NULL CHECK (clase_riesgo BETWEEN 1 AND 5),
  decreto_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.ciiu_codes IS 'CIIU oficiales DANE + clase de riesgo per Decreto 1607/2002.';

-- Seed mínimo: los 5 CIIU prioritarios + algunos comunes
INSERT INTO public.ciiu_codes (codigo, descripcion, clase_riesgo, decreto_reference) VALUES
  ('7020', 'Actividades de consultoría de gestión', 1, 'Decreto 1607/2002'),
  ('4711', 'Comercio al por menor en establecimientos no especializados', 2, 'Decreto 1607/2002'),
  ('1410', 'Confección de prendas de vestir', 3, 'Decreto 1607/2002'),
  ('4290', 'Construcción de obras de ingeniería civil', 5, 'Decreto 1607/2002'),
  ('8610', 'Actividades de hospitales y clínicas', 4, 'Decreto 1607/2002'),
  ('4321', 'Instalaciones eléctricas', 4, 'Decreto 1607/2002'),
  ('4329', 'Otras instalaciones especializadas', 4, 'Decreto 1607/2002'),
  ('4719', 'Otros comercios al por menor especializados', 2, 'Decreto 1607/2002')
ON CONFLICT (codigo) DO NOTHING;

-- =========================================================
-- eps_catalog, afp_catalog, arl_catalog: nombres oficiales del Ministerio
-- =========================================================
CREATE TABLE IF NOT EXISTS public.eps_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  nit TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);
COMMENT ON TABLE public.eps_catalog IS 'Catálogo público EPS Colombia.';
INSERT INTO public.eps_catalog (nombre) VALUES
  ('EPS Sura'), ('Sanitas'), ('Compensar'), ('Famisanar'), ('Salud Total'),
  ('Coomeva'), ('Nueva EPS'), ('Aliansalud'), ('Mutualser')
ON CONFLICT (nombre) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.afp_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  nit TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);
COMMENT ON TABLE public.afp_catalog IS 'Catálogo público AFP Colombia.';
INSERT INTO public.afp_catalog (nombre) VALUES
  ('Porvenir'), ('Protección'), ('Colfondos'), ('Skandia'), ('Colpensiones')
ON CONFLICT (nombre) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.arl_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  nit TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);
COMMENT ON TABLE public.arl_catalog IS 'Catálogo público ARL Colombia.';
INSERT INTO public.arl_catalog (nombre) VALUES
  ('ARL Sura'), ('Positiva'), ('Bolívar'), ('Colmena Seguros'), ('Liberty Seguros'),
  ('Mapfre'), ('Equidad'), ('Axa Colpatria'), ('La Previsora')
ON CONFLICT (nombre) DO NOTHING;

-- =========================================================
-- ciiu_hazard_mapping: D-002, T-F0-038 seed (119 peligros)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.ciiu_hazard_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ciiu_codigo TEXT NOT NULL REFERENCES public.ciiu_codes(codigo) ON DELETE CASCADE,
  ciiu_description TEXT,
  applicable_chapter TEXT CHECK (applicable_chapter IN ('I', 'II', 'III')),
  peligro_categoria TEXT NOT NULL,
  peligro_nombre TEXT NOT NULL,
  peligro_fuente TEXT NOT NULL,
  possible_effects TEXT[] NOT NULL DEFAULT '{}',
  suggested_controls TEXT[] NOT NULL DEFAULT '{}',
  reference TEXT,
  prioridad INT DEFAULT 5 CHECK (prioridad BETWEEN 1 AND 10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ciiu_hazard_codigo ON public.ciiu_hazard_mapping(ciiu_codigo);
CREATE INDEX IF NOT EXISTS idx_ciiu_hazard_categoria ON public.ciiu_hazard_mapping(peligro_categoria);
COMMENT ON TABLE public.ciiu_hazard_mapping IS 'D-002 + T-F0-038: peligros típicos GTC-45 por CIIU. Seed importa 119 peligros para 5 CIIUs vía scripts/seed_research_data.ts.';

-- =========================================================
-- document_frequencies: D-006, T-F0-038 seed (26 documentos)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.document_frequencies (
  document_type TEXT PRIMARY KEY,
  document_name TEXT NOT NULL,
  frequency TEXT NOT NULL,
  frequency_value INT,
  frequency_unit TEXT,
  trigger_immediate TEXT,
  norm_reference TEXT NOT NULL,
  applies_when JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.document_frequencies IS 'D-006: 26 documentos legales con frecuencias. Seed desde docs/research/frequencies_seed.json vía scripts/seed_research_data.ts.';

-- Activar la FK de companies.ciiu_principal -> ciiu_codes.codigo (no la creamos en 002 porque ciiu_codes vive aquí)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_companies_ciiu_principal'
      AND table_name = 'companies'
  ) THEN
    ALTER TABLE public.companies
      ADD CONSTRAINT fk_companies_ciiu_principal
      FOREIGN KEY (ciiu_principal) REFERENCES public.ciiu_codes(codigo) ON DELETE SET NULL;
  END IF;
END $$;

-- Activar FK de centros_de_trabajo.ciiu_centro -> ciiu_codes.codigo
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_centros_ciiu_centro'
      AND table_name = 'centros_de_trabajo'
  ) THEN
    ALTER TABLE public.centros_de_trabajo
      ADD CONSTRAINT fk_centros_ciiu_centro
      FOREIGN KEY (ciiu_centro) REFERENCES public.ciiu_codes(codigo) ON DELETE SET NULL;
  END IF;
END $$;
