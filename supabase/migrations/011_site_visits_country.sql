-- Ajoute la répartition par pays au trafic du site (la colonne existait
-- déjà dans site_visits depuis la migration 009, non peuplée jusqu'ici ;
-- track-visit.ts la peuple désormais via un cache IP->pays borné dans le
-- temps, pour rester dans le quota gratuit de l'API de géolocalisation
-- même à un volume de trafic plus élevé que les scans de QR).
create or replace function public.site_visits_breakdowns(
  p_days int default 30,
  p_limit int default 8
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with visits as (
    select path, referrer_host, device, country
    from public.site_visits
    where visited_at >= current_date - (p_days - 1)
      and public.is_admin()
  ),
  agg as (
    select
      (select count(*) from visits) as total,
      (select coalesce(jsonb_agg(jsonb_build_object('label', label, 'count', c) order by c desc), '[]'::jsonb)
       from (select path as label, count(*) as c from visits group by 1 order by 2 desc limit p_limit) x) as paths,
      (select coalesce(jsonb_agg(jsonb_build_object('label', label, 'count', c) order by c desc), '[]'::jsonb)
       from (select referrer_host as label, count(*) as c from visits where referrer_host is not null group by 1 order by 2 desc limit p_limit) x) as referrers,
      (select coalesce(jsonb_agg(jsonb_build_object('label', label, 'count', c) order by c desc), '[]'::jsonb)
       from (select device as label, count(*) as c from visits where device is not null group by 1 order by 2 desc limit p_limit) x) as devices,
      (select coalesce(jsonb_agg(jsonb_build_object('label', label, 'count', c) order by c desc), '[]'::jsonb)
       from (select country as label, count(*) as c from visits where country is not null group by 1 order by 2 desc limit p_limit) x) as countries
  )
  select jsonb_build_object(
    'total', total,
    'paths', paths,
    'referrers', referrers,
    'devices', devices,
    'countries', countries
  )
  from agg;
$$;
