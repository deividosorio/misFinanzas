-- ============================================================
-- MIFINANZA — Schema Completo v3
-- ============================================================
-- INSTRUCCIONES:
--   1. Supabase Dashboard → SQL Editor → New Query
--   2. Pega TODO este script y ejecuta con RUN
--   3. Verifica el mensaje final: "✅ MiFinanza Schema v3 instalado"
--
-- COMPATIBILIDAD:
--   Este script es IDEMPOTENTE: puedes ejecutarlo múltiples veces
--   sin romper datos existentes.
--   Usa CREATE TABLE IF NOT EXISTS, ALTER TABLE ADD COLUMN IF NOT EXISTS,
--   CREATE OR REPLACE FUNCTION, etc.
--
-- QUÉ INCLUYE v3 vs versiones anteriores:
--   ✓ Columna profiles.email (necesaria para UI de miembros)
--   ✓ Columna recurring_payments.linked_debt_id (vincular recurrente→deuda)
--   ✓ Trigger handle_new_user() más robusto (el bug principal de auth)
--   ✓ rpc_create_family() asigna role='owner' correctamente
--   ✓ rpc_join_family() con validación de límites de plan
--   ✓ rpc_update_profile() para cambios de idioma/tema/avatar
--   ✓ rpc_set_member_status() aprobar/suspender miembros
--   ✓ rpc_set_member_role() cambiar roles (solo owner)
--   ✓ rpc_update_debt(), rpc_update_recurring(), rpc_update_savings_goal()
--   ✓ rpc_mark_recurring_paid() con soporte para linked_debt_id
--   ✓ rpc_dashboard_summary() y rpc_net_worth() para el dashboard
--   ✓ rpc_ai_financial_context() para el CFO IA
--   ✓ Vistas actualizadas
--   ✓ Script de verificación final
-- ============================================================

-- ============================================================
-- MIFINANZA — Schema v4: Modelo de Cuentas Unificado
-- ============================================================
-- CAMBIO PRINCIPAL vs v3:
--   Se elimina la distinción entre "cuenta bancaria" y "forma de pago".
--   Todo es una cuenta con un subtipo que determina su comportamiento.
--
-- MODELO UNIFICADO DE CUENTAS:
--
--   ACTIVOS (nature = 'asset') → el dinero que TIENES:
--     checking     → Cuenta corriente / chequing
--     savings      → Cuenta de ahorros
--     investment   → TFSA, RRSP, portafolio
--     cash         → Efectivo físico
--
--   PASIVOS (nature = 'liability') → el dinero que DEBES:
--     credit_card  → Tarjeta de crédito
--     credit_line  → Línea de crédito / marge de crédit
--
-- LÓGICA DE TRANSACCIÓN POR TIPO DE CUENTA:
--
--   DÉBITO / AHORRO / INVERSIÓN / EFECTIVO (activos):
--     gasto  → saldo DISMINUYE (el dinero sale de la cuenta)
--     ingreso → saldo AUMENTA
--     ejemplo: pagas $320 en IGA con tu TD Chequing → saldo baja $320
--
--   CRÉDITO (pasivos):
--     gasto  → deuda AUMENTA (utilizas crédito del banco)
--     ingreso → no aplica directamente (los pagos son via "Recurrentes")
--     ejemplo: pagas $320 en IGA con TD Visa → deuda sube $320
--     saldo disponible = credit_limit - deuda_acumulada_del_mes
--
-- IMPACTO EN EL CONSOLIDADO:
--   Activos:  se suma el saldo (dinero disponible)
--   Pasivos:  se muestra la deuda acumulada del mes (dinero a pagar)
--   Patrimonio neto = activos - pasivos_largo_plazo (debts) - deuda_tarjetas
--
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- SECCIÓN 1: EXTENSIONES Y TIPOS
-- ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN CREATE TYPE plan_type AS ENUM ('free','pro','family','admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE member_role AS ENUM ('owner','admin','member','kid');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE member_status AS ENUM ('pending','active','suspended');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE txn_type AS ENUM ('income','expense','saving','transfer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE app_theme AS ENUM ('dark','light','system');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE goal_status AS ENUM ('active','completed','paused','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE freq_type AS ENUM ('weekly','biweekly','monthly','yearly');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── TIPO CENTRAL: account_subtype ────────────────────────────
-- Todos los subtipos de cuenta en un solo enum.
-- El campo 'nature' (derivado o calculado) determina si es activo o pasivo.
DO $$ BEGIN
  CREATE TYPE account_subtype AS ENUM (
    -- ACTIVOS (lo que tienes)
    'checking',      -- Cuenta corriente / chequing account
    'savings',       -- Cuenta de ahorros
    'investment',    -- Inversión (TFSA, RRSP, portafolio)
    'cash',          -- Efectivo físico
    -- PASIVOS (lo que debes / crédito disponible)
    'credit_card',   -- Tarjeta de crédito
    'credit_line'    -- Línea de crédito / marge de crédit
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─────────────────────────────────────────────────────────────
-- SECCIÓN 2: TABLAS
-- ─────────────────────────────────────────────────────────────

-- ── FAMILIES ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS families (
  id              UUID      PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT      NOT NULL,
  plan            plan_type NOT NULL DEFAULT 'free',
  plan_expires_at TIMESTAMPTZ,
  invite_code     TEXT      UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
  currency        TEXT      NOT NULL DEFAULT 'CAD',
  locale          TEXT      NOT NULL DEFAULT 'es',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── PROFILES ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id            UUID          PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  family_id     UUID          REFERENCES families(id) ON DELETE SET NULL,
  email         TEXT,
  role          member_role   NOT NULL DEFAULT 'member',
  status        member_status NOT NULL DEFAULT 'active',
  display_name  TEXT,
  avatar_emoji  TEXT          DEFAULT '🧑',
  avatar_color  TEXT          DEFAULT '#4f7cff',
  is_kid        BOOLEAN       DEFAULT FALSE,
  lang          TEXT          DEFAULT 'es' CHECK (lang IN ('es','en','fr')),
  theme         app_theme     DEFAULT 'dark',
  onboarded     BOOLEAN       DEFAULT FALSE,
  created_at    TIMESTAMPTZ   DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   DEFAULT NOW()
);

-- ── ACCOUNTS — MODELO UNIFICADO ────────────────────────────────
-- Una sola tabla para todos los instrumentos financieros.
-- El subtype determina si es activo (débito/ahorro) o pasivo (crédito).
CREATE TABLE IF NOT EXISTS accounts (
  id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id       UUID            NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  owner_profile   UUID            REFERENCES profiles(id) ON DELETE SET NULL,
  created_by      UUID            REFERENCES profiles(id) ON DELETE SET NULL,

  name            TEXT            NOT NULL,

  -- Subtipo: determina el comportamiento contable
  -- checking/savings/investment/cash → activos (el dinero que tienes)
  -- credit_card/credit_line          → pasivos (crédito utilizable)
  subtype         account_subtype NOT NULL,

  color           TEXT            DEFAULT '#4f7cff',
  institution     TEXT,
  -- Últimos 4 dígitos (para tarjetas de crédito/débito)
  last_four       CHAR(4),
  -- Límite de crédito (solo para credit_card y credit_line)
  credit_limit    NUMERIC(14,2),
  -- Saldo inicial al registrar la cuenta (para cuentas de activo)
  opening_balance NUMERIC(14,2)   DEFAULT 0,
  is_active       BOOLEAN         DEFAULT TRUE,
  notes           TEXT,
  created_at      TIMESTAMPTZ     DEFAULT NOW(),
  updated_at      TIMESTAMPTZ     DEFAULT NOW(),

  -- Restricción: credit_limit solo aplica para pasivos
  CONSTRAINT credit_limit_only_for_credit CHECK (
    (subtype IN ('credit_card','credit_line') AND credit_limit IS NOT NULL)
    OR (subtype NOT IN ('credit_card','credit_line'))
  )
);

COMMENT ON TABLE accounts IS
  'Modelo unificado de cuentas.
   Activos (checking, savings, investment, cash): el dinero que tienes.
     - Los gastos DISMINUYEN el saldo.
     - Los ingresos AUMENTAN el saldo.
   Pasivos (credit_card, credit_line): crédito disponible.
     - Los gastos AUMENTAN la deuda (disminuyen el disponible).
     - El pago de la deuda se registra como recurrente vinculado.
   Solo owner y admin pueden crear/editar cuentas (verificado en RLS).';

COMMENT ON COLUMN accounts.subtype IS
  'checking    → Cuenta corriente. Saldo = apertura + ingresos - gastos.
   savings     → Cuenta de ahorros. Igual que checking pero para ahorros.
   investment  → TFSA/RRSP/portafolio. Solo ingresos (rendimientos).
   cash        → Efectivo físico. Saldo manual.
   credit_card → Tarjeta de crédito. Disponible = limit - deuda_mes.
   credit_line → Línea de crédito. Igual que credit_card.';

-- ── TRANSACTIONS ──────────────────────────────────────────────
-- CAMBIO v4: Se elimina payment_account_id (antes era la "forma de pago").
-- Ahora account_id sirve para TODOS los tipos de cuenta (débito Y crédito).
-- La lógica contable depende del subtype de la cuenta seleccionada.
CREATE TABLE IF NOT EXISTS transactions (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id     UUID        NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  created_by    UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  type          txn_type    NOT NULL,
  category      TEXT        NOT NULL,
  description   TEXT,
  amount        NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  date          DATE        NOT NULL,

  -- account_id: la cuenta involucrada en la transacción
  -- Para gastos con tarjeta de crédito: account_id = id de la credit_card
  -- Para gastos con débito: account_id = id de la cuenta checking/savings
  -- Para ingresos: account_id = la cuenta donde entra el dinero
  account_id    UUID        REFERENCES accounts(id) ON DELETE SET NULL,

  -- auto_source: 'recurring' | 'debt_payment' | 'savings_deposit' | NULL (manual)
  auto_source   TEXT,
  source_id     UUID,
  notes         TEXT,
  is_void       BOOLEAN     DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON COLUMN transactions.account_id IS
  'La cuenta involucrada. Para todos los tipos:
   - Ingreso en cuenta savings → account_id = savings account id
   - Gasto con tarjeta crédito → account_id = credit_card id (aumenta deuda)
   - Gasto con débito          → account_id = checking id (disminuye saldo)
   - Pago de tarjeta crédito  → account_id = credit_card id, type=expense (reduce deuda)
   Ya no existe payment_account_id — account_id unifica todo.';

-- ── DEBTS ─────────────────────────────────────────────────────
-- Deudas de largo plazo (hipoteca, autos, préstamos).
-- DIFERENTE de credit_card: las deudas no tienen tarjeta, son préstamos.
CREATE TABLE IF NOT EXISTS debts (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id         UUID        NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  created_by        UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  -- De qué cuenta (checking/savings) se descuenta el pago
  linked_account_id UUID        REFERENCES accounts(id) ON DELETE SET NULL,
  name              TEXT        NOT NULL,
  category          TEXT        DEFAULT 'mortgage',
  total_amount      NUMERIC(14,2) NOT NULL CHECK (total_amount > 0),
  paid_amount       NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  monthly_payment   NUMERIC(14,2) CHECK (monthly_payment > 0),
  interest_rate     NUMERIC(6,3)  DEFAULT 0 CHECK (interest_rate >= 0),
  start_date        DATE,
  notes             TEXT,
  is_active         BOOLEAN     DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT debt_paid_lte_total CHECK (paid_amount <= total_amount)
);

-- ── RECURRING_PAYMENTS ────────────────────────────────────────
-- CAMBIO v4: account_id referencia a cualquier cuenta (débito O crédito).
-- Si la cuenta es credit_card → el gasto aumenta la deuda de la tarjeta.
-- Si la cuenta es checking → el gasto disminuye el saldo.
CREATE TABLE IF NOT EXISTS recurring_payments (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id      UUID        NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  created_by     UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  -- La cuenta desde la que se paga (puede ser débito o crédito)
  account_id     UUID        REFERENCES accounts(id) ON DELETE SET NULL,
  -- Vincula con una deuda de largo plazo (hipoteca, auto)
  -- Cuando se marca pagado, también abona a esta deuda
  linked_debt_id UUID        REFERENCES debts(id) ON DELETE SET NULL,
  name           TEXT        NOT NULL,
  amount         NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  frequency      freq_type   NOT NULL DEFAULT 'monthly',
  category       TEXT        NOT NULL DEFAULT 'utilities',
  next_due       DATE,
  notes          TEXT,
  is_active      BOOLEAN     DEFAULT TRUE,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── SAVINGS_GOALS ─────────────────────────────────────────────
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
  CONSTRAINT sg_current_lte_target CHECK (current_amount <= target_amount)
);

-- ── KIDS_GOALS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kids_goals (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id       UUID        NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  kid_profile     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  target_amount   NUMERIC(14,2) NOT NULL CHECK (target_amount > 0),
  current_amount  NUMERIC(14,2) NOT NULL DEFAULT 0,
  status          goal_status NOT NULL DEFAULT 'active',
  emoji           TEXT        DEFAULT '⭐',
  color           TEXT        DEFAULT '#fbbf24',
  reward_text     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS kids_deposits (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id      UUID        NOT NULL REFERENCES kids_goals(id) ON DELETE CASCADE,
  family_id    UUID        NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  amount       NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  deposited_by UUID        REFERENCES profiles(id),
  note         TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS kids_badges (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  kid_profile UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  family_id   UUID        NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  badge_key   TEXT        NOT NULL,
  earned_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(kid_profile, badge_key)
);

CREATE TABLE IF NOT EXISTS budgets (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id    UUID        NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  category     TEXT        NOT NULL,
  amount_limit NUMERIC(14,2) NOT NULL CHECK (amount_limit > 0),
  period_type  TEXT        NOT NULL DEFAULT 'monthly',
  alert_at_pct INT         DEFAULT 80,
  is_active    BOOLEAN     DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(family_id, category, period_type)
);

-- ─────────────────────────────────────────────────────────────
-- SECCIÓN 3: ÍNDICES
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_txn_family_date ON transactions(family_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_txn_account     ON transactions(account_id) WHERE account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_txn_source      ON transactions(source_id)  WHERE source_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_txn_auto        ON transactions(auto_source) WHERE auto_source IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_txn_void        ON transactions(family_id, is_void) WHERE is_void = FALSE;
CREATE INDEX IF NOT EXISTS idx_accounts_family ON accounts(family_id, subtype, is_active);
CREATE INDEX IF NOT EXISTS idx_debts_family    ON debts(family_id, is_active);
CREATE INDEX IF NOT EXISTS idx_rec_due         ON recurring_payments(family_id, next_due) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_profiles_family ON profiles(family_id, role, status);

-- ─────────────────────────────────────────────────────────────
-- SECCIÓN 4: ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────
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

-- Funciones helper (SECURITY DEFINER para leer profiles desde RLS)
CREATE OR REPLACE FUNCTION auth_family_id() RETURNS UUID
LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT family_id FROM profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION auth_role() RETURNS member_role
LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT COALESCE(role,'member'::member_role) FROM profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION auth_status() RETURNS member_status
LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT COALESCE(status,'active'::member_status) FROM profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION auth_is_kid() RETURNS BOOLEAN
LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT COALESCE(is_kid,FALSE) FROM profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION auth_is_admin() RETURNS BOOLEAN
LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT role IN ('owner','admin') FROM profiles WHERE id = auth.uid()
$$;

-- Función helper: determina si una cuenta es de crédito (pasivo)
CREATE OR REPLACE FUNCTION is_credit_account(p_account_id UUID) RETURNS BOOLEAN
LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT subtype IN ('credit_card','credit_line') FROM accounts WHERE id = p_account_id
$$;

-- Limpiar políticas anteriores
DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname, tablename FROM pg_policies WHERE schemaname='public'
    AND tablename IN ('families','profiles','accounts','transactions','debts',
                      'recurring_payments','savings_goals','kids_goals',
                      'kids_deposits','kids_badges','budgets')
  LOOP EXECUTE FORMAT('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename); END LOOP;
END $$;

-- Políticas
CREATE POLICY "profiles_r"  ON profiles FOR SELECT USING (id=auth.uid() OR family_id=auth_family_id());
CREATE POLICY "profiles_i"  ON profiles FOR INSERT WITH CHECK (id=auth.uid());
CREATE POLICY "profiles_u"  ON profiles FOR UPDATE USING (id=auth.uid() OR (auth_is_admin() AND family_id=auth_family_id()));

CREATE POLICY "families_r"  ON families FOR SELECT USING (id=auth_family_id());
CREATE POLICY "families_i"  ON families FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "families_u"  ON families FOR UPDATE USING (id=auth_family_id() AND auth_is_admin());

-- Cuentas: solo admin puede crear/editar (aplica a TODAS las cuentas, débito y crédito)
CREATE POLICY "accounts_r"  ON accounts FOR SELECT USING (family_id=auth_family_id());
CREATE POLICY "accounts_i"  ON accounts FOR INSERT WITH CHECK (family_id=auth_family_id() AND auth_is_admin() AND NOT auth_is_kid());
CREATE POLICY "accounts_u"  ON accounts FOR UPDATE USING (family_id=auth_family_id() AND auth_is_admin());
CREATE POLICY "accounts_d"  ON accounts FOR DELETE USING (family_id=auth_family_id() AND auth_role()='owner');

CREATE POLICY "txn_r" ON transactions FOR SELECT USING (family_id=auth_family_id());
CREATE POLICY "txn_i" ON transactions FOR INSERT WITH CHECK (
  family_id=auth_family_id() AND NOT auth_is_kid() AND auth_status()='active'
);
CREATE POLICY "txn_u" ON transactions FOR UPDATE USING (
  family_id=auth_family_id() AND NOT auth_is_kid()
  AND (created_by=auth.uid() OR auth_is_admin())
);
CREATE POLICY "txn_d" ON transactions FOR DELETE USING (
  family_id=auth_family_id() AND NOT auth_is_kid()
  AND (created_by=auth.uid() OR auth_is_admin())
);

CREATE POLICY "debts_r" ON debts FOR SELECT USING (family_id=auth_family_id());
CREATE POLICY "debts_i" ON debts FOR INSERT WITH CHECK (family_id=auth_family_id() AND NOT auth_is_kid());
CREATE POLICY "debts_u" ON debts FOR UPDATE USING (family_id=auth_family_id() AND NOT auth_is_kid() AND (created_by=auth.uid() OR auth_is_admin()));
CREATE POLICY "debts_d" ON debts FOR DELETE USING (family_id=auth_family_id() AND auth_is_admin());

CREATE POLICY "rec_r" ON recurring_payments FOR SELECT USING (family_id=auth_family_id());
CREATE POLICY "rec_i" ON recurring_payments FOR INSERT WITH CHECK (family_id=auth_family_id() AND NOT auth_is_kid());
CREATE POLICY "rec_u" ON recurring_payments FOR UPDATE USING (family_id=auth_family_id() AND NOT auth_is_kid() AND (created_by=auth.uid() OR auth_is_admin()));
CREATE POLICY "rec_d" ON recurring_payments FOR DELETE USING (family_id=auth_family_id() AND NOT auth_is_kid());

CREATE POLICY "sg_r" ON savings_goals FOR SELECT USING (family_id=auth_family_id());
CREATE POLICY "sg_i" ON savings_goals FOR INSERT WITH CHECK (family_id=auth_family_id() AND NOT auth_is_kid());
CREATE POLICY "sg_u" ON savings_goals FOR UPDATE USING (family_id=auth_family_id() AND NOT auth_is_kid() AND (owner_profile=auth.uid() OR auth_is_admin()));
CREATE POLICY "sg_d" ON savings_goals FOR DELETE USING (family_id=auth_family_id() AND auth_is_admin());

CREATE POLICY "kg_all" ON kids_goals    FOR ALL USING (family_id=auth_family_id());
CREATE POLICY "kd_all" ON kids_deposits FOR ALL USING (family_id=auth_family_id());
CREATE POLICY "kb_all" ON kids_badges   FOR ALL USING (family_id=auth_family_id());
CREATE POLICY "bud_all" ON budgets      FOR ALL USING (family_id=auth_family_id());

-- ─────────────────────────────────────────────────────────────
-- SECCIÓN 5: TRIGGERS
-- ─────────────────────────────────────────────────────────────

-- Trigger: crear perfil al registrarse (robusto, no falla el signup)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_name TEXT;
  v_lang TEXT;
BEGIN
  v_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'display_name'),''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'),''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'name'),''),
    SPLIT_PART(COALESCE(NEW.email,''),'@',1),
    'Usuario'
  );
  v_lang := COALESCE(NULLIF(NEW.raw_user_meta_data->>'lang',''),'es');

  INSERT INTO public.profiles(id,email,display_name,role,status,is_kid,avatar_emoji,avatar_color,lang,theme,onboarded,family_id)
  VALUES (NEW.id,NEW.email,v_name,'member','active',FALSE,'🧑','#4f7cff',v_lang,'dark',FALSE,NULL)
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[MiFinanza] handle_new_user error: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Trigger: updated_at automático
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DO $$ DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['families','profiles','accounts','transactions','debts','recurring_payments','savings_goals','kids_goals'] LOOP
    EXECUTE FORMAT('DROP TRIGGER IF EXISTS trg_upd_%I ON %I', t, t);
    EXECUTE FORMAT('CREATE TRIGGER trg_upd_%I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()', t, t);
  END LOOP;
END $$;

-- Trigger: deuda pagada → marcar inactiva
CREATE OR REPLACE FUNCTION handle_debt_completed() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.paid_amount >= NEW.total_amount AND OLD.paid_amount < OLD.total_amount THEN
    NEW.is_active = FALSE;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_debt_done ON debts;
CREATE TRIGGER trg_debt_done BEFORE UPDATE ON debts FOR EACH ROW EXECUTE FUNCTION handle_debt_completed();

-- Trigger: meta completada → actualizar status
CREATE OR REPLACE FUNCTION handle_goal_completed() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.current_amount >= NEW.target_amount AND NEW.status='active' THEN
    NEW.status = 'completed';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_sg_done ON savings_goals;
DROP TRIGGER IF EXISTS trg_kg_done ON kids_goals;
CREATE TRIGGER trg_sg_done BEFORE UPDATE ON savings_goals FOR EACH ROW EXECUTE FUNCTION handle_goal_completed();
CREATE TRIGGER trg_kg_done BEFORE UPDATE ON kids_goals    FOR EACH ROW EXECUTE FUNCTION handle_goal_completed();

-- ─────────────────────────────────────────────────────────────
-- SECCIÓN 6: FUNCIONES RPC
-- ─────────────────────────────────────────────────────────────

-- ── Auth / Familia ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION rpc_create_family(p_name TEXT, p_currency TEXT DEFAULT 'CAD', p_locale TEXT DEFAULT 'es')
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_fam families; v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  IF TRIM(p_name)='' THEN RAISE EXCEPTION 'Nombre requerido'; END IF;
  IF EXISTS(SELECT 1 FROM profiles WHERE id=v_uid AND family_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Ya perteneces a una familia';
  END IF;
  INSERT INTO families(name,currency,locale) VALUES(TRIM(p_name),p_currency,p_locale) RETURNING * INTO v_fam;
  UPDATE profiles SET family_id=v_fam.id, role='owner', status='active', onboarded=TRUE WHERE id=v_uid;
  RETURN json_build_object('family_id',v_fam.id,'family_name',v_fam.name,'invite_code',v_fam.invite_code,'role','owner');
END;
$$;

CREATE OR REPLACE FUNCTION rpc_join_family(p_invite_code TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_fam families; v_uid UUID := auth.uid(); v_cnt INT; v_max INT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  SELECT * INTO v_fam FROM families WHERE LOWER(invite_code)=LOWER(TRIM(p_invite_code));
  IF NOT FOUND THEN RAISE EXCEPTION 'Código inválido'; END IF;
  IF EXISTS(SELECT 1 FROM profiles WHERE id=v_uid AND family_id IS NOT NULL) THEN RAISE EXCEPTION 'Ya tienes familia'; END IF;
  SELECT COUNT(*) INTO v_cnt FROM profiles WHERE family_id=v_fam.id AND status='active';
  v_max := CASE v_fam.plan WHEN 'free' THEN 2 WHEN 'pro' THEN 5 ELSE 99 END;
  IF v_cnt >= v_max THEN RAISE EXCEPTION 'Límite de miembros alcanzado para el plan %', v_fam.plan; END IF;
  UPDATE profiles SET family_id=v_fam.id, role='member', status='pending' WHERE id=v_uid;
  RETURN json_build_object('family_id',v_fam.id,'family_name',v_fam.name,'status','pending');
END;
$$;

CREATE OR REPLACE FUNCTION rpc_set_member_status(p_member_id UUID, p_status member_status)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT auth_is_admin() THEN RAISE EXCEPTION 'Sin permiso'; END IF;
  IF NOT EXISTS(SELECT 1 FROM profiles WHERE id=p_member_id AND family_id=auth_family_id()) THEN RAISE EXCEPTION 'Miembro no encontrado'; END IF;
  IF EXISTS(SELECT 1 FROM profiles WHERE id=p_member_id AND role='owner') THEN RAISE EXCEPTION 'No se puede modificar al owner'; END IF;
  UPDATE profiles SET status=p_status WHERE id=p_member_id;
  RETURN json_build_object('ok',TRUE,'member_id',p_member_id,'status',p_status);
END;
$$;

CREATE OR REPLACE FUNCTION rpc_set_member_role(p_member_id UUID, p_role member_role)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF auth_role()!='owner' THEN RAISE EXCEPTION 'Solo el owner puede cambiar roles'; END IF;
  IF p_member_id=auth.uid() THEN RAISE EXCEPTION 'No puedes cambiar tu propio rol'; END IF;
  IF NOT EXISTS(SELECT 1 FROM profiles WHERE id=p_member_id AND family_id=auth_family_id()) THEN RAISE EXCEPTION 'No encontrado'; END IF;
  UPDATE profiles SET role=p_role WHERE id=p_member_id;
  RETURN json_build_object('ok',TRUE,'member_id',p_member_id,'role',p_role);
END;
$$;

CREATE OR REPLACE FUNCTION rpc_update_profile(p_display_name TEXT DEFAULT NULL, p_avatar_emoji TEXT DEFAULT NULL, p_avatar_color TEXT DEFAULT NULL, p_lang TEXT DEFAULT NULL, p_theme app_theme DEFAULT NULL)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_p profiles;
BEGIN
  UPDATE profiles SET
    display_name=COALESCE(p_display_name,display_name),
    avatar_emoji=COALESCE(p_avatar_emoji,avatar_emoji),
    avatar_color=COALESCE(p_avatar_color,avatar_color),
    lang=COALESCE(p_lang,lang),
    theme=COALESCE(p_theme,theme),
    updated_at=NOW()
  WHERE id=auth.uid() RETURNING * INTO v_p;
  RETURN row_to_json(v_p);
END;
$$;

-- ── Cuentas (modelo unificado) ────────────────────────────────

-- rpc_add_account: crea cualquier tipo de cuenta (débito o crédito)
-- Solo admin puede crear. La lógica de saldo es automática según subtype.
CREATE OR REPLACE FUNCTION rpc_add_account(
  p_name            TEXT,
  p_subtype         account_subtype,
  p_owner_profile   UUID    DEFAULT NULL,
  p_color           TEXT    DEFAULT '#4f7cff',
  p_institution     TEXT    DEFAULT NULL,
  p_last_four       CHAR(4) DEFAULT NULL,
  p_credit_limit    NUMERIC DEFAULT NULL,
  p_opening_balance NUMERIC DEFAULT 0,
  p_notes           TEXT    DEFAULT NULL
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_acc accounts;
  v_fid UUID := auth_family_id();
BEGIN
  IF NOT auth_is_admin() THEN RAISE EXCEPTION 'Solo el admin puede crear cuentas'; END IF;
  IF auth_is_kid() THEN RAISE EXCEPTION 'No autorizado'; END IF;
  IF TRIM(p_name)='' THEN RAISE EXCEPTION 'Nombre requerido'; END IF;

  -- Validar: credit_limit requerido para cuentas de crédito
  IF p_subtype IN ('credit_card','credit_line') AND (p_credit_limit IS NULL OR p_credit_limit <= 0) THEN
    RAISE EXCEPTION 'El límite de crédito es requerido para tarjetas y líneas de crédito';
  END IF;

  -- opening_balance no aplica para cuentas de crédito
  IF p_subtype IN ('credit_card','credit_line') AND p_opening_balance != 0 THEN
    RAISE EXCEPTION 'Las cuentas de crédito no tienen saldo inicial';
  END IF;

  INSERT INTO accounts(
    family_id, created_by, owner_profile, name, subtype,
    color, institution, last_four, credit_limit, opening_balance, notes
  ) VALUES (
    v_fid, auth.uid(), COALESCE(p_owner_profile, auth.uid()),
    TRIM(p_name), p_subtype,
    p_color, p_institution, p_last_four, p_credit_limit,
    CASE WHEN p_subtype IN ('credit_card','credit_line') THEN 0 ELSE p_opening_balance END,
    p_notes
  )
  RETURNING * INTO v_acc;
  RETURN row_to_json(v_acc);
END;
$$;

CREATE OR REPLACE FUNCTION rpc_update_account(
  p_account_id   UUID,
  p_name         TEXT    DEFAULT NULL,
  p_color        TEXT    DEFAULT NULL,
  p_institution  TEXT    DEFAULT NULL,
  p_credit_limit NUMERIC DEFAULT NULL,
  p_notes        TEXT    DEFAULT NULL,
  p_is_active    BOOLEAN DEFAULT NULL
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_acc accounts;
BEGIN
  IF NOT auth_is_admin() THEN RAISE EXCEPTION 'Solo el admin puede editar cuentas'; END IF;
  UPDATE accounts SET
    name=COALESCE(p_name,name), color=COALESCE(p_color,color),
    institution=COALESCE(p_institution,institution),
    credit_limit=COALESCE(p_credit_limit,credit_limit),
    notes=COALESCE(p_notes,notes), is_active=COALESCE(p_is_active,is_active),
    updated_at=NOW()
  WHERE id=p_account_id AND family_id=auth_family_id()
  RETURNING * INTO v_acc;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cuenta no encontrada'; END IF;
  RETURN row_to_json(v_acc);
END;
$$;

-- ── Transacciones ─────────────────────────────────────────────

-- rpc_add_transaction: registra un movimiento con la cuenta correcta
-- El sistema registra la transacción y la cuenta manejada sola la lógica
-- de saldo (activo: cambia balance, pasivo: cambia deuda acumulada).
CREATE OR REPLACE FUNCTION rpc_add_transaction(
  p_type        txn_type,
  p_category    TEXT,
  p_description TEXT,
  p_amount      NUMERIC,
  p_date        DATE,
  p_account_id  UUID    DEFAULT NULL,
  p_notes       TEXT    DEFAULT NULL,
  p_auto_source TEXT    DEFAULT NULL,
  p_source_id   UUID    DEFAULT NULL
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_fid UUID := auth_family_id();
  v_txn transactions;
BEGIN
  IF v_fid IS NULL THEN RAISE EXCEPTION 'Sin familia asignada'; END IF;
  IF auth_is_kid() THEN RAISE EXCEPTION 'Los niños no pueden registrar transacciones'; END IF;
  IF auth_status()!='active' THEN RAISE EXCEPTION 'Cuenta pendiente de aprobación'; END IF;
  IF p_amount<=0 THEN RAISE EXCEPTION 'El monto debe ser mayor que cero'; END IF;

  -- Validar que la cuenta pertenece a la familia
  IF p_account_id IS NOT NULL AND NOT EXISTS(
    SELECT 1 FROM accounts WHERE id=p_account_id AND family_id=v_fid AND is_active=TRUE
  ) THEN RAISE EXCEPTION 'Cuenta no encontrada o inactiva'; END IF;

  INSERT INTO transactions(family_id,created_by,type,category,description,amount,date,account_id,notes,auto_source,source_id)
  VALUES (v_fid,auth.uid(),p_type,p_category,p_description,p_amount,p_date,p_account_id,p_notes,p_auto_source,p_source_id)
  RETURNING * INTO v_txn;
  RETURN row_to_json(v_txn);
END;
$$;

CREATE OR REPLACE FUNCTION rpc_update_transaction(
  p_txn_id      UUID,
  p_type        txn_type DEFAULT NULL,
  p_category    TEXT     DEFAULT NULL,
  p_description TEXT     DEFAULT NULL,
  p_amount      NUMERIC  DEFAULT NULL,
  p_date        DATE     DEFAULT NULL,
  p_account_id  UUID     DEFAULT NULL,
  p_notes       TEXT     DEFAULT NULL
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_txn transactions;
BEGIN
  IF auth_is_kid() THEN RAISE EXCEPTION 'No autorizado'; END IF;
  SELECT * INTO v_txn FROM transactions WHERE id=p_txn_id AND family_id=auth_family_id() AND NOT is_void;
  IF NOT FOUND THEN RAISE EXCEPTION 'Transacción no encontrada'; END IF;
  IF v_txn.created_by!=auth.uid() AND NOT auth_is_admin() THEN RAISE EXCEPTION 'Sin permiso para editar'; END IF;
  UPDATE transactions SET
    type=COALESCE(p_type,type), category=COALESCE(p_category,category),
    description=COALESCE(p_description,description), amount=COALESCE(p_amount,amount),
    date=COALESCE(p_date,date), account_id=COALESCE(p_account_id,account_id),
    notes=COALESCE(p_notes,notes), updated_at=NOW()
  WHERE id=p_txn_id RETURNING * INTO v_txn;
  RETURN row_to_json(v_txn);
END;
$$;

-- ── Deudas ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION rpc_pay_debt(p_debt_id UUID, p_amount NUMERIC, p_date DATE DEFAULT CURRENT_DATE)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_debt debts; v_fid UUID := auth_family_id(); v_new_paid NUMERIC; v_txn_id UUID;
BEGIN
  IF auth_is_kid() THEN RAISE EXCEPTION 'No autorizado'; END IF;
  SELECT * INTO v_debt FROM debts WHERE id=p_debt_id AND family_id=v_fid AND is_active=TRUE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Deuda no encontrada'; END IF;
  v_new_paid := LEAST(v_debt.total_amount, v_debt.paid_amount + p_amount);
  UPDATE debts SET paid_amount=v_new_paid, updated_at=NOW() WHERE id=p_debt_id;
  IF NOT EXISTS(
    SELECT 1 FROM transactions WHERE source_id=p_debt_id AND auto_source='debt_payment'
    AND date=p_date AND amount=p_amount AND family_id=v_fid AND NOT is_void
  ) THEN
    INSERT INTO transactions(family_id,created_by,type,category,description,amount,date,account_id,auto_source,source_id)
    VALUES (v_fid,auth.uid(),'expense',v_debt.category,'Pago: '||v_debt.name,p_amount,p_date,v_debt.linked_account_id,'debt_payment',p_debt_id)
    RETURNING id INTO v_txn_id;
  END IF;
  RETURN json_build_object('debt_id',p_debt_id,'paid_amount',v_new_paid,'remaining',v_debt.total_amount-v_new_paid,'completed',v_new_paid>=v_debt.total_amount,'transaction_id',v_txn_id);
END;
$$;

CREATE OR REPLACE FUNCTION rpc_update_debt(
  p_debt_id UUID, p_name TEXT DEFAULT NULL, p_total_amount NUMERIC DEFAULT NULL,
  p_monthly_payment NUMERIC DEFAULT NULL, p_interest_rate NUMERIC DEFAULT NULL,
  p_start_date DATE DEFAULT NULL, p_category TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL, p_is_active BOOLEAN DEFAULT NULL
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_d debts;
BEGIN
  IF auth_is_kid() THEN RAISE EXCEPTION 'No autorizado'; END IF;
  UPDATE debts SET
    name=COALESCE(p_name,name), total_amount=COALESCE(p_total_amount,total_amount),
    monthly_payment=COALESCE(p_monthly_payment,monthly_payment), interest_rate=COALESCE(p_interest_rate,interest_rate),
    start_date=COALESCE(p_start_date,start_date), category=COALESCE(p_category,category),
    notes=COALESCE(p_notes,notes), is_active=COALESCE(p_is_active,is_active), updated_at=NOW()
  WHERE id=p_debt_id AND family_id=auth_family_id() AND (created_by=auth.uid() OR auth_is_admin())
  RETURNING * INTO v_d;
  IF NOT FOUND THEN RAISE EXCEPTION 'No encontrado o sin permiso'; END IF;
  RETURN row_to_json(v_d);
END;
$$;

-- ── Recurrentes ───────────────────────────────────────────────
-- rpc_mark_recurring_paid: marca pagado y abona a deuda si está vinculada
CREATE OR REPLACE FUNCTION rpc_mark_recurring_paid(p_rec_id UUID, p_date DATE DEFAULT CURRENT_DATE)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_rec recurring_payments; v_next DATE; v_txn_id UUID; v_fid UUID := auth_family_id();
BEGIN
  IF auth_is_kid() THEN RAISE EXCEPTION 'No autorizado'; END IF;
  SELECT * INTO v_rec FROM recurring_payments WHERE id=p_rec_id AND family_id=v_fid AND is_active=TRUE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No encontrado'; END IF;

  v_next := CASE v_rec.frequency
    WHEN 'weekly'   THEN v_rec.next_due + INTERVAL '7 days'
    WHEN 'biweekly' THEN v_rec.next_due + INTERVAL '14 days'
    WHEN 'monthly'  THEN v_rec.next_due + INTERVAL '1 month'
    WHEN 'yearly'   THEN v_rec.next_due + INTERVAL '1 year'
    ELSE v_rec.next_due + INTERVAL '1 month' END;

  UPDATE recurring_payments SET next_due=v_next, updated_at=NOW() WHERE id=p_rec_id;

  -- Crear transacción automática (idempotente)
  IF NOT EXISTS(
    SELECT 1 FROM transactions
    WHERE source_id=p_rec_id AND auto_source='recurring' AND date=p_date AND family_id=v_fid AND NOT is_void
  ) THEN
    INSERT INTO transactions(family_id,created_by,type,category,description,amount,date,account_id,auto_source,source_id)
    VALUES (v_fid,auth.uid(),'expense',v_rec.category,v_rec.name,v_rec.amount,p_date,v_rec.account_id,'recurring',p_rec_id)
    RETURNING id INTO v_txn_id;
  END IF;

  -- Si tiene deuda vinculada, abonar automáticamente
  IF v_rec.linked_debt_id IS NOT NULL THEN
    PERFORM rpc_pay_debt(v_rec.linked_debt_id, v_rec.amount, p_date);
  END IF;

  RETURN json_build_object('recurring_id',p_rec_id,'next_due',v_next,'transaction_id',v_txn_id,'debt_abonado',v_rec.linked_debt_id IS NOT NULL);
END;
$$;

CREATE OR REPLACE FUNCTION rpc_update_recurring(
  p_rec_id UUID, p_name TEXT DEFAULT NULL, p_amount NUMERIC DEFAULT NULL,
  p_frequency freq_type DEFAULT NULL, p_category TEXT DEFAULT NULL,
  p_account_id UUID DEFAULT NULL, p_linked_debt_id UUID DEFAULT NULL,
  p_next_due DATE DEFAULT NULL, p_notes TEXT DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT NULL, p_clear_debt BOOLEAN DEFAULT FALSE
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_r recurring_payments;
BEGIN
  IF auth_is_kid() THEN RAISE EXCEPTION 'No autorizado'; END IF;
  UPDATE recurring_payments SET
    name=COALESCE(p_name,name), amount=COALESCE(p_amount,amount),
    frequency=COALESCE(p_frequency,frequency), category=COALESCE(p_category,category),
    account_id=COALESCE(p_account_id,account_id),
    linked_debt_id=CASE WHEN p_clear_debt THEN NULL ELSE COALESCE(p_linked_debt_id,linked_debt_id) END,
    next_due=COALESCE(p_next_due,next_due), notes=COALESCE(p_notes,notes),
    is_active=COALESCE(p_is_active,is_active), updated_at=NOW()
  WHERE id=p_rec_id AND family_id=auth_family_id() AND (created_by=auth.uid() OR auth_is_admin())
  RETURNING * INTO v_r;
  IF NOT FOUND THEN RAISE EXCEPTION 'No encontrado o sin permiso'; END IF;
  RETURN row_to_json(v_r);
END;
$$;

-- ── Metas ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION rpc_deposit_savings_goal(p_goal_id UUID, p_amount NUMERIC, p_date DATE DEFAULT CURRENT_DATE, p_account_id UUID DEFAULT NULL)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_g savings_goals; v_new NUMERIC; v_txn_id UUID;
BEGIN
  IF auth_is_kid() THEN RAISE EXCEPTION 'No autorizado'; END IF;
  IF p_amount<=0 THEN RAISE EXCEPTION 'Monto inválido'; END IF;
  SELECT * INTO v_g FROM savings_goals WHERE id=p_goal_id AND family_id=auth_family_id();
  IF NOT FOUND THEN RAISE EXCEPTION 'Meta no encontrada'; END IF;
  IF v_g.status='completed' THEN RAISE EXCEPTION 'Meta ya completada'; END IF;
  v_new := LEAST(v_g.target_amount, v_g.current_amount + p_amount);
  UPDATE savings_goals SET current_amount=v_new, updated_at=NOW() WHERE id=p_goal_id;
  INSERT INTO transactions(family_id,created_by,type,category,description,amount,date,account_id,auto_source,source_id)
  VALUES (auth_family_id(),auth.uid(),'saving','goal','Ahorro: '||v_g.name,p_amount,p_date,COALESCE(p_account_id,v_g.account_id),'savings_deposit',p_goal_id)
  RETURNING id INTO v_txn_id;
  RETURN json_build_object('goal_id',p_goal_id,'new_amount',v_new,'completed',v_new>=v_g.target_amount,'transaction_id',v_txn_id);
END;
$$;

CREATE OR REPLACE FUNCTION rpc_update_savings_goal(
  p_goal_id UUID, p_name TEXT DEFAULT NULL, p_target_amount NUMERIC DEFAULT NULL,
  p_emoji TEXT DEFAULT NULL, p_color TEXT DEFAULT NULL,
  p_deadline DATE DEFAULT NULL, p_status goal_status DEFAULT NULL, p_notes TEXT DEFAULT NULL
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_g savings_goals;
BEGIN
  IF auth_is_kid() THEN RAISE EXCEPTION 'No autorizado'; END IF;
  UPDATE savings_goals SET
    name=COALESCE(p_name,name), target_amount=COALESCE(p_target_amount,target_amount),
    emoji=COALESCE(p_emoji,emoji), color=COALESCE(p_color,color),
    deadline=COALESCE(p_deadline,deadline), status=COALESCE(p_status,status),
    notes=COALESCE(p_notes,notes), updated_at=NOW()
  WHERE id=p_goal_id AND family_id=auth_family_id() AND (owner_profile=auth.uid() OR auth_is_admin())
  RETURNING * INTO v_g;
  IF NOT FOUND THEN RAISE EXCEPTION 'No encontrado o sin permiso'; END IF;
  RETURN row_to_json(v_g);
END;
$$;

CREATE OR REPLACE FUNCTION rpc_kids_deposit(p_goal_id UUID, p_amount NUMERIC, p_note TEXT DEFAULT NULL)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_g kids_goals; v_new NUMERIC;
BEGIN
  IF auth_is_kid() THEN RAISE EXCEPTION 'Solo padres pueden depositar'; END IF;
  SELECT * INTO v_g FROM kids_goals WHERE id=p_goal_id AND family_id=auth_family_id();
  IF NOT FOUND THEN RAISE EXCEPTION 'Meta no encontrada'; END IF;
  v_new := LEAST(v_g.target_amount, v_g.current_amount + p_amount);
  UPDATE kids_goals SET current_amount=v_new, updated_at=NOW() WHERE id=p_goal_id;
  INSERT INTO kids_deposits(goal_id,family_id,amount,deposited_by,note) VALUES(p_goal_id,auth_family_id(),p_amount,auth.uid(),p_note);
  PERFORM rpc_check_kid_badges(v_g.kid_profile);
  RETURN json_build_object('goal_id',p_goal_id,'new_amount',v_new,'completed',v_new>=v_g.target_amount);
END;
$$;

CREATE OR REPLACE FUNCTION rpc_check_kid_badges(p_kid UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_fid UUID; v_goals INT; v_done INT; v_total NUMERIC;
BEGIN
  SELECT family_id INTO v_fid FROM profiles WHERE id=p_kid;
  SELECT COUNT(*), COUNT(*) FILTER(WHERE status='completed'), COALESCE(SUM(current_amount),0)
  INTO v_goals, v_done, v_total FROM kids_goals WHERE kid_profile=p_kid;
  IF v_goals>=1   THEN INSERT INTO kids_badges(kid_profile,family_id,badge_key) VALUES(p_kid,v_fid,'first_goal')     ON CONFLICT DO NOTHING; END IF;
  IF v_done>=1    THEN INSERT INTO kids_badges(kid_profile,family_id,badge_key) VALUES(p_kid,v_fid,'goal_completed') ON CONFLICT DO NOTHING; END IF;
  IF v_done>=3    THEN INSERT INTO kids_badges(kid_profile,family_id,badge_key) VALUES(p_kid,v_fid,'super_saver')    ON CONFLICT DO NOTHING; END IF;
  IF v_total>=500 THEN INSERT INTO kids_badges(kid_profile,family_id,badge_key) VALUES(p_kid,v_fid,'big_saver')      ON CONFLICT DO NOTHING; END IF;
  IF EXISTS(SELECT 1 FROM kids_goals WHERE kid_profile=p_kid AND current_amount>=target_amount*0.5) THEN
    INSERT INTO kids_badges(kid_profile,family_id,badge_key) VALUES(p_kid,v_fid,'halfway') ON CONFLICT DO NOTHING;
  END IF;
END;
$$;

-- ── Dashboard summary ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION rpc_dashboard_summary(p_from DATE, p_to DATE, p_account_id UUID DEFAULT NULL)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE
  v_fid UUID := auth_family_id();
  v_income NUMERIC; v_expense NUMERIC; v_saving NUMERIC;
  v_pie JSON; v_trend JSON;
BEGIN
  IF auth_status()!='active' THEN RAISE EXCEPTION 'Cuenta pendiente'; END IF;
  SELECT
    COALESCE(SUM(amount) FILTER(WHERE type='income'),0),
    COALESCE(SUM(amount) FILTER(WHERE type='expense'),0),
    COALESCE(SUM(amount) FILTER(WHERE type='saving'),0)
  INTO v_income, v_expense, v_saving
  FROM transactions
  WHERE family_id=v_fid AND date BETWEEN p_from AND p_to AND NOT is_void
  AND (p_account_id IS NULL OR account_id=p_account_id);

  SELECT json_agg(row_to_json(t)) INTO v_pie FROM (
    SELECT category, SUM(amount) AS value
    FROM transactions WHERE family_id=v_fid AND type='expense'
    AND date BETWEEN p_from AND p_to AND NOT is_void
    AND (p_account_id IS NULL OR account_id=p_account_id)
    GROUP BY category ORDER BY value DESC LIMIT 12
  ) t;

  SELECT json_agg(row_to_json(t)) INTO v_trend FROM (
    SELECT TO_CHAR(DATE_TRUNC('month',date),'YYYY-MM') AS month,
      COALESCE(SUM(amount) FILTER(WHERE type='income'),0) AS income,
      COALESCE(SUM(amount) FILTER(WHERE type='expense'),0) AS expense,
      COALESCE(SUM(amount) FILTER(WHERE type='saving'),0) AS saving
    FROM transactions
    WHERE family_id=v_fid AND NOT is_void
    AND date >= DATE_TRUNC('month',NOW()) - INTERVAL '7 months'
    AND (p_account_id IS NULL OR account_id=p_account_id)
    GROUP BY 1 ORDER BY 1
  ) t;

  RETURN json_build_object(
    'income',v_income,'expense',v_expense,'saving',v_saving,
    'balance',v_income-v_expense-v_saving,
    'savings_rate',CASE WHEN v_income>0 THEN ROUND((v_saving/v_income)*100,1) ELSE 0 END,
    'by_category',COALESCE(v_pie,'[]'::JSON),
    'monthly_trend',COALESCE(v_trend,'[]'::JSON)
  );
END;
$$;

-- ── Patrimonio neto ───────────────────────────────────────────
-- ACTUALIZADO v4: separa correctamente activos y pasivos
-- Activos: saldo de cuentas checking/savings/investment/cash
-- Pasivos crédito: deuda acumulada en credit_card/credit_line (mes actual)
-- Pasivos largo plazo: deudas (hipoteca, auto, etc.)
CREATE OR REPLACE FUNCTION rpc_net_worth()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE
  v_fid UUID := auth_family_id();
  v_assets NUMERIC; v_credit_debt NUMERIC; v_long_debt NUMERIC;
BEGIN
  -- Activos: saldo de cuentas de débito/ahorro/inversión/efectivo
  SELECT COALESCE(SUM(
    a.opening_balance
    + COALESCE((SELECT SUM(amount) FILTER(WHERE type='income')  FROM transactions WHERE account_id=a.id AND NOT is_void),0)
    - COALESCE((SELECT SUM(amount) FILTER(WHERE type='expense') FROM transactions WHERE account_id=a.id AND NOT is_void),0)
    - COALESCE((SELECT SUM(amount) FILTER(WHERE type='saving')  FROM transactions WHERE account_id=a.id AND NOT is_void),0)
  ),0) INTO v_assets
  FROM accounts a
  WHERE a.family_id=v_fid AND a.subtype IN ('checking','savings','investment','cash') AND a.is_active=TRUE;

  -- Pasivos de corto plazo: deuda acumulada en tarjetas/líneas de crédito
  SELECT COALESCE(SUM(
    COALESCE((SELECT SUM(amount) FILTER(WHERE type='expense') FROM transactions WHERE account_id=a.id AND NOT is_void),0)
  ),0) INTO v_credit_debt
  FROM accounts a
  WHERE a.family_id=v_fid AND a.subtype IN ('credit_card','credit_line') AND a.is_active=TRUE;

  -- Pasivos de largo plazo: saldo restante de deudas (hipoteca, autos)
  SELECT COALESCE(SUM(total_amount-paid_amount),0) INTO v_long_debt
  FROM debts WHERE family_id=v_fid AND is_active=TRUE;

  RETURN json_build_object(
    'assets',     v_assets,
    'credit_debt',v_credit_debt,
    'long_debt',  v_long_debt,
    'liabilities',v_credit_debt + v_long_debt,
    'net',        v_assets - v_credit_debt - v_long_debt
  );
END;
$$;

-- ── AI Context ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION rpc_ai_financial_context(p_months_back INT DEFAULT 6)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE
  v_fid UUID := auth_family_id();
  v_from DATE := DATE_TRUNC('month',NOW()) - ((p_months_back-1)||' months')::INTERVAL;
  v_summary JSON; v_nw JSON; v_debts JSON; v_recs JSON; v_accounts JSON;
BEGIN
  v_summary := rpc_dashboard_summary(v_from, CURRENT_DATE);
  v_nw      := rpc_net_worth();

  SELECT json_agg(row_to_json(t)) INTO v_accounts FROM (
    SELECT a.name, a.subtype,
      CASE WHEN a.subtype IN ('credit_card','credit_line') THEN
        a.credit_limit - COALESCE((SELECT SUM(amount) FILTER(WHERE type='expense') FROM transactions WHERE account_id=a.id AND NOT is_void AND TO_CHAR(date,'YYYY-MM')=TO_CHAR(NOW(),'YYYY-MM')),0)
      ELSE
        a.opening_balance
        + COALESCE((SELECT SUM(amount) FILTER(WHERE type='income')  FROM transactions WHERE account_id=a.id AND NOT is_void),0)
        - COALESCE((SELECT SUM(amount) FILTER(WHERE type='expense') FROM transactions WHERE account_id=a.id AND NOT is_void),0)
        - COALESCE((SELECT SUM(amount) FILTER(WHERE type='saving')  FROM transactions WHERE account_id=a.id AND NOT is_void),0)
      END AS balance_or_available,
      a.credit_limit
    FROM accounts a WHERE a.family_id=v_fid AND a.is_active=TRUE
  ) t;

  SELECT json_agg(row_to_json(t)) INTO v_debts FROM (
    SELECT name, total_amount, paid_amount, monthly_payment, interest_rate,
      total_amount-paid_amount AS remaining,
      CASE WHEN monthly_payment>0 THEN CEIL((total_amount-paid_amount)/monthly_payment) ELSE NULL END AS months_left
    FROM debts WHERE family_id=v_fid AND is_active=TRUE
  ) t;

  SELECT json_agg(row_to_json(t)) INTO v_recs FROM (
    SELECT r.name, r.amount, r.frequency, r.category, r.next_due,
      a.name AS account_name, a.subtype AS account_subtype,
      (SELECT d.name FROM debts d WHERE d.id=r.linked_debt_id) AS linked_debt_name
    FROM recurring_payments r
    LEFT JOIN accounts a ON a.id=r.account_id
    WHERE r.family_id=v_fid AND r.is_active=TRUE
  ) t;

  RETURN json_build_object(
    'generated_at',    NOW(),
    'months_analyzed', p_months_back,
    'currency',        (SELECT currency FROM families WHERE id=v_fid),
    'accounts',        COALESCE(v_accounts,'[]'::JSON),
    'summary',         v_summary,
    'net_worth',       v_nw,
    'debts',           COALESCE(v_debts,'[]'::JSON),
    'recurring',       COALESCE(v_recs,'[]'::JSON)
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- SECCIÓN 7: VISTAS
-- ─────────────────────────────────────────────────────────────

-- Vista unificada de cuentas con saldo calculado
-- Para activos: saldo = apertura + ingresos - gastos - ahorros
-- Para crédito: disponible = límite - gastos_acumulados_mes, deuda = gastos_acumulados
CREATE OR REPLACE VIEW account_balances AS
SELECT
  a.id,
  a.family_id,
  a.name,
  a.subtype,
  -- is_credit: indica si es cuenta de crédito (pasivo)
  a.subtype IN ('credit_card','credit_line') AS is_credit,
  a.color,
  a.institution,
  a.last_four,
  a.credit_limit,
  a.opening_balance,
  p.display_name AS owner_name,
  -- Saldo para cuentas de activo (checking, savings, investment, cash)
  CASE WHEN a.subtype NOT IN ('credit_card','credit_line') THEN
    a.opening_balance
    + COALESCE(SUM(t.amount) FILTER(WHERE t.type='income'),  0)
    - COALESCE(SUM(t.amount) FILTER(WHERE t.type='expense'), 0)
    - COALESCE(SUM(t.amount) FILTER(WHERE t.type='saving'),  0)
  ELSE NULL END AS balance,
  -- Deuda acumulada del mes actual (para crédito)
  CASE WHEN a.subtype IN ('credit_card','credit_line') THEN
    COALESCE(SUM(t.amount) FILTER(
      WHERE t.type='expense'
      AND TO_CHAR(t.date,'YYYY-MM') = TO_CHAR(NOW(),'YYYY-MM')
    ), 0)
  ELSE NULL END AS month_debt,
  -- Disponible del mes actual (para crédito)
  CASE WHEN a.subtype IN ('credit_card','credit_line') THEN
    a.credit_limit - COALESCE(SUM(t.amount) FILTER(
      WHERE t.type='expense'
      AND TO_CHAR(t.date,'YYYY-MM') = TO_CHAR(NOW(),'YYYY-MM')
    ), 0)
  ELSE NULL END AS available,
  -- Deuda total acumulada (crédito, todos los tiempos)
  CASE WHEN a.subtype IN ('credit_card','credit_line') THEN
    COALESCE(SUM(t.amount) FILTER(WHERE t.type='expense'), 0)
  ELSE NULL END AS total_debt,
  COALESCE(SUM(t.amount) FILTER(WHERE t.type='income'),  0) AS total_income,
  COALESCE(SUM(t.amount) FILTER(WHERE t.type='expense'), 0) AS total_expense
FROM accounts a
LEFT JOIN transactions t ON t.account_id=a.id AND NOT t.is_void
LEFT JOIN profiles p ON p.id=a.owner_profile
WHERE a.is_active=TRUE
GROUP BY a.id, a.family_id, a.name, a.subtype, a.color, a.institution,
         a.last_four, a.credit_limit, a.opening_balance, p.display_name;

COMMENT ON VIEW account_balances IS
  'Vista unificada de cuentas con saldo calculado dinámicamente.
   balance:    para activos (checking/savings/investment/cash)
   month_debt: deuda del mes actual para crédito (credit_card/credit_line)
   available:  crédito disponible = limit - month_debt
   is_credit:  true si es tarjeta o línea de crédito';

-- Vista de pagos recurrentes con info de cuenta y deuda
CREATE OR REPLACE VIEW recurring_with_details AS
SELECT
  r.*,
  a.name AS account_name,
  a.subtype AS account_subtype,
  a.color AS account_color,
  a.last_four AS account_last_four,
  d.name AS linked_debt_name,
  d.total_amount - d.paid_amount AS linked_debt_remaining,
  (r.next_due - CURRENT_DATE) AS days_until_due,
  CASE
    WHEN r.next_due < CURRENT_DATE THEN 'overdue'
    WHEN r.next_due <= CURRENT_DATE + 5 THEN 'due_soon'
    ELSE 'up_to_date'
  END AS status_label
FROM recurring_payments r
LEFT JOIN accounts a ON a.id = r.account_id
LEFT JOIN debts d ON d.id = r.linked_debt_id
WHERE r.is_active = TRUE;

-- Vista de límites por plan
CREATE OR REPLACE VIEW plan_limits AS
SELECT
  f.id AS family_id, f.plan,
  COUNT(DISTINCT p.id)  AS member_count,
  COUNT(DISTINCT t.id)  AS transaction_count,
  CASE f.plan WHEN 'free' THEN 2  WHEN 'pro' THEN 5  ELSE 999 END AS max_members,
  CASE f.plan WHEN 'free' THEN 50 WHEN 'pro' THEN 500 ELSE 99999 END AS max_transactions
FROM families f
LEFT JOIN profiles p ON p.family_id=f.id AND p.status='active'
LEFT JOIN transactions t ON t.family_id=f.id AND NOT t.is_void
GROUP BY f.id, f.plan;

-- ─────────────────────────────────────────────────────────────
-- SECCIÓN 8: VERIFICACIÓN FINAL
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE v_tables INT; v_rpcs INT; v_views INT; v_trigger INT;
BEGIN
  SELECT COUNT(*) INTO v_tables FROM information_schema.tables
  WHERE table_schema='public' AND table_name IN (
    'families','profiles','accounts','transactions','debts',
    'recurring_payments','savings_goals','kids_goals','kids_deposits','kids_badges','budgets'
  );
  SELECT COUNT(*) INTO v_rpcs FROM information_schema.routines
  WHERE routine_schema='public' AND routine_name LIKE 'rpc_%';
  SELECT COUNT(*) INTO v_views FROM information_schema.views
  WHERE table_schema='public' AND table_name IN ('account_balances','recurring_with_details','plan_limits');
  SELECT COUNT(*) INTO v_trigger FROM information_schema.triggers WHERE trigger_name='on_auth_user_created';

  RAISE NOTICE '╔══════════════════════════════════════════════╗';
  RAISE NOTICE '║  MiFinanza Schema v4 — Verificación final    ║';
  RAISE NOTICE '╠══════════════════════════════════════════════╣';
  RAISE NOTICE '║  Tablas:    %/11                              ║', v_tables;
  RAISE NOTICE '║  Funciones: % RPCs                           ║', v_rpcs;
  RAISE NOTICE '║  Vistas:    %/3                               ║', v_views;
  RAISE NOTICE '║  Trigger:   % (handle_new_user)              ║', v_trigger;
  RAISE NOTICE '╠══════════════════════════════════════════════╣';
  IF v_tables=11 AND v_rpcs>=16 AND v_views=3 AND v_trigger=1 THEN
    RAISE NOTICE '║  ✅ Schema v4 instalado correctamente         ║';
  ELSE
    RAISE NOTICE '║  ⚠️  Revisar — algo no se instaló bien        ║';
  END IF;
  RAISE NOTICE '╠══════════════════════════════════════════════╣';
  RAISE NOTICE '║  CAMBIOS v4 vs v3:                            ║';
  RAISE NOTICE '║  - Sin payment_account_id en transactions     ║';
  RAISE NOTICE '║  - account_subtype unifica débito y crédito   ║';
  RAISE NOTICE '║  - rpc_net_worth separa crédito y largo plazo ║';
  RAISE NOTICE '║  - Vista account_balances muestra disponible  ║';
  RAISE NOTICE '╚══════════════════════════════════════════════╝';
END $$;