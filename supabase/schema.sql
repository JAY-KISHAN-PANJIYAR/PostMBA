-- ============================================================
-- JOB HUNT APP — DATABASE SCHEMA
-- Run this entire file in Supabase: SQL Editor → New Query → Run
-- ============================================================

-- TAGS (must come first — contacts reference it)
create table if not exists tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text not null default '#E6F1FB',
  text_color text not null default '#0C447C',
  created_at timestamptz default now()
);

-- Seed default tags
insert into tags (name, color, text_color) values
  ('Babson Alum', '#E6F1FB', '#0C447C'),
  ('Referred by someone', '#EEEDFE', '#3C3489'),
  ('Strong advocate', '#EAF3DE', '#27500A'),
  ('Board Fellow', '#FAEEDA', '#633806')
on conflict (name) do nothing;

-- CONTACTS
create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  sn integer,
  company text not null,
  name text,
  referred_by text,
  email text,
  mobile text,
  next_meeting text,
  referral_status text,
  action_item text,
  last_contact date,
  notes text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- CONTACT TAGS (many-to-many)
create table if not exists contact_tags (
  contact_id uuid references contacts(id) on delete cascade,
  tag_id uuid references tags(id) on delete cascade,
  primary key (contact_id, tag_id)
);

-- COMPANIES
create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz default now()
);

-- APPLICATION DAYS
create table if not exists app_days (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  date date not null,
  created_at timestamptz default now()
);

-- APPLICATIONS
create table if not exists applications (
  id uuid primary key default gen_random_uuid(),
  app_day_id uuid references app_days(id) on delete cascade,
  company_id uuid references companies(id) on delete set null,
  role_names text,
  apps_sent integer default 1,
  has_referral boolean default false,
  referral_contact_ids uuid[],
  created_at timestamptz default now()
);

-- ============================================================
-- SEED YOUR EXISTING CONTACTS
-- ============================================================

insert into contacts (sn, company, name, referred_by, email, mobile, referral_status, action_item, last_contact, notes, is_active) values
(1, 'Adobe', 'Jon Sofro', null, 'sofro@adobe.com', '617 733 7460', 'Got referral — MBA University Graduate PM R158962', 'Stay in touch; check next round timing', '2025-01-07', 'Met Jan 14 @ 4:30pm. Sent Job IDs and resume. Wait until current application clears before asking for next round.', true),
(2, 'Amazon', 'Sai', 'Kaushik', null, null, 'Referral promised', 'Check referral status', '2026-04-17', 'Sent email April 17. He replied and will send referral.', true),
(3, 'Apple', 'Suhash Nandeesh', 'Kaushik', 'suhas.nandeesh@gmail.com', null, 'Referral in progress', 'Follow up on referral for Business Analyst role', '2026-02-19', 'Business Analyst Finance & Analytics Process Transformation (200613602). Applied for one role.', true),
(4, 'BCG', 'Elizabeth Pawlicki', null, 'Pawlicki.Elizabeth@bcg.com', null, 'Asked referral', 'Follow up on Associate referral', '2026-02-19', 'Met Feb 10 @ 2:30. Sent thank-you note. Asked referral for Associate Experienced Hire role. Applied even without referral.', true),
(5, 'Cisco', 'Dan Hession', null, 'dhession@cisco.com', null, 'In touch', 'Ping on Webex; found jobs to send', '2026-02-19', 'Met Jan 16 @ 9am. Email Jen (admin) before Dan. Found some jobs to send.', true),
(6, 'Cisco', 'Ashley Woodford', null, 'awoodfor@cisco.com', null, 'In touch', 'Follow up; talk to more people at Cisco', '2025-01-07', 'Met 1/14/2026 12:30pm. Sent email Jan 7 asking for time.', true),
(7, 'CNN', 'Jason Sylva', null, 'jason.sylva@cnn.com', null, 'Under consideration', 'Check referral status; look for more CNN jobs', '2026-02-12', 'Met Feb 9 @ 1pm. Asked referral for one job under consideration. Pinged March 3.', true),
(8, 'Commonwealth Financial', 'Neha Agrawal', 'Alex from JP Morgan', null, null, 'In touch', 'Find Commonwealth jobs; ask to connect to someone', '2026-02-10', 'Sent msg on LinkedIn. Had virtual chat Feb 17. Need her email.', true),
(9, 'DoorDash', 'Michael Zaldivar', null, 'michael.zaldivar@doordash.com', null, 'Sent job IDs', 'Push for referral confirmation', '2026-02-12', 'Met Feb 10 @ 1pm. Sent job IDs. Need to push Tue March 3. Shortlist 2-3 roles max.', true),
(10, 'Emerson', 'Vincent Servello', null, 'Vincent.Servello@Emerson.com', null, 'Got referral — forwarding resume to talent', 'Applied to MBA program; monitor status', '2026-01-08', 'Met Jan 22 @ 4pm. Sent resume Jan 27. Sponsorship is main risk not profile. He will forward to talent.', true),
(11, 'FFAE', 'Kathy Doyle', null, 'kdoyle@fireflower-ae.com', null, 'Strong advocate', 'Keep in loop; network active', '2026-02-23', 'Intro to Caleb (managing partner). Permission to use as reference. EO network access. Looped for Caleb and Sanket Feb 23.', true),
(12, 'Google', 'Alexander Lapuyade', null, 'alapuyade@google.com', null, 'Warm intro', 'Try to get intro or referral; build recruiter relationships', '2026-01-08', 'Happy to help. Not willing to refer directly. Best path: network for clarity then warm intros then targeted applications.', true),
(13, 'Google', 'Ani Shanbhag', 'Kaushik', 'sendani@google.com', null, 'Got referral — applied Feb 23', 'Can apply 2 more roles before March 24 expiry', '2026-02-23', 'Internal referral for Strategy and Operations Senior Associate GTM. Applied Feb 23. Expires March 24.', true),
(14, 'IBM', 'Brendan McGuire', null, 'brendan.mcguire@us.ibm.com', null, 'Strong advocate', 'Send posting number — he will find hiring manager and endorse', '2026-01-08', 'Very proactive. Offered to look up hiring managers internally and make phone calls. Met Jan 22 @ 5pm.', true),
(15, 'JPMorganChase', 'Alexandre Furtado', null, 'alexandre.furtado@jpmchase.com', null, 'Asked referral', 'Submit resume once referral confirmed', '2026-02-19', 'Met Feb 3 @ 6pm. Asked referral Feb 20. Repinged Feb 25. Targeted JPM scan done.', true),
(16, 'McKinsey', 'Ravi Rajan', null, 'ravi_rajan@mckinsey.com', '5084948841', 'In touch', 'Stay in touch; he is coming next month', '2025-12-27', 'Sent email Jan 6. Happy to help. Talked Jan 15. Gave name of someone to reach out to.', true),
(17, 'Microsoft', 'Nate Findley', null, 'natefin@microsoft.com', null, 'No referral unless interview', 'Waiting for response', '2025-12-17', 'Met Feb 5 @ 9:35am. Will only refer if interview obtained. Sent follow-up Jan 26.', true),
(18, 'Microsoft', 'Drew Dials', null, 'Drew.Dials@microsoft.com', null, 'Got referral — AI Business Solutions TPM', 'Maybe ask for more referral roles', '2026-02-23', 'Met Feb 6 @ 1pm. Referred for AI Business Solutions Technical Program Manager. Repinged Feb 20.', true),
(19, 'Philips', 'Rishi Saurabh', 'Brendan from IBM', 'rishi.saurabh@philips.com', null, 'Need to connect', 'Schedule time to connect', '2026-02-23', 'Sent msg on LinkedIn and email. Follow-up msg Feb 23. Introduced by Brendan McGuire.', true),
(20, 'Stripe', 'Cousin', 'Kaushik', null, null, 'Got referral', 'Ask for referral link update', '2026-02-18', 'Internal referral obtained via Kaushik. Need link from cousin.', true),
(21, 'Value Assurance', 'Caleb Manchester', 'Kathy', 'csm@value-assurance.com', null, 'NDA pending', 'Sign NDA; ask clarity on terms', '2026-02-19', 'Initial call done. Signed NDA emailed Jan 6. Sent availability. Waiting to sign.', true),
(22, 'First Citizens', 'Jennifer Dowd', null, 'jennifer.dowd@firstcitizens.com', null, 'Meeting scheduled', 'Prepare script; confirm date/time', '2026-01-28', '9am call on 2/21. Emailed re: date confusion on Feb 6.', true);

-- Assign tags to contacts
insert into contact_tags (contact_id, tag_id)
select c.id, t.id from contacts c, tags t
where c.name in ('Jon Sofro','Vincent Servello','Alexander Lapuyade','Brendan McGuire','Ravi Rajan')
and t.name = 'Babson Alum'
on conflict do nothing;

insert into contact_tags (contact_id, tag_id)
select c.id, t.id from contacts c, tags t
where c.referred_by is not null and c.referred_by != ''
and t.name = 'Referred by someone'
on conflict do nothing;

insert into contact_tags (contact_id, tag_id)
select c.id, t.id from contacts c, tags t
where c.referral_status ilike '%strong advocate%'
and t.name = 'Strong advocate'
on conflict do nothing;

-- Seed companies
insert into companies (name) values
('Adobe'),('Amazon'),('Apple'),('BCG'),('Cisco'),('CNN'),
('Commonwealth Financial'),('DoorDash'),('Emerson'),('FFAE'),
('Google'),('IBM'),('JPMorganChase'),('McKinsey'),('Microsoft'),
('Philips'),('Stripe'),('Value Assurance'),('First Citizens')
on conflict (name) do nothing;
-- ============================================================
-- INTERVIEWS + TARGET COMPANY EXTENSIONS
-- Safe to run on an existing Supabase project.
-- ============================================================

-- TARGET COMPANIES
create table if not exists target_companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  priority text default 'medium' check (priority in ('high','medium','low')),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- INTERVIEWS
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

-- USER-CREATED VERTICALS FOR TARGET COMPANY KANBAN
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

alter table target_companies add column if not exists vertical_id uuid references company_verticals(id) on delete set null;
alter table target_companies add column if not exists application_decision text default 'apply' check (application_decision in ('apply','dont_apply_now'));
alter table target_companies add column if not exists last_applied_date date;
alter table target_companies add column if not exists updated_at timestamptz default now();

-- TRELLO-STYLE TO-DOS FOR EACH INTERVIEW
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
