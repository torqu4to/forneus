-- Forneus — saved catpal teams.
--
-- Run this once in the Supabase SQL Editor (Dashboard → SQL Editor → New
-- query → paste → Run).
--
-- READ THIS BEFORE SKIPPING ANY OF IT. The site ships the anon key inside its
-- JavaScript bundle, which is how Supabase is designed to work — the key
-- identifies the project, it does not authorize anything. What actually keeps
-- one player from reading another player's teams is Row Level Security. With
-- RLS off, that public key is a master key to this table.

create table if not exists public.profiles (
  -- The owner. `on delete cascade` means "delete my account" really does
  -- delete the data, with no cleanup job to forget to write.
  user_id    uuid        not null references auth.users (id) on delete cascade,

  -- Client-generated, so a profile keeps its identity across the browser and
  -- the account and can be matched during the first-sign-in merge. Text, not
  -- uuid: the browser falls back to a non-uuid id where crypto.randomUUID is
  -- unavailable (a plain http:// page has no secure context).
  id         text        not null,

  name       text        not null default '',
  catpals    jsonb       not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),

  -- Two people may generate the same id without colliding.
  primary key (user_id, id),

  -- Bounds are enforced here too, not only in the client. Anything reaching
  -- this table came from a browser, and a browser is not a trusted caller.
  constraint profiles_name_length check (char_length(name) <= 60),
  constraint profiles_catpals_is_array check (jsonb_typeof(catpals) = 'array'),
  constraint profiles_catpals_size check (jsonb_array_length(catpals) <= 18)
);

-- The one query the app makes: this user's profiles, newest first.
create index if not exists profiles_user_updated_idx
  on public.profiles (user_id, updated_at desc);

alter table public.profiles enable row level security;

-- Four policies, one per verb. Postgres denies anything not explicitly
-- allowed once RLS is on, so a verb without a policy is simply impossible.
--
-- `using` filters the rows a statement may touch; `with check` validates the
-- rows it tries to write. UPDATE needs both — without `with check`, someone
-- could hand their own row to another user_id.

drop policy if exists "profiles are readable by their owner" on public.profiles;
create policy "profiles are readable by their owner"
  on public.profiles for select
  using ((select auth.uid()) = user_id);

drop policy if exists "profiles are insertable by their owner" on public.profiles;
create policy "profiles are insertable by their owner"
  on public.profiles for insert
  with check ((select auth.uid()) = user_id);

drop policy if exists "profiles are updatable by their owner" on public.profiles;
create policy "profiles are updatable by their owner"
  on public.profiles for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "profiles are deletable by their owner" on public.profiles;
create policy "profiles are deletable by their owner"
  on public.profiles for delete
  using ((select auth.uid()) = user_id);

-- `updated_at` decides who wins the merge, so it must not be something a
-- client can backdate to overwrite a newer copy.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before insert or update on public.profiles
  for each row execute function public.touch_updated_at();
