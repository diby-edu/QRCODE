-- Quota de stockage par plan : consommation réelle mesurée dans
-- storage.objects (metadata->>'size'), tous buckets utilisateur confondus.

-- SECURITY DEFINER : storage.objects n'est pas exposé à l'API publique.
-- Garde-fou : un utilisateur ne lit que sa propre consommation, l'admin tout.
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
  if target <> auth.uid() and not public.is_admin() then
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

-- Backfill des plans existants : quota + droit vidéo selon gratuit/payant.
-- (Valeurs modifiables ensuite dans /admin/plans.)
update public.plans
set limits = limits || jsonb_build_object(
  'max_storage_mb', case when price_monthly = 0 then 20 else 500 end,
  'video_enabled', price_monthly > 0
)
where not (limits ? 'max_storage_mb');
