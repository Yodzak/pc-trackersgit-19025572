-- 1. Nettoyage (Optionnel : retirez les tirets '--' devant si vous voulez repartir de zéro)
-- DROP TABLE IF EXISTS projects;
-- DROP TABLE IF EXISTS events;

-- 2. Création de la table 'projects'
create table if not exists projects (
  id bigint primary key generated always as identity,
  created_at timestamptz default now(),
  user_id uuid references auth.users not null,
  "clientName" text not null,
  "projectType" text not null,
  versements bigint default 0,
  expenses jsonb default '{}'::jsonb,
  checklist jsonb default '[]'::jsonb,
  notes text
);

-- 3. Création de la table 'events'
create table if not exists events (
  id bigint primary key generated always as identity,
  created_at timestamptz default now(),
  user_id uuid references auth.users not null,
  title text not null,
  date text not null,
  type text not null
);

-- 4. Activation de la sécurité (RLS)
alter table projects enable row level security;
alter table events enable row level security;

-- 5. Création des politiques de sécurité (Pour que chaque utilisateur ne voie que SES données)

-- Pour PROJECTS
create policy "Users can view their own projects"
on projects for select
using ( auth.uid() = user_id );

create policy "Users can insert their own projects"
on projects for insert
with check ( auth.uid() = user_id );

create policy "Users can update their own projects"
on projects for update
using ( auth.uid() = user_id );

create policy "Users can delete their own projects"
on projects for delete
using ( auth.uid() = user_id );

-- Pour EVENTS
create policy "Users can view their own events"
on events for select
using ( auth.uid() = user_id );

create policy "Users can insert their own events"
on events for insert
with check ( auth.uid() = user_id );

create policy "Users can delete their own events"
on events for delete
using ( auth.uid() = user_id );
