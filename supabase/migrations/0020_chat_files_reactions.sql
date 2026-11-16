-- Legal Staff — team chat: files (PDF, images, documents), meeting cards (Google Meet) and emoji reactions.

-- Messages can be text, a file (data: path, name, size, type) or a meeting (data: title, start, minutes, link).
alter table public.chat_messages add column if not exists kind text not null default 'text';
alter table public.chat_messages add column if not exists data jsonb not null default '{}'::jsonb;
alter table public.chat_messages drop constraint if exists chat_messages_kind_check;
alter table public.chat_messages add constraint chat_messages_kind_check check (kind in ('text', 'file', 'meeting'));
alter table public.chat_messages drop constraint if exists chat_messages_body_check;
alter table public.chat_messages add constraint chat_messages_body_check check (length(body) <= 4000 and (kind <> 'text' or length(trim(body)) >= 1));

-- Reactions: one row per person, message and emoji.
create table if not exists public.chat_reactions (
  message_id uuid not null references public.chat_messages(id) on delete cascade,
  firm_id uuid not null references public.firms(id) on delete cascade,
  channel text not null,
  user_id uuid not null default auth.uid(),
  emoji text not null check (length(emoji) between 1 and 16),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);
create index if not exists chat_reactions_channel_idx on public.chat_reactions (firm_id, channel);
alter table public.chat_reactions enable row level security;
create policy chat_react_select on public.chat_reactions for select to authenticated using (public.chat_can(firm_id, channel));
create policy chat_react_insert on public.chat_reactions for insert to authenticated with check (
  user_id = (select auth.uid()) and public.chat_can(firm_id, channel)
  and exists (select 1 from public.chat_messages m where m.id = message_id and m.firm_id = chat_reactions.firm_id and m.channel = chat_reactions.channel));
create policy chat_react_delete on public.chat_reactions for delete to authenticated using (user_id = (select auth.uid()));
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_reactions') then
    alter publication supabase_realtime add table public.chat_reactions;
  end if;
end $$;

-- Chat files: private bucket, path <firm id>/<conversation>/<random>/<file name>, where the conversation is 'team' or
-- 'dm_<uid>_<uid>' (the chat channel with ':' written as '_'). Only people in that conversation can read or add files.
insert into storage.buckets (id, name, public, file_size_limit) values ('chat', 'chat', false, 20971520) on conflict (id) do nothing;
create or replace function public.chat_path_ok(p text) returns boolean language sql stable security definer set search_path = '' as $$
  select case when coalesce((storage.foldername(p))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', false)
    then public.chat_can(((storage.foldername(p))[1])::uuid, replace(coalesce((storage.foldername(p))[2], ''), '_', ':')) else false end
$$;
grant execute on function public.chat_path_ok(text) to authenticated;
create policy chat_files_read on storage.objects for select to authenticated using (bucket_id = 'chat' and public.chat_path_ok(name));
create policy chat_files_write on storage.objects for insert to authenticated with check (bucket_id = 'chat' and public.chat_path_ok(name));
create policy chat_files_delete on storage.objects for delete to authenticated using (bucket_id = 'chat' and owner = (select auth.uid()));
