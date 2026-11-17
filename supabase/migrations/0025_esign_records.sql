-- E-Sign requests are stored as records of kind 'esign' (and the existing 'limitation' kind the app already writes).
alter table public.records drop constraint if exists records_kind_check;
alter table public.records add constraint records_kind_check
  check (kind in ('case', 'client', 'hearing', 'order', 'task', 'doc', 'invoice', 'deadline', 'limitation', 'watch', 'log', 'esign'));
