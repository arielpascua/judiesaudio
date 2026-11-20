-- Judie's Audio orders. Idempotent. Touches ONLY ja_ objects.
--
-- The catalogue is CODE (lib/catalog/fixtures.ts): there are no catalogue tables
-- here, and an order stores a SNAPSHOT of what was charged, so a later catalogue
-- edit cannot rewrite history.
--
-- WHAT AN ORDER ROW MEANS: "a payment link was issued for this basket at this
-- total". Maya Payment Links have no webhook and no return redirect, so nothing
-- here ever learns whether the buyer paid. status stays 'pending' until a human
-- reconciles it against the Maya dashboard. 'paid' exists in the CHECK so that a
-- person can record it; no application code writes it.
--
-- Rows are written by the server with the service-role key (lib/server/orders.ts)
-- and read by a person in the Supabase dashboard. RLS is on and NO policy exists
-- for anon or authenticated, so the public keys can read and write nothing.

create table if not exists ja_orders (
  id uuid primary key,
  reference text unique not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'cancelled')),
  subtotal int not null check (subtotal >= 0),
  shipping int not null check (shipping >= 0),
  total int not null check (total > 0),
  item_count int not null check (item_count > 0),
  is_domestic boolean not null,
  payment_link text not null,
  -- { company, contactName, email, phone?, taxId?, poReference? }
  customer jsonb not null,
  shipping_address jsonb not null,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create table if not exists ja_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references ja_orders (id) on delete cascade,
  product_id text not null,
  product_name text not null,
  pack_id text not null,
  pack_label text not null,
  pack_units int not null check (pack_units > 0),
  finish_name text not null,
  -- whole pesos for ONE PACK, as charged
  unit_price int not null check (unit_price > 0),
  quantity int not null check (quantity > 0)
);

create index if not exists ja_order_items_order_id_idx on ja_order_items (order_id);

alter table ja_orders enable row level security;
alter table ja_order_items enable row level security;

revoke all on ja_orders from anon, authenticated;
revoke all on ja_order_items from anon, authenticated;
