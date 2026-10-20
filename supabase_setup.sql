-- 414 JEWELS: SUPABASE SETUP
-- Safe to run on a new project or an existing project. This file does not insert demo products.
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
  option_groups jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products add column if not exists option_groups jsonb not null default '[]'::jsonb;

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  sku text,
  price numeric(10,2) not null default 0 check (price >= 0),
  compare_at_price numeric(10,2) check (compare_at_price is null or compare_at_price >= 0),
  stock_qty integer not null default 0 check (stock_qty >= 0),
  active boolean not null default true,
  sort_order integer not null default 0,
  option_values jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists product_variants_product_id_idx on public.product_variants(product_id);
create index if not exists product_variants_active_idx on public.product_variants(product_id, active);

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
alter table public.product_variants enable row level security;
alter table public.admins enable row level security;

drop policy if exists "Public can read active products" on public.products;
create policy "Public can read active products"
on public.products for select
using (active = true or public.is_admin());

drop policy if exists "Admins can insert products" on public.products;
create policy "Admins can insert products"
on public.products for insert to authenticated
with check (public.is_admin());

drop policy if exists "Admins can update products" on public.products;
create policy "Admins can update products"
on public.products for update to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can delete products" on public.products;
create policy "Admins can delete products"
on public.products for delete to authenticated
using (public.is_admin());

drop policy if exists "Public can read active product variants" on public.product_variants;
create policy "Public can read active product variants"
on public.product_variants for select
using (
  active = true
  and exists (
    select 1 from public.products p
    where p.id = product_variants.product_id and p.active = true
  )
  or public.is_admin()
);

drop policy if exists "Admins can insert product variants" on public.product_variants;
create policy "Admins can insert product variants"
on public.product_variants for insert to authenticated
with check (public.is_admin());

drop policy if exists "Admins can update product variants" on public.product_variants;
create policy "Admins can update product variants"
on public.product_variants for update to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can delete product variants" on public.product_variants;
create policy "Admins can delete product variants"
on public.product_variants for delete to authenticated
using (public.is_admin());

drop policy if exists "Admin can see own admin row" on public.admins;
create policy "Admin can see own admin row"
on public.admins for select to authenticated
using (user_id = auth.uid());

grant usage on schema public to anon, authenticated;
grant select on public.products, public.product_variants to anon, authenticated;
grant insert, update, delete on public.products, public.product_variants to authenticated;
grant execute on function public.is_admin() to anon, authenticated;

create or replace function public.record_variant_sale(
  p_variant_id uuid,
  p_quantity integer,
  p_note text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  remaining integer;
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;
  if p_quantity is null or p_quantity < 1 then
    raise exception 'Quantity must be at least one';
  end if;

  update public.product_variants
  set stock_qty = stock_qty - p_quantity
  where id = p_variant_id and stock_qty >= p_quantity
  returning stock_qty into remaining;

  if remaining is null then
    raise exception 'Variant not found or insufficient stock';
  end if;

  return remaining;
end;
$$;

revoke all on function public.record_variant_sale(uuid, integer, text) from public;
revoke all on function public.record_variant_sale(uuid, integer, text) from anon;
grant execute on function public.record_variant_sale(uuid, integer, text) to authenticated;
