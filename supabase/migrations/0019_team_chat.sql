-- Legal Staff — team chat: one group chat per firm ('team') and one-to-one chats between members
-- ('dm:<user id>:<user id>', the two ids sorted). Live updates through Supabase Realtime.
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms(id) on delete cascade,
  channel text not null check (channel = 'team' or channel ~ '^dm:[0-9a-f-]{36}:[0-9a-f-]{36}$'),
  sender uuid not null default auth.uid(),
  body text not null check (length(trim(body)) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index if not exists chat_messages_channel_idx on public.chat_messages (firm_id, channel, created_at desc);

-- Where each person has read up to, per conversation (for unread counts).
create table if not exists public.chat_reads (
  firm_id uuid not null references public.firms(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  channel text not null,
  read_at timestamptz not null default now(),
  primary key (firm_id, user_id, channel)
);

-- Can the signed-in user use this conversation? The team chat: any active member of the firm.
-- A one-to-one chat: only the two people in it, both members of the firm.
create or replace function public.chat_can(f uuid, ch text) returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_member(f) and (
    ch = 'team' or (
      ch ~ '^dm:[0-9a-f-]{36}:[0-9a-f-]{36}$'
      and (select auth.uid())::text in (split_part(ch, ':', 2), split_part(ch, ':', 3))
      and split_part(ch, ':', 2) < split_part(ch, ':', 3)
      and exists (select 1 from public.members m where m.firm_id = f and m.user_id::text = split_part(ch, ':', 2))
      and exists (select 1 from public.members m where m.firm_id = f and m.user_id::text = split_part(ch, ':', 3))))
$$;
grant execute on function public.chat_can(uuid, text) to authenticated;

alter table public.chat_messages enable row level security;
alter table public.chat_reads enable row level security;
create policy chat_select on public.chat_messages for select to authenticated using (public.chat_can(firm_id, channel));
create policy chat_insert on public.chat_messages for insert to authenticated with check (sender = (select auth.uid()) and public.chat_can(firm_id, channel));
create policy chat_delete_own on public.chat_messages for delete to authenticated using (sender = (select auth.uid()));
create policy chat_reads_own on public.chat_reads for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()) and public.chat_can(firm_id, channel));

-- Unread messages per conversation for the signed-in user (row level security applies).
create or replace function public.chat_unread(f uuid) returns table (channel text, unread bigint) language sql stable set search_path = '' as $$
  select m.channel, count(*) from public.chat_messages m
  left join public.chat_reads r on r.firm_id = m.firm_id and r.channel = m.channel and r.user_id = (select auth.uid())
  where m.firm_id = f and m.sender <> (select auth.uid()) and m.created_at > coalesce(r.read_at, '-infinity'::timestamptz)
  group by m.channel
$$;
grant execute on function public.chat_unread(uuid) to authenticated;

-- Live updates.
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_messages') then
    alter publication supabase_realtime add table public.chat_messages;
  end if;
end $$;
