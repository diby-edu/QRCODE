-- Performances : évaluation des policies RLS, index manquants, index en double.
-- Aucune règle de sécurité n'est modifiée — les conditions sont rigoureusement
-- identiques, seule leur FORME change. À vérifier après application : la liste
-- des policies doit rester à 25, avec les mêmes commandes et les mêmes rôles.

-- ============================================================
-- 1. RLS : une évaluation par requête au lieu d'une par ligne
-- ============================================================
-- `auth.uid()` et `is_admin()` écrits nus dans une policy sont appelés une
-- fois PAR LIGNE examinée : Postgres ne peut pas les sortir de la boucle.
-- Encapsulés dans un sous-select, ils deviennent un InitPlan évalué une seule
-- fois par requête, dont le résultat est réutilisé pour toutes les lignes.
-- C'est la recommandation officielle de Supabase, et le gain est d'un ordre
-- de grandeur sur les grandes tables.
--
-- Mesure avant correctif sur la base de production : 11 621 balayages
-- séquentiels de `profiles` (5 lignes) — le coût cumulé de `is_admin()`
-- déclenché par chaque évaluation de policy sur chaque table.
--
-- `plans_select` (using true) n'appelle aucune fonction : inchangée.

-- ---------------------------------------------------------------- profiles
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select using (id = (select auth.uid()) or (select public.is_admin()));

-- Le WITH CHECK reste absent : les colonnes de privilège sont protégées par
-- le trigger protect_profile_columns (voir 015_privilege_lockdown.sql).
drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles
  for update using (id = (select auth.uid()) or (select public.is_admin()));

-- ------------------------------------------------------------ subscriptions
drop policy if exists "subscriptions_select" on public.subscriptions;
create policy "subscriptions_select" on public.subscriptions
  for select using (user_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "subscriptions_admin_write" on public.subscriptions;
create policy "subscriptions_admin_write" on public.subscriptions
  for all using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------------------------------------------------------------- payments
drop policy if exists "payments_select" on public.payments;
create policy "payments_select" on public.payments
  for select using (user_id = (select auth.uid()) or (select public.is_admin()));

-- ------------------------------------------------------------------- plans
drop policy if exists "plans_admin_write" on public.plans;
create policy "plans_admin_write" on public.plans
  for all using ((select public.is_admin())) with check ((select public.is_admin()));

-- ----------------------------------------------------------------- folders
drop policy if exists "folders_all" on public.folders;
create policy "folders_all" on public.folders
  for all using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------- qr_codes
drop policy if exists "qr_codes_owner" on public.qr_codes;
create policy "qr_codes_owner" on public.qr_codes
  for all using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "qr_codes_admin_select" on public.qr_codes;
create policy "qr_codes_admin_select" on public.qr_codes
  for select using ((select public.is_admin()));

drop policy if exists "qr_codes_admin_delete" on public.qr_codes;
create policy "qr_codes_admin_delete" on public.qr_codes
  for delete using ((select public.is_admin()));

-- ------------------------------------------------------------ qr_code_data
drop policy if exists "qr_code_data_owner" on public.qr_code_data;
create policy "qr_code_data_owner" on public.qr_code_data
  for all using (
    exists (
      select 1 from public.qr_codes qc
      where qc.id = qr_code_id and qc.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.qr_codes qc
      where qc.id = qr_code_id and qc.user_id = (select auth.uid())
    )
  );

drop policy if exists "qr_code_data_admin_select" on public.qr_code_data;
create policy "qr_code_data_admin_select" on public.qr_code_data
  for select using ((select public.is_admin()));

-- ---------------------------------------------------------------- qr_scans
-- La table qui bénéficie le plus du correctif : c'est elle qui grossit.
drop policy if exists "qr_scans_select" on public.qr_scans;
create policy "qr_scans_select" on public.qr_scans
  for select using (
    (select public.is_admin()) or exists (
      select 1 from public.qr_codes qc
      where qc.id = qr_code_id and qc.user_id = (select auth.uid())
    )
  );

-- ----------------------------------------------------------- site_settings
drop policy if exists "site_settings_select" on public.site_settings;
create policy "site_settings_select" on public.site_settings
  for select using ((select public.is_admin()));

drop policy if exists "site_settings_admin_write" on public.site_settings;
create policy "site_settings_admin_write" on public.site_settings
  for all using ((select public.is_admin())) with check ((select public.is_admin()));

-- ------------------------------------------------------------- site_visits
drop policy if exists "site_visits_select" on public.site_visits;
create policy "site_visits_select" on public.site_visits
  for select using ((select public.is_admin()));

-- ------------------------------------------------------ admin_activity_log
drop policy if exists "admin_activity_log_select" on public.admin_activity_log;
create policy "admin_activity_log_select" on public.admin_activity_log
  for select using ((select public.is_admin()));

drop policy if exists "admin_activity_log_insert" on public.admin_activity_log;
create policy "admin_activity_log_insert" on public.admin_activity_log
  for insert to authenticated with check ((select public.is_admin()));

-- ---------------------------------------------------------- custom_domains
drop policy if exists "custom_domains_owner_select" on public.custom_domains;
create policy "custom_domains_owner_select" on public.custom_domains
  for select using (user_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "custom_domains_owner_insert" on public.custom_domains;
create policy "custom_domains_owner_insert" on public.custom_domains
  for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'pending');

drop policy if exists "custom_domains_owner_update" on public.custom_domains;
create policy "custom_domains_owner_update" on public.custom_domains
  for update using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and status = 'pending');

drop policy if exists "custom_domains_owner_delete" on public.custom_domains;
create policy "custom_domains_owner_delete" on public.custom_domains
  for delete using (user_id = (select auth.uid()));

drop policy if exists "custom_domains_admin_write" on public.custom_domains;
create policy "custom_domains_admin_write" on public.custom_domains
  for update using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "custom_domains_admin_delete" on public.custom_domains;
create policy "custom_domains_admin_delete" on public.custom_domains
  for delete using ((select public.is_admin()));

-- ============================================================
-- 2. Index manquants sur les clés étrangères
-- ============================================================
-- Une clé étrangère sans index coûte deux fois : les suppressions en cascade
-- (ON DELETE SET NULL / CASCADE) balaient la table enfant en entier, et les
-- filtres applicatifs sur ces colonnes font de même.
--
-- Le cas le plus visible : filtrer ses QR par dossier est une fonctionnalité
-- utilisateur, servie jusqu'ici par un balayage complet de qr_codes.
create index if not exists qr_codes_folder_id_idx
  on public.qr_codes (folder_id) where folder_id is not null;
create index if not exists qr_codes_custom_domain_id_idx
  on public.qr_codes (custom_domain_id) where custom_domain_id is not null;
create index if not exists subscriptions_plan_id_idx
  on public.subscriptions (plan_id);
create index if not exists payments_subscription_id_idx
  on public.payments (subscription_id) where subscription_id is not null;
create index if not exists admin_activity_log_admin_id_idx
  on public.admin_activity_log (admin_id) where admin_id is not null;
create index if not exists custom_domains_activated_by_idx
  on public.custom_domains (activated_by) where activated_by is not null;

-- ============================================================
-- 3. Index en double sur qr_codes.slug
-- ============================================================
-- `slug text not null unique` (001_schema.sql) crée déjà l'index
-- qr_codes_slug_key. L'index explicite qr_codes_slug_idx ajouté juste après
-- fait exactement la même chose : chaque création ou modification de QR paie
-- deux mises à jour d'index au lieu d'une, sur le chemin le plus chaud de
-- l'application.
--
-- C'est bien le doublon qu'on retire : la contrainte d'unicité ne peut pas
-- être supprimée, et son index prendra le relais des recherches par slug.
drop index if exists public.qr_codes_slug_idx;
