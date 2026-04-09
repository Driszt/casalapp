-- CasalApp - Schema completo v3
-- Apaga tudo e recria
-- Corre no Supabase > SQL Editor

drop table if exists user_groups cascade;
drop table if exists invites cascade;
drop table if exists notes cascade;
drop table if exists messages cascade;
drop table if exists tasks cascade;
drop table if exists events cascade;
drop table if exists profiles cascade;

-- PROFILES
create table profiles (
  id uuid references auth.users primary key,
  email text,
  name text,
  photo text,
  created_at timestamp default now()
);
alter table profiles enable row level security;
create policy "profiles_select" on profiles for select using (auth.uid() = id);
create policy "profiles_insert" on profiles for insert with check (auth.uid() = id);
create policy "profiles_update" on profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- EVENTS
create table events (
  id text primary key,
  user_id uuid references auth.users not null,
  group_id text not null,
  data jsonb not null default '{}',
  created_at timestamp default now()
);
alter table events enable row level security;
create policy "events_select" on events for select using (auth.uid() = user_id);
create policy "events_insert" on events for insert with check (auth.uid() = user_id);
create policy "events_update" on events for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "events_delete" on events for delete using (auth.uid() = user_id);

-- TASKS
create table tasks (
  id text primary key,
  user_id uuid references auth.users not null,
  group_id text not null,
  data jsonb not null default '{}',
  created_at timestamp default now()
);
alter table tasks enable row level security;
create policy "tasks_select" on tasks for select using (auth.uid() = user_id);
create policy "tasks_insert" on tasks for insert with check (auth.uid() = user_id);
create policy "tasks_update" on tasks for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "tasks_delete" on tasks for delete using (auth.uid() = user_id);

-- MESSAGES
create table messages (
  id bigserial primary key,
  user_id uuid references auth.users not null,
  group_id text not null,
  data jsonb not null default '{}',
  sender_name text,
  created_at timestamp default now()
);
alter table messages enable row level security;
create policy "messages_select" on messages for select using (true);
create policy "messages_insert" on messages for insert with check (auth.uid() = user_id);

-- NOTES
create table notes (
  id text primary key,
  user_id uuid references auth.users not null,
  group_id text not null,
  data jsonb not null default '{}',
  created_at timestamp default now()
);
alter table notes enable row level security;
create policy "notes_select" on notes for select using (auth.uid() = user_id);
create policy "notes_insert" on notes for insert with check (auth.uid() = user_id);
create policy "notes_update" on notes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "notes_delete" on notes for delete using (auth.uid() = user_id);

-- INVITES
create table invites (
  id text primary key,
  group_id text not null,
  group_name text,
  group_emoji text,
  group_color text,
  group_type text default 'colaborativo',
  group_perms jsonb,
  group_admins jsonb default '[]',
  created_by uuid references auth.users,
  created_by_name text,
  created_at timestamp default now(),
  expires_at timestamp default (now() + interval '30 days'),
  used_by uuid references auth.users,
  used_at timestamp
);
alter table invites enable row level security;
create policy "invites_select" on invites for select using (true);
create policy "invites_insert" on invites for insert with check (true);
create policy "invites_update" on invites for update using (true) with check (true);

-- USER GROUPS
create table user_groups (
  id bigserial primary key,
  user_id uuid references auth.users not null,
  group_id text not null,
  group_name text,
  group_emoji text,
  group_color text,
  group_type text default 'colaborativo',
  group_admins jsonb default '[]',
  group_perms jsonb,
  joined_at timestamp default now(),
  unique(user_id, group_id)
);
alter table user_groups enable row level security;
create policy "user_groups_select" on user_groups for select using (auth.uid() = user_id);
create policy "user_groups_insert" on user_groups for insert with check (auth.uid() = user_id);
create policy "user_groups_update" on user_groups for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_groups_delete" on user_groups for delete using (auth.uid() = user_id);

-- REALTIME
alter publication supabase_realtime add table messages;

-- PROPOSALS (shared between users in same group)
create table proposals (
  id text primary key,
  group_id text not null,
  type text not null,
  action_type text not null,
  item jsonb not null default '{}',
  original jsonb,
  from_name text,
  from_user_id uuid references auth.users,
  status text default 'pending',
  created_at timestamp default now()
);
alter table proposals enable row level security;
create policy "proposals_select" on proposals for select using (true);
create policy "proposals_insert" on proposals for insert with check (auth.uid() = from_user_id);
create policy "proposals_update" on proposals for update using (true) with check (true);

-- REALTIME for proposals too
alter publication supabase_realtime add table proposals;
