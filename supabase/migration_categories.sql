-- ============================================================
-- MIFINANZA — Migración de Categorías v1
-- ============================================================
-- PROPÓSITO:
--   Crear tabla de categorías configurable por familia.
--   Cada familia tiene sus propias categorías custom.
--   Por defecto, se crean las categorías estándar.
--
-- TABLA CATEGORIES:
--   id: UUID (PK)
--   family_id: UUID (FK → families)
--   key: VARCHAR(50) - identificador único por familia (ej: 'food', 'cursos')
--   type: VARCHAR(20) - 'income', 'expense', 'saving'
--   label_es, label_en, label_fr: VARCHAR(100) - traducciones
--   color: VARCHAR(7) - código hex (ej: '#f87171')
--   is_custom: BOOLEAN - true si fue creada por el usuario, false si es estándar
--   created_at, updated_at: TIMESTAMP
--
-- TRIGGERS:
--   - Actualiza updated_at automáticamente
--   - Asegura que (family_id, key) sea único
-- ============================================================

-- ── Crear tabla categories ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  created_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  key TEXT NOT NULL,
  type public.txn_type NOT NULL, -- 'income', 'expense', 'saving'
  label_es VARCHAR(100),
  label_en VARCHAR(100),
  label_fr VARCHAR(100),
  color VARCHAR(7),
  color TEXT DEFAULT '#4f7cff', -- Color visual de la categoría
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(family_id, key, type)
);

-- 2. Habilitar seguridad por RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- 3. Crear Políticas de Seguridad RLS para las Categorías
CREATE POLICY "cat_all_policy" ON public.categories 
  FOR ALL 
  USING (family_id = auth_family_id())
  WITH CHECK (family_id = auth_family_id() AND NOT auth_is_kid());

  -- 4. Actualización de Tablas de Operaciones para usar Relación (Clave Foránea)
-- Mantenemos la flexibilidad cambiando/añadiendo la columna category_id
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;
ALTER TABLE public.recurring_payments ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;

-- Comentarios de documentación técnica en la Base de Datos
COMMENT ON TABLE public.categories IS 'Tabla de categorías personalizables por familia para transacciones, presupuestos y recurrentes.';
COMMENT ON COLUMN public.categories.key IS 'Slug único por familia de la categoría. Facilita migraciones o importaciones de CSV.';

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_categories_family_id ON categories(family_id);
CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(type);
CREATE INDEX IF NOT EXISTS idx_categories_family_type ON categories(family_id, type);

-- ── Trigger para actualizar updated_at ──────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_categories_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_categories_update_updated_at ON categories;
CREATE TRIGGER trigger_categories_update_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION trg_categories_update_updated_at();

-- ── RPC para crear categoría ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION rpc_add_category(
  p_family_id UUID,
  p_key VARCHAR,
  p_type VARCHAR,
  p_label_es VARCHAR,
  p_label_en VARCHAR,
  p_label_fr VARCHAR,
  p_color VARCHAR
)
RETURNS TABLE(id UUID, key VARCHAR, type VARCHAR, color VARCHAR) AS $$
DECLARE
  v_new_id UUID;
BEGIN
  INSERT INTO categories (family_id, key, type, label_es, label_en, label_fr, color, is_custom)
  VALUES (p_family_id, p_key, p_type, p_label_es, p_label_en, p_label_fr, p_color, TRUE)
  RETURNING categories.id INTO v_new_id;
  
  RETURN QUERY
  SELECT categories.id, categories.key, categories.type, categories.color
  FROM categories
  WHERE categories.id = v_new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── RPC para editar categoría ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION rpc_edit_category(
  p_category_id UUID,
  p_label_es VARCHAR DEFAULT NULL,
  p_label_en VARCHAR DEFAULT NULL,
  p_label_fr VARCHAR DEFAULT NULL,
  p_color VARCHAR DEFAULT NULL
)
RETURNS TABLE(id UUID, key VARCHAR, type VARCHAR, color VARCHAR) AS $$
BEGIN
  UPDATE categories
  SET
    label_es = COALESCE(p_label_es, label_es),
    label_en = COALESCE(p_label_en, label_en),
    label_fr = COALESCE(p_label_fr, label_fr),
    color = COALESCE(p_color, color)
  WHERE id = p_category_id;
  
  RETURN QUERY
  SELECT categories.id, categories.key, categories.type, categories.color
  FROM categories
  WHERE categories.id = p_category_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── RPC para eliminar categoría (solo si es custom) ─────────────────────────
CREATE OR REPLACE FUNCTION rpc_delete_category(
  p_category_id UUID
)
RETURNS TABLE(deleted BOOLEAN) AS $$
DECLARE
  v_is_custom BOOLEAN;
BEGIN
  SELECT is_custom INTO v_is_custom FROM categories WHERE id = p_category_id;
  
  -- Solo se pueden eliminar categorías custom
  IF v_is_custom IS FALSE THEN
    RETURN QUERY SELECT FALSE;
    RETURN;
  END IF;
  
  DELETE FROM categories WHERE id = p_category_id;
  RETURN QUERY SELECT TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── SEED: Crear categorías por defecto para CADA familia ────────────────────
-- Nota: Este seed se ejecuta manualmente para cada familia que existe.
-- Para nuevas familias, usa rpc_create_family_with_categories().

DO $$
DECLARE
  v_family_id UUID;
BEGIN
  -- Iterar sobre todas las familias
  FOR v_family_id IN
    SELECT id FROM families
  LOOP
    -- Verificar si ya existen categorías para esta familia
    IF NOT EXISTS (SELECT 1 FROM categories WHERE family_id = v_family_id) THEN
      -- INGRESOS
      INSERT INTO categories (family_id, key, type, label_es, label_en, label_fr, color, is_custom)
      VALUES
        (v_family_id, 'salary', 'income', 'Salario', 'Salary', 'Salaire', '#34d399', FALSE),
        (v_family_id, 'freelance', 'income', 'Freelance', 'Freelance', 'Freelance', '#6ee7b7', FALSE),
        (v_family_id, 'investment', 'income', 'Inversión', 'Investment', 'Investissement', '#a7f3d0', FALSE),
        (v_family_id, 'tax_refund', 'income', 'Retorno de impuestos', 'Tax refund', 'Retour d''impôts', '#6ee7b7', FALSE),
        (v_family_id, 'child_benefit_canada', 'income', 'Beneficio infantil Canadá', 'Canada child benefit', 'Allocation des enfants Canada', '#7dd3fc', FALSE),
        (v_family_id, 'child_benefit_quebec', 'income', 'Beneficio infantil Québec', 'Quebec child benefit', 'Allocation des enfants Québec', '#38bdf8', FALSE),
        (v_family_id, 'credit_card_points', 'income', 'Puntos tarjeta de crédito', 'Credit card points', 'Points carte de crédit', '#a5b4fc', FALSE),
        (v_family_id, 'other_income', 'income', 'Otro ingreso', 'Other income', 'Autre revenu', '#d1fae5', FALSE),
      
      -- GASTOS
        (v_family_id, 'food', 'expense', 'Alimentación', 'Food', 'Alimentation', '#f87171', FALSE),
        (v_family_id, 'groceries', 'expense', 'Supermercado', 'Groceries', 'Épicerie', '#fca5a5', FALSE),
        (v_family_id, 'housing', 'expense', 'Vivienda', 'Housing', 'Logement', '#fb923c', FALSE),
        (v_family_id, 'transport', 'expense', 'Transporte', 'Transport', 'Transport', '#fbbf24', FALSE),
        (v_family_id, 'health', 'expense', 'Salud', 'Health', 'Santé', '#e879f9', FALSE),
        (v_family_id, 'entertainment', 'expense', 'Entretenimiento', 'Entertainment', 'Divertissement', '#818cf8', FALSE),
        (v_family_id, 'education', 'expense', 'Educación', 'Education', 'Éducation', '#38bdf8', FALSE),
        (v_family_id, 'clothing', 'expense', 'Ropa', 'Clothing', 'Vêtements', '#f472b6', FALSE),
        (v_family_id, 'utilities', 'expense', 'Servicios', 'Utilities', 'Services', '#60a5fa', FALSE),
        (v_family_id, 'insurance', 'expense', 'Seguros', 'Insurance', 'Assurance', '#a78bfa', FALSE),
        (v_family_id, 'mortgage', 'expense', 'Hipoteca', 'Mortgage', 'Hypothèque', '#f97316', FALSE),
        (v_family_id, 'car', 'expense', 'Auto', 'Car', 'Auto', '#facc15', FALSE),
        (v_family_id, 'debts', 'expense', 'Deudas', 'Debts', 'Dettes', '#67e8f9', FALSE),
        (v_family_id, 'formation', 'expense', 'Formación', 'Formation', 'Formation', '#fbbf24', FALSE),
        (v_family_id, 'cursos', 'expense', 'Cursos', 'Courses', 'Cours', '#38bdf8', FALSE),
        (v_family_id, 'cuota_hija', 'expense', 'Cuota hija', 'Child support quota', 'Pension enfant', '#fbbf24', FALSE),
        (v_family_id, 'kids_activities', 'expense', 'Actividades niños', 'Kids activities', 'Activités enfants', '#fbbf24', FALSE),
        (v_family_id, 'kids_support', 'expense', 'Soporte niños', 'Kids support', 'Soutien enfants', '#f472b6', FALSE),
        (v_family_id, 'kids_wishlist', 'expense', 'Wishlist niños', 'Kids wishlist', 'Wishlist enfants', '#34d399', FALSE),
        (v_family_id, 'travel', 'expense', 'Viajes', 'Travel', 'Voyage', '#fb7185', FALSE),
        (v_family_id, 'subscription', 'expense', 'Suscripciones', 'Subscription', 'Abonnement', '#818cf8', FALSE),
        (v_family_id, 'gift', 'expense', 'Regalos', 'Gift', 'Cadeau', '#fbbf24', FALSE),
        (v_family_id, 'donations', 'expense', 'Donaciones', 'Donations', 'Dons', '#fcd34d', FALSE),
        (v_family_id, 'credit_card_fees', 'expense', 'Comisiones tarjeta', 'Credit card fees', 'Frais carte de crédit', '#fb7185', FALSE),
        (v_family_id, 'other_expense', 'expense', 'Otro gasto', 'Other expense', 'Autre dépense', '#94a3b8', FALSE),
      
      -- AHORROS
        (v_family_id, 'emergency', 'saving', 'Emergencias', 'Emergency', 'Urgences', '#fcd34d', FALSE),
        (v_family_id, 'vacation', 'saving', 'Vacaciones', 'Vacation', 'Vacances', '#67e8f9', FALSE),
        (v_family_id, 'retirement', 'saving', 'Retiro', 'Retirement', 'Retraite', '#c084fc', FALSE),
        (v_family_id, 'goal', 'saving', 'Meta', 'Goal', 'Objectif', '#86efac', FALSE),
        (v_family_id, 'transfer', 'saving', 'Transferencia', 'Transfer', 'Transfert', '#94a3b8', FALSE),
        (v_family_id, 'transfer_to_saving', 'saving', 'Transferencia a ahorros', 'Transfer to saving', 'Transfert vers épargne', '#2dd4a0', FALSE),
        (v_family_id, 'credit_card_payment', 'saving', 'Pago tarjeta de crédito', 'Credit card payment', 'Paiement carte', '#ff6b6b', FALSE);
      
    END IF;
  END LOOP;
END $$;

-- ✅ Migración de categorías completada



-- Limpieza: eliminar columna category de debts (si existía)
ALTER TABLE debts
  DROP COLUMN category;

-- Agregar nueva columna category_id a debts para relacionar con categories
ALTER TABLE debts
  ADD COLUMN category_id UUID REFERENCES categories(id) ON DELETE SET NULL;

-- Limpieza: eliminar columna category de budgets (si existía)
ALTER TABLE recurring_payments
  DROP COLUMN category;

-- Agregar nueva columna category_id a recurring_payments para relacionar con categories
ALTER TABLE recurring_payments
  ADD COLUMN category_id UUID REFERENCES categories(id) ON DELETE SET NULL;




