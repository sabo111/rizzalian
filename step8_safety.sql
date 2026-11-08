begin;

-- ===== blocks =====
create table if not exists public.blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
alter table public.blocks enable row level security;
drop policy if exists "see own blocks" on public.blocks;
drop policy if exists "block as yourself" on public.blocks;
drop policy if exists "unblock" on public.blocks;
create policy "see own blocks" on public.blocks for select to authenticated using (blocker_id = auth.uid());
create policy "block as yourself" on public.blocks for insert to authenticated with check (blocker_id = auth.uid());
create policy "unblock" on public.blocks for delete to authenticated using (blocker_id = auth.uid());

-- true if I blocked them or they blocked me
create or replace function public.is_blocked_with(other uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.blocks
       where (blocker_id = auth.uid() and blocked_id = other)
          or (blocker_id = other and blocked_id = auth.uid())) $$;
revoke all on function public.is_blocked_with(uuid) from public, anon;
grant execute on function public.is_blocked_with(uuid) to authenticated;

-- blocking removes the match, its chat and any likes between the two
create or replace function public.cleanup_after_block()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  delete from public.matches
   where (user1_id = new.blocker_id and user2_id = new.blocked_id)
      or (user1_id = new.blocked_id and user2_id = new.blocker_id);
  delete from public.likes
   where (liker_id = new.blocker_id and liked_id = new.blocked_id)
      or (liker_id = new.blocked_id and liked_id = new.blocker_id);
  return new;
end $$;
drop trigger if exists on_block_cleanup on public.blocks;
create trigger on_block_cleanup after insert on public.blocks
  for each row execute function public.cleanup_after_block();

-- blocked people can't see each other's profiles or like each other
drop policy if exists "profiles readable by signed-in users" on public.profiles;
drop policy if exists "profiles visible unless blocked" on public.profiles;
create policy "profiles visible unless blocked" on public.profiles
  for select to authenticated
  using (user_id = auth.uid() or not public.is_blocked_with(user_id));

drop policy if exists "send likes as yourself" on public.likes;
create policy "send likes as yourself" on public.likes
  for insert to authenticated
  with check (liker_id = auth.uid() and not public.is_blocked_with(liked_id));

-- ===== unmatch (the likes stay, so the pair can't match again) =====
create or replace function public.unmatch(p_match_id uuid)
returns void language sql security definer set search_path = ''
as $$ delete from public.matches
      where id = p_match_id and auth.uid() in (user1_id, user2_id) $$;
revoke all on function public.unmatch(uuid) from public, anon;
grant execute on function public.unmatch(uuid) to authenticated;

-- ===== reports (only admins can read them) =====
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_id uuid not null references auth.users(id) on delete cascade,
  match_id uuid references public.matches(id) on delete set null,
  reason text not null check (reason in ('harassment','fake','inappropriate','spam','underage','other')),
  details text check (details is null or char_length(details) <= 500),
  status text not null default 'open' check (status in ('open','reviewed','actioned','dismissed')),
  created_at timestamptz not null default now(),
  unique (reporter_id, reported_id, reason),
  check (reporter_id <> reported_id)
);
alter table public.reports enable row level security;
drop policy if exists "report as yourself" on public.reports;
drop policy if exists "admins read reports" on public.reports;
drop policy if exists "admins update reports" on public.reports;
create policy "report as yourself" on public.reports for insert to authenticated with check (reporter_id = auth.uid());
create policy "admins read reports" on public.reports for select to authenticated using (public.is_admin());
create policy "admins update reports" on public.reports for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

commit;
