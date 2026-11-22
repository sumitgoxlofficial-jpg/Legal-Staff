-- Legal Staff — core app hardening (2026-11-21 audit). Re-runnable; changes no customer data.
--  * Only the firm owner can change the firm's name, address, city or GSTIN (printed on invoices); members still write the shared working state.
--  * The owner row cannot be suspended, un-owned, re-pointed or moved by a signed-in client (which would lock the firm out or mint a second trial).
--  * Team-chat meeting cards must carry a Google Meet link and a start time (the browser renders the link as a button).
-- Service-role calls (auth.uid() is null: edge functions, migrations) are not restricted.

create or replace function public.guard_firm_fields() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then return new; end if;
  if new.id is distinct from old.id or new.created_by is distinct from old.created_by then raise exception 'These firm fields cannot be changed.'; end if;
  if (new.name is distinct from old.name or new.city is distinct from old.city or new.address is distinct from old.address or new.gstin is distinct from old.gstin)
     and not public.is_owner(old.id) then raise exception 'Only the firm owner can change the firm profile.'; end if;
  return new;
end $$;
drop trigger if exists guard_firm_fields on public.firms;
create trigger guard_firm_fields before update on public.firms for each row execute function public.guard_firm_fields();

create or replace function public.guard_owner_member() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then return new; end if;
  if old.is_owner and (new.is_owner is distinct from old.is_owner or new.status is distinct from old.status or new.user_id is distinct from old.user_id
      or new.email is distinct from old.email or new.firm_id is distinct from old.firm_id) then raise exception 'The firm owner cannot be suspended, changed or moved.'; end if;
  if not old.is_owner and new.is_owner then raise exception 'Ownership cannot be granted from here.'; end if;
  return new;
end $$;
drop trigger if exists guard_owner_member on public.members;
create trigger guard_owner_member before update on public.members for each row execute function public.guard_owner_member();

do $$ begin
  alter table public.chat_messages drop constraint if exists chat_meeting_check;
  alter table public.chat_messages add constraint chat_meeting_check check (kind <> 'meeting' or (
    coalesce(data ->> 'link', '') ~* '^https://meet\.google\.com/[a-z0-9-]{3,40}([?#].*)?$' and coalesce(data ->> 'start', '') ~ '^\d{4}-\d{2}-\d{2}T')) not valid;
exception when undefined_table then raise notice 'chat_messages not present: meeting check skipped'; end $$;
