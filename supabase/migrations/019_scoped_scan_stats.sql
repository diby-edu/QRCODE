-- Les statistiques de scans doivent pouvoir être cadrées sur un propriétaire.
--
-- Constat : sur son propre tableau de bord, un administrateur lisait
-- « Scans totaux : 67 » alors que ses deux QR n'en cumulent que 15. Ces trois
-- fonctions sont en SECURITY INVOKER et s'appuient sur la RLS pour se cadrer.
-- Or la policy qr_scans_select dit « is_admin() OR propriétaire » : pour un
-- admin, elles renvoient donc la plateforme entière.
--
-- La même fonction sert l'espace personnel ET /admin, sans rien pour les
-- distinguer — c'est cette ambiguïté qu'on lève ici, avec un paramètre
-- explicite. Les pages personnelles passeront l'identifiant de l'utilisateur,
-- les pages admin passeront null pour obtenir les chiffres de la plateforme.
--
-- Ce paramètre ne remplace pas la sécurité : les fonctions restent SECURITY
-- INVOKER, donc la RLS continue de s'appliquer par-dessus. Passer
-- l'identifiant d'un tiers ne révèle rien de plus qu'avant.
--
-- DROP nécessaire : ajouter un paramètre crée une surcharge plutôt que de
-- remplacer la fonction, ce qui rendrait les appels existants ambigus.

-- ------------------------------------------------------------ total_scan_count
drop function if exists public.total_scan_count();
create function public.total_scan_count(p_user_id uuid default null)
returns bigint
language sql
stable
set search_path = public
as $$
  select coalesce(sum(q.scan_count), 0)::bigint
  from public.qr_codes q
  where p_user_id is null or q.user_id = p_user_id;
$$;

-- ------------------------------------------------------------- scans_per_day
drop function if exists public.scans_per_day(int, uuid);
create function public.scans_per_day(
  p_days int default 30,
  p_qr_code_id uuid default null,
  p_user_id uuid default null
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
   and (
     p_user_id is null
     or exists (
       select 1 from public.qr_codes q
       where q.id = s.qr_code_id and q.user_id = p_user_id
     )
   )
  group by d.day
  order by d.day;
$$;

-- ---------------------------------------------------------- scan_breakdowns
drop function if exists public.scan_breakdowns(int, uuid, int);
create function public.scan_breakdowns(
  p_days int default 30,
  p_qr_code_id uuid default null,
  p_limit int default 8,
  p_user_id uuid default null
)
returns jsonb
language sql
stable
set search_path = public
as $$
  with scans as (
    select s.country, s.city, s.device, s.browser, s.operating_system
    from public.qr_scans s
    where s.scanned_at >= current_date - (p_days - 1)
      and (p_qr_code_id is null or s.qr_code_id = p_qr_code_id)
      and (
        p_user_id is null
        or exists (
          select 1 from public.qr_codes q
          where q.id = s.qr_code_id and q.user_id = p_user_id
        )
      )
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
