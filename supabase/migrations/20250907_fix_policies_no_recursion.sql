-- Refactor RLS policies to avoid recursive references between lists and list_collaborators
-- Adds helper functions and recreates policies using them

begin;

-- Ensure RLS enabled (no-op if already enabled)
alter table if exists public.list_collaborators enable row level security;
alter table if exists public.lists enable row level security;
alter table if exists public.items enable row level security;

-- Helper functions (security definer) to check ownership/membership without triggering RLS recursion
create or replace function public.is_list_owner(p_list_id uuid, p_uid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.lists l
    where l.id = p_list_id and l.user_id = p_uid
  );
$$;

revoke all on function public.is_list_owner(uuid, uuid) from public;
grant execute on function public.is_list_owner(uuid, uuid) to authenticated;

create or replace function public.is_list_member(p_list_id uuid, p_uid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.list_collaborators lc
    where lc.list_id = p_list_id and lc.user_id = p_uid
  );
$$;

revoke all on function public.is_list_member(uuid, uuid) from public;
grant execute on function public.is_list_member(uuid, uuid) to authenticated;

create or replace function public.is_list_editor(p_list_id uuid, p_uid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.list_collaborators lc
    where lc.list_id = p_list_id and lc.user_id = p_uid and lc.role = 'editor'
  );
$$;

revoke all on function public.is_list_editor(uuid, uuid) from public;
grant execute on function public.is_list_editor(uuid, uuid) to authenticated;

-- Drop existing policies (if present) so we can re-create them with the new logic
drop policy if exists "collab_select_for_member_or_owner" on public.list_collaborators;
drop policy if exists "collab_insert_by_list_owner" on public.list_collaborators;
drop policy if exists "collab_update_by_list_owner" on public.list_collaborators;
drop policy if exists "collab_delete_owner_or_self" on public.list_collaborators;

drop policy if exists "lists_select_for_collaborators" on public.lists;
drop policy if exists "lists_update_for_editors" on public.lists;

drop policy if exists "items_select_for_collaborators" on public.items;
drop policy if exists "items_insert_for_editors" on public.items;
drop policy if exists "items_update_for_editors" on public.items;
drop policy if exists "items_delete_for_editors" on public.items;

-- Recreate policies using helper functions (no recursion)
create policy "collab_select_for_member_or_owner"
  on public.list_collaborators for select
  using (
    user_id = auth.uid() or public.is_list_owner(list_id, auth.uid())
  );

create policy "collab_insert_by_list_owner"
  on public.list_collaborators for insert
  with check (
    public.is_list_owner(list_id, auth.uid())
  );

create policy "collab_update_by_list_owner"
  on public.list_collaborators for update
  using (public.is_list_owner(list_id, auth.uid()))
  with check (public.is_list_owner(list_id, auth.uid()));

create policy "collab_delete_owner_or_self"
  on public.list_collaborators for delete
  using (
    user_id = auth.uid() or public.is_list_owner(list_id, auth.uid())
  );

create policy "lists_select_for_collaborators"
  on public.lists for select
  using (
    user_id = auth.uid() or public.is_list_member(id, auth.uid())
  );

create policy "lists_update_for_editors"
  on public.lists for update
  using (
    user_id = auth.uid() or public.is_list_editor(id, auth.uid())
  );

create policy "items_select_for_collaborators"
  on public.items for select
  using (
    public.is_list_owner(list_id, auth.uid()) or public.is_list_member(list_id, auth.uid())
  );

create policy "items_insert_for_editors"
  on public.items for insert
  with check (
    public.is_list_owner(list_id, auth.uid()) or public.is_list_editor(list_id, auth.uid())
  );

create policy "items_update_for_editors"
  on public.items for update
  using (
    public.is_list_owner(list_id, auth.uid()) or public.is_list_editor(list_id, auth.uid())
  );

create policy "items_delete_for_editors"
  on public.items for delete
  using (
    public.is_list_owner(list_id, auth.uid()) or public.is_list_editor(list_id, auth.uid())
  );

commit;

