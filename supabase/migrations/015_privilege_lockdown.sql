-- Ferme deux failles d'escalade de privilèges trouvées à l'audit pré-lancement.
--
-- Rappel du modèle de sécurité Supabase : la base est exposée directement sur
-- Internet via PostgREST (<projet>.supabase.co/rest/v1/<table>), avec la clé
-- anon qui est publique par conception (elle est livrée dans le bundle JS).
-- Tout le code applicatif — Server Actions, requireAdmin(), vérifications de
-- plan — est donc contournable en appelant cette API directement. La RLS est
-- la SEULE barrière sur ce chemin : tout ce qu'elle autorise est réputé
-- autorisé, quoi que fasse l'application par ailleurs.

-- ------------------------------------------------------------------
-- 1. profiles : un utilisateur ne peut plus se promouvoir administrateur
-- ------------------------------------------------------------------
-- La policy profiles_update (001_schema.sql) n'a pas de WITH CHECK. Postgres
-- réutilise alors l'expression USING comme clause de vérification de la
-- nouvelle ligne : la seule condition imposée était `id = auth.uid()`, qui
-- reste vraie quand l'utilisateur modifie sa PROPRE ligne. La policy vérifiait
-- donc QUELLE ligne est modifiée, jamais QUELLES colonnes — et `role` en fait
-- partie. Un simple PATCH REST suffisait :
--
--   PATCH /rest/v1/profiles?id=eq.<son_uid>   {"role": "admin"}
--
-- Même chose pour is_suspended (un compte suspendu se réactivait seul) et pour
-- email (colonne utilisée comme clé de recherche par recordManualPayment et
-- resendConfirmation — un attaquant pouvait s'attribuer l'email d'un autre).
--
-- Correctif par trigger plutôt que par WITH CHECK : la vérification doit
-- comparer l'ancienne et la nouvelle valeur, ce qui imposerait en WITH CHECK
-- une sous-requête sur profiles depuis une policy de profiles — d'où l'erreur
-- « infinite recursion detected in policy for relation profiles ». Le trigger
-- a OLD et NEW directement, donc pas de récursion possible.
--
-- IMPORTANT — ce que ce correctif ne change PAS : l'administrateur garde tous
-- ses pouvoirs. setUserRole() et setUserSuspended() passent par le client
-- soumis à la RLS (rôle Postgres `authenticated`, comme n'importe quel
-- utilisateur) : c'est is_admin() qui les distingue ici, pas le rôle Postgres.
-- C'est aussi la raison pour laquelle on n'utilise PAS
-- `revoke update (role, ...) from authenticated` : cela casserait le panneau
-- admin, puisque l'admin emprunte exactement le même rôle Postgres.
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- service_role = createAdminClient() (activation d'abonnement, actions admin
  -- serveur). is_admin() = un administrateur authentifié via l'application.
  if auth.role() = 'service_role' or public.is_admin() then
    return new;
  end if;

  -- Utilisateur ordinaire : il garde full_name, avatar_url et language (tout
  -- ce dont updateProfile() et changeLanguage() ont besoin), mais les colonnes
  -- de privilège sont restaurées silencieusement. Silencieusement, et non par
  -- `raise exception` : une mise à jour de profil légitime ne doit jamais
  -- échouer, et un rejet explicite renseignerait l'attaquant.
  new.role := old.role;
  new.is_suspended := old.is_suspended;
  new.email := old.email;
  return new;
end;
$$;

drop trigger if exists profiles_protect_columns on public.profiles;
create trigger profiles_protect_columns
  before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- ------------------------------------------------------------------
-- 2. site_settings : plus de lecture publique
-- ------------------------------------------------------------------
-- La policy d'origine était `for select using (true)` — lecture par n'importe
-- qui sur Internet avec la seule clé anon (vérifié : HTTP 200). Or
-- savePaydunyaConfig() écrit dans cette table les clés marchandes PayDunya
-- (masterKey, privateKey, token) dès qu'elles sont saisies dans
-- /admin/settings. Ces clés permettent d'émettre des factures au nom du
-- marchand, et le hash d'authenticité des notifications IPN est
-- SHA-512(masterKey) : leur fuite rend les IPN forgeables.
--
-- Aucune page publique ne lit cette table : /admin/settings la lit en tant
-- qu'admin, et getPaydunyaConfig() / api/health passent par service_role
-- (qui ignore la RLS). La lecture peut donc être réservée à l'admin sans
-- rien casser.
drop policy if exists "site_settings_select" on public.site_settings;
create policy "site_settings_select" on public.site_settings
  for select using (public.is_admin());
