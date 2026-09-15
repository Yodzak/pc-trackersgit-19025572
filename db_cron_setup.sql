-- =====================================================================
-- PC TRACKERS — PLANIFICATION DE LA TACHE QUOTIDIENNE
--
-- A executer APRES :
--   1. db_migration_v2.sql   (tables et colonnes)
--   2. supabase functions deploy daily-check   (la fonction existe)
--
-- Supabase > SQL Editor > New query > RUN
--
-- IMPORTANT : remplacez la valeur marquee << A REMPLACER >>
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Activation des extensions (sans effet si deja actives)
-- ---------------------------------------------------------------------
create extension if not exists pg_cron  with schema extensions;
create extension if not exists pg_net   with schema extensions;


-- ---------------------------------------------------------------------
-- 2. Stockage des secrets dans Vault
--    Evite d'ecrire la cle en clair dans la definition du cron.
-- ---------------------------------------------------------------------

-- URL de la fonction : deja renseignee avec la reference de votre projet.
select vault.create_secret(
  'https://oiexcrqfnwowzpcqeslh.supabase.co/functions/v1/daily-check',
  'daily_check_url',
  'URL de la fonction daily-check'
);

-- << A REMPLACER >> : votre cle service_role
-- Supabase > Project Settings > API > service_role (secret)
select vault.create_secret(
  'COLLEZ_ICI_VOTRE_CLE_SERVICE_ROLE',
  'daily_check_key',
  'Cle service_role pour appeler daily-check'
);


-- ---------------------------------------------------------------------
-- 3. Planification : tous les jours a 07h00 UTC
--
--    Ajustez l'heure a votre fuseau :
--      Abidjan / Dakar (UTC+0)  -> '0 7 * * *'  = 07h00 locale
--      Douala / Lagos  (UTC+1)  -> '0 6 * * *'  = 07h00 locale
--      Paris hiver     (UTC+1)  -> '0 6 * * *'  = 07h00 locale
-- ---------------------------------------------------------------------

-- On retire une eventuelle planification precedente avant de recreer.
select cron.unschedule('pc-trackers-daily-check')
 where exists (
   select 1 from cron.job where jobname = 'pc-trackers-daily-check'
 );

select cron.schedule(
  'pc-trackers-daily-check',
  '0 7 * * *',
  $$
  select net.http_post(
    url     := (select decrypted_secret from vault.decrypted_secrets
                 where name = 'daily_check_url'),
    headers := jsonb_build_object(
                 'Content-Type',  'application/json',
                 'Authorization', 'Bearer ' || (select decrypted_secret
                                                  from vault.decrypted_secrets
                                                 where name = 'daily_check_key')
               ),
    body    := jsonb_build_object('source', 'pg_cron', 'at', now()),
    timeout_milliseconds := 30000
  );
  $$
);


-- =====================================================================
-- VERIFICATIONS
-- =====================================================================

-- La tache est-elle bien planifiee ?
select jobid, jobname, schedule, active
  from cron.job
 where jobname = 'pc-trackers-daily-check';

-- Historique des 10 dernieres executions (a consulter le lendemain)
-- select status, return_message, start_time
--   from cron.job_run_details
--  where jobid = (select jobid from cron.job where jobname = 'pc-trackers-daily-check')
--  order by start_time desc
--  limit 10;

-- Pour arreter definitivement l'envoi automatique :
-- select cron.unschedule('pc-trackers-daily-check');
