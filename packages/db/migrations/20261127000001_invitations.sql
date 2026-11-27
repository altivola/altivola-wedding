-- migrate:up
-- Keep the legacy tables so the previous app can still serve traffic during the deploy.

create table invitations (
  id uuid primary key,
  -- Null while a draft belongs to nobody. Such drafts are edited with a token and removed after 3 days.
  owner_id text references "user" (id) on delete cascade,
  draft_token_hash text,
  slug text unique,
  theme text not null,
  draft jsonb not null,
  published jsonb,
  published_at timestamptz,
  booth jsonb not null default '{}',
  camera jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invitations_editable check (owner_id is not null or draft_token_hash is not null),
  constraint invitations_slug_format check (slug ~ '^[a-z0-9](-?[a-z0-9])*$' and length(slug) between 3 and 40)
);
create index invitations_owner_idx on invitations (owner_id, updated_at desc);
create index invitations_unclaimed_idx on invitations (created_at) where owner_id is null;

create table invitation_media (
  id uuid primary key,
  invitation_id uuid not null references invitations (id) on delete cascade,
  kind text not null check (kind in ('photo', 'audio', 'strip', 'shot')),
  content_type text not null,
  size int not null,
  created_at timestamptz not null default now()
);
create index invitation_media_invitation_idx on invitation_media (invitation_id, kind);

create table invitation_guests (
  id uuid primary key,
  invitation_id uuid not null references invitations (id) on delete cascade,
  code text not null,
  name text not null,
  phone text not null default '',
  email text not null default '',
  label text not null default '',
  -- Null means the guest sees every event.
  events text[],
  seats int not null default 2 check (seats between 1 and 20),
  walk_in boolean not null default false,
  attending boolean,
  party int check (party between 0 and 20),
  responded_at timestamptz,
  checked_in_at timestamptz,
  checked_in_party int,
  created_at timestamptz not null default now(),
  unique (invitation_id, code)
);
create index invitation_guests_name_idx on invitation_guests (invitation_id, lower(name));

create table invitation_wishes (
  id uuid primary key,
  invitation_id uuid not null references invitations (id) on delete cascade,
  guest_id uuid references invitation_guests (id) on delete set null,
  name text not null,
  message text not null,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index invitation_wishes_idx on invitation_wishes (invitation_id, created_at desc);

create table booth_strips (
  id uuid primary key,
  invitation_id uuid not null references invitations (id) on delete cascade,
  media_id uuid not null references invitation_media (id) on delete cascade,
  guest_name text not null,
  layout text not null,
  frame text not null,
  created_at timestamptz not null default now()
);
create index booth_strips_idx on booth_strips (invitation_id, created_at desc);

create table camera_rolls (
  id uuid primary key,
  invitation_id uuid not null references invitations (id) on delete cascade,
  guest_name text not null,
  film text not null,
  created_at timestamptz not null default now()
);
create index camera_rolls_idx on camera_rolls (invitation_id, created_at);

create table camera_shots (
  id uuid primary key,
  roll_id uuid not null references camera_rolls (id) on delete cascade,
  media_id uuid not null references invitation_media (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index camera_shots_roll_idx on camera_shots (roll_id, created_at);

-- migrate:down
drop table camera_shots;
drop table camera_rolls;
drop table booth_strips;
drop table invitation_wishes;
drop table invitation_guests;
drop table invitation_media;
drop table invitations;
