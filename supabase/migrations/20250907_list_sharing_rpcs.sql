begin;

-- Add collaborator by email (owner only); upserts role
create or replace function public.add_list_collaborator_by_email(p_list_id uuid, p_email text, p_role text default 'editor')
returns public.list_collaborators
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_user uuid;
  v_role text := coalesce(p_role, 'editor');
  v_rec public.list_collaborators;
begin
  select user_id into v_owner from public.lists where id = p_list_id;
  if v_owner is null then
    raise exception 'List not found';
  end if;
  if v_owner <> auth.uid() then
    raise exception 'Only the list owner can modify collaborators';
  end if;

  select id into v_user from auth.users where lower(email) = lower(p_email) limit 1;
  if v_user is null then
    raise exception 'User with email % not found', p_email;
  end if;
  if v_user = v_owner then
    return null; -- owner is implicit
  end if;

  insert into public.list_collaborators(list_id, user_id, role)
  values (p_list_id, v_user, v_role)
  on conflict (list_id, user_id) do update set role = excluded.role
  returning * into v_rec;

  return v_rec;
end;
$$;

revoke all on function public.add_list_collaborator_by_email(uuid, text, text) from public;
grant execute on function public.add_list_collaborator_by_email(uuid, text, text) to authenticated;

-- Remove collaborator by email (owner only)
create or replace function public.remove_list_collaborator_by_email(p_list_id uuid, p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_user uuid;
begin
  select user_id into v_owner from public.lists where id = p_list_id;
  if v_owner is null then
    raise exception 'List not found';
  end if;
  if v_owner <> auth.uid() then
    raise exception 'Only the list owner can modify collaborators';
  end if;

  select id into v_user from auth.users where lower(email) = lower(p_email) limit 1;
  if v_user is null then
    return; -- nothing to do
  end if;

  delete from public.list_collaborators where list_id = p_list_id and user_id = v_user;
end;
$$;

revoke all on function public.remove_list_collaborator_by_email(uuid, text) from public;
grant execute on function public.remove_list_collaborator_by_email(uuid, text) to authenticated;

-- Set collaborator role by email (owner only)
create or replace function public.set_list_collaborator_role_by_email(p_list_id uuid, p_email text, p_role text)
returns public.list_collaborators
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_user uuid;
  v_rec public.list_collaborators;
begin
  if p_role not in ('viewer','editor') then
    raise exception 'Invalid role %', p_role;
  end if;
  select user_id into v_owner from public.lists where id = p_list_id;
  if v_owner is null then
    raise exception 'List not found';
  end if;
  if v_owner <> auth.uid() then
    raise exception 'Only the list owner can modify collaborators';
  end if;
  select id into v_user from auth.users where lower(email) = lower(p_email) limit 1;
  if v_user is null then
    raise exception 'User with email % not found', p_email;
  end if;

  update public.list_collaborators
    set role = p_role
    where list_id = p_list_id and user_id = v_user
  returning * into v_rec;

  return v_rec;
end;
$$;

revoke all on function public.set_list_collaborator_role_by_email(uuid, text, text) from public;
grant execute on function public.set_list_collaborator_role_by_email(uuid, text, text) to authenticated;

-- List collaborators with email (owner or collaborator can view)
create or replace function public.get_list_collaborators(p_list_id uuid)
returns table(user_id uuid, email text, role text, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_allowed boolean;
begin
  select exists (
    select 1 from public.lists l
    where l.id = p_list_id and (
      l.user_id = auth.uid() or exists (
        select 1 from public.list_collaborators lc
        where lc.list_id = l.id and lc.user_id = auth.uid()
      )
    )
  ) into v_allowed;
  if not v_allowed then
    raise exception 'Not authorized';
  end if;

  return query
    select lc.user_id, u.email, lc.role, lc.created_at
    from public.list_collaborators lc
    join auth.users u on u.id = lc.user_id
    where lc.list_id = p_list_id
    order by lc.created_at asc;
end;
$$;

revoke all on function public.get_list_collaborators(uuid) from public;
grant execute on function public.get_list_collaborators(uuid) to authenticated;

commit;

