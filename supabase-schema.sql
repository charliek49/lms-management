create table if not exists public.app_state (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create or replace function public.set_app_state_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists app_state_set_updated_at on public.app_state;

create trigger app_state_set_updated_at
before update on public.app_state
for each row
execute function public.set_app_state_updated_at();

alter table public.app_state disable row level security;
