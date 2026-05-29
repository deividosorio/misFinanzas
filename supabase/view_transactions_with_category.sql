-- ============================================================
-- MIFINANZA — Vista: transactions_with_category v1
-- ============================================================
-- Esta vista expone las transacciones con los datos de categoría y tipo
-- provenientes de la nueva tabla categories, para facilitar la migración
-- y presentación en la app. Solo requiere actualizar el SELECT en el context.
--
-- Incluye:
--   - Todos los campos de transactions
--   - type y datos de categoría (key, label, color, type) desde categories
--   - Si la transacción no tiene category_id, usa los datos legacy
-- ============================================================

-- Elimina las columnas legacy de transactions, ya que ahora se resuelven en la vista.
ALTER TABLE transactions
  DROP COLUMN category,
  DROP COLUMN type;

CREATE OR REPLACE VIEW public.transactions_with_category AS
SELECT
  t.id,
  t.family_id,
  t.created_by,

  -- Tipo final de la transacción (solo desde categories)
  COALESCE(c.type, 'uncategorized') AS type,

  -- ID de categoría asignada en la transacción
  t.category_id,

  -- Categoría final resuelta (si no hay category_id, queda NULL)
  c.id AS resolved_category_id,

  -- Clave de categoría (key)
  COALESCE(c.key, 'uncategorized') AS category_key,

  -- Labels traducidos
  COALESCE(c.label_es, 'Sin categoría') AS category_label_es,
  COALESCE(c.label_en, 'Uncategorized') AS category_label_en,
  COALESCE(c.label_fr, 'Sans catégorie') AS category_label_fr,

  -- Color de categoría
  COALESCE(c.color, '#4f7cff') AS category_color,

  -- Campos originales de la transacción
  t.description,
  t.amount,
  t.date,
  t.account_id,
  t.auto_source,
  t.source_id,
  t.notes,
  t.is_void,
  t.created_at,
  t.updated_at

FROM transactions t
LEFT JOIN categories c
  ON t.category_id = c.id;


-- Para migrar la app: solo cambia el SELECT en el context a esta vista.
-- Ejemplo:
--   supabase.from('transactions_with_category').select('*').eq('family_id', fid)


CREATE OR REPLACE VIEW public.account_balances
WITH (security_invoker = on) AS
SELECT
  a.id,
  a.family_id,
  a.name,
  a.is_active,
  a.subtype,
  a.subtype = ANY (
    ARRAY['credit_card'::account_subtype, 'credit_line'::account_subtype]
  ) AS is_credit,
  a.color,
  a.institution,
  a.last_four,
  a.credit_limit,
  a.opening_balance,
  p.display_name AS owner_name,

  -- BALANCE PARA CUENTAS QUE NO SON DE CRÉDITO
  CASE
    WHEN a.subtype <> ALL (
      ARRAY['credit_card'::account_subtype, 'credit_line'::account_subtype]
    ) THEN
      a.opening_balance
      + COALESCE(SUM(twc.amount) FILTER (WHERE twc.type = 'income'), 0)
      - COALESCE(SUM(twc.amount) FILTER (WHERE twc.type = 'expense'), 0)
      + COALESCE(SUM(twc.amount) FILTER (WHERE twc.type = 'saving'), 0)
    ELSE NULL
  END AS balance,

  -- DEUDA DEL MES (SOLO TARJETAS / LÍNEAS DE CRÉDITO)
  CASE
    WHEN a.subtype = ANY (
      ARRAY['credit_card'::account_subtype, 'credit_line'::account_subtype]
    ) THEN
      COALESCE(
        SUM(twc.amount) FILTER (
          WHERE twc.type = 'expense'
          AND to_char(twc.date, 'YYYY-MM') = to_char(NOW(), 'YYYY-MM')
        ),
        0
      )
    ELSE NULL
  END AS month_debt,

  -- DISPONIBLE (LÍMITE - GASTOS DEL MES)
  CASE
    WHEN a.subtype = ANY (
      ARRAY['credit_card'::account_subtype, 'credit_line'::account_subtype]
    ) THEN
      a.credit_limit
      - COALESCE(
          SUM(twc.amount) FILTER (
            WHERE twc.type = 'expense'
            AND to_char(twc.date, 'YYYY-MM') = to_char(NOW(), 'YYYY-MM')
          ),
          0
        )
    ELSE NULL
  END AS available,

  -- DEUDA TOTAL (SOLO CRÉDITO)
  CASE
    WHEN a.subtype = ANY (
      ARRAY['credit_card'::account_subtype, 'credit_line'::account_subtype]
    ) THEN
      COALESCE(SUM(twc.amount) FILTER (WHERE twc.type = 'expense'), 0)
    ELSE NULL
  END AS total_debt,

  -- TOTAL INGRESOS
  COALESCE(SUM(twc.amount) FILTER (WHERE twc.type = 'income'), 0) AS total_income,

  -- TOTAL GASTOS
  COALESCE(SUM(twc.amount) FILTER (WHERE twc.type = 'expense'), 0) AS total_expense

FROM accounts a
LEFT JOIN transactions_with_category twc
  ON twc.account_id = a.id
  AND NOT twc.is_void
LEFT JOIN profiles p
  ON p.id = a.owner_profile

WHERE a.is_active = TRUE

GROUP BY
  a.id,
  a.family_id,
  a.name,
  a.subtype,
  a.color,
  a.institution,
  a.last_four,
  a.credit_limit,
  a.opening_balance,
  p.display_name;
