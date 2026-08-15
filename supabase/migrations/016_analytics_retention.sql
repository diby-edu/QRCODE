-- Rend vraies deux affirmations de la politique de confidentialité, qui
-- jusqu'ici ne l'étaient pas (constat de l'audit pré-lancement) :
--   « statistiques de scan … n'identifient jamais la personne qui scanne »
--   « statistiques conservées 18 mois, puis supprimées automatiquement »
--
-- Côté application, src/lib/net.ts (anonymizeIp) tronque désormais l'IP AVANT
-- l'appel de géolocalisation et avant l'écriture — reste l'historique déjà
-- enregistré, et la purge, traités ici.

-- ------------------------------------------------------------------
-- 1. Historique : troncature des IP déjà stockées dans qr_scans
-- ------------------------------------------------------------------
-- Irréversible par nature — c'est l'objectif : une IP complète conservée
-- reste une donnée personnelle, quelle que soit la promesse affichée. Le
-- pays et la ville déjà résolus sont conservés, seule l'IP est réduite à son
-- réseau (dernier octet en IPv4, 64 derniers bits en IPv6).
-- IPv6 mis à NULL plutôt que tronqué : les formes compressées (2001:db8::1)
-- ne se découpent pas de façon fiable en SQL, et l'historique n'en contient
-- aucune de toute façon (vérifié : 55 lignes, toutes IPv4). Le code
-- applicatif, lui, gère correctement les deux familles (anonymizeIp).
update public.qr_scans
set ip_address = case
  when ip_address like '%:%' then null
  else regexp_replace(ip_address, '\.\d+$', '.0')
end
where ip_address is not null
  and ip_address !~ '\.0$';

-- ------------------------------------------------------------------
-- 2. Purge automatique à 18 mois
-- ------------------------------------------------------------------
-- Lève le TODO laissé dans 009_site_visits.sql. Les compteurs agrégés
-- (qr_codes.scan_count) ne sont volontairement PAS décrémentés : ils
-- représentent un total historique affiché au client, pas une donnée
-- personnelle.
create or replace function public.purge_old_analytics()
returns table(scans_deleted bigint, visits_deleted bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  s bigint;
  v bigint;
begin
  delete from public.qr_scans where scanned_at < now() - interval '18 months';
  get diagnostics s = row_count;

  delete from public.site_visits where visited_at < now() - interval '18 months';
  get diagnostics v = row_count;

  return query select s, v;
end;
$$;

revoke execute on function public.purge_old_analytics() from public, anon, authenticated;

-- Planification mensuelle (1er du mois, 03:00 UTC). Enveloppée dans un bloc
-- tolérant : si pg_cron n'est pas activable sur le projet, la migration ne
-- doit pas échouer pour autant — la fonction reste appelable à la main, et
-- DEPLOY.md documente la solution de repli par cron sur le VPS.
do $$
begin
  create extension if not exists pg_cron;
  perform cron.unschedule('purge-old-analytics')
  where exists (select 1 from cron.job where jobname = 'purge-old-analytics');
  perform cron.schedule(
    'purge-old-analytics',
    '0 3 1 * *',
    'select public.purge_old_analytics()'
  );
  raise notice 'Purge analytics planifiée via pg_cron (mensuelle).';
exception when others then
  raise notice 'pg_cron indisponible (%) — planifier purge_old_analytics() autrement, voir DEPLOY.md.', sqlerrm;
end;
$$;
