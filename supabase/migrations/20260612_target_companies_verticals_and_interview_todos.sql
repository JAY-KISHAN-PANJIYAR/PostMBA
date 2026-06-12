-- Target Companies: vertical Kanban, manual apply tracking, and Interview to-dos.

create table if not exists company_verticals (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz default now()
);

insert into company_verticals (name) values
  ('Fintech'),
  ('Big Tech'),
  ('Consulting')
on conflict (name) do nothing;

create table if not exists target_companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  priority text default 'medium' check (priority in ('high','medium','low')),
  notes text,
  vertical_id uuid references company_verticals(id) on delete set null,
  application_decision text default 'apply' check (application_decision in ('apply','dont_apply_now')),
  last_applied_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table target_companies add column if not exists vertical_id uuid references company_verticals(id) on delete set null;
alter table target_companies add column if not exists application_decision text default 'apply' check (application_decision in ('apply','dont_apply_now'));
alter table target_companies add column if not exists last_applied_date date;
alter table target_companies add column if not exists updated_at timestamptz default now();

create table if not exists interviews (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  role text,
  applied_date date,
  h1b_asked boolean,
  h1b_remarks text,
  total_rounds integer default 3,
  status text default 'coming_up' check (status in ('coming_up','ongoing','offer_received','rejected')),
  rejected_after_round integer,
  rejection_note text,
  offer_date date,
  offer_note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists interview_rounds (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid references interviews(id) on delete cascade,
  round_number integer not null,
  round_name text,
  interview_date date,
  interviewer text,
  duration text,
  remarks text,
  completed boolean default false,
  created_at timestamptz default now()
);

create table if not exists interview_todos (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid references interviews(id) on delete cascade,
  task text not null,
  completed boolean default false,
  position integer default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_target_companies_vertical_id on target_companies(vertical_id);
create index if not exists idx_interviews_company_status on interviews(company, status);
create index if not exists idx_interview_todos_interview_id on interview_todos(interview_id);
