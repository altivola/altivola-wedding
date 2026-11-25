-- migrate:up
alter table weddings add column owner_id text references "user" (id) on delete set null;
create index weddings_owner_idx on weddings (owner_id, created_at desc);

alter table wedding_guests add column phone text not null default '';
alter table wedding_guests add column email text not null default '';
alter table wedding_guests add column ceremony_check_in timestamptz;
alter table wedding_guests add column reception_check_in timestamptz;
create index wedding_guests_wedding_id_idx on wedding_guests (wedding_id);

create table wedding_drafts (
  id uuid primary key,
  owner_id text not null references "user" (id) on delete cascade,
  data jsonb not null,
  wedding_id uuid references weddings (id) on delete set null,
  updated_at timestamptz not null default now()
);
create index wedding_drafts_owner_idx on wedding_drafts (owner_id, updated_at desc);

create table wedding_issue_reports (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null references "user" (id) on delete cascade,
  page text not null,
  message text not null,
  created_at timestamptz not null default now()
);

-- migrate:down
drop table wedding_issue_reports;
drop table wedding_drafts;
drop index wedding_guests_wedding_id_idx;
alter table wedding_guests drop column reception_check_in, drop column ceremony_check_in, drop column email, drop column phone;
drop index weddings_owner_idx;
alter table weddings drop column owner_id;
