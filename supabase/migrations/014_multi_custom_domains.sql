-- Passe le domaine personnalisé de "un par utilisateur" à "plusieurs par
-- utilisateur, choisi QR par QR". Le schéma custom_domains n'a jamais eu
-- de contrainte d'unicité sur user_id (seul domain est unique) — la
-- limitation était purement applicative (active_custom_domain_for_user
-- prenait LIMIT 1, /domain n'affichait que le plus récent).

alter table public.qr_codes
  add column if not exists custom_domain_id uuid references public.custom_domains(id) on delete set null;

-- Le propriétaire peut désormais modifier (repasse en "pending", re-
-- validation admin requise — un nom de domaine différent = un nouveau
-- bloc nginx/certificat à provisionner) ou supprimer ses propres demandes.
-- Jusqu'ici seul un admin le pouvait (custom_domains_admin_write/delete).
drop policy if exists "custom_domains_owner_update" on public.custom_domains;
create policy "custom_domains_owner_update" on public.custom_domains
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid() and status = 'pending');

drop policy if exists "custom_domains_owner_delete" on public.custom_domains;
create policy "custom_domains_owner_delete" on public.custom_domains
  for delete using (user_id = auth.uid());
