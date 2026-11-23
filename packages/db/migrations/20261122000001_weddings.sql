-- migrate:up
create table weddings (
  id uuid primary key,
  content jsonb not null,
  created_at timestamptz not null default now()
);

create table wedding_guests (
  id uuid primary key,
  wedding_id uuid not null references weddings(id) on delete cascade,
  name text not null,
  attending boolean
);

-- migrate:down
drop table wedding_guests;
drop table weddings;
