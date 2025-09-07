-- Enable list sharing via collaborators and RLS policies
-- This migration creates a join table linking users to lists
-- with a role, and expands RLS to allow collaborators to
-- read/update lists and items accordingly.

begin;

-- 1) Collaborators table
create table if not exists public.list_collaborators (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lists(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'editor' check (role in ('viewer','editor')),
  created_at timestamptz not null default now(),
  unique(list_id, user_id)
);

alter table public.list_collaborators enable row level security;

-- Helper functions to avoid recursive RLS evaluation
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

-- Allow users to see their own collaborations and list owners to see/manage all
create policy "collab_select_for_member_or_owner"
  on public.list_collaborators for select
  using (
    user_id = auth.uid()
    or public.is_list_owner(list_id, auth.uid())
  );

-- Only list owners can add collaborators
create policy "collab_insert_by_list_owner"
  on public.list_collaborators for insert
  with check (
    public.is_list_owner(list_id, auth.uid())
  );

-- Owners can update collaborator role
create policy "collab_update_by_list_owner"
  on public.list_collaborators for update
  using (public.is_list_owner(list_id, auth.uid()))
  with check (public.is_list_owner(list_id, auth.uid()));

-- Owners can remove collaborators; collaborators can remove themselves
create policy "collab_delete_owner_or_self"
  on public.list_collaborators for delete
  using (
    user_id = auth.uid() or public.is_list_owner(list_id, auth.uid())
  );

-- 2) Expand RLS on lists to include collaborators
alter table public.lists enable row level security;

-- Allow collaborators to read lists they are on (owners likely already allowed by existing policy)
create policy "lists_select_for_collaborators"
  on public.lists for select
  using (
    user_id = auth.uid() or public.is_list_member(id, auth.uid())
  );

-- Allow editors to update list metadata; owners always allowed
create policy "lists_update_for_editors"
  on public.lists for update
  using (
    user_id = auth.uid() or public.is_list_editor(id, auth.uid())
  );

-- 3) Expand RLS on items to include collaborators of the parent list
alter table public.items enable row level security;

-- Read items when owner or collaborator on the parent list
create policy "items_select_for_collaborators"
  on public.items for select
  using (
    public.is_list_owner(list_id, auth.uid()) or public.is_list_member(list_id, auth.uid())
  );

-- Insert items when owner or editor on the parent list
create policy "items_insert_for_editors"
  on public.items for insert
  with check (
    public.is_list_owner(list_id, auth.uid()) or public.is_list_editor(list_id, auth.uid())
  );

-- Update items when owner or editor on the parent list
create policy "items_update_for_editors"
  on public.items for update
  using (
    public.is_list_owner(list_id, auth.uid()) or public.is_list_editor(list_id, auth.uid())
  );

-- Delete items when owner or editor on the parent list
create policy "items_delete_for_editors"
  on public.items for delete
  using (
    public.is_list_owner(list_id, auth.uid()) or public.is_list_editor(list_id, auth.uid())
  );

commit;
