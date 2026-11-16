begin;

create table public.dakhl_ledgers (
  user_id uuid primary key references auth.users (id) on delete cascade,
  revision uuid not null,
  ledger jsonb not null,
  constraint dakhl_ledger_shape check ((
    jsonb_typeof(ledger) = 'object'
    and ledger -> 'version' = '1'::jsonb
    and jsonb_typeof(ledger -> 'accounts') = 'array'
    and jsonb_typeof(ledger -> 'categories') = 'array'
    and jsonb_typeof(ledger -> 'debts') = 'array'
    and jsonb_typeof(ledger -> 'transactions') = 'array'
  ) is true)
);

alter table public.dakhl_ledgers enable row level security;

revoke all on table public.dakhl_ledgers from public, anon, authenticated;
grant select, insert on table public.dakhl_ledgers to authenticated;
grant update (revision, ledger) on table public.dakhl_ledgers to authenticated;

create policy "Read own ledger" on public.dakhl_ledgers
  for select to authenticated using (user_id = (select auth.uid()));

create policy "Create own ledger" on public.dakhl_ledgers
  for insert to authenticated with check (user_id = (select auth.uid()));

create policy "Update own ledger" on public.dakhl_ledgers
  for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

commit;
