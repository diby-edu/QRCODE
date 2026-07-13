-- Enrichit le trafic du site : ville, système, navigateur (même niveau de
-- détail que les scans de QR), et un hash anonyme par visiteur pour compter
-- les visiteurs uniques SANS jamais stocker l'IP elle-même (cohérent avec
-- le choix de conception de la migration 009 — table déjà 100% anonyme).
alter table public.site_visits add column if not exists city text;
alter table public.site_visits add column if not exists os text;
alter table public.site_visits add column if not exists browser text;
alter table public.site_visits add column if not exists visitor_hash text;

create index if not exists site_visits_visitor_hash_idx
  on public.site_visits (visitor_hash);

-- Répartitions complètes (pages, référents, appareils, pays, villes, OS,
-- navigateurs) — remplace la version de la migration 011.
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
    select path, referrer_host, device, country, city, os, browser
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
       from (select country as label, count(*) as c from visits where country is not null group by 1 order by 2 desc limit p_limit) x) as countries,
      (select coalesce(jsonb_agg(jsonb_build_object('label', label, 'count', c) order by c desc), '[]'::jsonb)
       from (select city as label, count(*) as c from visits where city is not null group by 1 order by 2 desc limit p_limit) x) as cities,
      (select coalesce(jsonb_agg(jsonb_build_object('label', label, 'count', c) order by c desc), '[]'::jsonb)
       from (select os as label, count(*) as c from visits where os is not null group by 1 order by 2 desc limit p_limit) x) as os_list,
      (select coalesce(jsonb_agg(jsonb_build_object('label', label, 'count', c) order by c desc), '[]'::jsonb)
       from (select browser as label, count(*) as c from visits where browser is not null group by 1 order by 2 desc limit p_limit) x) as browsers
  )
  select jsonb_build_object(
    'total', total,
    'paths', paths,
    'referrers', referrers,
    'devices', devices,
    'countries', countries,
    'cities', cities,
    'os', os_list,
    'browsers', browsers
  )
  from agg;
$$;

-- Visiteurs uniques (par hash anonyme, pas par IP) et total de visites sur
-- la période — les deux vrais KPI qui manquaient au module.
create or replace function public.site_visits_summary(p_days int default 30)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'totalVisits', (
      select count(*) from public.site_visits
      where visited_at >= current_date - (p_days - 1) and public.is_admin()
    ),
    'uniqueVisitors', (
      select count(distinct visitor_hash) from public.site_visits
      where visited_at >= current_date - (p_days - 1)
        and visitor_hash is not null
        and public.is_admin()
    ),
    'totalVisitsAllTime', (
      select count(*) from public.site_visits where public.is_admin()
    )
  );
$$;
