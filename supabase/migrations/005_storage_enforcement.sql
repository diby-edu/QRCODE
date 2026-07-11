-- Fait passer le droit "vidéo hébergée" du plan d'un contrôle purement
-- côté UI (checkUpload, contournable en appelant l'API Storage directement
-- avec la clé anon) à une contrainte réellement appliquée par Postgres.

-- Corrige une faille de logique à trois valeurs de Postgres : quand
-- auth.uid() est NULL, `target <> auth.uid()` évalue à NULL (ni vrai ni
-- faux), donc le `if` ne se déclenchait jamais et l'exception n'était
-- jamais levée. `is distinct from` traite NULL comme une valeur normale et
-- ferme cette échappatoire — tout en laissant explicitement passer le
-- service_role (comme partout ailleurs dans l'app, qui bypasse la RLS via
-- createAdminClient), pour qui auth.uid() est NULL par construction.
create or replace function public.user_storage_bytes(p_user_id uuid default null)
returns bigint
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  target uuid := coalesce(p_user_id, auth.uid());
  total bigint;
begin
  if target is null then
    return 0;
  end if;
  if auth.role() is distinct from 'service_role'
     and target is distinct from auth.uid()
     and not public.is_admin() then
    raise exception 'forbidden';
  end if;

  select coalesce(sum((metadata ->> 'size')::bigint), 0)
  into total
  from storage.objects
  where bucket_id in ('logos', 'uploads', 'qr-previews')
    and (storage.foldername(name))[1] = target::text;

  return total;
end;
$$;

-- Limites du plan effectif d'un utilisateur (abonnement actif et non expiré,
-- sinon plan gratuit) — équivalent SQL de getUserPlan() dans src/lib/plans.ts,
-- utilisé par la policy RLS ci-dessous qui n'a pas accès au code TS.
create or replace function public.user_plan_limits(p_user_id uuid default null)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select pl.limits
      from public.subscriptions s
      join public.plans pl on pl.id = s.plan_id
      where s.user_id = coalesce(p_user_id, auth.uid())
        and s.status = 'active'
        and (s.current_period_end is null or s.current_period_end >= now())
      order by s.created_at desc
      limit 1
    ),
    (
      select limits from public.plans
      where is_active and price_monthly = 0
      order by sort_order
      limit 1
    ),
    '{}'::jsonb
  );
$$;

-- Policy RESTRICTIVE : combinée en ET avec les policies permissives
-- existantes (storage_user_insert) sans les remplacer — Postgres combine
-- toutes les policies permissives d'une même commande en OU, donc une
-- policy restrictive est la seule façon d'ajouter une condition
-- supplémentaire obligatoire sans reconstruire la policy d'origine.
--
-- Testée et confirmée fonctionnelle : le Content-Type déclaré (metadata->>
-- 'mimetype') est déjà connu au moment de l'INSERT dans storage.objects,
-- avant même que le corps du fichier soit entièrement reçu.
--
-- NB : le quota de STOCKAGE (taille totale) n'a délibérément PAS de policy
-- équivalente ici. Testé empiriquement (RESTRICTIVE sur INSERT, puis sur
-- UPDATE) : metadata->>'size' n'est fiable à lire qu'une fois le fichier
-- entièrement reçu, et cette étape ne semble pas passer par la RLS
-- standard côté Storage — une policy basée sur la taille ne bloque donc
-- rien en pratique. Le quota reste appliqué côté client (checkUpload dans
-- src/app/(app)/qr/actions.ts, appelé par tous les points d'upload de
-- l'app) : suffisant contre un usage normal via l'UI, pas contre un client
-- qui appellerait l'API Storage directement. Fermer complètement cette
-- faille demanderait de faire transiter les uploads par un serveur (route
-- API recevant le fichier puis le réécrivant vers Storage via
-- service_role, avec le quota vérifié sur la taille réelle reçue) — une
-- évolution plus large, hors du cadre de ce correctif.
drop policy if exists "storage_video_check" on storage.objects;
create policy "storage_video_check" on storage.objects
  as restrictive
  for insert to authenticated
  with check (
    bucket_id not in ('logos', 'uploads', 'qr-previews')
    or coalesce(metadata ->> 'mimetype', '') not ilike 'video/%'
    or coalesce((public.user_plan_limits(auth.uid()) ->> 'video_enabled')::boolean, false)
  );
