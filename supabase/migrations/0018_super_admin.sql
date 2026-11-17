-- Legal Staff — super admin console (admin.html + functions/admin): revenue, firms, payments, coupons, support, expenses.
-- Only the emails listed here can use it; the admin function checks the signed-in user's verified email on every call.
create table if not exists public.super_admins (email text primary key check (email = lower(email)), added_at timestamptz not null default now());
alter table public.super_admins enable row level security;
insert into public.super_admins (email) values ('legalstaff17@gmail.com') on conflict do nothing;

-- Support messages: the website contact form and the in-app "Contact support" form share contact_requests.
alter table public.contact_requests
  add column if not exists status text not null default 'open' check (status in ('open', 'replied', 'closed')),
  add column if not exists reply text not null default '',
  add column if not exists replied_at timestamptz,
  add column if not exists firm_id uuid references public.firms(id) on delete set null,
  add column if not exists user_id uuid;
create index if not exists contact_requests_status_idx on public.contact_requests (status, created_at desc);

-- Business expenses, for profit = revenue - expenses (entered in the console).
create table if not exists public.admin_expenses (
  id uuid primary key default gen_random_uuid(),
  spent_on date not null default current_date,
  label text not null check (length(trim(label)) between 1 and 200),
  amount_paise integer not null check (amount_paise >= 0),
  created_at timestamptz not null default now()
);
alter table public.admin_expenses enable row level security;
