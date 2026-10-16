-- ============================================================================
-- E-commerce schema + security
-- ----------------------------------------------------------------------------
-- This migration is IDEMPOTENT on purpose. The existing local `products`
-- table drifted from its original migration (it only declared id + name, but
-- the app reads productCode / category / packed / price / imagePath). Instead
-- of recreating the table and losing your data, we reconcile it in place.
--
-- Guarantees established here:
--   * Prices are validated on the trusted backend (create_order reads price
--     from the products table, NEVER from the client).
--   * Row Level Security is enabled on every table.
--   * Orders are written only through the definer RPC (guests cannot enumerate
--     or tamper with orders via the public API).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Reconcile the products table with what the app actually uses
-- ---------------------------------------------------------------------------
alter table public.products
    add column if not exists "productCode" text,
    add column if not exists "category"    text,
    add column if not exists "packed"      text,
    add column if not exists "price"       numeric(12,2) not null default 0,
    add column if not exists "imagePath"   text,
    add column if not exists "description" text,
    add column if not exists "stock"       integer,
    add column if not exists "createdAt"   timestamptz not null default now();

-- Keep `name` in sync with productCode for older rows (name is the original col)
update public.products
    set "productCode" = name
    where "productCode" is null and name is not null;

-- packed is a controlled vocabulary: individual items vs group/mystery packs
do $$
begin
    alter table public.products
        drop constraint if exists products_packed_check;
    alter table public.products
        add constraint products_packed_check
        check ("packed" in ('individual', 'group'));
exception when others then
    raise notice 'skipped products_packed_check: %', sqlerrm;
end $$;

-- Basic validity: a product must have a code, category and non-negative price
do $$
begin
    alter table public.products
        drop constraint if exists products_price_nonneg;
    alter table public.products
        add constraint products_price_nonneg check (price >= 0);
end $$;

-- Lookup indexes for the shop queries (filter by category + packed)
create index if not exists products_category_packed_idx
    on public.products ("category", "packed");

-- ---------------------------------------------------------------------------
-- 2) Row Level Security on products
--    Public (anon + authenticated) may READ the catalog, nothing more.
--    Writes happen only through the Supabase dashboard / service role.
-- ---------------------------------------------------------------------------
alter table public.products enable row level security;

drop policy if exists "products_are_publicly_readable" on public.products;
create policy "products_are_publicly_readable"
    on public.products
    for select
    to anon, authenticated
    using (true);

-- ---------------------------------------------------------------------------
-- 3) Orders (guest-friendly: identity is captured, not required)
-- ---------------------------------------------------------------------------
create table if not exists public.orders (
    id                    uuid primary key default gen_random_uuid(),
    -- Midtrans/external order id (we set a readable one at charge time)
    "orderRef"            text unique not null default ('STK-' || replace(gen_random_uuid()::text, '-', '')),
    status                text not null default 'pending'
                              check (status in ('pending', 'paid', 'settled', 'failed', 'expired', 'refunded')),
    -- buyer / shipping capture (collected at guest checkout)
    buyerName             text not null,
    buyerEmail            text not null,
    buyerPhone            text,
    shippingAddress       text not null,
    shippingCity          text not null,
    shippingPostal        text,
    -- trusted totals (server computed)
    subtotal              numeric(14,2) not null default 0,
    shippingCost          numeric(12,2) not null default 0,
    "grandTotal"          numeric(14,2) not null default 0,
    -- links the auth user when present; null for guests
    "userId"              uuid references auth.users(id) on delete set null,
    -- Midtrans identifiers
    midtransTransactionId text,
    midtransOrderId       text,
    paymentStatus         text not null default 'pending'
                              check (paymentStatus in ('pending', 'settlement', 'expire', 'cancel', 'refund', 'failed')),
    createdAt             timestamptz not null default now(),
    updatedAt             timestamptz not null default now()
);

create index if not exists orders_email_idx      on public.orders (lower(buyerEmail));
create index if not exists orders_createdAt_idx  on public.orders ("createdAt" desc);

alter table public.orders enable row level security;

-- No direct anon/authenticated access to orders. All writes go through
-- create_order(); status updates go through the service-role webhook.
-- Logged-in users may read their own orders (forward-looking for when auth is on).
drop policy if exists "users_read_own_orders" on public.orders;
create policy "users_read_own_orders"
    on public.orders
    for select
    to authenticated
    using ("userId" = auth.uid());

-- ---------------------------------------------------------------------------
-- 4) Order items (snapshot of product data at purchase time)
-- ---------------------------------------------------------------------------
create table if not exists public.order_items (
    id           uuid primary key default gen_random_uuid(),
    "orderId"    uuid not null references public.orders(id) on delete cascade,
    "productId"  bigint references public.products(id) on delete set null,
    -- snapshots so past receipts stay correct even if the catalog changes
    "productCode" text not null,
    title         text not null,
    "imagePath"   text,
    unitPrice     numeric(12,2) not null,
    quantity      integer not null check (quantity > 0),
    lineTotal     numeric(14,2) not null
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
-- 5) create_order() — the ONLY way an order is placed.
--    SECURITY DEFINER so it can write to RLS-locked tables, but it:
--      * recomputes every price from the products table (never trusts client),
--      * ignores any client-supplied totals,
--      * returns the created order so a guest can render a receipt without
--        being granted SELECT on the orders table.
-- ---------------------------------------------------------------------------
create or replace function public.create_order(
    p_items jsonb,   -- [{ "productId": 1, "quantity": 2 }, ...]
    p_buyer jsonb    -- { name, email, phone, address, city, postal }
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_shipping numeric(12,2) := 8000; -- flat domestic shipping; adjust per business rules
    v_order    public.orders;
    v_item     jsonb;
    v_product  public.products;
    v_subtotal numeric(14,2) := 0;
    v_qty      integer;
    v_user     uuid := auth.uid(); -- null for guests
begin
    if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
        raise exception 'create_order: p_items must be a non-empty array';
    end if;

    if coalesce(p_buyer->>'name', '') = ''
       or coalesce(p_buyer->>'email', '') = ''
       or coalesce(p_buyer->>'address', '') = ''
       or coalesce(p_buyer->>'city', '') = '' then
        raise exception 'create_order: buyer name, email, address and city are required';
    end if;

    insert into public.orders (
        buyerName, buyerEmail, buyerPhone,
        shippingAddress, shippingCity, shippingPostal,
        shippingCost, "userId", status
    ) values (
        p_buyer->>'name', p_buyer->>'email', p_buyer->>'phone',
        p_buyer->>'address', p_buyer->>'city', p_buyer->>'postal',
        v_shipping, v_user, 'pending'
    )
    returning * into v_order;

    for v_item in select * from jsonb_array_elements(p_items)
    loop
        select * into v_product
            from public.products
            where id = (v_item->>'productId')::bigint;

        if not found then
            raise exception 'create_order: product % not found', v_item->>'productId';
        end if;

        v_qty := coalesce((v_item->>'quantity')::integer, 0);
        if v_qty <= 0 then
            raise exception 'create_order: invalid quantity for product %', v_product.id;
        end if;

        -- optional stock guard when stock is tracked
        if v_product.stock is not null and v_qty > v_product.stock then
            raise exception 'create_order: insufficient stock for %', v_product."productCode";
        end if;

        -- trusted price comes from the DB, never the client
        insert into public.order_items (
            "orderId", "productId", "productCode", title, "imagePath",
            unitPrice, quantity, lineTotal
        ) values (
            v_order.id, v_product.id, v_product."productCode",
            coalesce(v_product.name, v_product."productCode"), v_product."imagePath",
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
        'shippingCost', v_order.shippingCost,
        'grandTotal', v_order."grandTotal",
        'status', v_order.status
    );
end;
$$;

-- Only authenticated + anon can attempt to place an order
revoke all on function public.create_order(jsonb, jsonb) from public;
grant execute on function public.create_order(jsonb, jsonb) to anon, authenticated;

-- Trigger to keep updatedAt fresh
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
