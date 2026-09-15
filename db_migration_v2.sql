-- =====================================================================
-- PC TRACKERS — MIGRATION V2
-- A executer UNE SEULE FOIS dans Supabase > SQL Editor > New query > RUN
--
-- Contenu :
--   1. Suivi des dates de modification (updated_at + trigger)
--   2. Table des jetons de notification push
--   3. Table des preferences utilisateur (seuil d'alerte, frequence rapport)
--   4. Correctif : politique UPDATE manquante sur events
--   5. Vue des dossiers en sommeil
--
-- Ce script est IDEMPOTENT : le relancer ne casse rien.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. SUIVI DES DATES DE MODIFICATION
-- ---------------------------------------------------------------------

-- 1.a Ajout de la colonne
alter table projects
  add column if not exists updated_at timestamptz;

-- 1.b Retro-remplissage : les dossiers existants prennent leur date de creation
update projects
  set updated_at = created_at
  where updated_at is null;

-- 1.c Valeur par defaut + non nul pour les futurs dossiers
alter table projects
  alter column updated_at set default now();

alter table projects
  alter column updated_at set not null;

-- 1.d Fonction de trigger : touche updated_at a chaque modification
create or replace function touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 1.e Branchement du trigger sur la table projects
drop trigger if exists projects_touch_updated_at on projects;

create trigger projects_touch_updated_at
  before update on projects
  for each row
  execute function touch_updated_at();

-- 1.f Index pour que la recherche des dossiers en sommeil reste rapide
create index if not exists projects_user_updated_idx
  on projects (user_id, updated_at desc);


-- ---------------------------------------------------------------------
-- 2. JETONS DE NOTIFICATION PUSH
--    Un meme utilisateur peut avoir plusieurs appareils (tel + tablette).
-- ---------------------------------------------------------------------

create table if not exists push_tokens (
  id bigint primary key generated always as identity,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  user_id uuid references auth.users not null,
  token text not null,
  platform text,
  device_name text,
  unique (user_id, token)
);

alter table push_tokens enable row level security;

drop policy if exists "Users manage their own push tokens" on push_tokens;
create policy "Users manage their own push tokens"
  on push_tokens for all
  using ( auth.uid() = user_id )
  with check ( auth.uid() = user_id );


-- ---------------------------------------------------------------------
-- 3. PREFERENCES UTILISATEUR
--    Le seuil de 7 jours et la frequence du rapport sont parametrables
--    ici, sans toucher au code de l'application.
-- ---------------------------------------------------------------------

create table if not exists user_settings (
  user_id uuid primary key references auth.users,
  created_at timestamptz not null default now(),
  -- Nombre de jours sans modification avant qu'un dossier soit signale
  stale_threshold_days int not null default 7,
  -- Activer / desactiver les alertes de dossier en sommeil
  stale_alerts_enabled boolean not null default true,
  -- Frequence du rapport : 'daily' | 'weekly' | 'monthly' | 'off'
  report_frequency text not null default 'weekly',
  -- Adresse de reception du rapport (vide = email du compte)
  report_email text
);

alter table user_settings enable row level security;

drop policy if exists "Users manage their own settings" on user_settings;
create policy "Users manage their own settings"
  on user_settings for all
  using ( auth.uid() = user_id )
  with check ( auth.uid() = user_id );


-- ---------------------------------------------------------------------
-- 4. CORRECTIF : politique UPDATE manquante sur events
--    Sans elle, un evenement du calendrier ne peut pas etre modifie.
-- ---------------------------------------------------------------------

drop policy if exists "Users can update their own events" on events;
create policy "Users can update their own events"
  on events for update
  using ( auth.uid() = user_id )
  with check ( auth.uid() = user_id );


-- ---------------------------------------------------------------------
-- 5. VUE DES DOSSIERS EN SOMMEIL
--    Utilisee par l'application et par la tache automatique.
--    security_invoker = la RLS de l'utilisateur s'applique normalement.
-- ---------------------------------------------------------------------

create or replace view stale_projects
with (security_invoker = on)
as
select
  p.id,
  p.user_id,
  p."clientName",
  p."projectType",
  p.versements,
  p.updated_at,
  extract(day from (now() - p.updated_at))::int as days_inactive
from projects p
where p.updated_at < now() - (
  coalesce(
    (select s.stale_threshold_days from user_settings s where s.user_id = p.user_id),
    7
  ) * interval '1 day'
);


-- =====================================================================
-- VERIFICATION — doit renvoyer 3 lignes, chacune avec resultat = 1
-- =====================================================================
select 'updated_at' as element,
       count(*)::text as resultat
  from information_schema.columns
 where table_name = 'projects' and column_name = 'updated_at'
union all
select 'push_tokens',
       count(*)::text from information_schema.tables where table_name = 'push_tokens'
union all
select 'user_settings',
       count(*)::text from information_schema.tables where table_name = 'user_settings';
