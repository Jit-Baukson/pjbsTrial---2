-- Reconcile the hand-built catalog with the final e-commerce shape.
--
-- This migration was generated from a drifted local database, where the
-- products table had already lost its legacy id/name columns. That made it
-- unsafe to apply to a fresh project (the 20260913 seed rows still exist and
-- have a NULL productCode) or to the existing remote project (id/name were
-- already gone, so DROP COLUMN without IF EXISTS failed).
--
-- Every statement below is now idempotent and works in both situations.

alter table public.products
    drop constraint if exists products_pkey;

alter table public.products
    alter column "availability" drop default;

alter table public.products
    alter column "price" drop default;

-- The rows created by 20260913 only carry a name and cannot be sold; the real
-- catalog is keyed by productCode. Remove only those unusable seed rows.
delete from public.products
where "productCode" is null;

alter table public.products
    drop column if exists "id";

alter table public.products
    drop column if exists "name";

alter table public.products
    alter column "availability" drop not null;

alter table public.products
    alter column "price" drop not null;

alter table public.products
    alter column "productCode" set not null;

-- Add the primary key only when the table does not already have one.
do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conrelid = 'public.products'::regclass
          and contype = 'p'
    ) then
        alter table public.products
            add constraint products_pkey primary key ("productCode");
    end if;
end $$;
