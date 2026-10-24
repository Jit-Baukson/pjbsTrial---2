-- ============================================================================
-- Checkout integrity + payment state reconciliation
-- ----------------------------------------------------------------------------
-- Fixes found during the pre-launch audit:
--   1. Unavailable group packs could still be ordered by calling the RPC
--      directly (the UI hid them, the server did not check).
--   2. Quantities were only limited by the UI.
--   3. A failed/expired payment permanently removed unique stickers from sale.
--   4. Late or duplicate Midtrans notifications could move a paid order back
--      to pending/failed.
--
-- All order writes still go through SECURITY DEFINER functions. The new
-- apply_payment_status() function is executable only by service_role (the
-- Midtrans webhook), never by the browser.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) create_order(): same contract, stricter validation.
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

    -- The cart already aggregates by productCode. Reject duplicated payloads
    -- instead of silently charging for two lines of the same unique sticker.
    if exists (
        select 1
        from jsonb_array_elements(p_items) as x(item)
        group by x.item->>'productCode'
        having count(*) > 1
    ) then
        raise exception 'create_order: duplicate productCode in p_items';
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
        if v_qty <= 0 or v_qty > 99 then
            raise exception 'create_order: quantity for % must be between 1 and 99',
                v_product."productCode";
        end if;

        if v_product.price is null or v_product.price < 0 then
            raise exception 'create_order: product % has no valid price',
                v_product."productCode";
        end if;

        -- The shop hides unavailable rows, but the RPC is the security boundary.
        if coalesce(v_product.availability, false) = false then
            raise exception 'create_order: % is unavailable', v_product."productCode";
        end if;

        if v_product.packed = 'individual' then
            -- Unique stickers: one unit, one sale only.
            if v_qty <> 1 then
                raise exception 'create_order: individual sticker % must be quantity 1',
                    v_product."productCode";
            end if;
            update public.products
                set availability = false
                where "productCode" = v_product."productCode";
        elsif v_product.packed is distinct from 'group' then
            raise exception 'create_order: product % has an unsupported packed type',
                v_product."productCode";
        end if;
        -- Group / mystery packs are re-sellable; stock is not flipped.

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

revoke all on function public.create_order(jsonb, jsonb) from public, anon;
grant execute on function public.create_order(jsonb, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- 2) apply_payment_status(): atomic, idempotent payment-state transition.
--    Called only by midtrans-webhook with the service role.
-- ---------------------------------------------------------------------------
create or replace function public.apply_payment_status(
    p_order_ref       text,
    p_status          text,
    p_payment_status  text,
    p_transaction_id  text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_order       public.orders;
    v_item        record;
    v_release     boolean := false;
    v_released    integer := 0;
    v_changed     integer := 0;
begin
    if coalesce(p_order_ref, '') = '' then
        raise exception 'apply_payment_status: order reference is required';
    end if;

    if p_status not in ('pending', 'paid', 'failed', 'expired', 'refunded') then
        raise exception 'apply_payment_status: invalid order status %', p_status;
    end if;

    if p_payment_status not in ('pending', 'settlement', 'expire', 'cancel', 'refund', 'failed') then
        raise exception 'apply_payment_status: invalid payment status %', p_payment_status;
    end if;

    -- Serialise concurrent webhook retries for the same order.
    select * into v_order
        from public.orders
        where "orderRef" = p_order_ref
        for update;

    if not found then
        return jsonb_build_object('ok', false, 'reason', 'not_found');
    end if;

    -- Ignore notifications that would regress a final state. This protects
    -- against duplicate/out-of-order Midtrans deliveries.
    if v_order.status = 'refunded' and p_status <> 'refunded' then
        return jsonb_build_object('ok', true, 'ignored', true, 'reason', 'already_refunded');
    end if;

    if v_order.status in ('paid', 'settled') and p_status in ('pending', 'failed', 'expired') then
        return jsonb_build_object('ok', true, 'ignored', true, 'reason', 'already_paid');
    end if;

    if v_order.status in ('failed', 'expired') and p_status in ('pending', 'paid') then
        return jsonb_build_object('ok', true, 'ignored', true, 'reason', 'manual_review_required');
    end if;

    if v_order.status = 'pending' and p_status = 'refunded' then
        return jsonb_build_object('ok', true, 'ignored', true, 'reason', 'not_paid_yet');
    end if;

    -- Release unique stickers only on the first pending -> failed/expired
    -- transition. Retries see a non-pending status and cannot release twice.
    if v_order.status = 'pending' and p_status in ('failed', 'expired') then
        v_release := true;
    end if;

    update public.orders
        set status = p_status,
            "paymentStatus" = p_payment_status,
            "midtransTransactionId" = coalesce(p_transaction_id, "midtransTransactionId")
        where id = v_order.id;

    if v_release then
        for v_item in
            select "productCode" from public.order_items where "orderId" = v_order.id
        loop
            update public.products
                set availability = true
                where "productCode" = v_item."productCode"
                  and packed = 'individual'
                  and availability = false;
            get diagnostics v_changed = row_count;
            v_released := v_released + v_changed;
        end loop;
    end if;

    return jsonb_build_object(
        'ok', true,
        'status', p_status,
        'paymentStatus', p_payment_status,
        'released', v_release,
        'releasedCount', v_released
    );
end;
$$;

revoke all on function public.apply_payment_status(text, text, text, text)
    from public, anon, authenticated;
grant execute on function public.apply_payment_status(text, text, text, text)
    to service_role;

comment on function public.apply_payment_status(text, text, text, text) is
    'Trusted Midtrans webhook state transition; releases unique sticker reservations on expire/cancel/deny.';
