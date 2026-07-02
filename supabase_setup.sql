-- SQL Setup Script for Agile Spark
-- Run this in your Supabase SQL Editor (https://database.new)

-- 1. Create rooms table
create table if not exists public.rooms (
  id text primary key,
  created_at timestamptz default now() not null,
  story text default 'New user story — click to edit' not null,
  revealed boolean default false not null
);

-- 2. Create players table
create table if not exists public.players (
  id uuid primary key,
  room_id text references public.rooms(id) on delete cascade not null,
  name text not null,
  role text not null check (role in ('developer', 'scrum_master')),
  vote text,
  is_mock boolean default false not null,
  updated_at timestamptz default now() not null
);

-- 3. Enable Row Level Security (RLS)
alter table public.rooms enable row level security;
alter table public.players enable row level security;

-- 4. Create RLS Policies
-- Note: For simplicity and collaboration, authenticated users can view, insert, update, or delete records.
create policy "Allow all actions for authenticated users on rooms"
  on public.rooms
  for all
  to authenticated
  using (true)
  with check (true);

create policy "Allow all actions for authenticated users on players"
  on public.players
  for all
  to authenticated
  using (true)
  with check (true);

-- 5. Enable Realtime Replication
-- This enables clients to receive real-time updates when records change.
do $$
begin
  -- Check and drop public.rooms table if it is already in the publication
  if exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'rooms'
  ) then
    alter publication supabase_realtime drop table public.rooms;
  end if;

  -- Check and drop public.players table if it is already in the publication
  if exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'players'
  ) then
    alter publication supabase_realtime drop table public.players;
  end if;
end $$;

-- Add tables to the realtime publication
alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.players;
