-- =====================================================================
-- PC TRACKERS — MIGRATION V3 : PIECES JOINTES
--
-- DEJA APPLIQUEE sur le projet oiexcrqfnwowzpcqeslh.
-- Conservee ici pour l'historique et pour un eventuel autre projet.
--
-- Chaque dossier peut porter plusieurs fichiers : plans, arretes,
-- notices, photos de chantier.
-- =====================================================================

-- 1. Espace de stockage prive (25 Mo par fichier).
insert into storage.buckets (id, name, public, file_size_limit)
values ('attachments', 'attachments', false, 26214400)
on conflict (id) do nothing;

-- 2. Metadonnees. on delete cascade : supprimer un dossier retire ses
--    pieces jointes de la base.
create table if not exists attachments (
  id bigint primary key generated always as identity,
  created_at timestamptz not null default now(),
  project_id bigint not null references projects (id) on delete cascade,
  user_id uuid not null references auth.users,
  file_name text not null,
  storage_path text not null unique,
  mime_type text,
  size_bytes bigint,
  category text
);

create index if not exists attachments_project_idx
  on attachments (project_id, created_at desc);

alter table attachments enable row level security;

drop policy if exists "Users manage their own attachments" on attachments;
create policy "Users manage their own attachments"
  on attachments for all
  using ( auth.uid() = user_id )
  with check ( auth.uid() = user_id );

-- 3. Regles sur les fichiers. Convention : <user_id>/<project_id>/<fichier>
drop policy if exists "Users read their own attachment files" on storage.objects;
create policy "Users read their own attachment files"
  on storage.objects for select
  using (bucket_id = 'attachments'
         and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users upload their own attachment files" on storage.objects;
create policy "Users upload their own attachment files"
  on storage.objects for insert
  with check (bucket_id = 'attachments'
              and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users delete their own attachment files" on storage.objects;
create policy "Users delete their own attachment files"
  on storage.objects for delete
  using (bucket_id = 'attachments'
         and (storage.foldername(name))[1] = auth.uid()::text);

-- 4. Ajouter ou retirer une piece jointe compte comme une activite :
--    sans cela, joindre un plan ne sortait pas le dossier du sommeil.
create or replace function touch_project_from_attachment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.projects
     set updated_at = now()
   where id = coalesce(new.project_id, old.project_id);
  return coalesce(new, old);
end;
$$;

drop trigger if exists attachments_touch_project on attachments;
create trigger attachments_touch_project
  after insert or delete on attachments
  for each row
  execute function touch_project_from_attachment();
