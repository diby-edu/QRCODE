-- Rend cohérent l'état des abonnements échus.
--
-- Constat à l'origine : le panneau admin affichait « Business » pour un
-- abonnement dont la période s'était terminée six jours plus tôt, pendant que
-- l'application appliquait déjà les limites du plan Free. Deux chemins de code
-- ne s'accordaient pas sur le sens du mot « actif » :
--
--   user_plan_limits()  exige status='active' ET une période non échue
--   admin_list_users()  se contentait de status='active'
--
-- La cause profonde est plus simple : le statut 'expired' existe dans le type
-- TypeScript et dans la contrainte CHECK de la table, mais RIEN dans le code
-- ne l'attribuait jamais. Les abonnements échus restaient donc 'active'
-- indéfiniment (2 lignes dans ce cas au moment d'écrire cette migration).

-- ============================================================
-- 1. Faire basculer les abonnements échus (la cause)
-- ============================================================
create or replace function public.expire_due_subscriptions()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  update public.subscriptions
  set status = 'expired'
  where status = 'active'
    and current_period_end is not null
    and current_period_end < now();
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke execute on function public.expire_due_subscriptions() from public, anon, authenticated;

-- Rattrapage de l'existant, maintenant.
select public.expire_due_subscriptions();

-- Exécution quotidienne à 02:00 UTC — avant la purge analytics de 03:00 le
-- 1er du mois (voir 016). Bloc tolérant : si pg_cron n'est pas activable, la
-- migration ne doit pas échouer pour autant, la fonction restant appelable
-- à la main.
do $$
begin
  create extension if not exists pg_cron;
  perform cron.unschedule('expire-subscriptions')
  where exists (select 1 from cron.job where jobname = 'expire-subscriptions');
  perform cron.schedule(
    'expire-subscriptions',
    '0 2 * * *',
    'select public.expire_due_subscriptions()'
  );
  raise notice 'Expiration des abonnements planifiée (quotidienne, 02:00 UTC).';
exception when others then
  raise notice 'pg_cron indisponible (%) — appeler expire_due_subscriptions() autrement.', sqlerrm;
end;
$$;

-- ============================================================
-- 2. Aligner l'affichage admin (le symptôme)
-- ============================================================
-- Deux corrections, pas une seule.
--
-- 1. Condition sur la période, comme dans user_plan_limits() : même si la
--    tâche ci-dessus tourne chaque nuit, un abonnement peut expirer dans la
--    journée.
--
-- 2. Repli sur le plan gratuit. C'est le piège de cette correction : se
--    contenter d'ajouter la condition ferait afficher « aucun plan » pour un
--    abonnement échu, alors que user_plan_limits() applique le plan gratuit
--    par coalesce. L'admin lirait « — » pendant que le client dispose bel et
--    bien des limites Free. On passerait d'un mensonge à un autre.
--
-- Cette fonction renvoie donc désormais le plan EFFECTIF, celui que
-- l'application applique réellement — les deux sources s'accordent enfin.
create or replace function public.admin_list_users(
  p_search text default null,
  p_limit int default 100,
  p_offset int default 0
)
returns table (
  id uuid,
  email text,
  full_name text,
  role text,
  is_suspended boolean,
  created_at timestamptz,
  plan_id uuid,
  plan_name text,
  qr_count bigint,
  storage_mb numeric
)
language sql
stable
set search_path = public
as $$
  select
    p.id, p.email, p.full_name, p.role, p.is_suspended, p.created_at,
    coalesce(sub.plan_id, free.plan_id),
    coalesce(sub.plan_name, free.plan_name),
    (select count(*) from public.qr_codes q where q.user_id = p.id),
    round((public.user_storage_bytes(p.id) / 1024.0 / 1024.0)::numeric, 1)
  from public.profiles p
  -- Abonnement payant réellement en cours (mêmes critères que user_plan_limits)
  left join lateral (
    select pl.id as plan_id, pl.name as plan_name
    from public.subscriptions s
    join public.plans pl on pl.id = s.plan_id
    where s.user_id = p.id
      and s.status = 'active'
      and (s.current_period_end is null or s.current_period_end >= now())
    order by s.created_at desc
    limit 1
  ) sub on true
  -- Repli : le plan gratuit, celui que l'application applique à défaut
  left join lateral (
    select pl.id as plan_id, pl.name as plan_name
    from public.plans pl
    where pl.is_active and pl.price_monthly = 0
    order by pl.sort_order
    limit 1
  ) free on true
  where p_search is null
     or p.email ilike '%' || p_search || '%'
     or p.full_name ilike '%' || p_search || '%'
  order by p.created_at desc
  limit p_limit offset p_offset;
$$;
