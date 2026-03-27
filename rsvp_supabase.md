# RSVP (Supabase) quick setup

This page is wired for **Supabase REST API** insert (client-side) using your **anon key**.

## 1) Create table
Run in Supabase SQL editor:

```sql
create table if not exists public.rsvp (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  attend text not null check (attend in ('yes','no')),
  people_count integer,
  created_at timestamptz not null default now()
);
```

## 2) Enable RLS + policy for inserts
```sql
alter table public.rsvp enable row level security;

create policy "anon can insert rsvp"
on public.rsvp
for insert
to anon
with check (true);
```

## 3) Configure `main.js`
Edit these variables:

- `RSVP.supabaseUrl`
- `RSVP.supabaseAnonKey` (anon key only)
- `RSVP.table` (defaults to `rsvp`)

If these are not set, the form still shows the success message and stores submissions locally in `localStorage` (queue) instead.

