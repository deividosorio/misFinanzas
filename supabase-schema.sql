-- ============================================================
-- MiFinanza - Schema completo para Supabase
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- Habilitar UUID
create extension if not exists "uuid-ossp";

-- ─── PROFILES (uno por usuario autenticado) ───────────────────
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  name text,
  family_id uuid,
  created_at timestamptz default now()
);

-- ─── FAMILIES (grupo familiar compartido) ────────────────────
create table if not exists families (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  owner_id uuid references profiles(id),
  created_at timestamptz default now()
);

-- Agregar referencia de familia en profiles
alter table profiles add column if not exists family_id uuid references families(id);

-- ─── ACCOUNTS (cuentas bancarias) ────────────────────────────
create table if not exists accounts (
  id uuid default uuid_generate_v4() primary key,
  family_id uuid references families(id) on delete cascade,
  name text not null,
  owner text not null,
  type text not null default 'savingsAccount',
  color text default '#4f7cff',
  created_at timestamptz default now()
);

-- ─── PAYMENT_METHODS (tarjetas / efectivo) ───────────────────
create table if not exists payment_methods (
  id uuid default uuid_generate_v4() primary key,
  family_id uuid references families(id) on delete cascade,
  name text not null,
  type text not null default 'creditCard',
  last_four text,
  color text default '#f87171',
  credit_limit numeric(12,2),
  created_at timestamptz default now()
);

-- ─── TRANSACTIONS (movimientos) ──────────────────────────────
create table if not exists transactions (
  id uuid default uuid_generate_v4() primary key,
  family_id uuid references families(id) on delete cascade,
  type text not null check (type in ('income','expense','saving')),
  category text not null,
  description text,
  amount numeric(12,2) not null,
  date date not null,
  account_id uuid references accounts(id) on delete set null,
  payment_method_id uuid references payment_methods(id) on delete set null,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- ─── DEBTS (hipoteca, carros) ─────────────────────────────────
create table if not exists debts (
  id uuid default uuid_generate_v4() primary key,
  family_id uuid references families(id) on delete cascade,
  name text not null,
  total_debt numeric(12,2) not null,
  paid numeric(12,2) default 0,
  monthly_payment numeric(12,2),
  interest_rate numeric(5,2),
  start_date date,
  created_at timestamptz default now()
);

-- ─── RECURRING_PAYMENTS (pagos periódicos) ───────────────────
create table if not exists recurring_payments (
  id uuid default uuid_generate_v4() primary key,
  family_id uuid references families(id) on delete cascade,
  name text not null,
  amount numeric(12,2) not null,
  frequency text default 'monthly',
  category text,
  payment_method_id uuid,
  next_due date,
  created_at timestamptz default now()
);

-- ─── SAVINGS_GOALS (metas de ahorro) ─────────────────────────
create table if not exists savings_goals (
  id uuid default uuid_generate_v4() primary key,
  family_id uuid references families(id) on delete cascade,
  name text not null,
  target numeric(12,2) not null,
  current numeric(12,2) default 0,
  created_at timestamptz default now()
);

-- ═══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS) — solo ves los datos de tu familia
-- ═══════════════════════════════════════════════════════════════

alter table profiles enable row level security;
alter table families enable row level security;
alter table accounts enable row level security;
alter table payment_methods enable row level security;
alter table transactions enable row level security;
alter table debts enable row level security;
alter table recurring_payments enable row level security;
alter table savings_goals enable row level security;

-- Profiles: solo tu propio perfil
create policy "Own profile" on profiles
  for all using (auth.uid() = id);

-- Families: solo si eres miembro
create policy "Family members" on families
  for all using (
    id in (select family_id from profiles where id = auth.uid())
  );

-- Función helper: obtener family_id del usuario actual
create or replace function get_family_id()
returns uuid language sql security definer as $$
  select family_id from profiles where id = auth.uid()
$$;

-- Todas las demás tablas: solo datos de tu familia
create policy "Family accounts" on accounts
  for all using (family_id = get_family_id());

create policy "Family payment_methods" on payment_methods
  for all using (family_id = get_family_id());

create policy "Family transactions" on transactions
  for all using (family_id = get_family_id());

create policy "Family debts" on debts
  for all using (family_id = get_family_id());

create policy "Family recurring_payments" on recurring_payments
  for all using (family_id = get_family_id());

create policy "Family savings_goals" on savings_goals
  for all using (family_id = get_family_id());

-- ═══════════════════════════════════════════════════════════════
-- TRIGGER: crear perfil automáticamente al registrarse
-- ═══════════════════════════════════════════════════════════════
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, email, name)
  values (new.id, new.email, split_part(new.email, '@', 1));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ══════════════════════════════════════════════════════════════
-- MIGRATION v7 — Run this in Supabase SQL Editor if upgrading
-- from a previous version
-- ══════════════════════════════════════════════════════════════

-- Add frequency to debts
ALTER TABLE debts ADD COLUMN IF NOT EXISTS frequency text DEFAULT 'monthly';

-- Add amount_type to recurring_payments (fixed/variable)
ALTER TABLE recurring_payments ADD COLUMN IF NOT EXISTS amount_type text DEFAULT 'fixed';

-- Add deadline to savings_goals
ALTER TABLE savings_goals ADD COLUMN IF NOT EXISTS deadline date;
