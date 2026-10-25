-- ============================================================================
-- Stickit.co e-commerce — reconciled to the REAL catalog schema
-- ----------------------------------------------------------------------------
-- The local `products` table is hand-built and keyed by "productCode" (a unique
-- text code), NOT a surrogate id. Its columns are:
--     productCode · price (bigint) · category · packed · availability (bool) · imagePath
-- There is no `id`, no `sold`, and no `stock`. This migration matches that
-- reality so the shop + checkout work end to end. Idempotent.
--
-- Guarantees:
--   * Public read on the catalog (fixes the blank shop under RLS).
--   * "productCode" is the identity everywhere (cart, order_items, lookups).
--   * Prices are read from the DB in create_order(); client totals ignored.
--   * Individual (unique) stickers can only be sold once: availability flips
--     false at order time and the row is locked FOR UPDATE to close races.
--   * Checkout requires a signed-in user; profiles store contact details.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Catalog: ensure columns exist (reset-safe), unique productCode, RLS read.
-- ---------------------------------------------------------------------------
alter table public.products
    add column if not exists "productCode"  text,
    add column if not exists "category"     text,
    add column if not exists "packed"       text,
    add column if not exists "price"        bigint not null default 0,
    add column if not exists "imagePath"    text,
    add column if not exists "availability" boolean not null default true;

-- productCode is the identity used for cart lines, order items and lookups.
create unique index if not exists products_productCode_key
    on public.products ("productCode");

create index if not exists products_category_packed_idx
    on public.products ("category", "packed");

alter table public.products enable row level security;

drop policy if exists "products_are_publicly_readable" on public.products;
create policy "products_are_publicly_readable"
    on public.products
    for select
    to anon, authenticated
    using (true);

-- ---------------------------------------------------------------------------
-- 2) Orders (camelCase columns are quoted so supabase-js / Edge Functions match)
-- ---------------------------------------------------------------------------
create table if not exists public.orders (
    id                      uuid primary key default gen_random_uuid(),
    "orderRef"              text unique not null default ('STK-' || replace(gen_random_uuid()::text, '-', '')),
    status                  text not null default 'pending'
                                check (status in ('pending', 'paid', 'settled', 'failed', 'expired', 'refunded')),
    "buyerName"             text not null,
    "buyerEmail"            text not null,
    "buyerIg"               text,
    -- Meet-up location (the checkout no longer collects address/city/postal).
    "shippingAddress"       text not null,
    subtotal                numeric(14,2) not null default 0,
    "shippingCost"          numeric(12,2) not null default 0,
    "grandTotal"            numeric(14,2) not null default 0,
    "userId"                uuid references auth.users(id) on delete set null,
    "midtransTransactionId" text,
    "midtransOrderId"       text,
    "paymentStatus"         text not null default 'pending'
                                check ("paymentStatus" in ('pending', 'settlement', 'expire', 'cancel', 'refund', 'failed')),
    "createdAt"             timestamptz not null default now(),
    "updatedAt"             timestamptz not null default now()
);

create index if not exists orders_email_idx     on public.orders (lower("buyerEmail"));
create index if not exists orders_createdAt_idx on public.orders ("createdAt" desc);

alter table public.orders enable row level security;

-- All writes go through create_order(); a signed-in user may read their own.
drop policy if exists "users_read_own_orders" on public.orders;
create policy "users_read_own_orders"
    on public.orders
    for select
    to authenticated
    using ("userId" = auth.uid());

-- ---------------------------------------------------------------------------
-- 3) Order items (snapshot of product data at purchase time, keyed by code)
-- ---------------------------------------------------------------------------
create table if not exists public.order_items (
    id            uuid primary key default gen_random_uuid(),
    "orderId"     uuid not null references public.orders(id) on delete cascade,
    "productCode" text not null references public.products("productCode"),
    title         text not null,
    "imagePath"   text,
    "unitPrice"   numeric(14,2) not null,
    quantity      integer not null check (quantity > 0),
    "lineTotal"   numeric(14,2) not null
);

create index if not exists order_items_orderId_idx on public.order_items ("orderId");

alter table public.order_items enable row level security;

drop policy if exists "users_read_own_order_items" on public.order_items;
create policy "users_read_own_order_items"
    on public.order_items
    for select
    to authenticated
    using (
        exists (
            select 1 from public.orders o
            where o.id = order_items."orderId"
              and o."userId" = auth.uid()
        )
    );

-- ---------------------------------------------------------------------------
-- 4) Profiles — per-user saved contact details (prefill at checkout)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
    "userId"     uuid primary key references auth.users(id) on delete cascade,
    name         text,
    "instagram"  text,
    email        text,
    "createdAt"  timestamptz not null default now(),
    "updatedAt"  timestamptz not null default now()
);

-- Optional contact number the customer can save on their profile page
-- (not collected at checkout).
alter table public.profiles add column if not exists phone text;

alter table public.profiles enable row level security;

grant select, insert, update on public.profiles to authenticated;
revoke all on public.profiles from anon;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
    on public.profiles for select to authenticated
    using ("userId" = auth.uid());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
    on public.profiles for insert to authenticated
    with check ("userId" = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
    on public.profiles for update to authenticated
    using ("userId" = auth.uid()) with check ("userId" = auth.uid());

-- ---------------------------------------------------------------------------
-- 5) create_order() — the ONLY way an order is placed.
--    SECURITY DEFINER so it can write to RLS-locked tables, but it:
--      * requires an authenticated caller,
--      * reads every price from the products table (never trusts the client),
--      * locks each product FOR UPDATE and flips unique stickers to unavailable,
--      * returns the created order so the buyer can render a receipt.
-- ---------------------------------------------------------------------------
create or replace function public.create_order(
    p_items jsonb,   -- [{ "productCode": "Doraemon-01", "quantity": 1 }, ...]
    p_buyer jsonb    -- { name, email, ig, meet }
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_shipping numeric(12,2) := 4500; -- MUST match SHIPPING_COST in src/lib/checkout.js
    v_order    public.orders;
    v_item     jsonb;
    v_product  public.products;
    v_subtotal numeric(14,2) := 0;
    v_qty      integer;
    v_user     uuid := auth.uid();
begin
    if v_user is null then
        raise exception 'create_order: authentication required';
    end if;

    if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
        raise exception 'create_order: p_items must be a non-empty array';
    end if;

    if coalesce(p_buyer->>'name', '') = ''
       or coalesce(p_buyer->>'email', '') = ''
       or coalesce(p_buyer->>'ig', '') = ''
       or coalesce(p_buyer->>'meet', '') = '' then
        raise exception 'create_order: buyer name, email, instagram and meetup location are required';
    end if;

    insert into public.orders (
        "buyerName", "buyerEmail", "buyerIg", "shippingAddress",
        "shippingCost", "userId", status
    ) values (
        p_buyer->>'name', p_buyer->>'email', p_buyer->>'ig', p_buyer->>'meet',
        v_shipping, v_user, 'pending'
    )
    returning * into v_order;

    for v_item in select * from jsonb_array_elements(p_items)
    loop
        -- Lock the row so two concurrent orders can't grab the same sticker.
        select * into v_product
            from public.products
            where "productCode" = (v_item->>'productCode')
            for update;

        if not found then
            raise exception 'create_order: product % not found', v_item->>'productCode';
        end if;

        v_qty := coalesce((v_item->>'quantity')::integer, 0);
        if v_qty <= 0 then
            raise exception 'create_order: invalid quantity for %', v_product."productCode";
        end if;

        if v_product.packed = 'individual' then
            -- Unique stickers: one unit, and never sold more than once.
            if not v_product.availability then
                raise exception 'create_order: % is already sold', v_product."productCode";
            end if;
            if v_qty <> 1 then
                raise exception 'create_order: individual sticker % must be quantity 1', v_product."productCode";
            end if;
            update public.products set availability = false
                where "productCode" = v_product."productCode";
        end if;
        -- Group / mystery packs are not unique; no per-unit availability flip.

        insert into public.order_items (
            "orderId", "productCode", title, "imagePath",
            "unitPrice", quantity, "lineTotal"
        ) values (
            v_order.id, v_product."productCode", v_product."productCode", v_product."imagePath",
            v_product.price, v_qty, v_product.price * v_qty
        );

        v_subtotal := v_subtotal + (v_product.price * v_qty);
    end loop;

    update public.orders
        set subtotal = v_subtotal,
            "grandTotal" = v_subtotal + v_shipping
        where id = v_order.id
        returning * into v_order;

    return jsonb_build_object(
        'orderId', v_order.id,
        'orderRef', v_order."orderRef",
        'subtotal', v_order.subtotal,
        'shippingCost', v_order."shippingCost",
        'grandTotal', v_order."grandTotal",
        'status', v_order.status
    );
end;
$$;

-- Only signed-in customers can place an order.
revoke all on function public.create_order(jsonb, jsonb) from public, anon;
grant execute on function public.create_order(jsonb, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- 6) Keep orders.updatedAt fresh on every update.
-- ---------------------------------------------------------------------------
create or replace function public.touch_updatedAt()
returns trigger language plpgsql as $$
begin
    new."updatedAt" = now();
    return new;
end $$;

drop trigger if exists orders_touch_updatedAt on public.orders;
create trigger orders_touch_updatedAt
    before update on public.orders
    for each row execute function public.touch_updatedAt();
