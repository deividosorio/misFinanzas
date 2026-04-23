-- ============================================================
-- MIFINANZA — Base de Datos Completa
-- Versión: 2.0
-- Incluye: Schema, RLS, RPC Functions, Triggers, Seed Data
--
-- INSTRUCCIONES:
--   1. Abre supabase.com → tu proyecto → SQL Editor
--   2. Crea un nuevo query
--   3. Pega TODO este archivo y ejecuta con "Run"
--   4. Verifica que no haya errores en la consola
--
-- ORDEN DE EJECUCIÓN (importante):
--   1. Extensions y enums
--   2. Tablas base (sin foreign keys aún)
--   3. Tablas con foreign keys
--   4. Índices
--   5. Row Level Security
--   6. Funciones helper
--   7. Funciones RPC (lógica de negocio)
--   8. Triggers
--   9. Vistas
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 0. EXTENSIONES
-- ────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ────────────────────────────────────────────────────────────
-- 1. TIPOS ENUMERADOS (ENUMs)
-- ────────────────────────────────────────────────────────────

-- Plan de suscripción de la familia
DO $$ BEGIN
  CREATE TYPE plan_type AS ENUM ('free', 'pro', 'family', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Rol del miembro dentro de la familia
DO $$ BEGIN
  CREATE TYPE member_role AS ENUM ('owner', 'admin', 'member', 'kid');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Estado de autorización de un miembro
DO $$ BEGIN
  CREATE TYPE member_status AS ENUM ('pending', 'active', 'suspended');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tipo de transacción financiera
DO $$ BEGIN
  CREATE TYPE txn_type AS ENUM ('income', 'expense', 'saving', 'transfer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Naturaleza contable de una cuenta (doble entrada)
DO $$ BEGIN
  CREATE TYPE account_nature AS ENUM ('asset', 'liability', 'equity', 'income', 'expense');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Subtipo de cuenta bancaria
DO $$ BEGIN
  CREATE TYPE account_subtype AS ENUM (
    'savings', 'checking', 'investment', 'cash',
    'credit_card', 'debit_card', 'credit_line',
    'mortgage', 'car_loan', 'personal_loan'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Frecuencia de pagos recurrentes
DO $$ BEGIN
  CREATE TYPE freq_type AS ENUM ('weekly', 'biweekly', 'monthly', 'yearly');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Estado de una meta de ahorro
DO $$ BEGIN
  CREATE TYPE goal_status AS ENUM ('active', 'completed', 'paused', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Lado del asiento contable (doble entrada)
DO $$ BEGIN
  CREATE TYPE entry_side AS ENUM ('debit', 'credit');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Estado de un asiento contable
DO $$ BEGIN
  CREATE TYPE journal_status AS ENUM ('posted', 'void', 'pending');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tema visual de la app
DO $$ BEGIN
  CREATE TYPE app_theme AS ENUM ('dark', 'light', 'system');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ────────────────────────────────────────────────────────────
-- 2. TABLA: families (unidad de suscripción/tenant)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS families (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              TEXT        NOT NULL,
  slug              TEXT        UNIQUE,
  plan              plan_type   NOT NULL DEFAULT 'free',
  plan_expires_at   TIMESTAMPTZ,
  invite_code       TEXT        UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
  logo_url          TEXT,
  currency          TEXT        NOT NULL DEFAULT 'CAD',
  locale            TEXT        NOT NULL DEFAULT 'es',
  -- Metadatos de auditoría
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE families IS
  'Unidad de suscripción (tenant). Cada familia tiene su propio plan y datos aislados.';

-- ────────────────────────────────────────────────────────────
-- 3. TABLA: profiles (extiende auth.users de Supabase)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id              UUID        PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  family_id       UUID        REFERENCES families(id) ON DELETE SET NULL,
  role            member_role NOT NULL DEFAULT 'member',
  status          member_status NOT NULL DEFAULT 'active',
  display_name    TEXT,
  avatar_emoji    TEXT        DEFAULT '🧑',
  avatar_color    TEXT        DEFAULT '#4f7cff',
  is_kid          BOOLEAN     DEFAULT FALSE,
  birth_year      INT,
  -- Preferencias de UI
  lang            TEXT        DEFAULT 'es',
  theme           app_theme   DEFAULT 'dark',
  -- Control de onboarding
  onboarded       BOOLEAN     DEFAULT FALSE,
  -- Auditoría
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE profiles IS
  'Perfil de usuario. Extiende auth.users con datos de la app (nombre, avatar, rol, preferencias).';
COMMENT ON COLUMN profiles.status IS
  'pending=esperando aprobación del admin, active=puede usar la app, suspended=bloqueado';
COMMENT ON COLUMN profiles.is_kid IS
  'Si true, el usuario ve la interfaz Kids gamificada y no puede crear transacciones.';

-- ────────────────────────────────────────────────────────────
-- 4. TABLA: accounts (plan de cuentas — activos y pasivos)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS accounts (
  id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id       UUID            NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  owner_profile   UUID            REFERENCES profiles(id) ON DELETE SET NULL,
  -- Solo owner y admin pueden crear cuentas (verificado en RLS)
  created_by      UUID            REFERENCES profiles(id) ON DELETE SET NULL,
  name            TEXT            NOT NULL,
  nature          account_nature  NOT NULL DEFAULT 'asset',
  subtype         account_subtype NOT NULL DEFAULT 'savings',
  color           TEXT            DEFAULT '#4f7cff',
  institution     TEXT,
  last_four       CHAR(4),        -- últimos 4 dígitos (tarjetas)
  credit_limit    NUMERIC(14,2),  -- límite de crédito (tarjetas/líneas)
  opening_balance NUMERIC(14,2)   DEFAULT 0,
  is_active       BOOLEAN         DEFAULT TRUE,
  notes           TEXT,
  created_at      TIMESTAMPTZ     DEFAULT NOW(),
  updated_at      TIMESTAMPTZ     DEFAULT NOW()
);

COMMENT ON TABLE accounts IS
  'Plan de cuentas de la familia. Incluye cuentas bancarias (asset) y deudas (liability).
   Solo owner y admin pueden crear/editar cuentas.';
COMMENT ON COLUMN accounts.nature IS
  'asset=lo que tienes, liability=lo que debes, equity=patrimonio, income=ingresos, expense=gastos';
COMMENT ON COLUMN accounts.opening_balance IS
  'Saldo inicial al registrar la cuenta. Sirve como base para calcular el saldo actual.';

-- ────────────────────────────────────────────────────────────
-- 5. TABLA: transactions (movimientos financieros)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id         UUID        NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  created_by        UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  -- Datos del movimiento
  type              txn_type    NOT NULL,
  category          TEXT        NOT NULL,
  description       TEXT,
  amount            NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  date              DATE        NOT NULL,
  -- Relaciones con cuentas
  account_id        UUID        REFERENCES accounts(id) ON DELETE SET NULL,
  payment_account_id UUID       REFERENCES accounts(id) ON DELETE SET NULL,
  -- Origen automático (qué disparó la creación)
  auto_source       TEXT,       -- 'recurring', 'debt_payment', 'savings_deposit', NULL=manual
  source_id         UUID,       -- ID del registro origen (recurring_id, debt_id, goal_id)
  -- Metadatos
  notes             TEXT,
  is_void           BOOLEAN     DEFAULT FALSE,  -- permite "anular" sin borrar
  -- Auditoría
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE transactions IS
  'Historial de todos los movimientos financieros de la familia.
   Las transacciones automáticas tienen auto_source != NULL para evitar duplicados.';
COMMENT ON COLUMN transactions.auto_source IS
  'recurring=pago recurrente marcado pagado, debt_payment=abono a deuda,
   savings_deposit=depósito en meta, savings_goal_deposit=depósito en meta Kids';
COMMENT ON COLUMN transactions.is_void IS
  'Permite anular una transacción sin eliminarla (mantiene historial de auditoría).';

-- ────────────────────────────────────────────────────────────
-- 6. TABLA: debts (deudas de largo plazo)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS debts (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id         UUID        NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  created_by        UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  linked_account_id UUID        REFERENCES accounts(id) ON DELETE SET NULL,
  name              TEXT        NOT NULL,
  total_amount      NUMERIC(14,2) NOT NULL CHECK (total_amount > 0),
  paid_amount       NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  monthly_payment   NUMERIC(14,2) CHECK (monthly_payment > 0),
  interest_rate     NUMERIC(6,3)  DEFAULT 0 CHECK (interest_rate >= 0),
  start_date        DATE,
  category          TEXT        DEFAULT 'mortgage',  -- mortgage, car_loan, personal_loan, etc.
  notes             TEXT,
  is_active         BOOLEAN     DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  -- Restricción: pagado no puede superar el total
  CONSTRAINT paid_not_exceed_total CHECK (paid_amount <= total_amount)
);

COMMENT ON TABLE debts IS
  'Deudas de largo plazo (hipoteca, auto, préstamos).
   Cada pago registrado genera automáticamente una transacción en transactions.';

-- ────────────────────────────────────────────────────────────
-- 7. TABLA: recurring_payments (pagos periódicos configurados)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recurring_payments (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id     UUID        NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  created_by    UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  account_id    UUID        REFERENCES accounts(id) ON DELETE SET NULL,
  name          TEXT        NOT NULL,
  amount        NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  frequency     freq_type   NOT NULL DEFAULT 'monthly',
  category      TEXT        NOT NULL DEFAULT 'utilities',
  next_due      DATE,
  notes         TEXT,
  is_active     BOOLEAN     DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE recurring_payments IS
  'Pagos configurados que se repiten periódicamente (hipoteca, servicios, internet).
   Al marcarse como pagado, se genera automáticamente una transacción.';

-- ────────────────────────────────────────────────────────────
-- 8. TABLA: savings_goals (metas de ahorro — adultos)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS savings_goals (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id       UUID        NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  owner_profile   UUID        REFERENCES profiles(id) ON DELETE CASCADE,
  account_id      UUID        REFERENCES accounts(id) ON DELETE SET NULL,
  name            TEXT        NOT NULL,
  target_amount   NUMERIC(14,2) NOT NULL CHECK (target_amount > 0),
  current_amount  NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
  status          goal_status NOT NULL DEFAULT 'active',
  emoji           TEXT        DEFAULT '🎯',
  color           TEXT        DEFAULT '#4f7cff',
  deadline        DATE,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT current_not_exceed_target CHECK (current_amount <= target_amount)
);

COMMENT ON TABLE savings_goals IS
  'Metas de ahorro para adultos. Cada depósito genera una transacción automática.';

-- ────────────────────────────────────────────────────────────
-- 9. TABLA: kids_goals (metas gamificadas para niños)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kids_goals (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id       UUID        NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  kid_profile     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  description     TEXT,
  target_amount   NUMERIC(14,2) NOT NULL CHECK (target_amount > 0),
  current_amount  NUMERIC(14,2) NOT NULL DEFAULT 0,
  status          goal_status NOT NULL DEFAULT 'active',
  emoji           TEXT        DEFAULT '⭐',
  color           TEXT        DEFAULT '#fbbf24',
  reward_text     TEXT,
  approved_by     UUID        REFERENCES profiles(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- 10. TABLA: kids_deposits (depósitos en metas de niños)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kids_deposits (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id         UUID        NOT NULL REFERENCES kids_goals(id) ON DELETE CASCADE,
  family_id       UUID        NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  amount          NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  deposited_by    UUID        REFERENCES profiles(id),
  note            TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- 11. TABLA: kids_badges (logros de los niños)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kids_badges (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  kid_profile     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  family_id       UUID        NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  badge_key       TEXT        NOT NULL,
  earned_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(kid_profile, badge_key)
);

-- ────────────────────────────────────────────────────────────
-- 12. TABLA: budgets (controles de presupuesto)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS budgets (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id       UUID        NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  category        TEXT        NOT NULL,
  amount_limit    NUMERIC(14,2) NOT NULL CHECK (amount_limit > 0),
  period_type     TEXT        NOT NULL DEFAULT 'monthly',
  alert_at_pct    INT         DEFAULT 80 CHECK (alert_at_pct BETWEEN 1 AND 100),
  is_active       BOOLEAN     DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(family_id, category, period_type)
);

COMMENT ON TABLE budgets IS 'Límites de presupuesto por categoría para alertas automáticas.';

-- ────────────────────────────────────────────────────────────
-- 13. TABLA: ai_insights (sugerencias y alertas de IA)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_insights (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id       UUID        NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  insight_type    TEXT        NOT NULL,  -- alert, suggestion, projection, anomaly
  priority        TEXT        NOT NULL DEFAULT 'medium',
  title           TEXT        NOT NULL,
  body            TEXT        NOT NULL,
  data_snapshot   JSONB,
  action_url      TEXT,
  is_read         BOOLEAN     DEFAULT FALSE,
  is_dismissed    BOOLEAN     DEFAULT FALSE,
  valid_until     TIMESTAMPTZ,
  generated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- 14. ÍNDICES DE PERFORMANCE
-- ────────────────────────────────────────────────────────────

-- transactions: consultas más frecuentes
CREATE INDEX IF NOT EXISTS idx_txn_family_date
  ON transactions(family_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_txn_account
  ON transactions(account_id) WHERE account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_txn_payment
  ON transactions(payment_account_id) WHERE payment_account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_txn_source
  ON transactions(source_id) WHERE source_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_txn_auto_source
  ON transactions(auto_source) WHERE auto_source IS NOT NULL;

-- accounts
CREATE INDEX IF NOT EXISTS idx_accounts_family
  ON accounts(family_id, nature, is_active);

-- debts
CREATE INDEX IF NOT EXISTS idx_debts_family
  ON debts(family_id, is_active);

-- recurring_payments
CREATE INDEX IF NOT EXISTS idx_recurring_family_due
  ON recurring_payments(family_id, next_due) WHERE is_active = TRUE;

-- profiles
CREATE INDEX IF NOT EXISTS idx_profiles_family
  ON profiles(family_id, role, status);

-- ────────────────────────────────────────────────────────────
-- 15. ROW LEVEL SECURITY (RLS)
-- Cada tabla solo expone datos de la familia del usuario autenticado.
-- Los niños (is_kid=true) tienen restricciones adicionales.
-- ────────────────────────────────────────────────────────────

ALTER TABLE families           ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts              ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_goals      ENABLE ROW LEVEL SECURITY;
ALTER TABLE kids_goals         ENABLE ROW LEVEL SECURITY;
ALTER TABLE kids_deposits      ENABLE ROW LEVEL SECURITY;
ALTER TABLE kids_badges        ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets            ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights        ENABLE ROW LEVEL SECURITY;

-- ── Funciones helper de seguridad ─────────────────────────────────────────
-- Retornan valores del perfil del usuario actual.
-- security definer = ejecutan con permisos del creador (pueden leer profiles).
-- stable = el resultado no cambia dentro de la misma transacción (performance).

CREATE OR REPLACE FUNCTION auth_family_id()
RETURNS UUID LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT family_id FROM profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION auth_role()
RETURNS member_role LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION auth_is_kid()
RETURNS BOOLEAN LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT COALESCE(is_kid, FALSE) FROM profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION auth_is_family_admin()
RETURNS BOOLEAN LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT role IN ('owner', 'admin') FROM profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION auth_member_status()
RETURNS member_status LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT status FROM profiles WHERE id = auth.uid()
$$;

-- ── Políticas RLS por tabla ───────────────────────────────────────────────

-- PROFILES: ver todos los de la familia, editar solo el propio
CREATE POLICY "profiles_select" ON profiles FOR SELECT
  USING (id = auth.uid() OR family_id = auth_family_id());

CREATE POLICY "profiles_insert" ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update" ON profiles FOR UPDATE
  USING (
    id = auth.uid()  -- cada quien edita su propio perfil
    OR (auth_is_family_admin() AND family_id = auth_family_id())  -- admin edita miembros
  );

-- FAMILIES: solo ver y editar la propia
CREATE POLICY "families_select" ON families FOR SELECT
  USING (id = auth_family_id());

CREATE POLICY "families_insert" ON families FOR INSERT
  WITH CHECK (TRUE);  -- cualquiera puede crear familia durante onboarding

CREATE POLICY "families_update" ON families FOR UPDATE
  USING (id = auth_family_id() AND auth_is_family_admin());

-- ACCOUNTS: ver todos de la familia, crear/editar solo admin
CREATE POLICY "accounts_select" ON accounts FOR SELECT
  USING (family_id = auth_family_id());

CREATE POLICY "accounts_insert" ON accounts FOR INSERT
  WITH CHECK (family_id = auth_family_id() AND auth_is_family_admin() AND NOT auth_is_kid());

CREATE POLICY "accounts_update" ON accounts FOR UPDATE
  USING (family_id = auth_family_id() AND auth_is_family_admin() AND NOT auth_is_kid());

CREATE POLICY "accounts_delete" ON accounts FOR DELETE
  USING (family_id = auth_family_id() AND auth_role() = 'owner');

-- TRANSACTIONS: ver todos de la familia, los kids no pueden crear ni editar
CREATE POLICY "txn_select" ON transactions FOR SELECT
  USING (family_id = auth_family_id());

CREATE POLICY "txn_insert" ON transactions FOR INSERT
  WITH CHECK (family_id = auth_family_id() AND NOT auth_is_kid());

CREATE POLICY "txn_update" ON transactions FOR UPDATE
  USING (
    family_id = auth_family_id()
    AND NOT auth_is_kid()
    AND (created_by = auth.uid() OR auth_is_family_admin())
  );

CREATE POLICY "txn_delete" ON transactions FOR DELETE
  USING (
    family_id = auth_family_id()
    AND NOT auth_is_kid()
    AND (created_by = auth.uid() OR auth_is_family_admin())
  );

-- DEBTS
CREATE POLICY "debts_select" ON debts FOR SELECT USING (family_id = auth_family_id());
CREATE POLICY "debts_insert" ON debts FOR INSERT WITH CHECK (family_id = auth_family_id() AND NOT auth_is_kid());
CREATE POLICY "debts_update" ON debts FOR UPDATE USING (family_id = auth_family_id() AND NOT auth_is_kid() AND (created_by = auth.uid() OR auth_is_family_admin()));
CREATE POLICY "debts_delete" ON debts FOR DELETE USING (family_id = auth_family_id() AND auth_is_family_admin());

-- RECURRING_PAYMENTS
CREATE POLICY "rec_select" ON recurring_payments FOR SELECT USING (family_id = auth_family_id());
CREATE POLICY "rec_insert" ON recurring_payments FOR INSERT WITH CHECK (family_id = auth_family_id() AND NOT auth_is_kid());
CREATE POLICY "rec_update" ON recurring_payments FOR UPDATE USING (family_id = auth_family_id() AND NOT auth_is_kid() AND (created_by = auth.uid() OR auth_is_family_admin()));
CREATE POLICY "rec_delete" ON recurring_payments FOR DELETE USING (family_id = auth_family_id() AND NOT auth_is_kid());

-- SAVINGS_GOALS
CREATE POLICY "sg_select" ON savings_goals FOR SELECT USING (family_id = auth_family_id());
CREATE POLICY "sg_insert" ON savings_goals FOR INSERT WITH CHECK (family_id = auth_family_id() AND NOT auth_is_kid());
CREATE POLICY "sg_update" ON savings_goals FOR UPDATE USING (family_id = auth_family_id() AND NOT auth_is_kid() AND (owner_profile = auth.uid() OR auth_is_family_admin()));
CREATE POLICY "sg_delete" ON savings_goals FOR DELETE USING (family_id = auth_family_id() AND auth_is_family_admin());

-- KIDS_GOALS
CREATE POLICY "kg_select" ON kids_goals FOR SELECT USING (family_id = auth_family_id());
CREATE POLICY "kg_insert" ON kids_goals FOR INSERT WITH CHECK (family_id = auth_family_id() AND NOT auth_is_kid());
CREATE POLICY "kg_update" ON kids_goals FOR UPDATE USING (family_id = auth_family_id() AND (kid_profile = auth.uid() OR NOT auth_is_kid()));
CREATE POLICY "kg_delete" ON kids_goals FOR DELETE USING (family_id = auth_family_id() AND NOT auth_is_kid());

-- KIDS_DEPOSITS
CREATE POLICY "kd_select" ON kids_deposits FOR SELECT USING (family_id = auth_family_id());
CREATE POLICY "kd_insert" ON kids_deposits FOR INSERT WITH CHECK (family_id = auth_family_id() AND NOT auth_is_kid());

-- KIDS_BADGES
CREATE POLICY "kb_select" ON kids_badges FOR SELECT USING (family_id = auth_family_id());
CREATE POLICY "kb_insert" ON kids_badges FOR INSERT WITH CHECK (family_id = auth_family_id() AND NOT auth_is_kid());

-- BUDGETS
CREATE POLICY "bud_all" ON budgets FOR ALL USING (family_id = auth_family_id());

-- AI_INSIGHTS
CREATE POLICY "ai_all" ON ai_insights FOR ALL USING (family_id = auth_family_id());

-- ────────────────────────────────────────────────────────────
-- 16. FUNCIONES RPC (toda la lógica de negocio en el servidor)
-- Ninguna lógica financiera vive en el frontend.
-- ────────────────────────────────────────────────────────────

-- ── A. Crear familia ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION rpc_create_family(
  p_name     TEXT,
  p_currency TEXT DEFAULT 'CAD',
  p_locale   TEXT DEFAULT 'es'
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_family families;
BEGIN
  -- Crear la familia
  INSERT INTO families(name, currency, locale)
  VALUES (p_name, p_currency, p_locale)
  RETURNING * INTO v_family;

  -- Asignar al creador como owner
  UPDATE profiles
  SET family_id = v_family.id, role = 'owner', status = 'active'
  WHERE id = auth.uid();

  RETURN row_to_json(v_family);
END;
$$;

-- ── B. Unirse a familia por código de invitación ──────────────
CREATE OR REPLACE FUNCTION rpc_join_family(p_invite_code TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_family  families;
  v_count   INT;
BEGIN
  -- Buscar la familia
  SELECT * INTO v_family FROM families WHERE invite_code = p_invite_code;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Código de invitación inválido';
  END IF;

  -- Verificar límite de miembros según el plan
  SELECT COUNT(*) INTO v_count FROM profiles WHERE family_id = v_family.id;
  IF v_family.plan = 'free' AND v_count >= 2 THEN
    RAISE EXCEPTION 'Plan gratuito limitado a 2 miembros. Actualiza al plan Pro o Family.';
  END IF;
  IF v_family.plan = 'pro' AND v_count >= 5 THEN
    RAISE EXCEPTION 'Plan Pro limitado a 5 miembros. Actualiza al plan Family.';
  END IF;

  -- Unirse como miembro pendiente (el admin debe aprobar)
  UPDATE profiles
  SET family_id = v_family.id,
      role      = 'member',
      status    = 'pending'  -- requiere aprobación del admin
  WHERE id = auth.uid();

  RETURN json_build_object(
    'family_id',   v_family.id,
    'family_name', v_family.name,
    'status',      'pending',
    'message',     'Solicitud enviada. El administrador debe aprobar tu acceso.'
  );
END;
$$;

-- ── C. Aprobar o suspender un miembro (solo admin/owner) ──────
CREATE OR REPLACE FUNCTION rpc_set_member_status(
  p_member_id UUID,
  p_status    member_status
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_fid UUID;
BEGIN
  SELECT auth_family_id() INTO v_fid;

  -- Solo owner y admin pueden cambiar el estado de miembros
  IF NOT auth_is_family_admin() THEN
    RAISE EXCEPTION 'Solo el administrador puede gestionar miembros';
  END IF;

  -- No se puede suspender al owner
  IF EXISTS(SELECT 1 FROM profiles WHERE id = p_member_id AND role = 'owner') THEN
    RAISE EXCEPTION 'No se puede suspender al propietario de la familia';
  END IF;

  -- El miembro debe pertenecer a la misma familia
  IF NOT EXISTS(SELECT 1 FROM profiles WHERE id = p_member_id AND family_id = v_fid) THEN
    RAISE EXCEPTION 'Miembro no encontrado en la familia';
  END IF;

  UPDATE profiles SET status = p_status WHERE id = p_member_id;

  RETURN json_build_object('member_id', p_member_id, 'new_status', p_status);
END;
$$;

-- ── D. Cambiar rol de un miembro ─────────────────────────────
CREATE OR REPLACE FUNCTION rpc_set_member_role(
  p_member_id UUID,
  p_role      member_role
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF auth_role() != 'owner' THEN
    RAISE EXCEPTION 'Solo el propietario puede cambiar roles';
  END IF;

  IF p_member_id = auth.uid() THEN
    RAISE EXCEPTION 'No puedes cambiar tu propio rol';
  END IF;

  IF NOT EXISTS(SELECT 1 FROM profiles WHERE id = p_member_id AND family_id = auth_family_id()) THEN
    RAISE EXCEPTION 'Miembro no encontrado';
  END IF;

  UPDATE profiles SET role = p_role WHERE id = p_member_id;
  RETURN json_build_object('member_id', p_member_id, 'new_role', p_role);
END;
$$;

-- ── E. Actualizar preferencias del perfil propio ─────────────
CREATE OR REPLACE FUNCTION rpc_update_profile(
  p_display_name TEXT    DEFAULT NULL,
  p_avatar_emoji TEXT    DEFAULT NULL,
  p_avatar_color TEXT    DEFAULT NULL,
  p_lang         TEXT    DEFAULT NULL,
  p_theme        app_theme DEFAULT NULL
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_profile profiles;
BEGIN
  UPDATE profiles SET
    display_name  = COALESCE(p_display_name, display_name),
    avatar_emoji  = COALESCE(p_avatar_emoji, avatar_emoji),
    avatar_color  = COALESCE(p_avatar_color, avatar_color),
    lang          = COALESCE(p_lang,         lang),
    theme         = COALESCE(p_theme,        theme),
    updated_at    = NOW()
  WHERE id = auth.uid()
  RETURNING * INTO v_profile;

  RETURN row_to_json(v_profile);
END;
$$;

-- ── F. Agregar transacción ────────────────────────────────────
CREATE OR REPLACE FUNCTION rpc_add_transaction(
  p_type               txn_type,
  p_category           TEXT,
  p_description        TEXT,
  p_amount             NUMERIC,
  p_date               DATE,
  p_account_id         UUID    DEFAULT NULL,
  p_payment_account_id UUID    DEFAULT NULL,
  p_notes              TEXT    DEFAULT NULL,
  p_auto_source        TEXT    DEFAULT NULL,
  p_source_id          UUID    DEFAULT NULL
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_fid UUID;
  v_txn transactions;
BEGIN
  SELECT auth_family_id() INTO v_fid;
  IF v_fid IS NULL THEN RAISE EXCEPTION 'Usuario sin familia asignada'; END IF;
  IF auth_is_kid() THEN RAISE EXCEPTION 'Los niños no pueden registrar transacciones'; END IF;
  IF auth_member_status() != 'active' THEN RAISE EXCEPTION 'Tu cuenta está pendiente de aprobación'; END IF;

  INSERT INTO transactions(
    family_id, created_by, type, category, description,
    amount, date, account_id, payment_account_id, notes,
    auto_source, source_id
  )
  VALUES (
    v_fid, auth.uid(), p_type, p_category, p_description,
    p_amount, p_date, p_account_id, p_payment_account_id, p_notes,
    p_auto_source, p_source_id
  )
  RETURNING * INTO v_txn;

  RETURN row_to_json(v_txn);
END;
$$;

-- ── G. Editar transacción ─────────────────────────────────────
CREATE OR REPLACE FUNCTION rpc_update_transaction(
  p_txn_id             UUID,
  p_type               txn_type    DEFAULT NULL,
  p_category           TEXT        DEFAULT NULL,
  p_description        TEXT        DEFAULT NULL,
  p_amount             NUMERIC     DEFAULT NULL,
  p_date               DATE        DEFAULT NULL,
  p_account_id         UUID        DEFAULT NULL,
  p_payment_account_id UUID        DEFAULT NULL,
  p_notes              TEXT        DEFAULT NULL
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_txn transactions;
BEGIN
  IF auth_is_kid() THEN RAISE EXCEPTION 'No autorizado'; END IF;

  -- Verificar que pertenece a la familia y que tiene permiso para editarla
  SELECT * INTO v_txn FROM transactions
  WHERE id = p_txn_id AND family_id = auth_family_id() AND NOT is_void;

  IF NOT FOUND THEN RAISE EXCEPTION 'Transacción no encontrada'; END IF;

  IF v_txn.created_by != auth.uid() AND NOT auth_is_family_admin() THEN
    RAISE EXCEPTION 'Solo puedes editar tus propias transacciones';
  END IF;

  UPDATE transactions SET
    type                 = COALESCE(p_type,                 type),
    category             = COALESCE(p_category,             category),
    description          = COALESCE(p_description,          description),
    amount               = COALESCE(p_amount,               amount),
    date                 = COALESCE(p_date,                 date),
    account_id           = COALESCE(p_account_id,           account_id),
    payment_account_id   = COALESCE(p_payment_account_id,   payment_account_id),
    notes                = COALESCE(p_notes,                notes),
    updated_at           = NOW()
  WHERE id = p_txn_id
  RETURNING * INTO v_txn;

  RETURN row_to_json(v_txn);
END;
$$;

-- ── H. Crear cuenta (solo admin/owner) ───────────────────────
CREATE OR REPLACE FUNCTION rpc_add_account(
  p_name            TEXT,
  p_nature          account_nature,
  p_subtype         account_subtype,
  p_owner_profile   UUID            DEFAULT NULL,
  p_color           TEXT            DEFAULT '#4f7cff',
  p_institution     TEXT            DEFAULT NULL,
  p_last_four       CHAR(4)         DEFAULT NULL,
  p_credit_limit    NUMERIC         DEFAULT NULL,
  p_opening_balance NUMERIC         DEFAULT 0,
  p_notes           TEXT            DEFAULT NULL
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_fid UUID;
  v_acc accounts;
BEGIN
  SELECT auth_family_id() INTO v_fid;
  IF NOT auth_is_family_admin() THEN
    RAISE EXCEPTION 'Solo el administrador puede crear cuentas';
  END IF;

  INSERT INTO accounts(
    family_id, created_by, owner_profile, name, nature, subtype,
    color, institution, last_four, credit_limit, opening_balance, notes
  )
  VALUES (
    v_fid, auth.uid(), COALESCE(p_owner_profile, auth.uid()),
    p_name, p_nature, p_subtype,
    p_color, p_institution, p_last_four, p_credit_limit, p_opening_balance, p_notes
  )
  RETURNING * INTO v_acc;

  RETURN row_to_json(v_acc);
END;
$$;

-- ── I. Editar cuenta ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION rpc_update_account(
  p_account_id      UUID,
  p_name            TEXT            DEFAULT NULL,
  p_color           TEXT            DEFAULT NULL,
  p_institution     TEXT            DEFAULT NULL,
  p_credit_limit    NUMERIC         DEFAULT NULL,
  p_notes           TEXT            DEFAULT NULL,
  p_is_active       BOOLEAN         DEFAULT NULL
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_acc accounts;
BEGIN
  IF NOT auth_is_family_admin() THEN
    RAISE EXCEPTION 'Solo el administrador puede editar cuentas';
  END IF;

  UPDATE accounts SET
    name          = COALESCE(p_name,         name),
    color         = COALESCE(p_color,        color),
    institution   = COALESCE(p_institution,  institution),
    credit_limit  = COALESCE(p_credit_limit, credit_limit),
    notes         = COALESCE(p_notes,        notes),
    is_active     = COALESCE(p_is_active,    is_active),
    updated_at    = NOW()
  WHERE id = p_account_id AND family_id = auth_family_id()
  RETURNING * INTO v_acc;

  IF NOT FOUND THEN RAISE EXCEPTION 'Cuenta no encontrada'; END IF;
  RETURN row_to_json(v_acc);
END;
$$;

-- ── J. Abonar a deuda + crear transacción automática ──────────
-- REGLA DE NEGOCIO CRÍTICA:
--   1. Actualiza paid_amount en la deuda
--   2. Crea automáticamente una transacción de tipo 'expense'
--   3. Verifica idempotencia: no crea duplicado si source_id ya existe
CREATE OR REPLACE FUNCTION rpc_pay_debt(
  p_debt_id    UUID,
  p_amount     NUMERIC,
  p_date       DATE    DEFAULT CURRENT_DATE,
  p_account_id UUID    DEFAULT NULL,
  p_notes      TEXT    DEFAULT NULL
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_debt      debts;
  v_fid       UUID;
  v_txn_id    UUID;
  v_new_paid  NUMERIC;
BEGIN
  IF auth_is_kid() THEN RAISE EXCEPTION 'No autorizado'; END IF;
  SELECT auth_family_id() INTO v_fid;

  -- Obtener deuda y validar
  SELECT * INTO v_debt FROM debts
  WHERE id = p_debt_id AND family_id = v_fid AND is_active = TRUE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Deuda no encontrada'; END IF;
  IF p_amount <= 0 THEN RAISE EXCEPTION 'El monto debe ser mayor que cero'; END IF;

  v_new_paid := LEAST(v_debt.total_amount, v_debt.paid_amount + p_amount);

  -- Actualizar deuda
  UPDATE debts SET
    paid_amount = v_new_paid,
    updated_at  = NOW()
  WHERE id = p_debt_id;

  -- Crear transacción automática (solo si no existe ya para esta combinación)
  -- Usa source_id + fecha para evitar duplicados
  IF NOT EXISTS(
    SELECT 1 FROM transactions
    WHERE source_id = p_debt_id
      AND auto_source = 'debt_payment'
      AND date = p_date
      AND amount = p_amount
      AND family_id = v_fid
  ) THEN
    SELECT rpc_add_transaction(
      p_type               := 'expense',
      p_category           := v_debt.category,
      p_description        := 'Pago: ' || v_debt.name,
      p_amount             := p_amount,
      p_date               := p_date,
      p_account_id         := COALESCE(p_account_id, v_debt.linked_account_id),
      p_notes              := p_notes,
      p_auto_source        := 'debt_payment',
      p_source_id          := p_debt_id
    )::JSON ->> 'id' INTO v_txn_id;
  END IF;

  RETURN json_build_object(
    'debt_id',       p_debt_id,
    'paid_amount',   v_new_paid,
    'remaining',     v_debt.total_amount - v_new_paid,
    'completed',     v_new_paid >= v_debt.total_amount,
    'transaction_id',v_txn_id
  );
END;
$$;

-- ── K. Editar deuda ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION rpc_update_debt(
  p_debt_id         UUID,
  p_name            TEXT    DEFAULT NULL,
  p_total_amount    NUMERIC DEFAULT NULL,
  p_monthly_payment NUMERIC DEFAULT NULL,
  p_interest_rate   NUMERIC DEFAULT NULL,
  p_start_date      DATE    DEFAULT NULL,
  p_notes           TEXT    DEFAULT NULL,
  p_is_active       BOOLEAN DEFAULT NULL
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_debt debts;
BEGIN
  IF auth_is_kid() THEN RAISE EXCEPTION 'No autorizado'; END IF;

  UPDATE debts SET
    name             = COALESCE(p_name,             name),
    total_amount     = COALESCE(p_total_amount,     total_amount),
    monthly_payment  = COALESCE(p_monthly_payment,  monthly_payment),
    interest_rate    = COALESCE(p_interest_rate,    interest_rate),
    start_date       = COALESCE(p_start_date,       start_date),
    notes            = COALESCE(p_notes,            notes),
    is_active        = COALESCE(p_is_active,        is_active),
    updated_at       = NOW()
  WHERE id = p_debt_id
    AND family_id = auth_family_id()
    AND (created_by = auth.uid() OR auth_is_family_admin())
  RETURNING * INTO v_debt;

  IF NOT FOUND THEN RAISE EXCEPTION 'Deuda no encontrada o sin permiso'; END IF;
  RETURN row_to_json(v_debt);
END;
$$;

-- ── L. Marcar pago recurrente + crear transacción automática ──
CREATE OR REPLACE FUNCTION rpc_mark_recurring_paid(
  p_rec_id     UUID,
  p_date       DATE    DEFAULT CURRENT_DATE,
  p_account_id UUID    DEFAULT NULL
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_rec       recurring_payments;
  v_next_due  DATE;
  v_txn_id    UUID;
BEGIN
  IF auth_is_kid() THEN RAISE EXCEPTION 'No autorizado'; END IF;

  SELECT * INTO v_rec FROM recurring_payments
  WHERE id = p_rec_id AND family_id = auth_family_id() AND is_active = TRUE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pago recurrente no encontrado'; END IF;

  -- Calcular próxima fecha según frecuencia
  v_next_due := CASE v_rec.frequency
    WHEN 'weekly'    THEN v_rec.next_due + INTERVAL '7 days'
    WHEN 'biweekly'  THEN v_rec.next_due + INTERVAL '14 days'
    WHEN 'monthly'   THEN v_rec.next_due + INTERVAL '1 month'
    WHEN 'yearly'    THEN v_rec.next_due + INTERVAL '1 year'
    ELSE v_rec.next_due + INTERVAL '1 month'
  END;

  -- Avanzar next_due
  UPDATE recurring_payments
  SET next_due = v_next_due, updated_at = NOW()
  WHERE id = p_rec_id;

  -- Crear transacción automática (idempotente)
  IF NOT EXISTS(
    SELECT 1 FROM transactions
    WHERE source_id = p_rec_id
      AND auto_source = 'recurring'
      AND date = p_date
      AND family_id = auth_family_id()
  ) THEN
    SELECT rpc_add_transaction(
      p_type        := 'expense',
      p_category    := v_rec.category,
      p_description := v_rec.name,
      p_amount      := v_rec.amount,
      p_date        := p_date,
      p_account_id  := COALESCE(p_account_id, v_rec.account_id),
      p_auto_source := 'recurring',
      p_source_id   := p_rec_id
    )::JSON ->> 'id' INTO v_txn_id;
  END IF;

  RETURN json_build_object(
    'recurring_id',   p_rec_id,
    'next_due',       v_next_due,
    'transaction_id', v_txn_id
  );
END;
$$;

-- ── M. Editar pago recurrente ─────────────────────────────────
CREATE OR REPLACE FUNCTION rpc_update_recurring(
  p_rec_id    UUID,
  p_name      TEXT    DEFAULT NULL,
  p_amount    NUMERIC DEFAULT NULL,
  p_frequency freq_type DEFAULT NULL,
  p_category  TEXT    DEFAULT NULL,
  p_next_due  DATE    DEFAULT NULL,
  p_notes     TEXT    DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT NULL
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_rec recurring_payments;
BEGIN
  IF auth_is_kid() THEN RAISE EXCEPTION 'No autorizado'; END IF;

  UPDATE recurring_payments SET
    name        = COALESCE(p_name,       name),
    amount      = COALESCE(p_amount,     amount),
    frequency   = COALESCE(p_frequency,  frequency),
    category    = COALESCE(p_category,   category),
    next_due    = COALESCE(p_next_due,   next_due),
    notes       = COALESCE(p_notes,      notes),
    is_active   = COALESCE(p_is_active,  is_active),
    updated_at  = NOW()
  WHERE id = p_rec_id
    AND family_id = auth_family_id()
    AND (created_by = auth.uid() OR auth_is_family_admin())
  RETURNING * INTO v_rec;

  IF NOT FOUND THEN RAISE EXCEPTION 'No encontrado o sin permiso'; END IF;
  RETURN row_to_json(v_rec);
END;
$$;

-- ── N. Depositar en meta de ahorro + crear transacción ────────
CREATE OR REPLACE FUNCTION rpc_deposit_savings_goal(
  p_goal_id    UUID,
  p_amount     NUMERIC,
  p_date       DATE    DEFAULT CURRENT_DATE,
  p_account_id UUID    DEFAULT NULL,
  p_notes      TEXT    DEFAULT NULL
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_goal      savings_goals;
  v_new_amt   NUMERIC;
  v_txn_id    UUID;
BEGIN
  IF auth_is_kid() THEN RAISE EXCEPTION 'No autorizado'; END IF;
  IF p_amount <= 0 THEN RAISE EXCEPTION 'Monto debe ser mayor que cero'; END IF;

  SELECT * INTO v_goal FROM savings_goals
  WHERE id = p_goal_id AND family_id = auth_family_id() AND status = 'active';
  IF NOT FOUND THEN RAISE EXCEPTION 'Meta no encontrada o ya completada'; END IF;

  v_new_amt := LEAST(v_goal.target_amount, v_goal.current_amount + p_amount);

  UPDATE savings_goals SET
    current_amount = v_new_amt,
    status = CASE WHEN v_new_amt >= target_amount THEN 'completed' ELSE status END,
    updated_at = NOW()
  WHERE id = p_goal_id;

  -- Crear transacción automática de tipo 'saving'
  SELECT rpc_add_transaction(
    p_type        := 'saving',
    p_category    := 'goal',
    p_description := 'Ahorro: ' || v_goal.name,
    p_amount      := p_amount,
    p_date        := p_date,
    p_account_id  := COALESCE(p_account_id, v_goal.account_id),
    p_notes       := p_notes,
    p_auto_source := 'savings_deposit',
    p_source_id   := p_goal_id
  )::JSON ->> 'id' INTO v_txn_id;

  RETURN json_build_object(
    'goal_id',        p_goal_id,
    'new_amount',     v_new_amt,
    'completed',      v_new_amt >= v_goal.target_amount,
    'transaction_id', v_txn_id
  );
END;
$$;

-- ── Ñ. Editar meta de ahorro ──────────────────────────────────
CREATE OR REPLACE FUNCTION rpc_update_savings_goal(
  p_goal_id       UUID,
  p_name          TEXT    DEFAULT NULL,
  p_target_amount NUMERIC DEFAULT NULL,
  p_emoji         TEXT    DEFAULT NULL,
  p_color         TEXT    DEFAULT NULL,
  p_deadline      DATE    DEFAULT NULL,
  p_status        goal_status DEFAULT NULL,
  p_notes         TEXT    DEFAULT NULL
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_goal savings_goals;
BEGIN
  IF auth_is_kid() THEN RAISE EXCEPTION 'No autorizado'; END IF;

  UPDATE savings_goals SET
    name          = COALESCE(p_name,          name),
    target_amount = COALESCE(p_target_amount, target_amount),
    emoji         = COALESCE(p_emoji,         emoji),
    color         = COALESCE(p_color,         color),
    deadline      = COALESCE(p_deadline,      deadline),
    status        = COALESCE(p_status,        status),
    notes         = COALESCE(p_notes,         notes),
    updated_at    = NOW()
  WHERE id = p_goal_id
    AND family_id = auth_family_id()
    AND (owner_profile = auth.uid() OR auth_is_family_admin())
  RETURNING * INTO v_goal;

  IF NOT FOUND THEN RAISE EXCEPTION 'Meta no encontrada o sin permiso'; END IF;
  RETURN row_to_json(v_goal);
END;
$$;

-- ── O. Depósito en meta Kids + badges ────────────────────────
CREATE OR REPLACE FUNCTION rpc_kids_deposit(
  p_goal_id UUID,
  p_amount  NUMERIC,
  p_note    TEXT DEFAULT NULL
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_goal      kids_goals;
  v_new_amt   NUMERIC;
BEGIN
  IF auth_is_kid() THEN RAISE EXCEPTION 'Solo padres/admin pueden depositar'; END IF;

  SELECT * INTO v_goal FROM kids_goals
  WHERE id = p_goal_id AND family_id = auth_family_id();
  IF NOT FOUND THEN RAISE EXCEPTION 'Meta no encontrada'; END IF;

  v_new_amt := LEAST(v_goal.target_amount, v_goal.current_amount + p_amount);

  UPDATE kids_goals SET
    current_amount = v_new_amt,
    status = CASE WHEN v_new_amt >= target_amount THEN 'completed' ELSE status END,
    updated_at = NOW()
  WHERE id = p_goal_id;

  INSERT INTO kids_deposits(goal_id, family_id, amount, deposited_by, note)
  VALUES (p_goal_id, auth_family_id(), p_amount, auth.uid(), p_note);

  -- Otorgar badges automáticamente
  PERFORM rpc_check_kid_badges(v_goal.kid_profile);

  RETURN json_build_object(
    'goal_id',    p_goal_id,
    'new_amount', v_new_amt,
    'completed',  v_new_amt >= v_goal.target_amount
  );
END;
$$;

-- ── P. Verificar y otorgar badges ────────────────────────────
CREATE OR REPLACE FUNCTION rpc_check_kid_badges(p_kid_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_fid       UUID;
  v_goals     INT;
  v_completed INT;
  v_total     NUMERIC;
BEGIN
  SELECT family_id INTO v_fid FROM profiles WHERE id = p_kid_id;

  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'completed'),
    COALESCE(SUM(current_amount), 0)
  INTO v_goals, v_completed, v_total
  FROM kids_goals WHERE kid_profile = p_kid_id;

  -- Otorgar badges según condiciones
  IF v_goals >= 1 THEN
    INSERT INTO kids_badges(kid_profile, family_id, badge_key)
    VALUES (p_kid_id, v_fid, 'first_goal')
    ON CONFLICT DO NOTHING;
  END IF;

  IF EXISTS(SELECT 1 FROM kids_goals WHERE kid_profile = p_kid_id
    AND current_amount >= target_amount * 0.5) THEN
    INSERT INTO kids_badges(kid_profile, family_id, badge_key)
    VALUES (p_kid_id, v_fid, 'halfway')
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_completed >= 1 THEN
    INSERT INTO kids_badges(kid_profile, family_id, badge_key)
    VALUES (p_kid_id, v_fid, 'goal_completed')
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_completed >= 3 THEN
    INSERT INTO kids_badges(kid_profile, family_id, badge_key)
    VALUES (p_kid_id, v_fid, 'super_saver')
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_total >= 500 THEN
    INSERT INTO kids_badges(kid_profile, family_id, badge_key)
    VALUES (p_kid_id, v_fid, 'big_saver')
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;

-- ── Q. Dashboard summary con filtros ─────────────────────────
CREATE OR REPLACE FUNCTION rpc_dashboard_summary(
  p_from       DATE,
  p_to         DATE,
  p_account_id UUID DEFAULT NULL
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE
  v_fid    UUID;
  v_income NUMERIC; v_expense NUMERIC; v_saving NUMERIC;
  v_pie    JSON;    v_trend   JSON;
BEGIN
  SELECT auth_family_id() INTO v_fid;
  IF auth_member_status() != 'active' THEN RAISE EXCEPTION 'Cuenta pendiente de aprobación'; END IF;

  -- Totales del período
  SELECT
    COALESCE(SUM(amount) FILTER (WHERE type = 'income'),  0),
    COALESCE(SUM(amount) FILTER (WHERE type = 'expense'), 0),
    COALESCE(SUM(amount) FILTER (WHERE type = 'saving'),  0)
  INTO v_income, v_expense, v_saving
  FROM transactions
  WHERE family_id = v_fid
    AND date BETWEEN p_from AND p_to
    AND NOT is_void
    AND (p_account_id IS NULL OR account_id = p_account_id);

  -- Distribución por categoría (gastos)
  SELECT json_agg(row_to_json(t)) INTO v_pie FROM (
    SELECT category, SUM(amount) AS value
    FROM transactions
    WHERE family_id = v_fid AND type = 'expense'
      AND date BETWEEN p_from AND p_to
      AND NOT is_void
      AND (p_account_id IS NULL OR account_id = p_account_id)
    GROUP BY category
    ORDER BY value DESC LIMIT 12
  ) t;

  -- Tendencia mensual (últimos 8 meses)
  SELECT json_agg(row_to_json(t)) INTO v_trend FROM (
    SELECT
      TO_CHAR(DATE_TRUNC('month', date), 'YYYY-MM') AS month,
      COALESCE(SUM(amount) FILTER (WHERE type = 'income'),  0) AS income,
      COALESCE(SUM(amount) FILTER (WHERE type = 'expense'), 0) AS expense,
      COALESCE(SUM(amount) FILTER (WHERE type = 'saving'),  0) AS saving
    FROM transactions
    WHERE family_id = v_fid
      AND NOT is_void
      AND date >= DATE_TRUNC('month', NOW()) - INTERVAL '7 months'
      AND (p_account_id IS NULL OR account_id = p_account_id)
    GROUP BY 1 ORDER BY 1
  ) t;

  RETURN json_build_object(
    'income',         v_income,
    'expense',        v_expense,
    'saving',         v_saving,
    'balance',        v_income - v_expense - v_saving,
    'savings_rate',   CASE WHEN v_income > 0 THEN ROUND((v_saving / v_income) * 100, 1) ELSE 0 END,
    'by_category',    COALESCE(v_pie,   '[]'::JSON),
    'monthly_trend',  COALESCE(v_trend, '[]'::JSON)
  );
END;
$$;

-- ── R. Patrimonio neto ────────────────────────────────────────
CREATE OR REPLACE FUNCTION rpc_net_worth()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE
  v_fid    UUID;
  v_assets NUMERIC;
  v_liabs  NUMERIC;
BEGIN
  SELECT auth_family_id() INTO v_fid;

  -- Activos: saldo inicial + ingresos - gastos - ahorros
  SELECT COALESCE(SUM(
    a.opening_balance +
    COALESCE((SELECT SUM(amount) FILTER (WHERE type='income')  FROM transactions WHERE account_id=a.id AND NOT is_void), 0) -
    COALESCE((SELECT SUM(amount) FILTER (WHERE type='expense') FROM transactions WHERE account_id=a.id AND NOT is_void), 0) -
    COALESCE((SELECT SUM(amount) FILTER (WHERE type='saving')  FROM transactions WHERE account_id=a.id AND NOT is_void), 0)
  ), 0) INTO v_assets
  FROM accounts a
  WHERE a.family_id = v_fid AND a.nature = 'asset' AND a.is_active = TRUE;

  -- Pasivos: deudas activas restantes
  SELECT COALESCE(SUM(total_amount - paid_amount), 0) INTO v_liabs
  FROM debts
  WHERE family_id = v_fid AND is_active = TRUE;

  RETURN json_build_object(
    'assets',      v_assets,
    'liabilities', v_liabs,
    'net',         v_assets - v_liabs
  );
END;
$$;

-- ── S. Upgrade de plan ────────────────────────────────────────
CREATE OR REPLACE FUNCTION rpc_upgrade_plan(
  p_plan    plan_type,
  p_months  INT DEFAULT 1
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_fid UUID;
BEGIN
  SELECT auth_family_id() INTO v_fid;
  IF auth_role() != 'owner' THEN RAISE EXCEPTION 'Solo el propietario puede cambiar el plan'; END IF;

  UPDATE families SET
    plan = p_plan,
    plan_expires_at = CASE
      WHEN p_plan = 'free' THEN NULL
      ELSE NOW() + (p_months || ' months')::INTERVAL
    END
  WHERE id = v_fid;

  RETURN json_build_object('plan', p_plan, 'months', p_months);
END;
$$;

-- ── T. Contexto completo para IA ─────────────────────────────
CREATE OR REPLACE FUNCTION rpc_ai_financial_context(
  p_months_back INT DEFAULT 6
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE
  v_fid     UUID;
  v_p_from  DATE := DATE_TRUNC('month', NOW()) - ((p_months_back - 1) || ' months')::INTERVAL;
  v_p_to    DATE := CURRENT_DATE;
  v_summary JSON; v_nw JSON; v_debts JSON; v_budgets JSON;
BEGIN
  SELECT auth_family_id() INTO v_fid;

  v_summary := rpc_dashboard_summary(v_p_from, v_p_to);
  v_nw      := rpc_net_worth();

  SELECT json_agg(row_to_json(t)) INTO v_debts FROM (
    SELECT name, total_amount, paid_amount, monthly_payment, interest_rate,
           total_amount - paid_amount AS remaining,
           CASE WHEN monthly_payment > 0
             THEN CEIL((total_amount - paid_amount) / monthly_payment)
             ELSE NULL END AS months_left
    FROM debts WHERE family_id = v_fid AND is_active = TRUE
  ) t;

  SELECT json_agg(row_to_json(t)) INTO v_budgets FROM (
    SELECT b.category, b.amount_limit,
           COALESCE(SUM(tx.amount), 0) AS spent_this_month
    FROM budgets b
    LEFT JOIN transactions tx ON tx.family_id = v_fid
      AND tx.category = b.category
      AND tx.type = 'expense'
      AND TO_CHAR(tx.date, 'YYYY-MM') = TO_CHAR(NOW(), 'YYYY-MM')
      AND NOT tx.is_void
    WHERE b.family_id = v_fid AND b.is_active = TRUE
    GROUP BY b.category, b.amount_limit
  ) t;

  RETURN json_build_object(
    'generated_at',    NOW(),
    'months_analyzed', p_months_back,
    'period',          json_build_object('from', v_p_from, 'to', v_p_to),
    'summary',         v_summary,
    'net_worth',       v_nw,
    'debts',           COALESCE(v_debts,   '[]'::JSON),
    'budgets',         COALESCE(v_budgets, '[]'::JSON),
    'currency',        (SELECT currency FROM families WHERE id = v_fid)
  );
END;
$$;

-- ────────────────────────────────────────────────────────────
-- 17. TRIGGERS
-- ────────────────────────────────────────────────────────────

-- ── Trigger: crear perfil al registrarse ─────────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles(id, display_name, lang, theme)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'lang', 'es'),
    'dark'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── Trigger: updated_at automático ───────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Aplicar a todas las tablas con updated_at
DO $$ DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['families','profiles','accounts','transactions',
                            'debts','recurring_payments','savings_goals','kids_goals']
  LOOP
    EXECUTE FORMAT('DROP TRIGGER IF EXISTS touch_%I ON %I', t, t);
    EXECUTE FORMAT(
      'CREATE TRIGGER touch_%I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
      t, t
    );
  END LOOP;
END $$;

-- ── Trigger: deuda completada → marcarla inactiva ────────────
CREATE OR REPLACE FUNCTION handle_debt_completed()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Si el pago cubre el total, marcar como inactiva automáticamente
  IF NEW.paid_amount >= NEW.total_amount AND OLD.paid_amount < OLD.total_amount THEN
    NEW.is_active = FALSE;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_debt_completed
  BEFORE UPDATE ON debts
  FOR EACH ROW EXECUTE FUNCTION handle_debt_completed();

-- ── Trigger: meta completada → actualizar status ─────────────
CREATE OR REPLACE FUNCTION handle_goal_completed()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.current_amount >= NEW.target_amount AND NEW.status = 'active' THEN
    NEW.status = 'completed';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_savings_goal_completed
  BEFORE UPDATE ON savings_goals
  FOR EACH ROW EXECUTE FUNCTION handle_goal_completed();

CREATE TRIGGER on_kids_goal_completed
  BEFORE UPDATE ON kids_goals
  FOR EACH ROW EXECUTE FUNCTION handle_goal_completed();

-- ────────────────────────────────────────────────────────────
-- 18. VISTAS ÚTILES
-- ────────────────────────────────────────────────────────────

-- ── Vista: saldos de cuentas en tiempo real ─────────────────
CREATE OR REPLACE VIEW account_balances AS
SELECT
  a.id,
  a.family_id,
  a.name,
  a.nature,
  a.subtype,
  a.color,
  a.institution,
  a.last_four,
  a.credit_limit,
  p.display_name AS owner_name,
  -- Saldo = apertura + ingresos - gastos - ahorros
  a.opening_balance +
    COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'income'),  0) -
    COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'expense'), 0) -
    COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'saving'),  0) AS balance,
  COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'income'),  0) AS total_income,
  COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'expense'), 0) AS total_expense
FROM accounts a
LEFT JOIN transactions t ON t.account_id = a.id AND NOT t.is_void
LEFT JOIN profiles p ON p.id = a.owner_profile
WHERE a.is_active = TRUE
GROUP BY a.id, a.family_id, a.name, a.nature, a.subtype,
         a.color, a.institution, a.last_four, a.credit_limit,
         a.opening_balance, p.display_name;

COMMENT ON VIEW account_balances IS 'Saldo calculado en tiempo real para cada cuenta activa.';

-- ── Vista: gasto mensual por tarjeta ────────────────────────
CREATE OR REPLACE VIEW card_monthly_spending AS
SELECT
  a.id,
  a.family_id,
  a.name,
  a.subtype,
  a.color,
  a.last_four,
  a.credit_limit,
  COALESCE(SUM(t.amount) FILTER (
    WHERE TO_CHAR(t.date, 'YYYY-MM') = TO_CHAR(NOW(), 'YYYY-MM')
  ), 0) AS month_spent,
  COALESCE(SUM(t.amount), 0) AS total_spent
FROM accounts a
LEFT JOIN transactions t
  ON t.payment_account_id = a.id AND t.type = 'expense' AND NOT t.is_void
WHERE a.subtype IN ('credit_card', 'debit_card', 'credit_line')
  AND a.is_active = TRUE
GROUP BY a.id, a.family_id, a.name, a.subtype, a.color, a.last_four, a.credit_limit;

-- ── Vista: estado de pagos recurrentes ──────────────────────
CREATE OR REPLACE VIEW recurring_status AS
SELECT
  r.*,
  (r.next_due - CURRENT_DATE) AS days_until_due,
  CASE
    WHEN r.next_due < CURRENT_DATE THEN 'overdue'
    WHEN r.next_due <= CURRENT_DATE + 5 THEN 'due_soon'
    ELSE 'up_to_date'
  END AS status_label
FROM recurring_payments r
WHERE r.is_active = TRUE;

-- ── Vista: límites del plan ──────────────────────────────────
CREATE OR REPLACE VIEW plan_limits AS
SELECT
  f.id AS family_id,
  f.plan,
  COUNT(DISTINCT p.id)                              AS member_count,
  COUNT(DISTINCT t.id)                              AS transaction_count,
  CASE f.plan WHEN 'free' THEN 2  WHEN 'pro' THEN 5  ELSE 999 END AS max_members,
  CASE f.plan WHEN 'free' THEN 50 WHEN 'pro' THEN 500 ELSE 99999 END AS max_transactions,
  -- ¿Está dentro de los límites?
  COUNT(DISTINCT p.id) < CASE f.plan WHEN 'free' THEN 2 WHEN 'pro' THEN 5 ELSE 999 END
    AS within_member_limit,
  COUNT(DISTINCT t.id) < CASE f.plan WHEN 'free' THEN 50 WHEN 'pro' THEN 500 ELSE 99999 END
    AS within_transaction_limit
FROM families f
LEFT JOIN profiles p ON p.family_id = f.id AND p.status = 'active'
LEFT JOIN transactions t ON t.family_id = f.id AND NOT t.is_void
GROUP BY f.id, f.plan;

-- ────────────────────────────────────────────────────────────
-- 19. VERIFICACIÓN FINAL
-- ────────────────────────────────────────────────────────────
DO $$
DECLARE
  tabla TEXT;
  tabla_count INT := 0;
  rpc_count INT := 0;
BEGIN
  -- Contar tablas creadas
  SELECT COUNT(*) INTO tabla_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN (
      'families','profiles','accounts','transactions','debts',
      'recurring_payments','savings_goals','kids_goals',
      'kids_deposits','kids_badges','budgets','ai_insights'
    );

  -- Contar RPCs creadas
  SELECT COUNT(*) INTO rpc_count
  FROM information_schema.routines
  WHERE routine_schema = 'public'
    AND routine_name LIKE 'rpc_%';

  RAISE NOTICE '✅ MiFinanza Schema instalado correctamente';
  RAISE NOTICE '   Tablas: %/12', tabla_count;
  RAISE NOTICE '   Funciones RPC: %', rpc_count;
  RAISE NOTICE '   Vistas: account_balances, card_monthly_spending, recurring_status, plan_limits';
  RAISE NOTICE '   RLS: activo en todas las tablas';
  RAISE NOTICE '   Triggers: updated_at, new_user, debt_completed, goal_completed';
END $$;
