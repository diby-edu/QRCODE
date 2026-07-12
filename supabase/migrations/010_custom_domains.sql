-- Domaine personnalisé sur les QR dynamiques, mode assisté par l'admin
-- (pas de self-service). Le client demande un domaine qu'il possède déjà ;
-- l'admin exécute scripts/add-custom-domain.sh sur le VPS (nginx + certbot)
-- puis bascule la ligne en "active" ici — deux étapes volontairement
-- séparées (le script n'a pas besoin des credentials Supabase).
create table if not exists public.custom_domains (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  domain text not null unique,
  status text not null default 'pending' check (status in ('pending', 'active', 'failed')),
  verified_at timestamptz,
  activated_by uuid references auth.users(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists custom_domains_user_id_idx on public.custom_domains (user_id);

alter table public.custom_domains enable row level security;

-- Le propriétaire lit ses propres demandes et peut en créer (statut
-- "pending" uniquement — le contrôle de custom_domain_enabled reste
-- applicatif, comme folders_enabled/password_enabled aujourd'hui).
drop policy if exists "custom_domains_owner_select" on public.custom_domains;
create policy "custom_domains_owner_select" on public.custom_domains
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "custom_domains_owner_insert" on public.custom_domains;
create policy "custom_domains_owner_insert" on public.custom_domains
  for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending');

drop policy if exists "custom_domains_admin_write" on public.custom_domains;
create policy "custom_domains_admin_write" on public.custom_domains
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "custom_domains_admin_delete" on public.custom_domains;
create policy "custom_domains_admin_delete" on public.custom_domains
  for delete using (public.is_admin());

-- Domaine actif d'un utilisateur (ou null) — utilisé par proxy.ts et par
-- toute page qui construit une URL courte, pour éviter de dupliquer la
-- requête. SECURITY DEFINER : lisible par tous (le domaine actif d'un QR
-- doit être résolvable par un visiteur anonyme sur ce domaine), mais ne
-- renvoie qu'un simple hostname, aucune donnée sensible.
create or replace function public.active_custom_domain_for_user(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select domain from public.custom_domains
  where user_id = p_user_id and status = 'active'
  limit 1;
$$;
