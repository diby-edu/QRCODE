-- Import CSV en masse — MVP limité au type "website" (url), le seul assez
-- simple pour une correspondance directe colonne CSV -> champ. SECURITY
-- INVOKER : RLS suffit (mêmes policies qr_codes_owner/qr_code_data_owner
-- que createQrCode() côté app), pas besoin d'élever les privilèges.
--
-- Vérifie le quota AVANT tout insert (fonction Postgres = transaction
-- implicite) : soit tout le lot passe, soit rien n'est inséré en cas de
-- dépassement — pas d'import partiel qui laisserait l'utilisateur au-delà
-- de son quota. Les lignes individuellement malformées (titre/URL vides)
-- sont simplement ignorées et rapportées, indépendamment du quota.
create or replace function public.import_qr_codes_website(p_rows jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_limits jsonb;
  v_max_qr int;
  v_max_dynamic int;
  v_existing_count int;
  v_existing_dynamic int;
  v_new_count int;
  v_new_dynamic int;
  v_row jsonb;
  v_title text;
  v_url text;
  v_folder_name text;
  v_is_dynamic boolean;
  v_folder_id uuid;
  v_slug text;
  v_qr_id uuid;
  v_imported int := 0;
  v_skipped jsonb := '[]'::jsonb;
  v_index int := 0;
begin
  if v_user_id is null then
    raise exception 'unauthorized';
  end if;

  v_limits := public.user_plan_limits(v_user_id);
  v_max_qr := coalesce((v_limits->>'max_qr_codes')::int, 5);
  v_max_dynamic := coalesce((v_limits->>'max_dynamic')::int, 3);

  select count(*) into v_existing_count from public.qr_codes where user_id = v_user_id;
  select count(*) into v_existing_dynamic
    from public.qr_codes where user_id = v_user_id and is_dynamic;

  select
    count(*),
    count(*) filter (where coalesce((r->>'is_dynamic')::boolean, true))
  into v_new_count, v_new_dynamic
  from jsonb_array_elements(p_rows) as r
  where coalesce(trim(r->>'title'), '') <> '' and coalesce(trim(r->>'url'), '') <> '';

  if v_max_qr >= 0 and v_existing_count + v_new_count > v_max_qr then
    raise exception 'qrLimit:%', v_max_qr;
  end if;
  if v_max_dynamic >= 0 and v_existing_dynamic + v_new_dynamic > v_max_dynamic then
    raise exception 'dynamicLimit:%', v_max_dynamic;
  end if;

  for v_row in select * from jsonb_array_elements(p_rows)
  loop
    v_index := v_index + 1;
    v_title := trim(coalesce(v_row->>'title', ''));
    v_url := trim(coalesce(v_row->>'url', ''));
    if v_title = '' or v_url = '' then
      v_skipped := v_skipped || jsonb_build_object('row', v_index, 'reason', 'missing_fields');
      continue;
    end if;

    v_is_dynamic := coalesce((v_row->>'is_dynamic')::boolean, true);
    v_folder_name := nullif(trim(coalesce(v_row->>'folder', '')), '');
    v_folder_id := null;
    if v_folder_name is not null and coalesce((v_limits->>'folders_enabled')::boolean, false) then
      select id into v_folder_id from public.folders
      where user_id = v_user_id and lower(name) = lower(v_folder_name)
      limit 1;
    end if;

    v_slug := substr(md5(gen_random_uuid()::text), 1, 8);

    insert into public.qr_codes (user_id, folder_id, type, title, slug, is_dynamic, is_active, design)
    values (
      v_user_id, v_folder_id, 'website', v_title, v_slug, v_is_dynamic, true,
      '{"fgColor":"#0f172a","bgColor":"#ffffff","dotStyle":"square","cornerStyle":"square","logoUrl":null}'::jsonb
    )
    returning id into v_qr_id;

    insert into public.qr_code_data (qr_code_id, data)
    values (v_qr_id, jsonb_build_object('url', v_url));

    v_imported := v_imported + 1;
  end loop;

  return jsonb_build_object('imported', v_imported, 'skipped', v_skipped);
end;
$$;
