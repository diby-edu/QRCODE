-- Agrégats de scans pour le dashboard et les pages de statistiques.
-- SECURITY INVOKER (défaut) : la RLS de qr_scans s'applique — le
-- propriétaire ne voit que les scans de ses QR, l'admin voit tout.
-- Évite de rapatrier les lignes brutes (plafond PostgREST à 1000).

-- Scans par jour sur les N derniers jours (jours vides inclus, à 0).
-- p_qr_code_id null = tous les QR visibles par l'appelant.
create or replace function public.scans_per_day(
  p_days int default 30,
  p_qr_code_id uuid default null
)
returns table(day date, scans bigint)
language sql
stable
set search_path = public
as $$
  select d.day::date, count(s.id)
  from generate_series(
    current_date - (p_days - 1),
    current_date,
    interval '1 day'
  ) as d(day)
  left join public.qr_scans s
    on s.scanned_at >= d.day
   and s.scanned_at < d.day + interval '1 day'
   and (p_qr_code_id is null or s.qr_code_id = p_qr_code_id)
  group by d.day
  order by d.day;
$$;

-- Répartitions (pays, villes, appareils, navigateurs, OS) sur N jours.
create or replace function public.scan_breakdowns(
  p_days int default 30,
  p_qr_code_id uuid default null,
  p_limit int default 8
)
returns jsonb
language sql
stable
set search_path = public
as $$
  with scans as (
    select country, city, device, browser, operating_system
    from public.qr_scans
    where scanned_at >= current_date - (p_days - 1)
      and (p_qr_code_id is null or qr_code_id = p_qr_code_id)
  ),
  agg as (
    select
      (select count(*) from scans) as total,
      (select coalesce(jsonb_agg(jsonb_build_object('label', label, 'count', c) order by c desc), '[]'::jsonb)
       from (select country as label, count(*) as c from scans where country is not null group by 1 order by 2 desc limit p_limit) x) as countries,
      (select coalesce(jsonb_agg(jsonb_build_object('label', label, 'count', c) order by c desc), '[]'::jsonb)
       from (select city as label, count(*) as c from scans where city is not null group by 1 order by 2 desc limit p_limit) x) as cities,
      (select coalesce(jsonb_agg(jsonb_build_object('label', label, 'count', c) order by c desc), '[]'::jsonb)
       from (select device as label, count(*) as c from scans where device is not null group by 1 order by 2 desc limit p_limit) x) as devices,
      (select coalesce(jsonb_agg(jsonb_build_object('label', label, 'count', c) order by c desc), '[]'::jsonb)
       from (select browser as label, count(*) as c from scans where browser is not null group by 1 order by 2 desc limit p_limit) x) as browsers,
      (select coalesce(jsonb_agg(jsonb_build_object('label', label, 'count', c) order by c desc), '[]'::jsonb)
       from (select operating_system as label, count(*) as c from scans where operating_system is not null group by 1 order by 2 desc limit p_limit) x) as os
  )
  select jsonb_build_object(
    'total', total,
    'countries', countries,
    'cities', cities,
    'devices', devices,
    'browsers', browsers,
    'os', os
  )
  from agg;
$$;

-- Total des scans (tous QR visibles par l'appelant — RLS appliquée).
create or replace function public.total_scan_count()
returns bigint
language sql
stable
set search_path = public
as $$
  select coalesce(sum(scan_count), 0)::bigint from public.qr_codes;
$$;

-- Index pour les fenêtres temporelles (le tri par QR existe déjà via la FK).
create index if not exists qr_scans_scanned_at_idx
  on public.qr_scans (scanned_at desc);
