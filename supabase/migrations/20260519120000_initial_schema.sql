-- Prezenco initial schema: businesses, employees, time_logs, device_change_requests
-- Run in the Supabase SQL Editor or via `supabase db push`.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users (id) on delete restrict,
  supabase_url text,
  checkin_radius_metres integer not null default 150,
  workplace_lat numeric(10, 7),
  workplace_lng numeric(10, 7),
  subscription_status text not null default 'trial',
  trial_started_at timestamptz,
  created_at timestamptz not null default now(),
  constraint businesses_checkin_radius_positive check (checkin_radius_metres > 0)
);

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  full_name text not null,
  email text not null,
  status text not null default 'active',
  invite_accepted boolean not null default false,
  device_fingerprint text,
  device_reset_requested boolean not null default false,
  created_at timestamptz not null default now(),
  constraint employees_status_check check (status in ('active', 'inactive')),
  constraint employees_business_email_unique unique (business_id, email)
);

create table public.time_logs (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  type text not null,
  timestamp timestamptz not null,
  lat numeric(10, 7),
  lng numeric(10, 7),
  within_radius boolean,
  manually_adjusted boolean not null default false,
  adjusted_by text,
  adjustment_reason text,
  original_timestamp timestamptz,
  created_at timestamptz not null default now(),
  constraint time_logs_type_check check (type in ('checkin', 'checkout'))
);

create or replace function public.validate_time_log_business()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1
    from public.employees e
    where e.id = new.employee_id
      and e.business_id = new.business_id
  ) then
    raise exception 'employee_id does not belong to business_id';
  end if;
  return new;
end;
$$;

create trigger time_logs_validate_business
  before insert or update on public.time_logs
  for each row
  execute function public.validate_time_log_business();

create table public.device_change_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  new_device_fingerprint text not null,
  status text not null default 'pending',
  requested_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint device_change_requests_status_check check (
    status in ('pending', 'approved', 'rejected')
  )
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index businesses_owner_id_idx on public.businesses (owner_id);

create index employees_business_id_idx on public.employees (business_id);
create index employees_email_idx on public.employees (lower(email));

create index time_logs_employee_id_idx on public.time_logs (employee_id);
create index time_logs_business_id_idx on public.time_logs (business_id);
create index time_logs_timestamp_idx on public.time_logs (business_id, timestamp desc);

create index device_change_requests_employee_id_idx
  on public.device_change_requests (employee_id);
create index device_change_requests_status_idx
  on public.device_change_requests (status)
  where status = 'pending';

-- ---------------------------------------------------------------------------
-- Helper functions for RLS (employees are linked to auth by email)
-- Must be created after tables exist.
-- ---------------------------------------------------------------------------

create or replace function public.current_user_email()
returns text
language sql
stable
as $$
  select nullif(trim(auth.jwt() ->> 'email'), '');
$$;

create or replace function public.is_business_owner(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.businesses b
    where b.id = p_business_id
      and b.owner_id = auth.uid()
  );
$$;

create or replace function public.is_own_employee(p_employee_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.employees e
    where e.id = p_employee_id
      and public.current_user_email() is not null
      and lower(e.email) = lower(public.current_user_email())
  );
$$;

create or replace function public.is_employee_of_business(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.employees e
    where e.business_id = p_business_id
      and public.current_user_email() is not null
      and lower(e.email) = lower(public.current_user_email())
  );
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.businesses enable row level security;
alter table public.employees enable row level security;
alter table public.time_logs enable row level security;
alter table public.device_change_requests enable row level security;

-- businesses ----------------------------------------------------------------

create policy "businesses_select_owner"
  on public.businesses
  for select
  to authenticated
  using (owner_id = auth.uid());

create policy "businesses_select_employee"
  on public.businesses
  for select
  to authenticated
  using (public.is_employee_of_business(id));

create policy "businesses_insert_owner"
  on public.businesses
  for insert
  to authenticated
  with check (owner_id = auth.uid());

create policy "businesses_update_owner"
  on public.businesses
  for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "businesses_delete_owner"
  on public.businesses
  for delete
  to authenticated
  using (owner_id = auth.uid());

-- employees -----------------------------------------------------------------

create policy "employees_select_owner"
  on public.employees
  for select
  to authenticated
  using (public.is_business_owner(business_id));

create policy "employees_select_self"
  on public.employees
  for select
  to authenticated
  using (public.is_own_employee(id));

create policy "employees_insert_owner"
  on public.employees
  for insert
  to authenticated
  with check (public.is_business_owner(business_id));

create policy "employees_update_owner"
  on public.employees
  for update
  to authenticated
  using (public.is_business_owner(business_id))
  with check (public.is_business_owner(business_id));

create policy "employees_update_self"
  on public.employees
  for update
  to authenticated
  using (public.is_own_employee(id))
  with check (public.is_own_employee(id));

create policy "employees_delete_owner"
  on public.employees
  for delete
  to authenticated
  using (public.is_business_owner(business_id));

-- time_logs -----------------------------------------------------------------

create policy "time_logs_select_owner"
  on public.time_logs
  for select
  to authenticated
  using (public.is_business_owner(business_id));

create policy "time_logs_select_self"
  on public.time_logs
  for select
  to authenticated
  using (public.is_own_employee(employee_id));

create policy "time_logs_insert_self"
  on public.time_logs
  for insert
  to authenticated
  with check (
    public.is_own_employee(employee_id)
    and public.is_employee_of_business(business_id)
    and exists (
      select 1
      from public.employees e
      where e.id = employee_id
        and e.business_id = business_id
        and e.status = 'active'
    )
  );

create policy "time_logs_update_owner"
  on public.time_logs
  for update
  to authenticated
  using (public.is_business_owner(business_id))
  with check (public.is_business_owner(business_id));

create policy "time_logs_delete_owner"
  on public.time_logs
  for delete
  to authenticated
  using (public.is_business_owner(business_id));

-- device_change_requests ----------------------------------------------------

create policy "device_change_requests_select_owner"
  on public.device_change_requests
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.employees e
      where e.id = employee_id
        and public.is_business_owner(e.business_id)
    )
  );

create policy "device_change_requests_select_self"
  on public.device_change_requests
  for select
  to authenticated
  using (public.is_own_employee(employee_id));

create policy "device_change_requests_insert_self"
  on public.device_change_requests
  for insert
  to authenticated
  with check (
    public.is_own_employee(employee_id)
    and status = 'pending'
  );

create policy "device_change_requests_update_owner"
  on public.device_change_requests
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.employees e
      where e.id = employee_id
        and public.is_business_owner(e.business_id)
    )
  )
  with check (
    exists (
      select 1
      from public.employees e
      where e.id = employee_id
        and public.is_business_owner(e.business_id)
    )
  );

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

grant usage on schema public to authenticated;

grant select, insert, update, delete on public.businesses to authenticated;
grant select, insert, update, delete on public.employees to authenticated;
grant select, insert, update, delete on public.time_logs to authenticated;
grant select, insert, update, delete on public.device_change_requests to authenticated;

grant execute on function public.current_user_email() to authenticated;
grant execute on function public.is_business_owner(uuid) to authenticated;
grant execute on function public.is_own_employee(uuid) to authenticated;
grant execute on function public.is_employee_of_business(uuid) to authenticated;
