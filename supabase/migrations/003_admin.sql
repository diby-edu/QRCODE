-- Support du dashboard admin : email dans profiles, agrégats revenus,
-- listing utilisateurs avec plan et nombre de QR.

-- Email copié depuis auth.users (l'admin doit pouvoir chercher par email
-- sans accéder au schéma auth depuis le client).
alter table public.profiles add column if not exists email text;

update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id and p.email is null;

-- Le trigger d'inscription copie désormais aussi l'email
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  free_plan_id uuid;
begin
  insert into public.profiles (id, full_name, language, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'language', 'fr'),
    new.email
  );

  select id into free_plan_id
  from public.plans
  where price_monthly = 0 and is_active
  order by sort_order
  limit 1;

  if free_plan_id is not null then
    insert into public.subscriptions (user_id, plan_id, status)
    values (new.id, free_plan_id, 'active');
  end if;

  return new;
end;
$$;

-- Revenus encaissés (SECURITY INVOKER : RLS payments — l'admin voit tout,
-- un utilisateur normal n'obtiendrait que ses propres paiements).
create or replace function public.total_revenue()
returns numeric
language sql
stable
set search_path = public
as $$
  select coalesce(sum(amount), 0) from public.payments where status = 'completed';
$$;

-- Listing utilisateurs pour /admin/users (SECURITY INVOKER : la RLS de
-- profiles ne renvoie tout que si l'appelant est admin).
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
  qr_count bigint
)
language sql
stable
set search_path = public
as $$
  select
    p.id, p.email, p.full_name, p.role, p.is_suspended, p.created_at,
    pl.id, pl.name,
    (select count(*) from public.qr_codes q where q.user_id = p.id)
  from public.profiles p
  left join public.subscriptions s on s.user_id = p.id and s.status = 'active'
  left join public.plans pl on pl.id = s.plan_id
  where p_search is null
     or p.email ilike '%' || p_search || '%'
     or p.full_name ilike '%' || p_search || '%'
  order by p.created_at desc
  limit p_limit offset p_offset;
$$;
