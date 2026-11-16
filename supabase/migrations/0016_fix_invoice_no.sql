-- Legal Staff — next_invoice_no(): the parameter 'fy' clashed with the column of the same name ("column reference is ambiguous").
create or replace function public.next_invoice_no(fy text) returns text language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  insert into public.invoice_counters as c (fy, last) values (next_invoice_no.fy, 1)
    on conflict on constraint invoice_counters_pkey do update set last = c.last + 1
    returning c.last into n;
  return 'LS/' || next_invoice_no.fy || '/' || lpad(n::text, 4, '0');
end $$;
revoke all on function public.next_invoice_no(text) from public, anon, authenticated;
grant execute on function public.next_invoice_no(text) to service_role;
