-- 414 JEWELS: SUPABASE SETUP
-- Run this entire file in the Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'Other',
  sku text,
  price numeric(10,2) not null default 0,
  compare_at_price numeric(10,2),
  description text,
  image_url text,
  stock_qty integer not null default 0,
  active boolean not null default true,
  featured boolean not null default false,
  sort_order integer not null default 0,
  finishes text[] not null default '{}',
  lengths text[] not null default '{}',
  widths text[] not null default '{}',
  sizes text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_products_updated_at on public.products;
create trigger set_products_updated_at
before update on public.products
for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins where user_id = auth.uid()
  );
$$;

alter table public.products enable row level security;
alter table public.admins enable row level security;

drop policy if exists "Public can read active products" on public.products;
create policy "Public can read active products"
on public.products
for select
using (active = true or public.is_admin());

drop policy if exists "Admins can insert products" on public.products;
create policy "Admins can insert products"
on public.products
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins can update products" on public.products;
create policy "Admins can update products"
on public.products
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can delete products" on public.products;
create policy "Admins can delete products"
on public.products
for delete
to authenticated
using (public.is_admin());

drop policy if exists "Admin can see own admin row" on public.admins;
create policy "Admin can see own admin row"
on public.admins
for select
to authenticated
using (user_id = auth.uid());

-- OPTIONAL starter products:
insert into public.products
(name, category, sku, price, description, stock_qty, active, featured, sort_order, finishes, lengths, widths, sizes)
values
('Gold Rope Chain','Chains','RP-G-001',35,'Classic rope chain with a polished gold-tone finish.',5,true,true,1,array['Gold'],array['18"','20"','22"','24"'],array['3 mm','4 mm'],array[]::text[]),
('Classic Bangle','Bangles','BG-001',40,'Polished bangle made for stacking or wearing on its own.',4,true,true,2,array['Gold','Silver'],array[]::text[],array[]::text[],array['Small','Medium','Large']),
('Rimless Fashion Glasses','Glasses','GL-001',45,'Statement rimless fashion frame with a clean luxury look.',3,true,true,3,array['Gold','Silver'],array[]::text[],array[]::text[],array[]::text[])
on conflict do nothing;

-- AFTER creating your admin user in Supabase Authentication,
-- replace YOUR_AUTH_USER_UUID below with that user's UUID, then run:
--
-- insert into public.admins(user_id)
-- values ('YOUR_AUTH_USER_UUID')
-- on conflict do nothing;
grant usage on schema public to anon, authenticated;

grant select on public.products to anon, authenticated;

grant insert, update, delete on public.products to authenticated;

grant execute on function public.is_admin() to anon, authenticated;