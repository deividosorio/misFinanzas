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

-- ─────────────────────────────────────────────────────────────
-- SECCIÓN 1: EXTENSIONES
-- ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────────────────────
-- SECCIÓN 2: TIPOS ENUMERADOS
-- Se usan DO/EXCEPTION para no fallar si ya existen
-- ─────────────────────────────────────────────────────────────

DO $$ BEGIN CREATE TYPE plan_type AS ENUM ('free','pro','family','admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE member_role AS ENUM ('owner','admin','member','kid');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE member_status AS ENUM ('pending','active','suspended');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE txn_type AS ENUM ('income','expense','saving','transfer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE account_nature AS ENUM ('asset','liability','equity','income','expense');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE account_subtype AS ENUM (
  'savings','checking','investment','cash',
  'credit_card','debit_card','credit_line',
  'mortgage','car_loan','personal_loan'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE freq_type AS ENUM ('weekly','biweekly','monthly','yearly');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE goal_status AS ENUM ('active','completed','paused','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE app_theme AS ENUM ('dark','light','system');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─────────────────────────────────────────────────────────────
-- SECCIÓN 3: TABLAS PRINCIPALES
-- ─────────────────────────────────────────────────────────────

-- ── 3.1 FAMILIES ──────────────────────────────────────────────
-- Unidad de suscripción (tenant). Todos los datos están aislados por family_id.
CREATE TABLE IF NOT EXISTS families (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT        NOT NULL,
  plan            plan_type   NOT NULL DEFAULT 'free',
  plan_expires_at TIMESTAMPTZ,
  -- Código de invitación: 12 caracteres hex aleatorios
  invite_code     TEXT        UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
  currency        TEXT        NOT NULL DEFAULT 'CAD',
  locale          TEXT        NOT NULL DEFAULT 'es',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE families IS
  'Tenant de la aplicación. Todos los datos (transacciones, cuentas, etc.)
   pertenecen a una familia. El plan controla los límites de uso.';

-- ── 3.2 PROFILES ──────────────────────────────────────────────
-- Extiende auth.users de Supabase con datos de la app.
-- El trigger handle_new_user() crea este registro automáticamente al registrarse.
CREATE TABLE IF NOT EXISTS profiles (
  id            UUID          PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  family_id     UUID          REFERENCES families(id) ON DELETE SET NULL,
  -- email: se copia de auth.users para facilitar búsquedas y UI de miembros
  -- sin necesidad de hacer JOINs con auth.users (que requiere service_role)
  email         TEXT,
  role          member_role   NOT NULL DEFAULT 'member',
  status        member_status NOT NULL DEFAULT 'active',
  display_name  TEXT,
  avatar_emoji  TEXT          DEFAULT '🧑',
  avatar_color  TEXT          DEFAULT '#4f7cff',
  is_kid        BOOLEAN       DEFAULT FALSE,
  -- Preferencias de interfaz
  lang          TEXT          DEFAULT 'es'   CHECK (lang IN ('es','en','fr')),
  theme         app_theme     DEFAULT 'dark',
  onboarded     BOOLEAN       DEFAULT FALSE,
  created_at    TIMESTAMPTZ   DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   DEFAULT NOW()
);

COMMENT ON TABLE profiles IS
  'Perfil de usuario. Se crea automáticamente vía trigger al hacer signUp().
   family_id=NULL significa que el usuario aún no creó ni se unió a una familia.
   status=pending significa que se unió pero el admin no lo ha aprobado.';

COMMENT ON COLUMN profiles.email IS
  'Copia del email de auth.users. Se actualiza en el trigger handle_new_user().
   Permite mostrar emails en la UI de miembros sin acceso a auth.users.';

COMMENT ON COLUMN profiles.role IS
  'owner: creó la familia, control total.
   admin: puede aprobar miembros y crear cuentas.
   member: puede registrar transacciones.
   kid: solo ve la interfaz Kids, no puede crear transacciones.';

-- NUEVAS COLUMNAS (si la tabla ya existe de una versión anterior)
DO $$ BEGIN
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;
EXCEPTION WHEN others THEN NULL; END $$;

-- ── 3.3 ACCOUNTS ──────────────────────────────────────────────
-- Plan de cuentas: activos (savings, checking, investment, cash)
-- y pasivos (credit_card, credit_line) de la familia.
-- Solo owner y admin pueden crear/editar cuentas (verificado en RLS).
CREATE TABLE IF NOT EXISTS accounts (
  id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id       UUID            NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  owner_profile   UUID            REFERENCES profiles(id) ON DELETE SET NULL,
  created_by      UUID            REFERENCES profiles(id) ON DELETE SET NULL,
  name            TEXT            NOT NULL,
  nature          account_nature  NOT NULL DEFAULT 'asset',
  subtype         account_subtype NOT NULL DEFAULT 'savings',
  color           TEXT            DEFAULT '#4f7cff',
  institution     TEXT,
  last_four       CHAR(4),
  credit_limit    NUMERIC(14,2),
  opening_balance NUMERIC(14,2)   DEFAULT 0,
  is_active       BOOLEAN         DEFAULT TRUE,
  notes           TEXT,
  created_at      TIMESTAMPTZ     DEFAULT NOW(),
  updated_at      TIMESTAMPTZ     DEFAULT NOW()
);

COMMENT ON TABLE accounts IS
  'Plan de cuentas de la familia. Incluye cuentas bancarias, inversiones,
   efectivo y tarjetas de crédito. El saldo se calcula dinámicamente
   desde las transacciones (no se guarda como campo).';

-- ── 3.4 TRANSACTIONS ──────────────────────────────────────────
-- Historial de todos los movimientos financieros.
-- Las transacciones automáticas tienen auto_source != NULL.
CREATE TABLE IF NOT EXISTS transactions (
  id                   UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id            UUID        NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  created_by           UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  type                 txn_type    NOT NULL,
  category             TEXT        NOT NULL,
  description          TEXT,
  amount               NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  date                 DATE        NOT NULL,
  account_id           UUID        REFERENCES accounts(id) ON DELETE SET NULL,
  payment_account_id   UUID        REFERENCES accounts(id) ON DELETE SET NULL,
  -- auto_source: identifica transacciones creadas automáticamente
  -- Valores: 'recurring' | 'debt_payment' | 'savings_deposit' | NULL (manual)
  auto_source          TEXT,
  -- source_id: ID del registro que originó esta transacción
  -- (recurring_payment.id, debt.id, savings_goal.id)
  source_id            UUID,
  notes                TEXT,
  -- is_void: permite anular sin borrar (mantiene historial de auditoría)
  is_void              BOOLEAN     DEFAULT FALSE,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON COLUMN transactions.auto_source IS
  'recurring: generada al marcar un pago recurrente como pagado.
   debt_payment: generada al registrar un abono a una deuda.
   savings_deposit: generada al depositar en una meta de ahorro.
   NULL: transacción registrada manualmente por el usuario.';

COMMENT ON COLUMN transactions.is_void IS
  'TRUE: la transacción fue anulada. Se mantiene en BD para auditoría
   pero no se incluye en los cálculos de totales ni en el dashboard.
   Las transacciones automáticas se anulan (is_void=true) en lugar de borrarse.';

-- ── 3.5 DEBTS ─────────────────────────────────────────────────
-- Deudas de largo plazo (hipoteca, autos, préstamos personales).
-- El campo paid_amount se actualiza cuando se registran pagos.
-- Los pagos se registran desde recurring_payments (vía linked_debt_id).
CREATE TABLE IF NOT EXISTS debts (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id         UUID        NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  created_by        UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  -- linked_account_id: de qué cuenta se descuenta el pago
  linked_account_id UUID        REFERENCES accounts(id) ON DELETE SET NULL,
  name              TEXT        NOT NULL,
  -- Categoría para clasificar la transacción automática de pago
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
  CONSTRAINT paid_lte_total CHECK (paid_amount <= total_amount)
);

COMMENT ON TABLE debts IS
  'Deudas de largo plazo. El pago se registra automáticamente cuando
   un pago recurrente vinculado (linked_debt_id) se marca como pagado.
   La página Debts.jsx es solo informativa — no acepta pagos directamente.';

-- ── 3.6 RECURRING_PAYMENTS ────────────────────────────────────
-- Pagos que se repiten periódicamente (hipoteca, servicios, seguros).
-- NOVEDAD v3: linked_debt_id vincula el pago a una deuda registrada.
CREATE TABLE IF NOT EXISTS recurring_payments (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id      UUID        NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  created_by     UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  account_id     UUID        REFERENCES accounts(id) ON DELETE SET NULL,
  -- NUEVA COLUMNA v3: si linked_debt_id != NULL, al marcar pagado
  -- también se abona este monto a la deuda correspondiente.
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

COMMENT ON COLUMN recurring_payments.linked_debt_id IS
  'Si está configurado, al marcar este pago como pagado (rpc_mark_recurring_paid):
   1. Se crea una transacción de tipo expense (normal)
   2. ADEMÁS se abona este amount a la deuda con id=linked_debt_id
   3. La deuda actualiza su paid_amount automáticamente
   Ejemplo: "Hipoteca TD" linked_debt_id="d-1" → cada pago mensual
   abona a la deuda Hipoteca TD.';

-- NUEVA COLUMNA (para instalaciones existentes)
DO $$ BEGIN
  ALTER TABLE recurring_payments ADD COLUMN IF NOT EXISTS linked_debt_id UUID REFERENCES debts(id) ON DELETE SET NULL;
EXCEPTION WHEN others THEN NULL; END $$;

-- ── 3.7 SAVINGS_GOALS ─────────────────────────────────────────
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
  CONSTRAINT savings_current_lte_target CHECK (current_amount <= target_amount)
);

-- ── 3.8 KIDS_GOALS ────────────────────────────────────────────
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

-- ── 3.9 KIDS_DEPOSITS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kids_deposits (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id       UUID        NOT NULL REFERENCES kids_goals(id) ON DELETE CASCADE,
  family_id     UUID        NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  amount        NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  deposited_by  UUID        REFERENCES profiles(id),
  note          TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3.10 KIDS_BADGES ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kids_badges (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  kid_profile UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  family_id   UUID        NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  badge_key   TEXT        NOT NULL,
  earned_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(kid_profile, badge_key)
);

-- ── 3.11 BUDGETS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS budgets (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id     UUID        NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  category      TEXT        NOT NULL,
  amount_limit  NUMERIC(14,2) NOT NULL CHECK (amount_limit > 0),
  period_type   TEXT        NOT NULL DEFAULT 'monthly',
  alert_at_pct  INT         DEFAULT 80,
  is_active     BOOLEAN     DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(family_id, category, period_type)
);

-- ─────────────────────────────────────────────────────────────
-- SECCIÓN 4: ÍNDICES
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_txn_family_date   ON transactions(family_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_txn_account        ON transactions(account_id)          WHERE account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_txn_payment        ON transactions(payment_account_id)  WHERE payment_account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_txn_source         ON transactions(source_id)           WHERE source_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_txn_auto           ON transactions(auto_source)         WHERE auto_source IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_txn_void           ON transactions(family_id, is_void)  WHERE is_void = FALSE;
CREATE INDEX IF NOT EXISTS idx_accounts_family    ON accounts(family_id, is_active);
CREATE INDEX IF NOT EXISTS idx_debts_family       ON debts(family_id, is_active);
CREATE INDEX IF NOT EXISTS idx_recurring_due      ON recurring_payments(family_id, next_due) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_profiles_family    ON profiles(family_id, role, status);
CREATE INDEX IF NOT EXISTS idx_profiles_email     ON profiles(email)                   WHERE email IS NOT NULL;

-- ─────────────────────────────────────────────────────────────
-- SECCIÓN 5: ROW LEVEL SECURITY (RLS)
-- Garantiza que cada usuario solo vea datos de su familia.
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

-- ── Funciones helper de seguridad ────────────────────────────
-- SECURITY DEFINER: se ejecutan con permisos del creador (pueden leer profiles)
-- STABLE: el resultado no cambia en la misma transacción (optimización)

CREATE OR REPLACE FUNCTION auth_family_id()
RETURNS UUID LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT family_id FROM profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION auth_role()
RETURNS member_role LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT COALESCE(role, 'member'::member_role) FROM profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION auth_status()
RETURNS member_status LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT COALESCE(status, 'active'::member_status) FROM profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION auth_is_kid()
RETURNS BOOLEAN LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT COALESCE(is_kid, FALSE) FROM profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION auth_is_admin()
RETURNS BOOLEAN LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT role IN ('owner','admin') FROM profiles WHERE id = auth.uid()
$$;

-- ── Eliminar políticas existentes (para actualizar limpiamente) ──
DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname, tablename FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename IN ('families','profiles','accounts','transactions','debts',
                      'recurring_payments','savings_goals','kids_goals',
                      'kids_deposits','kids_badges','budgets')
  LOOP
    EXECUTE FORMAT('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- ── Políticas RLS ─────────────────────────────────────────────

-- PROFILES
-- Los usuarios pueden ver su propio perfil y el de su familia
CREATE POLICY "profiles_read"   ON profiles FOR SELECT USING (
  id = auth.uid() OR family_id = auth_family_id()
);
-- Solo pueden crear su propio perfil (el trigger lo hace automáticamente)
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (id = auth.uid());
-- Pueden editar su propio perfil; admin puede editar miembros de su familia
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (
  id = auth.uid()
  OR (auth_is_admin() AND family_id = auth_family_id())
);

-- FAMILIES
CREATE POLICY "families_read"   ON families FOR SELECT USING (id = auth_family_id());
CREATE POLICY "families_insert" ON families FOR INSERT WITH CHECK (TRUE); -- cualquiera puede crear
CREATE POLICY "families_update" ON families FOR UPDATE USING (
  id = auth_family_id() AND auth_is_admin()
);

-- ACCOUNTS (solo admin puede crear/editar)
CREATE POLICY "accounts_read"   ON accounts FOR SELECT USING (family_id = auth_family_id());
CREATE POLICY "accounts_insert" ON accounts FOR INSERT WITH CHECK (
  family_id = auth_family_id() AND auth_is_admin() AND NOT auth_is_kid()
);
CREATE POLICY "accounts_update" ON accounts FOR UPDATE USING (
  family_id = auth_family_id() AND auth_is_admin() AND NOT auth_is_kid()
);
CREATE POLICY "accounts_delete" ON accounts FOR DELETE USING (
  family_id = auth_family_id() AND auth_role() = 'owner'
);

-- TRANSACTIONS (kids no pueden crear/editar, solo leer)
CREATE POLICY "txn_read"   ON transactions FOR SELECT USING (family_id = auth_family_id());
CREATE POLICY "txn_insert" ON transactions FOR INSERT WITH CHECK (
  family_id = auth_family_id() AND NOT auth_is_kid()
  AND auth_status() = 'active'
);
CREATE POLICY "txn_update" ON transactions FOR UPDATE USING (
  family_id = auth_family_id() AND NOT auth_is_kid()
  AND (created_by = auth.uid() OR auth_is_admin())
);
CREATE POLICY "txn_delete" ON transactions FOR DELETE USING (
  family_id = auth_family_id() AND NOT auth_is_kid()
  AND (created_by = auth.uid() OR auth_is_admin())
);

-- DEBTS
CREATE POLICY "debts_read"   ON debts FOR SELECT USING (family_id = auth_family_id());
CREATE POLICY "debts_insert" ON debts FOR INSERT WITH CHECK (
  family_id = auth_family_id() AND NOT auth_is_kid()
);
CREATE POLICY "debts_update" ON debts FOR UPDATE USING (
  family_id = auth_family_id() AND NOT auth_is_kid()
  AND (created_by = auth.uid() OR auth_is_admin())
);
CREATE POLICY "debts_delete" ON debts FOR DELETE USING (
  family_id = auth_family_id() AND auth_is_admin()
);

-- RECURRING_PAYMENTS
CREATE POLICY "rec_read"   ON recurring_payments FOR SELECT USING (family_id = auth_family_id());
CREATE POLICY "rec_insert" ON recurring_payments FOR INSERT WITH CHECK (
  family_id = auth_family_id() AND NOT auth_is_kid()
);
CREATE POLICY "rec_update" ON recurring_payments FOR UPDATE USING (
  family_id = auth_family_id() AND NOT auth_is_kid()
  AND (created_by = auth.uid() OR auth_is_admin())
);
CREATE POLICY "rec_delete" ON recurring_payments FOR DELETE USING (
  family_id = auth_family_id() AND NOT auth_is_kid()
);

-- SAVINGS_GOALS
CREATE POLICY "sg_read"   ON savings_goals FOR SELECT USING (family_id = auth_family_id());
CREATE POLICY "sg_insert" ON savings_goals FOR INSERT WITH CHECK (
  family_id = auth_family_id() AND NOT auth_is_kid()
);
CREATE POLICY "sg_update" ON savings_goals FOR UPDATE USING (
  family_id = auth_family_id() AND NOT auth_is_kid()
  AND (owner_profile = auth.uid() OR auth_is_admin())
);
CREATE POLICY "sg_delete" ON savings_goals FOR DELETE USING (
  family_id = auth_family_id() AND auth_is_admin()
);

-- KIDS_GOALS, KIDS_DEPOSITS, KIDS_BADGES
CREATE POLICY "kg_all" ON kids_goals    FOR ALL USING (family_id = auth_family_id());
CREATE POLICY "kd_all" ON kids_deposits FOR ALL USING (family_id = auth_family_id());
CREATE POLICY "kb_all" ON kids_badges   FOR ALL USING (family_id = auth_family_id());

-- BUDGETS
CREATE POLICY "bud_all" ON budgets FOR ALL USING (family_id = auth_family_id());

-- ─────────────────────────────────────────────────────────────
-- SECCIÓN 6: TRIGGER — handle_new_user (ROBUSTO)
-- ─────────────────────────────────────────────────────────────
-- Este trigger se ejecuta en la tabla auth.users de Supabase
-- cuando un nuevo usuario se registra via supabase.auth.signUp().
--
-- PROBLEMAS CORREGIDOS EN v3:
--   - Antes: fallaba silenciosamente si el registro ya existía
--   - Antes: el email no se guardaba en profiles
--   - Antes: el display_name no se extraía de los metadatos correctamente
--   - Ahora: ON CONFLICT DO NOTHING para idempotencia
--   - Ahora: extrae email de auth.users directamente
--   - Ahora: maneja múltiples campos de metadatos posibles
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_display_name TEXT;
  v_lang         TEXT;
BEGIN
  -- Extraer display_name de los metadatos del usuario
  -- Supabase puede enviar el nombre en diferentes campos según el provider
  v_display_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'display_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
    SPLIT_PART(COALESCE(NEW.email, ''), '@', 1),
    'Usuario'
  );

  -- Extraer idioma preferido (si se pasó en los metadatos)
  v_lang := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'lang', ''),
    'es'
  );

  -- Insertar el perfil
  -- ON CONFLICT DO NOTHING: si el perfil ya existe (caso de trigger duplicado),
  -- no falla — simplemente no hace nada.
  INSERT INTO public.profiles (
    id,
    email,
    display_name,
    role,
    status,
    is_kid,
    avatar_emoji,
    avatar_color,
    lang,
    theme,
    onboarded,
    family_id  -- NULL: el usuario aún no ha creado/unido su familia
  )
  VALUES (
    NEW.id,
    NEW.email,
    v_display_name,
    'member',   -- rol por defecto; se cambia a 'owner' en rpc_create_family()
    'active',   -- activo por defecto; cambia a 'pending' al unirse con código
    FALSE,
    '🧑',
    '#4f7cff',
    v_lang,
    'dark',
    FALSE,
    NULL        -- family_id = NULL → App.jsx muestra FamilySetupScreen
  )
  ON CONFLICT (id) DO UPDATE SET
    -- Si el perfil ya existía, actualizar el email por si cambió
    email = EXCLUDED.email;

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  -- Si hay cualquier error (constraint, etc.), lo logueamos pero NO fallamos
  -- para que el signup de Supabase Auth siempre complete exitosamente.
  RAISE WARNING '[MiFinanza] handle_new_user error para usuario %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- Crear el trigger en auth.users (eliminar si existe para recrear limpiamente)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── Trigger: updated_at automático ───────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DO $$ DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'families','profiles','accounts','transactions',
    'debts','recurring_payments','savings_goals','kids_goals'
  ] LOOP
    EXECUTE FORMAT('DROP TRIGGER IF EXISTS trg_updated_at_%I ON %I', t, t);
    EXECUTE FORMAT(
      'CREATE TRIGGER trg_updated_at_%I BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
      t, t
    );
  END LOOP;
END $$;

-- ── Trigger: deuda completada ────────────────────────────────
CREATE OR REPLACE FUNCTION handle_debt_completed()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Cuando paid_amount alcanza total_amount, marcar la deuda como inactiva
  IF NEW.paid_amount >= NEW.total_amount AND OLD.paid_amount < OLD.total_amount THEN
    NEW.is_active = FALSE;
    RAISE NOTICE '[MiFinanza] Deuda % completamente pagada', NEW.name;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_debt_completed ON debts;
CREATE TRIGGER trg_debt_completed
  BEFORE UPDATE ON debts
  FOR EACH ROW EXECUTE FUNCTION handle_debt_completed();

-- ── Trigger: meta de ahorro completada ──────────────────────
CREATE OR REPLACE FUNCTION handle_goal_completed()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.current_amount >= NEW.target_amount AND NEW.status = 'active' THEN
    NEW.status = 'completed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_savings_goal_completed ON savings_goals;
CREATE TRIGGER trg_savings_goal_completed
  BEFORE UPDATE ON savings_goals
  FOR EACH ROW EXECUTE FUNCTION handle_goal_completed();

DROP TRIGGER IF EXISTS trg_kids_goal_completed ON kids_goals;
CREATE TRIGGER trg_kids_goal_completed
  BEFORE UPDATE ON kids_goals
  FOR EACH ROW EXECUTE FUNCTION handle_goal_completed();

-- ─────────────────────────────────────────────────────────────
-- SECCIÓN 7: FUNCIONES RPC
-- Toda la lógica de negocio vive aquí (en PostgreSQL).
-- El frontend NUNCA escribe directamente en las tablas sensibles.
-- ─────────────────────────────────────────────────────────────

-- ── RPC: Crear familia ────────────────────────────────────────
-- Llamada desde FamilySetupScreen cuando el usuario elige "Crear mi familia".
-- Crea la familia Y asigna al usuario como 'owner' en una transacción atómica.
CREATE OR REPLACE FUNCTION rpc_create_family(
  p_name     TEXT,
  p_currency TEXT DEFAULT 'CAD',
  p_locale   TEXT DEFAULT 'es'
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_family  families;
  v_user_id UUID := auth.uid();
BEGIN
  -- Validar que el usuario esté autenticado
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  -- Validar nombre de familia
  IF TRIM(p_name) = '' THEN
    RAISE EXCEPTION 'El nombre de la familia no puede estar vacío';
  END IF;

  -- Verificar que el usuario no tenga ya una familia
  IF EXISTS(SELECT 1 FROM profiles WHERE id = v_user_id AND family_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Ya perteneces a una familia. Sal de ella antes de crear una nueva.';
  END IF;

  -- Crear la familia
  INSERT INTO families(name, currency, locale)
  VALUES (TRIM(p_name), p_currency, p_locale)
  RETURNING * INTO v_family;

  -- Asignar al usuario como OWNER y activarlo
  UPDATE profiles SET
    family_id    = v_family.id,
    role         = 'owner',
    status       = 'active',
    onboarded    = TRUE
  WHERE id = v_user_id;

  RETURN json_build_object(
    'family_id',   v_family.id,
    'family_name', v_family.name,
    'invite_code', v_family.invite_code,
    'role',        'owner',
    'message',     '¡Familia creada exitosamente!'
  );
END;
$$;

-- ── RPC: Unirse a familia con código ─────────────────────────
-- El usuario queda con status='pending' hasta que el admin lo apruebe.
CREATE OR REPLACE FUNCTION rpc_join_family(p_invite_code TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_family    families;
  v_user_id   UUID := auth.uid();
  v_members   INT;
  v_max       INT;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;

  -- Buscar la familia por código (case-insensitive)
  SELECT * INTO v_family FROM families
  WHERE LOWER(invite_code) = LOWER(TRIM(p_invite_code));

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Código de invitación inválido. Verifica con el administrador.';
  END IF;

  -- Verificar que el usuario no tenga ya familia
  IF EXISTS(SELECT 1 FROM profiles WHERE id = v_user_id AND family_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Ya perteneces a una familia.';
  END IF;

  -- Verificar límites del plan
  SELECT COUNT(*) INTO v_members FROM profiles
  WHERE family_id = v_family.id AND status = 'active';

  v_max := CASE v_family.plan
    WHEN 'free'   THEN 2
    WHEN 'pro'    THEN 5
    WHEN 'family' THEN 99
    ELSE 99
  END;

  IF v_members >= v_max THEN
    RAISE EXCEPTION 'La familia ha alcanzado el límite de miembros del plan %. Contacta al administrador para actualizar el plan.', v_family.plan;
  END IF;

  -- Unirse como miembro PENDIENTE (el admin debe aprobar)
  UPDATE profiles SET
    family_id = v_family.id,
    role      = 'member',
    status    = 'pending'   -- espera aprobación
  WHERE id = v_user_id;

  RETURN json_build_object(
    'family_id',   v_family.id,
    'family_name', v_family.name,
    'status',      'pending',
    'message',     'Solicitud enviada. El administrador debe aprobar tu acceso.'
  );
END;
$$;

-- ── RPC: Aprobar o suspender miembro ─────────────────────────
CREATE OR REPLACE FUNCTION rpc_set_member_status(
  p_member_id UUID,
  p_status    member_status
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_fid UUID := auth_family_id();
BEGIN
  IF NOT auth_is_admin() THEN
    RAISE EXCEPTION 'Solo el administrador puede gestionar miembros';
  END IF;

  IF NOT EXISTS(SELECT 1 FROM profiles WHERE id = p_member_id AND family_id = v_fid) THEN
    RAISE EXCEPTION 'Miembro no encontrado en tu familia';
  END IF;

  -- No se puede suspender al owner
  IF EXISTS(SELECT 1 FROM profiles WHERE id = p_member_id AND role = 'owner') THEN
    RAISE EXCEPTION 'No se puede cambiar el estado del propietario';
  END IF;

  UPDATE profiles SET status = p_status WHERE id = p_member_id;

  RETURN json_build_object(
    'member_id',  p_member_id,
    'new_status', p_status,
    'ok',         TRUE
  );
END;
$$;

-- ── RPC: Cambiar rol de miembro ───────────────────────────────
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
  RETURN json_build_object('member_id', p_member_id, 'new_role', p_role, 'ok', TRUE);
END;
$$;

-- ── RPC: Actualizar perfil propio ─────────────────────────────
CREATE OR REPLACE FUNCTION rpc_update_profile(
  p_display_name TEXT      DEFAULT NULL,
  p_avatar_emoji TEXT      DEFAULT NULL,
  p_avatar_color TEXT      DEFAULT NULL,
  p_lang         TEXT      DEFAULT NULL,
  p_theme        app_theme DEFAULT NULL
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_profile profiles;
BEGIN
  UPDATE profiles SET
    display_name = COALESCE(p_display_name, display_name),
    avatar_emoji = COALESCE(p_avatar_emoji, avatar_emoji),
    avatar_color = COALESCE(p_avatar_color, avatar_color),
    lang         = COALESCE(p_lang,         lang),
    theme        = COALESCE(p_theme,        theme),
    updated_at   = NOW()
  WHERE id = auth.uid()
  RETURNING * INTO v_profile;
  RETURN row_to_json(v_profile);
END;
$$;

-- ── RPC: Agregar transacción ──────────────────────────────────
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
  v_fid UUID := auth_family_id();
  v_txn transactions;
BEGIN
  IF v_fid IS NULL THEN RAISE EXCEPTION 'Sin familia asignada'; END IF;
  IF auth_is_kid() THEN RAISE EXCEPTION 'Los niños no pueden registrar transacciones'; END IF;
  IF auth_status() != 'active' THEN RAISE EXCEPTION 'Tu cuenta está pendiente de aprobación'; END IF;
  IF p_amount <= 0 THEN RAISE EXCEPTION 'El monto debe ser mayor que cero'; END IF;

  INSERT INTO transactions(
    family_id, created_by, type, category, description,
    amount, date, account_id, payment_account_id, notes,
    auto_source, source_id
  ) VALUES (
    v_fid, auth.uid(), p_type, p_category, p_description,
    p_amount, p_date, p_account_id, p_payment_account_id, p_notes,
    p_auto_source, p_source_id
  )
  RETURNING * INTO v_txn;
  RETURN row_to_json(v_txn);
END;
$$;

-- ── RPC: Editar transacción ───────────────────────────────────
CREATE OR REPLACE FUNCTION rpc_update_transaction(
  p_txn_id             UUID,
  p_type               txn_type  DEFAULT NULL,
  p_category           TEXT      DEFAULT NULL,
  p_description        TEXT      DEFAULT NULL,
  p_amount             NUMERIC   DEFAULT NULL,
  p_date               DATE      DEFAULT NULL,
  p_account_id         UUID      DEFAULT NULL,
  p_payment_account_id UUID      DEFAULT NULL,
  p_notes              TEXT      DEFAULT NULL
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_txn transactions;
BEGIN
  IF auth_is_kid() THEN RAISE EXCEPTION 'No autorizado'; END IF;

  SELECT * INTO v_txn FROM transactions
  WHERE id = p_txn_id AND family_id = auth_family_id() AND NOT is_void;
  IF NOT FOUND THEN RAISE EXCEPTION 'Transacción no encontrada'; END IF;

  IF v_txn.created_by != auth.uid() AND NOT auth_is_admin() THEN
    RAISE EXCEPTION 'Solo puedes editar tus propias transacciones';
  END IF;

  UPDATE transactions SET
    type                 = COALESCE(p_type,                type),
    category             = COALESCE(p_category,            category),
    description          = COALESCE(p_description,         description),
    amount               = COALESCE(p_amount,              amount),
    date                 = COALESCE(p_date,                date),
    account_id           = COALESCE(p_account_id,          account_id),
    payment_account_id   = COALESCE(p_payment_account_id,  payment_account_id),
    notes                = COALESCE(p_notes,               notes),
    updated_at           = NOW()
  WHERE id = p_txn_id
  RETURNING * INTO v_txn;
  RETURN row_to_json(v_txn);
END;
$$;

-- ── RPC: Crear cuenta ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION rpc_add_account(
  p_name            TEXT,
  p_nature          account_nature,
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
  v_fid UUID := auth_family_id();
  v_acc accounts;
BEGIN
  IF NOT auth_is_admin() THEN RAISE EXCEPTION 'Solo el administrador puede crear cuentas'; END IF;
  IF auth_is_kid() THEN RAISE EXCEPTION 'No autorizado'; END IF;
  IF TRIM(p_name) = '' THEN RAISE EXCEPTION 'El nombre de la cuenta no puede estar vacío'; END IF;

  INSERT INTO accounts(
    family_id, created_by, owner_profile, name, nature, subtype,
    color, institution, last_four, credit_limit, opening_balance, notes
  ) VALUES (
    v_fid, auth.uid(), COALESCE(p_owner_profile, auth.uid()),
    TRIM(p_name), p_nature, p_subtype,
    p_color, p_institution, p_last_four, p_credit_limit, p_opening_balance, p_notes
  )
  RETURNING * INTO v_acc;
  RETURN row_to_json(v_acc);
END;
$$;

-- ── RPC: Editar cuenta ────────────────────────────────────────
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
  IF NOT auth_is_admin() THEN RAISE EXCEPTION 'Solo el administrador puede editar cuentas'; END IF;
  UPDATE accounts SET
    name         = COALESCE(p_name,         name),
    color        = COALESCE(p_color,        color),
    institution  = COALESCE(p_institution,  institution),
    credit_limit = COALESCE(p_credit_limit, credit_limit),
    notes        = COALESCE(p_notes,        notes),
    is_active    = COALESCE(p_is_active,    is_active),
    updated_at   = NOW()
  WHERE id = p_account_id AND family_id = auth_family_id()
  RETURNING * INTO v_acc;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cuenta no encontrada'; END IF;
  RETURN row_to_json(v_acc);
END;
$$;

-- ── RPC: Abonar a deuda (+ transacción automática) ────────────
-- IDEMPOTENTE: verifica que no exista ya una transacción para el mismo
-- source_id + fecha + monto antes de crear una nueva.
CREATE OR REPLACE FUNCTION rpc_pay_debt(
  p_debt_id    UUID,
  p_amount     NUMERIC,
  p_date       DATE    DEFAULT CURRENT_DATE,
  p_account_id UUID    DEFAULT NULL
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_debt     debts;
  v_fid      UUID := auth_family_id();
  v_new_paid NUMERIC;
  v_txn_id   UUID;
BEGIN
  IF auth_is_kid() THEN RAISE EXCEPTION 'No autorizado'; END IF;
  IF p_amount <= 0 THEN RAISE EXCEPTION 'El monto debe ser mayor que cero'; END IF;

  SELECT * INTO v_debt FROM debts
  WHERE id = p_debt_id AND family_id = v_fid AND is_active = TRUE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Deuda no encontrada'; END IF;
  IF v_debt.paid_amount >= v_debt.total_amount THEN RAISE EXCEPTION 'Esta deuda ya está completamente pagada'; END IF;

  -- Actualizar paid_amount (sin superar el total)
  v_new_paid := LEAST(v_debt.total_amount, v_debt.paid_amount + p_amount);
  UPDATE debts SET paid_amount = v_new_paid, updated_at = NOW() WHERE id = p_debt_id;

  -- Crear transacción automática (solo si no existe ya para esta fecha y monto)
  IF NOT EXISTS(
    SELECT 1 FROM transactions
    WHERE source_id = p_debt_id
      AND auto_source = 'debt_payment'
      AND date = p_date
      AND amount = p_amount
      AND family_id = v_fid
      AND NOT is_void
  ) THEN
    INSERT INTO transactions(
      family_id, created_by, type, category, description,
      amount, date, account_id, auto_source, source_id
    ) VALUES (
      v_fid, auth.uid(), 'expense', v_debt.category,
      'Pago: ' || v_debt.name,
      p_amount, p_date,
      COALESCE(p_account_id, v_debt.linked_account_id),
      'debt_payment', p_debt_id
    )
    RETURNING id INTO v_txn_id;
  END IF;

  RETURN json_build_object(
    'debt_id',        p_debt_id,
    'paid_amount',    v_new_paid,
    'remaining',      v_debt.total_amount - v_new_paid,
    'completed',      v_new_paid >= v_debt.total_amount,
    'transaction_id', v_txn_id
  );
END;
$$;

-- ── RPC: Editar deuda ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION rpc_update_debt(
  p_debt_id         UUID,
  p_name            TEXT    DEFAULT NULL,
  p_total_amount    NUMERIC DEFAULT NULL,
  p_monthly_payment NUMERIC DEFAULT NULL,
  p_interest_rate   NUMERIC DEFAULT NULL,
  p_start_date      DATE    DEFAULT NULL,
  p_category        TEXT    DEFAULT NULL,
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
    category         = COALESCE(p_category,         category),
    notes            = COALESCE(p_notes,            notes),
    is_active        = COALESCE(p_is_active,        is_active),
    updated_at       = NOW()
  WHERE id = p_debt_id
    AND family_id = auth_family_id()
    AND (created_by = auth.uid() OR auth_is_admin())
  RETURNING * INTO v_debt;
  IF NOT FOUND THEN RAISE EXCEPTION 'Deuda no encontrada o sin permiso'; END IF;
  RETURN row_to_json(v_debt);
END;
$$;

-- ── RPC: Marcar recurrente como pagado (+ deuda vinculada) ────
-- NOVEDAD v3: Si linked_debt_id != NULL, también abona a la deuda.
CREATE OR REPLACE FUNCTION rpc_mark_recurring_paid(
  p_rec_id     UUID,
  p_date       DATE DEFAULT CURRENT_DATE
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_rec      recurring_payments;
  v_next_due DATE;
  v_txn_id   UUID;
  v_fid      UUID := auth_family_id();
BEGIN
  IF auth_is_kid() THEN RAISE EXCEPTION 'No autorizado'; END IF;

  SELECT * INTO v_rec FROM recurring_payments
  WHERE id = p_rec_id AND family_id = v_fid AND is_active = TRUE;
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

  -- Crear transacción automática (idempotente: verificar si ya existe para esta fecha)
  IF NOT EXISTS(
    SELECT 1 FROM transactions
    WHERE source_id = p_rec_id
      AND auto_source = 'recurring'
      AND date = p_date
      AND family_id = v_fid
      AND NOT is_void
  ) THEN
    INSERT INTO transactions(
      family_id, created_by, type, category, description,
      amount, date, account_id, auto_source, source_id
    ) VALUES (
      v_fid, auth.uid(), 'expense', v_rec.category, v_rec.name,
      v_rec.amount, p_date, v_rec.account_id,
      'recurring', p_rec_id
    )
    RETURNING id INTO v_txn_id;
  END IF;

  -- Si tiene deuda vinculada, abonar automáticamente
  IF v_rec.linked_debt_id IS NOT NULL THEN
    PERFORM rpc_pay_debt(v_rec.linked_debt_id, v_rec.amount, p_date);
  END IF;

  RETURN json_build_object(
    'recurring_id',   p_rec_id,
    'next_due',       v_next_due,
    'transaction_id', v_txn_id,
    'debt_paid',      v_rec.linked_debt_id IS NOT NULL
  );
END;
$$;

-- ── RPC: Editar recurrente ────────────────────────────────────
CREATE OR REPLACE FUNCTION rpc_update_recurring(
  p_rec_id        UUID,
  p_name          TEXT      DEFAULT NULL,
  p_amount        NUMERIC   DEFAULT NULL,
  p_frequency     freq_type DEFAULT NULL,
  p_category      TEXT      DEFAULT NULL,
  p_account_id    UUID      DEFAULT NULL,
  p_linked_debt_id UUID     DEFAULT NULL,
  p_next_due      DATE      DEFAULT NULL,
  p_notes         TEXT      DEFAULT NULL,
  p_is_active     BOOLEAN   DEFAULT NULL,
  p_clear_debt    BOOLEAN   DEFAULT FALSE  -- TRUE para desvincular la deuda
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_rec recurring_payments;
BEGIN
  IF auth_is_kid() THEN RAISE EXCEPTION 'No autorizado'; END IF;
  UPDATE recurring_payments SET
    name           = COALESCE(p_name,      name),
    amount         = COALESCE(p_amount,    amount),
    frequency      = COALESCE(p_frequency, frequency),
    category       = COALESCE(p_category,  category),
    account_id     = COALESCE(p_account_id,account_id),
    linked_debt_id = CASE
                       WHEN p_clear_debt THEN NULL           -- desvincular
                       ELSE COALESCE(p_linked_debt_id, linked_debt_id)  -- mantener o cambiar
                     END,
    next_due       = COALESCE(p_next_due,  next_due),
    notes          = COALESCE(p_notes,     notes),
    is_active      = COALESCE(p_is_active, is_active),
    updated_at     = NOW()
  WHERE id = p_rec_id
    AND family_id = auth_family_id()
    AND (created_by = auth.uid() OR auth_is_admin())
  RETURNING * INTO v_rec;
  IF NOT FOUND THEN RAISE EXCEPTION 'No encontrado o sin permiso'; END IF;
  RETURN row_to_json(v_rec);
END;
$$;

-- ── RPC: Depositar en meta de ahorro (+ transacción auto) ─────
CREATE OR REPLACE FUNCTION rpc_deposit_savings_goal(
  p_goal_id    UUID,
  p_amount     NUMERIC,
  p_date       DATE    DEFAULT CURRENT_DATE,
  p_account_id UUID    DEFAULT NULL
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_goal    savings_goals;
  v_new_amt NUMERIC;
  v_txn_id  UUID;
BEGIN
  IF auth_is_kid() THEN RAISE EXCEPTION 'No autorizado'; END IF;
  IF p_amount <= 0 THEN RAISE EXCEPTION 'El monto debe ser mayor que cero'; END IF;

  SELECT * INTO v_goal FROM savings_goals
  WHERE id = p_goal_id AND family_id = auth_family_id();
  IF NOT FOUND THEN RAISE EXCEPTION 'Meta no encontrada'; END IF;
  IF v_goal.status = 'completed' THEN RAISE EXCEPTION 'Esta meta ya está completada'; END IF;

  v_new_amt := LEAST(v_goal.target_amount, v_goal.current_amount + p_amount);
  UPDATE savings_goals SET
    current_amount = v_new_amt,
    updated_at     = NOW()
  WHERE id = p_goal_id;

  -- Crear transacción automática
  INSERT INTO transactions(
    family_id, created_by, type, category, description,
    amount, date, account_id, auto_source, source_id
  ) VALUES (
    auth_family_id(), auth.uid(), 'saving', 'goal',
    'Ahorro: ' || v_goal.name,
    p_amount, p_date,
    COALESCE(p_account_id, v_goal.account_id),
    'savings_deposit', p_goal_id
  )
  RETURNING id INTO v_txn_id;

  RETURN json_build_object(
    'goal_id',        p_goal_id,
    'new_amount',     v_new_amt,
    'completed',      v_new_amt >= v_goal.target_amount,
    'transaction_id', v_txn_id
  );
END;
$$;

-- ── RPC: Editar meta de ahorro ────────────────────────────────
CREATE OR REPLACE FUNCTION rpc_update_savings_goal(
  p_goal_id       UUID,
  p_name          TEXT        DEFAULT NULL,
  p_target_amount NUMERIC     DEFAULT NULL,
  p_emoji         TEXT        DEFAULT NULL,
  p_color         TEXT        DEFAULT NULL,
  p_deadline      DATE        DEFAULT NULL,
  p_status        goal_status DEFAULT NULL,
  p_notes         TEXT        DEFAULT NULL
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
    AND (owner_profile = auth.uid() OR auth_is_admin())
  RETURNING * INTO v_goal;
  IF NOT FOUND THEN RAISE EXCEPTION 'Meta no encontrada o sin permiso'; END IF;
  RETURN row_to_json(v_goal);
END;
$$;

-- ── RPC: Depositar en meta Kids ───────────────────────────────
CREATE OR REPLACE FUNCTION rpc_kids_deposit(
  p_goal_id UUID,
  p_amount  NUMERIC,
  p_note    TEXT DEFAULT NULL
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_goal    kids_goals;
  v_new_amt NUMERIC;
BEGIN
  IF auth_is_kid() THEN RAISE EXCEPTION 'Solo padres/admin pueden depositar'; END IF;
  IF p_amount <= 0 THEN RAISE EXCEPTION 'Monto inválido'; END IF;

  SELECT * INTO v_goal FROM kids_goals
  WHERE id = p_goal_id AND family_id = auth_family_id();
  IF NOT FOUND THEN RAISE EXCEPTION 'Meta no encontrada'; END IF;

  v_new_amt := LEAST(v_goal.target_amount, v_goal.current_amount + p_amount);
  UPDATE kids_goals SET current_amount = v_new_amt, updated_at = NOW()
  WHERE id = p_goal_id;

  INSERT INTO kids_deposits(goal_id, family_id, amount, deposited_by, note)
  VALUES (p_goal_id, auth_family_id(), p_amount, auth.uid(), p_note);

  -- Verificar y otorgar badges
  PERFORM rpc_check_kid_badges(v_goal.kid_profile);

  RETURN json_build_object(
    'goal_id',    p_goal_id,
    'new_amount', v_new_amt,
    'completed',  v_new_amt >= v_goal.target_amount
  );
END;
$$;

-- ── RPC: Verificar y otorgar badges Kids ─────────────────────
CREATE OR REPLACE FUNCTION rpc_check_kid_badges(p_kid_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_fid       UUID;
  v_goals     INT;
  v_completed INT;
  v_total     NUMERIC;
BEGIN
  SELECT family_id INTO v_fid FROM profiles WHERE id = p_kid_id;
  SELECT COUNT(*), COUNT(*) FILTER (WHERE status='completed'), COALESCE(SUM(current_amount),0)
  INTO v_goals, v_completed, v_total
  FROM kids_goals WHERE kid_profile = p_kid_id;

  IF v_goals >= 1    THEN INSERT INTO kids_badges(kid_profile,family_id,badge_key) VALUES (p_kid_id,v_fid,'first_goal')     ON CONFLICT DO NOTHING; END IF;
  IF v_completed >= 1 THEN INSERT INTO kids_badges(kid_profile,family_id,badge_key) VALUES (p_kid_id,v_fid,'goal_completed') ON CONFLICT DO NOTHING; END IF;
  IF v_completed >= 3 THEN INSERT INTO kids_badges(kid_profile,family_id,badge_key) VALUES (p_kid_id,v_fid,'super_saver')    ON CONFLICT DO NOTHING; END IF;
  IF v_total >= 500   THEN INSERT INTO kids_badges(kid_profile,family_id,badge_key) VALUES (p_kid_id,v_fid,'big_saver')      ON CONFLICT DO NOTHING; END IF;
  IF EXISTS(SELECT 1 FROM kids_goals WHERE kid_profile=p_kid_id AND current_amount >= target_amount*0.5) THEN
    INSERT INTO kids_badges(kid_profile,family_id,badge_key) VALUES (p_kid_id,v_fid,'halfway') ON CONFLICT DO NOTHING;
  END IF;
END;
$$;

-- ── RPC: Dashboard summary ────────────────────────────────────
CREATE OR REPLACE FUNCTION rpc_dashboard_summary(
  p_from       DATE,
  p_to         DATE,
  p_account_id UUID DEFAULT NULL
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE
  v_fid     UUID := auth_family_id();
  v_income  NUMERIC; v_expense NUMERIC; v_saving NUMERIC;
  v_pie     JSON;    v_trend   JSON;
BEGIN
  IF auth_status() != 'active' THEN RAISE EXCEPTION 'Cuenta pendiente de aprobación'; END IF;

  SELECT
    COALESCE(SUM(amount) FILTER (WHERE type='income'),  0),
    COALESCE(SUM(amount) FILTER (WHERE type='expense'), 0),
    COALESCE(SUM(amount) FILTER (WHERE type='saving'),  0)
  INTO v_income, v_expense, v_saving
  FROM transactions
  WHERE family_id = v_fid
    AND date BETWEEN p_from AND p_to
    AND NOT is_void
    AND (p_account_id IS NULL OR account_id = p_account_id);

  SELECT json_agg(row_to_json(t)) INTO v_pie FROM (
    SELECT category, SUM(amount) AS value
    FROM transactions
    WHERE family_id=v_fid AND type='expense'
      AND date BETWEEN p_from AND p_to AND NOT is_void
      AND (p_account_id IS NULL OR account_id=p_account_id)
    GROUP BY category ORDER BY value DESC LIMIT 12
  ) t;

  SELECT json_agg(row_to_json(t)) INTO v_trend FROM (
    SELECT
      TO_CHAR(DATE_TRUNC('month', date), 'YYYY-MM') AS month,
      COALESCE(SUM(amount) FILTER (WHERE type='income'),  0) AS income,
      COALESCE(SUM(amount) FILTER (WHERE type='expense'), 0) AS expense,
      COALESCE(SUM(amount) FILTER (WHERE type='saving'),  0) AS saving
    FROM transactions
    WHERE family_id=v_fid AND NOT is_void
      AND date >= DATE_TRUNC('month', NOW()) - INTERVAL '7 months'
      AND (p_account_id IS NULL OR account_id=p_account_id)
    GROUP BY 1 ORDER BY 1
  ) t;

  RETURN json_build_object(
    'income',        v_income,
    'expense',       v_expense,
    'saving',        v_saving,
    'balance',       v_income - v_expense - v_saving,
    'savings_rate',  CASE WHEN v_income > 0 THEN ROUND((v_saving/v_income)*100,1) ELSE 0 END,
    'by_category',   COALESCE(v_pie,   '[]'::JSON),
    'monthly_trend', COALESCE(v_trend, '[]'::JSON)
  );
END;
$$;

-- ── RPC: Patrimonio neto ──────────────────────────────────────
CREATE OR REPLACE FUNCTION rpc_net_worth()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE
  v_fid  UUID := auth_family_id();
  v_assets NUMERIC; v_liabs NUMERIC;
BEGIN
  SELECT COALESCE(SUM(
    a.opening_balance
    + COALESCE((SELECT SUM(amount) FILTER(WHERE type='income')  FROM transactions WHERE account_id=a.id AND NOT is_void),0)
    - COALESCE((SELECT SUM(amount) FILTER(WHERE type='expense') FROM transactions WHERE account_id=a.id AND NOT is_void),0)
    - COALESCE((SELECT SUM(amount) FILTER(WHERE type='saving')  FROM transactions WHERE account_id=a.id AND NOT is_void),0)
  ),0) INTO v_assets
  FROM accounts a WHERE a.family_id=v_fid AND a.nature='asset' AND a.is_active=TRUE;

  SELECT COALESCE(SUM(total_amount-paid_amount),0) INTO v_liabs
  FROM debts WHERE family_id=v_fid AND is_active=TRUE;

  RETURN json_build_object('assets',v_assets,'liabilities',v_liabs,'net',v_assets-v_liabs);
END;
$$;

-- ── RPC: Contexto para IA (CFO personal) ─────────────────────
CREATE OR REPLACE FUNCTION rpc_ai_financial_context(p_months_back INT DEFAULT 6)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE
  v_fid    UUID := auth_family_id();
  v_from   DATE := DATE_TRUNC('month', NOW()) - ((p_months_back-1)||' months')::INTERVAL;
  v_to     DATE := CURRENT_DATE;
  v_summary JSON; v_nw JSON; v_debts JSON; v_recs JSON;
BEGIN
  v_summary := rpc_dashboard_summary(v_from, v_to);
  v_nw      := rpc_net_worth();

  SELECT json_agg(row_to_json(t)) INTO v_debts FROM (
    SELECT name, total_amount, paid_amount, monthly_payment, interest_rate,
           total_amount - paid_amount AS remaining,
           CASE WHEN monthly_payment > 0
             THEN CEIL((total_amount-paid_amount)/monthly_payment) ELSE NULL END AS months_left
    FROM debts WHERE family_id=v_fid AND is_active=TRUE
  ) t;

  SELECT json_agg(row_to_json(t)) INTO v_recs FROM (
    SELECT name, amount, frequency, category, next_due,
           (SELECT name FROM debts WHERE id=linked_debt_id) AS linked_debt_name
    FROM recurring_payments WHERE family_id=v_fid AND is_active=TRUE
  ) t;

  RETURN json_build_object(
    'generated_at',    NOW(),
    'months_analyzed', p_months_back,
    'currency',        (SELECT currency FROM families WHERE id=v_fid),
    'summary',         v_summary,
    'net_worth',       v_nw,
    'debts',           COALESCE(v_debts,'[]'::JSON),
    'recurring',       COALESCE(v_recs, '[]'::JSON)
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- SECCIÓN 8: VISTAS
-- ─────────────────────────────────────────────────────────────

-- Vista: saldo calculado de cuentas (dinámico, basado en transacciones)
CREATE OR REPLACE VIEW account_balances AS
SELECT
  a.id, a.family_id, a.name, a.nature, a.subtype, a.color,
  a.institution, a.last_four, a.credit_limit,
  p.display_name AS owner_name,
  a.opening_balance
  + COALESCE(SUM(t.amount) FILTER (WHERE t.type='income'),  0)
  - COALESCE(SUM(t.amount) FILTER (WHERE t.type='expense'), 0)
  - COALESCE(SUM(t.amount) FILTER (WHERE t.type='saving'),  0)
  AS balance,
  COALESCE(SUM(t.amount) FILTER (WHERE t.type='income'),  0) AS total_income,
  COALESCE(SUM(t.amount) FILTER (WHERE t.type='expense'), 0) AS total_expense
FROM accounts a
LEFT JOIN transactions t ON t.account_id = a.id AND NOT t.is_void
LEFT JOIN profiles p ON p.id = a.owner_profile
WHERE a.is_active = TRUE
GROUP BY a.id, a.family_id, a.name, a.nature, a.subtype, a.color,
         a.institution, a.last_four, a.credit_limit, a.opening_balance, p.display_name;

-- Vista: estado de pagos recurrentes con días hasta vencimiento
CREATE OR REPLACE VIEW recurring_status AS
SELECT
  r.*,
  d.name AS linked_debt_name,
  d.total_amount - d.paid_amount AS linked_debt_remaining,
  (r.next_due - CURRENT_DATE) AS days_until_due,
  CASE
    WHEN r.next_due < CURRENT_DATE THEN 'overdue'
    WHEN r.next_due <= CURRENT_DATE + 5 THEN 'due_soon'
    ELSE 'up_to_date'
  END AS status_label
FROM recurring_payments r
LEFT JOIN debts d ON d.id = r.linked_debt_id
WHERE r.is_active = TRUE;

-- Vista: tarjetas con gasto del mes actual
CREATE OR REPLACE VIEW card_monthly_spending AS
SELECT
  a.id, a.family_id, a.name, a.subtype, a.color, a.last_four, a.credit_limit,
  COALESCE(SUM(t.amount) FILTER (
    WHERE TO_CHAR(t.date,'YYYY-MM') = TO_CHAR(NOW(),'YYYY-MM')
  ), 0) AS month_spent,
  COALESCE(SUM(t.amount), 0) AS total_spent
FROM accounts a
LEFT JOIN transactions t ON t.payment_account_id = a.id AND t.type='expense' AND NOT t.is_void
WHERE a.subtype IN ('credit_card','debit_card','credit_line') AND a.is_active=TRUE
GROUP BY a.id, a.family_id, a.name, a.subtype, a.color, a.last_four, a.credit_limit;

-- Vista: límites del plan por familia
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
-- SECCIÓN 9: CONFIGURACIÓN DE SUPABASE AUTH
-- ─────────────────────────────────────────────────────────────
-- NOTA: Estas configuraciones se hacen en el Dashboard de Supabase,
-- NO via SQL. Las incluimos como referencia documentada.
--
-- En Supabase Dashboard → Authentication → Settings:
--
-- 1. CONFIRM EMAIL: Desactivar para proyectos personales/familiares
--    Ruta: Authentication → Settings → "Enable email confirmations" → OFF
--    Motivo: Simplifica el flujo — el usuario entra directamente después de registrarse.
--    Para producción pública se recomienda activar.
--
-- 2. SITE URL: Configurar la URL de tu app
--    Ruta: Authentication → Settings → "Site URL"
--    Valor: http://localhost:5173 (desarrollo) o https://tu-dominio.vercel.app (producción)
--
-- 3. REDIRECT URLS: Para reset de contraseña
--    Ruta: Authentication → Settings → "Additional Redirect URLs"
--    Valor: http://localhost:5173, https://tu-dominio.vercel.app
--
-- ─────────────────────────────────────────────────────────────
-- SECCIÓN 10: VERIFICACIÓN FINAL
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_tables  INT;
  v_rpcs    INT;
  v_views   INT;
  v_trigger INT;
BEGIN
  SELECT COUNT(*) INTO v_tables FROM information_schema.tables
  WHERE table_schema='public' AND table_name IN (
    'families','profiles','accounts','transactions','debts',
    'recurring_payments','savings_goals','kids_goals',
    'kids_deposits','kids_badges','budgets'
  );

  SELECT COUNT(*) INTO v_rpcs FROM information_schema.routines
  WHERE routine_schema='public' AND routine_name LIKE 'rpc_%';

  SELECT COUNT(*) INTO v_views FROM information_schema.views
  WHERE table_schema='public' AND table_name IN (
    'account_balances','recurring_status','card_monthly_spending','plan_limits'
  );

  SELECT COUNT(*) INTO v_trigger FROM information_schema.triggers
  WHERE trigger_name='on_auth_user_created';

  RAISE NOTICE '';
  RAISE NOTICE '╔══════════════════════════════════════════════════╗';
  RAISE NOTICE '║     MiFinanza Schema v3 — Verificación final     ║';
  RAISE NOTICE '╠══════════════════════════════════════════════════╣';
  RAISE NOTICE '║  Tablas:    %/11                                  ║', v_tables;
  RAISE NOTICE '║  Funciones: %                                     ║', v_rpcs;
  RAISE NOTICE '║  Vistas:    %/4                                   ║', v_views;
  RAISE NOTICE '║  Trigger:   %/1 (handle_new_user)                 ║', v_trigger;
  RAISE NOTICE '╠══════════════════════════════════════════════════╣';

  IF v_tables = 11 AND v_rpcs >= 15 AND v_views = 4 AND v_trigger = 1 THEN
    RAISE NOTICE '║  ✅ Instalación correcta — MiFinanza listo        ║';
  ELSE
    RAISE NOTICE '║  ⚠️  Verificar: algo no se instaló correctamente  ║';
  END IF;

  RAISE NOTICE '╠══════════════════════════════════════════════════╣';
  RAISE NOTICE '║  PRÓXIMOS PASOS:                                  ║';
  RAISE NOTICE '║  1. Authentication → Settings → Confirm email OFF ║';
  RAISE NOTICE '║  2. Authentication → Settings → Site URL          ║';
  RAISE NOTICE '║  3. Copiar .env.local.example → .env.local        ║';
  RAISE NOTICE '║  4. npm run dev → registrarse → crear familia     ║';
  RAISE NOTICE '╚══════════════════════════════════════════════════╝';
END $$;