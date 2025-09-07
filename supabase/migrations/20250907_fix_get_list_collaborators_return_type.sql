-- Fix get_list_collaborators to return text for email/role as declared

begin;

create or replace function public.get_list_collaborators(p_list_id uuid)
returns table(user_id uuid, email text, role text, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_allowed boolean;
begin
  select (
    public.is_list_owner(p_list_id, auth.uid())
    or public.is_list_member(p_list_id, auth.uid())
  ) into v_allowed;

  if not v_allowed then
    raise exception 'Not authorized';
  end if;

  return query
    select lc.user_id, (u.email)::text as email, (lc.role)::text as role, lc.created_at
    from public.list_collaborators lc
    join auth.users u on u.id = lc.user_id
    where lc.list_id = p_list_id
    order by lc.created_at asc;
end;
$$;

revoke all on function public.get_list_collaborators(uuid) from public;
grant execute on function public.get_list_collaborators(uuid) to authenticated;

commit;

