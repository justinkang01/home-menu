-- home-menu schema
-- Run this once in the Supabase project's SQL Editor.

create extension if not exists pgcrypto;

create table menus (
  id uuid primary key default gen_random_uuid(),
  admin_token text not null unique,   -- long random secret, bearer-style; never exposed to anon
  guest_slug  text not null unique,   -- short public id, QR-friendly
  name text not null,
  created_at timestamptz not null default now()
);

create table menu_items (
  id uuid primary key default gen_random_uuid(),
  menu_id uuid not null references menus(id) on delete cascade,
  category text,
  name text not null,
  description text,
  is_available boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index on menu_items (menu_id);

create table guests (
  id uuid primary key default gen_random_uuid(),  -- this IS the client-side guest_id
  menu_id uuid not null references menus(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);
create index on guests (menu_id);

create table orders (
  id uuid primary key default gen_random_uuid(),
  menu_id uuid not null references menus(id) on delete cascade,
  guest_id uuid not null references guests(id) on delete cascade,
  guest_name text not null,            -- snapshot of guests.display_name
  status text not null default 'pending' check (status in ('pending','preparing','served')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on orders (menu_id, created_at desc);
create index on orders (guest_id);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  menu_id uuid not null references menus(id) on delete cascade,       -- denormalized so Realtime can filter by menu_id
  menu_item_id uuid references menu_items(id) on delete set null,
  item_name text not null,             -- snapshot, survives menu edits
  quantity integer not null default 1 check (quantity > 0),
  created_at timestamptz not null default now()
);
create index on order_items (order_id);
create index on order_items (menu_id);

create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger orders_set_updated_at
before update on orders
for each row execute function set_updated_at();

-- Row Level Security
alter table menus       enable row level security;
alter table menu_items  enable row level security;
alter table guests      enable row level security;
alter table orders      enable row level security;
alter table order_items enable row level security;

-- No anon policies on menus/menu_items: admin_token lookups and all menu edits
-- go exclusively through server-side API routes using the service-role key.
--
-- orders/guests/order_items get anon SELECT so the browser can open Realtime
-- subscriptions directly. No anon INSERT/UPDATE/DELETE policy exists anywhere,
-- so all writes still require the service role key from an API route.
--
-- Note: these SELECT policies are intentionally NOT scoped per-menu (the anon
-- key has no server-verifiable identity to filter on without adding real
-- auth). This means anyone with the public anon key could query orders across
-- all menus on this project, not just their own. Acceptable for a small
-- home-cafe app with no payments and no PII beyond a first name.
create policy "anon can read guests"      on guests      for select to anon using (true);
create policy "anon can read orders"      on orders      for select to anon using (true);
create policy "anon can read order_items" on order_items for select to anon using (true);

-- Enable Realtime replication on the tables the UI subscribes to
alter publication supabase_realtime add table orders, order_items;
