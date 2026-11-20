-- Judie's Audio inquiries. Idempotent. Touches ONLY ja_ objects.
--
-- An inquiry is a buyer asking about models. It carries NO price: a pack row stores
-- a label and a unit count, never an amount. Rows are written by the server with
-- the service-role key (lib/server/inquiries.ts) and read by a person in the
-- Supabase dashboard.

create table if not exists ja_inquiries (
  id uuid primary key,
  reference text unique not null,
  status text not null default 'new' check (status in ('new', 'contacted', 'closed')),
  company text not null,
  contact_name text not null,
  email text not null,
  phone text,
  role text,
  message text,
  created_at timestamptz not null default now()
);

create table if not exists ja_inquiry_items (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references ja_inquiries (id) on delete cascade,
  product_id text not null,
  product_name text not null,
  pack_id text not null,
  pack_label text not null,
  units int not null check (units > 0),
  quantity int not null check (quantity > 0)
);

create index if not exists ja_inquiry_items_inquiry_id_idx on ja_inquiry_items (inquiry_id);

alter table ja_inquiries enable row level security;
alter table ja_inquiry_items enable row level security;

-- RLS on with ZERO policies: the anon and authenticated roles can read or write nothing.
-- Only the server's service-role key (which bypasses RLS) touches these tables.
revoke all on ja_inquiries from anon, authenticated;
revoke all on ja_inquiry_items from anon, authenticated;
