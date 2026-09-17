create table public.products (
    id bigint primary key generated always as identity,
    name text not null
);

insert into public.products (name)
values
    ('Doraemon-mystery-pack'),
    ('Doraemon-01'),
    ('Doraemon-02');