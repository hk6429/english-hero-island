create schema if not exists private;

create table public.teacher_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 80),
  approval_status text not null default 'pending'
    check (approval_status in ('pending', 'approved', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.content_reviewer_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 80),
  reviewer_role text not null
    check (reviewer_role in ('english_teacher', 'content_editor', 'administrator')),
  approval_status text not null default 'pending'
    check (approval_status in ('pending', 'approved', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.classrooms (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teacher_profiles(user_id) on delete restrict,
  title text not null check (char_length(trim(title)) between 1 and 80),
  grade smallint not null check (grade between 3 and 6),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, teacher_id)
);

create table public.classroom_members (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  member_code text not null
    check (member_code ~ '^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$'),
  display_alias text not null check (char_length(trim(display_alias)) between 1 and 24),
  group_label text check (
    group_label is null or char_length(trim(group_label)) between 1 and 24
  ),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (classroom_id, member_code),
  unique (id, classroom_id)
);

create table public.classroom_activities (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null,
  teacher_id uuid not null,
  title text not null check (char_length(trim(title)) between 1 and 80),
  grade smallint not null check (grade between 3 and 6),
  micro_skill text not null check (char_length(trim(micro_skill)) between 1 and 80),
  question_count smallint not null check (question_count in (3, 5)),
  audience text not null check (audience in ('whole_class', 'small_group', 'individual')),
  join_code text not null unique
    check (join_code ~ '^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$'),
  status text not null default 'waiting'
    check (status in ('waiting', 'active', 'completed', 'ended')),
  join_closes_at timestamptz not null,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (classroom_id, teacher_id)
    references public.classrooms(id, teacher_id) on delete cascade,
  check (join_closes_at > created_at),
  unique (id, classroom_id)
);

create table public.activity_targets (
  activity_id uuid not null,
  classroom_id uuid not null,
  member_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (activity_id, member_id),
  foreign key (activity_id, classroom_id)
    references public.classroom_activities(id, classroom_id) on delete cascade,
  foreign key (member_id, classroom_id)
    references public.classroom_members(id, classroom_id) on delete restrict
);

create table public.activity_participants (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.classroom_activities(id) on delete cascade,
  auth_user_id uuid references auth.users(id) on delete set null,
  classroom_member_id uuid references public.classroom_members(id) on delete restrict,
  nickname text not null check (char_length(trim(nickname)) between 1 and 12),
  state text not null default 'joined'
    check (state in ('joined', 'in_progress', 'completed', 'may_need_help')),
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (activity_id, auth_user_id),
  unique (activity_id, classroom_member_id),
  unique (id, activity_id)
);

create table private.activity_join_attempts (
  id bigint generated always as identity primary key,
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  attempted_at timestamptz not null default now()
);

create table private.question_versions (
  question_id text not null,
  version integer not null check (version > 0),
  supersedes_version integer,
  change_summary text check (
    change_summary is null or char_length(trim(change_summary)) between 4 and 500
  ),
  status text not null
    check (status in ('draft', 'in_review', 'reviewed', 'published', 'disputed', 'retired')),
  grade smallint not null check (grade between 3 and 6),
  skill text not null,
  indicator text not null,
  micro_skill text not null,
  difficulty smallint not null check (difficulty between 1 and 3),
  modality text not null check (modality in ('text', 'audio', 'image')),
  question_type text not null,
  purpose text not null check (purpose in ('diagnostic', 'practice', 'boss', 'rescue', 'review')),
  prompt text not null,
  audio jsonb,
  image jsonb,
  options jsonb not null check (jsonb_typeof(options) = 'array'),
  correct_option_id text not null,
  explanation text not null,
  hints text[] not null check (cardinality(hints) > 0),
  variant_group text not null,
  source jsonb not null,
  author jsonb not null,
  created_by uuid references auth.users(id) on delete set null,
  locked_at timestamptz,
  reviewed_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  search_vector tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(question_id, '')), 'A')
    || setweight(to_tsvector('simple', coalesce(prompt, '')), 'A')
    || setweight(to_tsvector('simple', coalesce(indicator, '')), 'B')
    || setweight(to_tsvector('simple', coalesce(micro_skill, '')), 'B')
    || setweight(to_tsvector('simple', coalesce(explanation, '')), 'C')
  ) stored,
  primary key (question_id, version),
  foreign key (question_id, supersedes_version)
    references private.question_versions(question_id, version) on delete restrict,
  check (
    (version = 1 and supersedes_version is null)
    or (version > 1 and supersedes_version = version - 1 and change_summary is not null)
  ),
  check (
    status <> 'published'
    or (
      reviewed_at is not null
      and published_at is not null
      and (
        (source ->> 'kind' = 'original' and source ->> 'usageRights' = 'original-for-project')
        or (
          source ->> 'kind' = 'licensed'
          and source ->> 'usageRights' = 'licensed-for-publication'
        )
      )
    )
  )
);

create table private.question_reviews (
  id uuid primary key default gen_random_uuid(),
  question_id text not null,
  question_version integer not null,
  reviewer_id uuid not null
    references public.content_reviewer_profiles(user_id) on delete restrict,
  reviewer_role_snapshot text not null check (reviewer_role_snapshot = 'english_teacher'),
  verdict text not null check (verdict in ('approved', 'changes_requested')),
  criteria jsonb not null check (jsonb_typeof(criteria) = 'object'),
  note text not null check (char_length(trim(note)) between 4 and 1000),
  created_at timestamptz not null default now(),
  foreign key (question_id, question_version)
    references private.question_versions(question_id, version) on delete restrict,
  unique (question_id, question_version, reviewer_id)
);

create table private.question_status_events (
  id uuid primary key default gen_random_uuid(),
  question_id text not null,
  question_version integer not null,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null check (
    event_type in (
      'submitted_for_review',
      'review_recorded',
      'marked_reviewed',
      'published',
      'disputed',
      'retired',
      'revision_created'
    )
  ),
  from_status text,
  to_status text not null,
  note text not null check (char_length(trim(note)) between 1 and 1000),
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  created_at timestamptz not null default now(),
  foreign key (question_id, question_version)
    references private.question_versions(question_id, version) on delete restrict
);

create table public.activity_questions (
  activity_id uuid not null references public.classroom_activities(id) on delete cascade,
  position smallint not null check (position between 1 and 6),
  question_id text not null,
  question_version integer not null,
  purpose text not null check (purpose in ('practice', 'boss', 'rescue', 'review')),
  modality text not null check (modality in ('text', 'audio', 'image')),
  question_type text not null,
  prompt text not null,
  options jsonb not null check (jsonb_typeof(options) = 'array'),
  audio_src text,
  image_src text,
  image_alt text,
  created_at timestamptz not null default now(),
  primary key (activity_id, position),
  unique (activity_id, question_id, question_version),
  foreign key (question_id, question_version)
    references private.question_versions(question_id, version) on delete restrict
);

create table public.activity_responses (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null,
  participant_id uuid not null,
  question_id text not null,
  question_version integer not null,
  selected_option_id text not null,
  hints_used smallint not null default 0 check (hints_used >= 0),
  rescue_variant_correct boolean not null default false,
  device_event_id uuid not null unique,
  judgment_status text not null default 'pending'
    check (judgment_status in ('pending', 'judged', 'rejected')),
  submitted_at timestamptz not null default now(),
  judged_at timestamptz,
  foreign key (participant_id, activity_id)
    references public.activity_participants(id, activity_id) on delete cascade,
  foreign key (activity_id, question_id, question_version)
    references public.activity_questions(activity_id, question_id, question_version) on delete restrict,
  unique (participant_id, activity_id, question_id, question_version)
);

create table public.classroom_learning_events (
  id uuid primary key,
  activity_id uuid not null,
  participant_id uuid not null,
  response_id uuid not null unique references public.activity_responses(id) on delete restrict,
  question_id text not null,
  question_version integer not null,
  micro_skill text not null,
  outcome text not null
    check (outcome in ('independent_correct', 'assisted_correct', 'rescued', 'pending_support')),
  occurred_at timestamptz not null,
  study_date date not null,
  created_at timestamptz not null default now(),
  foreign key (participant_id, activity_id)
    references public.activity_participants(id, activity_id) on delete restrict,
  foreign key (activity_id, question_id, question_version)
    references public.activity_questions(activity_id, question_id, question_version) on delete restrict
);

create table public.classroom_story_progress (
  activity_id uuid primary key references public.classroom_activities(id) on delete cascade,
  contribution_count integer not null default 0 check (contribution_count >= 0),
  repaired_points integer not null default 0 check (repaired_points >= 0),
  boss_armor integer not null default 0 check (boss_armor >= 0),
  updated_at timestamptz not null default now()
);

create index classrooms_teacher_id_idx
  on public.classrooms (teacher_id);
create index classroom_members_classroom_active_idx
  on public.classroom_members (classroom_id, group_label, display_alias)
  where archived_at is null;
create index classroom_activities_classroom_status_idx
  on public.classroom_activities (classroom_id, status, created_at desc);
create index classroom_activities_teacher_status_idx
  on public.classroom_activities (teacher_id, status, created_at desc);
create index activity_targets_member_idx
  on public.activity_targets (member_id, activity_id);
create index activity_participants_activity_state_idx
  on public.activity_participants (activity_id, state);
create index activity_participants_auth_user_idx
  on public.activity_participants (auth_user_id)
  where auth_user_id is not null;
create index activity_responses_participant_submitted_idx
  on public.activity_responses (participant_id, submitted_at desc);
create index activity_responses_activity_judgment_idx
  on public.activity_responses (activity_id, judgment_status, submitted_at);
create index classroom_learning_events_activity_skill_idx
  on public.classroom_learning_events (activity_id, micro_skill, occurred_at);
create index classroom_learning_events_participant_occurred_idx
  on public.classroom_learning_events (participant_id, occurred_at desc);
create index classroom_learning_events_question_version_outcome_idx
  on public.classroom_learning_events (question_id, question_version, outcome);
create index question_versions_status_grade_skill_idx
  on private.question_versions (status, grade, micro_skill, published_at desc);
create unique index question_versions_one_published_idx
  on private.question_versions (question_id)
  where status = 'published';
create index question_versions_search_idx on private.question_versions using gin (search_vector);
create index question_reviews_version_verdict_idx
  on private.question_reviews (question_id, question_version, verdict, created_at);
create index question_reviews_reviewer_idx
  on private.question_reviews (reviewer_id, created_at desc);
create index question_status_events_version_idx
  on private.question_status_events (question_id, question_version, created_at);
create index activity_join_attempts_user_time_idx
  on private.activity_join_attempts (auth_user_id, attempted_at desc);

alter table public.teacher_profiles enable row level security;
alter table public.content_reviewer_profiles enable row level security;
alter table public.classrooms enable row level security;
alter table public.classroom_members enable row level security;
alter table public.classroom_activities enable row level security;
alter table public.activity_targets enable row level security;
alter table public.activity_participants enable row level security;
alter table public.activity_questions enable row level security;
alter table public.activity_responses enable row level security;
alter table public.classroom_learning_events enable row level security;
alter table public.classroom_story_progress enable row level security;
alter table private.question_versions enable row level security;
alter table private.question_reviews enable row level security;
alter table private.question_status_events enable row level security;
alter table private.activity_join_attempts enable row level security;

alter table public.teacher_profiles force row level security;
alter table public.content_reviewer_profiles force row level security;
alter table public.classrooms force row level security;
alter table public.classroom_members force row level security;
alter table public.classroom_activities force row level security;
alter table public.activity_targets force row level security;
alter table public.activity_participants force row level security;
alter table public.activity_questions force row level security;
alter table public.activity_responses force row level security;
alter table public.classroom_learning_events force row level security;
alter table public.classroom_story_progress force row level security;
alter table private.question_versions force row level security;
alter table private.question_reviews force row level security;
alter table private.question_status_events force row level security;
alter table private.activity_join_attempts force row level security;

revoke all on public.teacher_profiles from anon, authenticated;
revoke all on public.content_reviewer_profiles from anon, authenticated;
revoke all on public.classrooms from anon, authenticated;
revoke all on public.classroom_members from anon, authenticated;
revoke all on public.classroom_activities from anon, authenticated;
revoke all on public.activity_targets from anon, authenticated;
revoke all on public.activity_participants from anon, authenticated;
revoke all on public.activity_questions from anon, authenticated;
revoke all on public.activity_responses from anon, authenticated;
revoke all on public.classroom_learning_events from anon, authenticated;
revoke all on public.classroom_story_progress from anon, authenticated;
revoke all on schema private from public, anon, authenticated;
revoke all on private.question_versions from public, anon, authenticated;
revoke all on private.question_reviews from public, anon, authenticated;
revoke all on private.question_status_events from public, anon, authenticated;
revoke all on private.activity_join_attempts from public, anon, authenticated;

grant usage on schema public to authenticated;
grant select on public.teacher_profiles to authenticated;
grant update (display_name) on public.teacher_profiles to authenticated;
grant select on public.content_reviewer_profiles to authenticated;
grant select on public.classrooms to authenticated;
grant select on public.classroom_members to authenticated;
grant select, delete on public.classroom_activities to authenticated;
grant select on public.activity_targets to authenticated;
grant select on public.activity_participants to authenticated;
grant select on public.activity_questions to authenticated;
grant select on public.classroom_story_progress to authenticated;

grant usage on schema private to service_role;
grant select, insert, update on private.question_versions to service_role;
grant select, insert on private.question_reviews to service_role;
grant select, insert on private.question_status_events to service_role;
grant select, insert, delete on private.activity_join_attempts to service_role;

create policy teacher_profiles_select_own
on public.teacher_profiles for select
to authenticated
using ((select auth.uid()) = user_id);

create policy teacher_profiles_update_own_display_name
on public.teacher_profiles for update
to authenticated
using (
  (select auth.uid()) = user_id
  and coalesce((select (auth.jwt() ->> 'is_anonymous')::boolean), false) is false
)
with check (
  (select auth.uid()) = user_id
  and coalesce((select (auth.jwt() ->> 'is_anonymous')::boolean), false) is false
);

create policy content_reviewer_profiles_select_own
on public.content_reviewer_profiles for select
to authenticated
using ((select auth.uid()) = user_id);

create policy classrooms_teacher_select
on public.classrooms for select
to authenticated
using ((select auth.uid()) = teacher_id);

create policy classrooms_approved_teacher_insert
on public.classrooms for insert
to authenticated
with check (
  (select auth.uid()) = teacher_id
  and coalesce((select (auth.jwt() ->> 'is_anonymous')::boolean), false) is false
  and exists (
    select 1 from public.teacher_profiles profile
    where profile.user_id = (select auth.uid())
      and profile.approval_status = 'approved'
  )
);

create policy classrooms_approved_teacher_update
on public.classrooms for update
to authenticated
using ((select auth.uid()) = teacher_id)
with check (
  (select auth.uid()) = teacher_id
  and coalesce((select (auth.jwt() ->> 'is_anonymous')::boolean), false) is false
  and exists (
    select 1 from public.teacher_profiles profile
    where profile.user_id = (select auth.uid())
      and profile.approval_status = 'approved'
  )
);

create policy classrooms_approved_teacher_delete
on public.classrooms for delete
to authenticated
using (
  (select auth.uid()) = teacher_id
  and exists (
    select 1 from public.teacher_profiles profile
    where profile.user_id = (select auth.uid())
      and profile.approval_status = 'approved'
  )
);

create policy classroom_members_teacher_select
on public.classroom_members for select
to authenticated
using (
  exists (
    select 1 from public.classrooms classroom
    where classroom.id = public.classroom_members.classroom_id
      and classroom.teacher_id = (select auth.uid())
  )
);

create policy classroom_activities_teacher_select
on public.classroom_activities for select
to authenticated
using ((select auth.uid()) = teacher_id);

create policy classroom_activities_approved_teacher_insert
on public.classroom_activities for insert
to authenticated
with check (
  (select auth.uid()) = teacher_id
  and coalesce((select (auth.jwt() ->> 'is_anonymous')::boolean), false) is false
  and exists (
    select 1 from public.teacher_profiles profile
    where profile.user_id = (select auth.uid())
      and profile.approval_status = 'approved'
  )
);

create policy classroom_activities_approved_teacher_update
on public.classroom_activities for update
to authenticated
using ((select auth.uid()) = teacher_id)
with check (
  (select auth.uid()) = teacher_id
  and coalesce((select (auth.jwt() ->> 'is_anonymous')::boolean), false) is false
  and exists (
    select 1 from public.teacher_profiles profile
    where profile.user_id = (select auth.uid())
      and profile.approval_status = 'approved'
  )
);

create policy classroom_activities_approved_teacher_delete
on public.classroom_activities for delete
to authenticated
using (
  (select auth.uid()) = teacher_id
  and exists (
    select 1 from public.teacher_profiles profile
    where profile.user_id = (select auth.uid())
      and profile.approval_status = 'approved'
  )
);

create policy activity_targets_teacher_select
on public.activity_targets for select
to authenticated
using (
  exists (
    select 1 from public.classroom_activities activity
    where activity.id = public.activity_targets.activity_id
      and activity.teacher_id = (select auth.uid())
  )
);

create policy activity_participants_select_self
on public.activity_participants for select
to authenticated
using ((select auth.uid()) = auth_user_id);

create policy activity_questions_teacher_select
on public.activity_questions for select
to authenticated
using (
  exists (
    select 1 from public.classroom_activities activity
    where activity.id = public.activity_questions.activity_id
      and activity.teacher_id = (select auth.uid())
  )
);

create policy activity_questions_participant_select_active
on public.activity_questions for select
to authenticated
using (
  exists (
    select 1
    from public.activity_participants participant
    join public.classroom_activities activity on activity.id = participant.activity_id
    where participant.activity_id = public.activity_questions.activity_id
      and participant.auth_user_id = (select auth.uid())
      and activity.status = 'active'
  )
);

create policy activity_responses_participant_insert
on public.activity_responses for insert
to authenticated
with check (
  judgment_status = 'pending'
  and exists (
    select 1 from public.activity_participants participant
    where participant.id = public.activity_responses.participant_id
      and participant.activity_id = public.activity_responses.activity_id
      and participant.auth_user_id = (select auth.uid())
  )
  and exists (
    select 1
    from public.activity_questions question
    join public.classroom_activities activity on activity.id = question.activity_id
    where question.activity_id = public.activity_responses.activity_id
      and question.question_id = public.activity_responses.question_id
      and question.question_version = public.activity_responses.question_version
      and activity.status = 'active'
  )
);

create policy classroom_story_progress_participant_select
on public.classroom_story_progress for select
to authenticated
using (
  exists (
    select 1 from public.activity_participants participant
    where participant.activity_id = public.classroom_story_progress.activity_id
      and participant.auth_user_id = (select auth.uid())
  )
);

create policy classroom_story_progress_teacher_select
on public.classroom_story_progress for select
to authenticated
using (
  exists (
    select 1 from public.classroom_activities activity
    where activity.id = public.classroom_story_progress.activity_id
      and activity.teacher_id = (select auth.uid())
  )
);

create or replace function private.validate_question_content(p_content jsonb)
returns void
language plpgsql
immutable
set search_path = ''
as $$
declare
  modality text;
  option_count integer;
  distinct_option_id_count integer;
  distinct_option_text_count integer;
  invalid_option_count integer;
begin
  if p_content is null or jsonb_typeof(p_content) <> 'object' then
    raise exception 'question content must be an object' using errcode = '22023';
  end if;

  if coalesce(p_content ->> 'grade', '') !~ '^[3-6]$' then
    raise exception 'question grade must be 3 to 6' using errcode = '22023';
  end if;

  if p_content ->> 'skill' not in (
    'letters',
    'phonics',
    'vocabulary',
    'classroom_english',
    'grammar',
    'comprehension'
  ) then
    raise exception 'question skill is invalid' using errcode = '22023';
  end if;

  if char_length(trim(coalesce(p_content ->> 'indicator', ''))) not between 1 and 200
    or char_length(trim(coalesce(p_content ->> 'microSkill', ''))) not between 1 and 120
  then
    raise exception 'question indicator or micro skill is invalid' using errcode = '22023';
  end if;

  if coalesce(p_content ->> 'difficulty', '') !~ '^[1-3]$' then
    raise exception 'question difficulty must be 1 to 3' using errcode = '22023';
  end if;

  modality := p_content ->> 'modality';
  if modality not in ('text', 'audio', 'image') then
    raise exception 'question modality is invalid' using errcode = '22023';
  end if;

  if p_content ->> 'questionType' not in (
    'multiple_choice',
    'listening_choice',
    'image_choice',
    'sentence_order'
  ) then
    raise exception 'question type is invalid' using errcode = '22023';
  end if;

  if p_content ->> 'purpose' not in (
    'diagnostic',
    'practice',
    'boss',
    'rescue',
    'review'
  ) then
    raise exception 'question purpose is invalid' using errcode = '22023';
  end if;

  if char_length(trim(coalesce(p_content ->> 'prompt', ''))) not between 1 and 1000
    or char_length(trim(coalesce(p_content ->> 'explanation', ''))) not between 1 and 2000
    or char_length(trim(coalesce(p_content ->> 'variantGroup', ''))) not between 1 and 120
  then
    raise exception 'question text content is invalid' using errcode = '22023';
  end if;

  if jsonb_typeof(p_content -> 'options') <> 'array'
    or jsonb_array_length(p_content -> 'options') not between 2 and 6
  then
    raise exception 'question options must contain 2 to 6 choices' using errcode = '22023';
  end if;

  select
    count(*)::integer,
    count(distinct option_value ->> 'id')::integer,
    count(distinct lower(trim(option_value ->> 'text')))::integer,
    count(*) filter (
      where case
        when jsonb_typeof(option_value) <> 'object' then true
        else jsonb_object_length(option_value) <> 2
          or not (option_value ? 'id')
          or not (option_value ? 'text')
          or jsonb_typeof(option_value -> 'id') <> 'string'
          or jsonb_typeof(option_value -> 'text') <> 'string'
          or char_length(trim(coalesce(option_value ->> 'id', ''))) = 0
          or option_value ->> 'id' <> trim(option_value ->> 'id')
          or char_length(trim(coalesce(option_value ->> 'text', ''))) = 0
      end
    )::integer
  into
    option_count,
    distinct_option_id_count,
    distinct_option_text_count,
    invalid_option_count
  from jsonb_array_elements(p_content -> 'options') as option(option_value);

  if invalid_option_count > 0
    or option_count <> distinct_option_id_count
    or option_count <> distinct_option_text_count
  then
    raise exception 'question choices must have unique non-empty ids and text'
      using errcode = '22023';
  end if;

  if char_length(trim(coalesce(p_content ->> 'correctOptionId', ''))) = 0
    or not exists (
      select 1
      from jsonb_array_elements(p_content -> 'options') as option(option_value)
      where option_value ->> 'id' = p_content ->> 'correctOptionId'
    )
  then
    raise exception 'correct option must identify an existing choice' using errcode = '22023';
  end if;

  if jsonb_typeof(p_content -> 'hints') <> 'array'
    or jsonb_array_length(p_content -> 'hints') = 0
    or exists (
      select 1
      from jsonb_array_elements(p_content -> 'hints') as hint(hint_value)
      where jsonb_typeof(hint_value) <> 'string'
        or char_length(trim(hint_value #>> '{}')) = 0
    )
  then
    raise exception 'question hints must contain non-empty text' using errcode = '22023';
  end if;

  if modality = 'audio'
    and (
      jsonb_typeof(p_content -> 'audio') <> 'object'
      or char_length(trim(coalesce(p_content -> 'audio' ->> 'src', ''))) = 0
      or char_length(trim(coalesce(p_content -> 'audio' ->> 'transcript', ''))) = 0
    )
  then
    raise exception 'audio questions require a source and transcript' using errcode = '22023';
  end if;

  if modality = 'image'
    and (
      jsonb_typeof(p_content -> 'image') <> 'object'
      or char_length(trim(coalesce(p_content -> 'image' ->> 'src', ''))) = 0
      or char_length(trim(coalesce(p_content -> 'image' ->> 'alt', ''))) = 0
    )
  then
    raise exception 'image questions require a source and alternative text'
      using errcode = '22023';
  end if;

  if jsonb_typeof(p_content -> 'source') <> 'object'
    or coalesce(p_content -> 'source' ->> 'kind', '') not in (
      'original',
      'licensed',
      'research_reference'
    )
    or char_length(trim(coalesce(p_content -> 'source' ->> 'note', ''))) = 0
    or char_length(trim(coalesce(p_content -> 'source' ->> 'usageRights', ''))) = 0
  then
    raise exception 'question source metadata is invalid' using errcode = '22023';
  end if;
end;
$$;

revoke execute on function private.validate_question_content(jsonb) from public, anon, authenticated;

create or replace function public.get_content_governance_profile()
returns table (
  user_id uuid,
  display_name text,
  reviewer_role text,
  approval_status text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null
    or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) is true
  then
    raise exception 'content governance authentication required'
      using errcode = '42501';
  end if;

  return query
  select
    profile.user_id,
    profile.display_name,
    profile.reviewer_role,
    profile.approval_status
  from public.content_reviewer_profiles profile
  where profile.user_id = auth.uid();

  if not found then
    raise exception 'content governance profile not found' using errcode = 'P0002';
  end if;
end;
$$;

revoke execute on function public.get_content_governance_profile() from public, anon;
grant execute on function public.get_content_governance_profile() to authenticated;

create or replace function public.search_question_bank(
  p_query text default null,
  p_grade smallint default null,
  p_skill text default null,
  p_micro_skill text default null,
  p_status text default null,
  p_modality text default null,
  p_difficulty smallint default null,
  p_cursor_created_at timestamptz default null,
  p_cursor_question_id text default null,
  p_cursor_question_version integer default null,
  p_limit integer default 50
)
returns table (
  question_id text,
  question_version integer,
  question_status text,
  grade smallint,
  skill text,
  indicator text,
  micro_skill text,
  difficulty smallint,
  modality text,
  question_type text,
  purpose text,
  prompt text,
  audio jsonb,
  image jsonb,
  options jsonb,
  correct_option_id text,
  explanation text,
  hints text[],
  variant_group text,
  source jsonb,
  author jsonb,
  created_by uuid,
  supersedes_version integer,
  change_summary text,
  locked_at timestamptz,
  reviewed_at timestamptz,
  published_at timestamptz,
  created_at timestamptz,
  approval_count integer,
  change_request_count integer,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  profile_record public.content_reviewer_profiles%rowtype;
begin
  if auth.uid() is null
    or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) is true
  then
    raise exception 'approved content governor authentication required'
      using errcode = '42501';
  end if;

  select profile.*
  into profile_record
  from public.content_reviewer_profiles profile
  where profile.user_id = auth.uid()
    and profile.reviewer_role in ('english_teacher', 'content_editor', 'administrator')
    and profile.approval_status = 'approved';

  if not found then
    raise exception 'approved content governor required' using errcode = '42501';
  end if;

  if p_grade is not null and p_grade not between 3 and 6 then
    raise exception 'question grade filter is invalid' using errcode = '22023';
  end if;

  if p_status is not null
    and p_status not in ('draft', 'in_review', 'reviewed', 'published', 'disputed', 'retired')
  then
    raise exception 'question status filter is invalid' using errcode = '22023';
  end if;

  if p_modality is not null and p_modality not in ('text', 'audio', 'image') then
    raise exception 'question modality filter is invalid' using errcode = '22023';
  end if;

  if p_difficulty is not null and p_difficulty not between 1 and 3 then
    raise exception 'question difficulty filter is invalid' using errcode = '22023';
  end if;

  if p_limit is null or p_limit not between 1 and 100 then
    raise exception 'question search limit must be 1 to 100' using errcode = '22023';
  end if;

  if (p_cursor_created_at is null) <> (p_cursor_question_id is null)
    or (p_cursor_created_at is null) <> (p_cursor_question_version is null)
  then
    raise exception 'question search cursor is incomplete' using errcode = '22023';
  end if;

  if p_cursor_question_version is not null and p_cursor_question_version <= 0 then
    raise exception 'question search cursor version is invalid' using errcode = '22023';
  end if;

  return query
  with filtered_versions as (
    select
      latest.*,
      coalesce(review_counts.approval_count, 0) as approval_count,
      coalesce(review_counts.change_request_count, 0) as change_request_count,
      count(*) over () as total_count
    from private.question_versions latest
    left join lateral (
      select
        count(distinct review.reviewer_id) filter (
          where review.verdict = 'approved'
        )::integer as approval_count,
        count(distinct review.reviewer_id) filter (
          where review.verdict = 'changes_requested'
        )::integer as change_request_count
      from private.question_reviews review
      join public.content_reviewer_profiles reviewer
        on reviewer.user_id = review.reviewer_id
      where review.question_id = latest.question_id
        and review.question_version = latest.version
        and reviewer.reviewer_role = 'english_teacher'
        and reviewer.approval_status = 'approved'
    ) review_counts on true
    where (p_query is null or trim(p_query) = ''
      or latest.search_vector @@ websearch_to_tsquery('simple', trim(p_query)))
      and (p_grade is null or latest.grade = p_grade)
      and (p_skill is null or latest.skill = p_skill)
      and (p_micro_skill is null or latest.micro_skill = p_micro_skill)
      and (p_status is null or latest.status = p_status)
      and (p_modality is null or latest.modality = p_modality)
      and (p_difficulty is null or latest.difficulty = p_difficulty)
  )
  select
    filtered.question_id,
    filtered.version,
    filtered.status,
    filtered.grade,
    filtered.skill,
    filtered.indicator,
    filtered.micro_skill,
    filtered.difficulty,
    filtered.modality,
    filtered.question_type,
    filtered.purpose,
    filtered.prompt,
    filtered.audio,
    filtered.image,
    filtered.options,
    filtered.correct_option_id,
    filtered.explanation,
    filtered.hints,
    filtered.variant_group,
    filtered.source,
    filtered.author,
    filtered.created_by,
    filtered.supersedes_version,
    filtered.change_summary,
    filtered.locked_at,
    filtered.reviewed_at,
    filtered.published_at,
    filtered.created_at,
    filtered.approval_count,
    filtered.change_request_count,
    filtered.total_count
  from filtered_versions filtered
  where p_cursor_created_at is null
    or filtered.created_at < p_cursor_created_at
    or (
      filtered.created_at = p_cursor_created_at
      and filtered.question_id > p_cursor_question_id
    )
    or (
      filtered.created_at = p_cursor_created_at
      and filtered.question_id = p_cursor_question_id
      and filtered.version < p_cursor_question_version
    )
  order by filtered.created_at desc, filtered.question_id, filtered.version desc
  limit p_limit;
end;
$$;

revoke execute on function public.search_question_bank(text, smallint, text, text, text, text, smallint, timestamptz, text, integer, integer) from public, anon;
grant execute on function public.search_question_bank(text, smallint, text, text, text, text, smallint, timestamptz, text, integer, integer) to authenticated;

create or replace function public.list_question_versions(p_question_id text)
returns table (
  question_id text,
  question_version integer,
  question_status text,
  grade smallint,
  skill text,
  indicator text,
  micro_skill text,
  difficulty smallint,
  modality text,
  question_type text,
  purpose text,
  prompt text,
  audio jsonb,
  image jsonb,
  options jsonb,
  correct_option_id text,
  explanation text,
  hints text[],
  variant_group text,
  source jsonb,
  author jsonb,
  created_by uuid,
  supersedes_version integer,
  change_summary text,
  locked_at timestamptz,
  reviewed_at timestamptz,
  published_at timestamptz,
  created_at timestamptz,
  approval_count integer,
  change_request_count integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  profile_record public.content_reviewer_profiles%rowtype;
begin
  if auth.uid() is null
    or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) is true
  then
    raise exception 'approved content governor authentication required'
      using errcode = '42501';
  end if;

  select profile.*
  into profile_record
  from public.content_reviewer_profiles profile
  where profile.user_id = auth.uid()
    and profile.reviewer_role in ('english_teacher', 'content_editor', 'administrator')
    and profile.approval_status = 'approved';

  if not found then
    raise exception 'approved content governor required' using errcode = '42501';
  end if;

  if p_question_id is null or char_length(trim(p_question_id)) not between 1 and 120 then
    raise exception 'question id is invalid' using errcode = '22023';
  end if;

  return query
  select
    question.question_id,
    question.version,
    question.status,
    question.grade,
    question.skill,
    question.indicator,
    question.micro_skill,
    question.difficulty,
    question.modality,
    question.question_type,
    question.purpose,
    question.prompt,
    question.audio,
    question.image,
    question.options,
    question.correct_option_id,
    question.explanation,
    question.hints,
    question.variant_group,
    question.source,
    question.author,
    question.created_by,
    question.supersedes_version,
    question.change_summary,
    question.locked_at,
    question.reviewed_at,
    question.published_at,
    question.created_at,
    coalesce(review_counts.approval_count, 0),
    coalesce(review_counts.change_request_count, 0)
  from private.question_versions question
  left join lateral (
    select
      count(distinct review.reviewer_id) filter (
        where review.verdict = 'approved'
      )::integer as approval_count,
      count(distinct review.reviewer_id) filter (
        where review.verdict = 'changes_requested'
      )::integer as change_request_count
    from private.question_reviews review
    join public.content_reviewer_profiles reviewer
      on reviewer.user_id = review.reviewer_id
    where review.question_id = question.question_id
      and review.question_version = question.version
      and reviewer.reviewer_role = 'english_teacher'
      and reviewer.approval_status = 'approved'
  ) review_counts on true
  where question.question_id = trim(p_question_id)
  order by question.version desc;
end;
$$;

revoke execute on function public.list_question_versions(text) from public, anon;
grant execute on function public.list_question_versions(text) to authenticated;

create or replace function public.list_question_quality_signals(
  p_grade smallint default null,
  p_micro_skill text default null,
  p_status text default null,
  p_modality text default null
)
returns table (
  question_id text,
  question_version integer,
  question_status text,
  grade smallint,
  micro_skill text,
  modality text,
  prompt text,
  response_count bigint,
  independent_correct_count bigint,
  assisted_correct_count bigint,
  rescued_count bigint,
  pending_support_count bigint,
  is_disputed boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  profile_record public.content_reviewer_profiles%rowtype;
begin
  if auth.uid() is null
    or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) is true
  then
    raise exception 'approved content governor authentication required'
      using errcode = '42501';
  end if;

  select profile.*
  into profile_record
  from public.content_reviewer_profiles profile
  where profile.user_id = auth.uid()
    and profile.reviewer_role in ('english_teacher', 'content_editor', 'administrator')
    and profile.approval_status = 'approved';

  if not found then
    raise exception 'approved content governor required' using errcode = '42501';
  end if;

  if p_grade is not null and p_grade not between 3 and 6 then
    raise exception 'question grade filter is invalid' using errcode = '22023';
  end if;

  if p_status is not null
    and p_status not in ('draft', 'in_review', 'reviewed', 'published', 'disputed', 'retired')
  then
    raise exception 'question status filter is invalid' using errcode = '22023';
  end if;

  if p_modality is not null and p_modality not in ('text', 'audio', 'image') then
    raise exception 'question modality filter is invalid' using errcode = '22023';
  end if;

  return query
  select
    question.question_id,
    question.version,
    question.status,
    question.grade,
    question.micro_skill,
    question.modality,
    question.prompt,
    count(event.id) as response_count,
    count(event.id) filter (
      where event.outcome = 'independent_correct'
    ) as independent_correct_count,
    count(event.id) filter (
      where event.outcome = 'assisted_correct'
    ) as assisted_correct_count,
    count(event.id) filter (
      where event.outcome = 'rescued'
    ) as rescued_count,
    count(event.id) filter (
      where event.outcome = 'pending_support'
    ) as pending_support_count,
    question.status = 'disputed' as is_disputed
  from private.question_versions question
  left join public.classroom_learning_events event
    on event.question_id = question.question_id
    and event.question_version = question.version
  where (p_grade is null or question.grade = p_grade)
    and (p_micro_skill is null or question.micro_skill = p_micro_skill)
    and (p_status is null or question.status = p_status)
    and (p_modality is null or question.modality = p_modality)
  group by
    question.question_id,
    question.version,
    question.status,
    question.grade,
    question.micro_skill,
    question.modality,
    question.prompt
  order by question.grade, question.micro_skill, question.question_id, question.version desc;
end;
$$;

revoke execute on function public.list_question_quality_signals(smallint, text, text, text) from public, anon;
grant execute on function public.list_question_quality_signals(smallint, text, text, text) to authenticated;

create or replace function public.create_question_draft(
  p_question_id text,
  p_content jsonb
)
returns table (
  question_id text,
  question_version integer,
  question_status text,
  created_by uuid,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_record public.content_reviewer_profiles%rowtype;
  saved_question private.question_versions%rowtype;
begin
  if auth.uid() is null
    or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) is true
  then
    raise exception 'approved content author authentication required'
      using errcode = '42501';
  end if;

  select profile.*
  into profile_record
  from public.content_reviewer_profiles profile
  where profile.user_id = auth.uid()
    and profile.reviewer_role in ('content_editor', 'administrator')
    and profile.approval_status = 'approved';

  if not found then
    raise exception 'approved content editor or administrator required'
      using errcode = '42501';
  end if;

  if p_question_id is null
    or char_length(trim(p_question_id)) not between 1 and 120
    or trim(p_question_id) !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,119}$'
  then
    raise exception 'question id is invalid' using errcode = '22023';
  end if;

  perform private.validate_question_content(p_content);

  insert into private.question_versions (
    question_id,
    version,
    supersedes_version,
    change_summary,
    status,
    grade,
    skill,
    indicator,
    micro_skill,
    difficulty,
    modality,
    question_type,
    purpose,
    prompt,
    audio,
    image,
    options,
    correct_option_id,
    explanation,
    hints,
    variant_group,
    source,
    author,
    created_by
  )
  values (
    trim(p_question_id),
    1,
    null,
    null,
    'draft',
    (p_content ->> 'grade')::smallint,
    trim(p_content ->> 'skill'),
    trim(p_content ->> 'indicator'),
    trim(p_content ->> 'microSkill'),
    (p_content ->> 'difficulty')::smallint,
    trim(p_content ->> 'modality'),
    trim(p_content ->> 'questionType'),
    trim(p_content ->> 'purpose'),
    trim(p_content ->> 'prompt'),
    p_content -> 'audio',
    p_content -> 'image',
    p_content -> 'options',
    trim(p_content ->> 'correctOptionId'),
    trim(p_content ->> 'explanation'),
    array(
      select jsonb_array_elements_text(p_content -> 'hints')
    ),
    trim(p_content ->> 'variantGroup'),
    p_content -> 'source',
    jsonb_build_object(
      'id', auth.uid()::text,
      'displayName', profile_record.display_name
    ),
    auth.uid()
  )
  returning * into saved_question;

  return query
  select
    saved_question.question_id,
    saved_question.version,
    saved_question.status,
    saved_question.created_by,
    saved_question.created_at;
end;
$$;

revoke execute on function public.create_question_draft(text, jsonb) from public, anon;
grant execute on function public.create_question_draft(text, jsonb) to authenticated;

create or replace function public.import_question_drafts(p_drafts jsonb)
returns table (
  question_id text,
  question_version integer,
  question_status text,
  created_by uuid,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_record public.content_reviewer_profiles%rowtype;
  draft_record jsonb;
  draft_count integer;
  distinct_question_id_count integer;
begin
  if auth.uid() is null
    or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) is true
  then
    raise exception 'approved content author authentication required'
      using errcode = '42501';
  end if;

  select profile.*
  into profile_record
  from public.content_reviewer_profiles profile
  where profile.user_id = auth.uid()
    and profile.reviewer_role in ('content_editor', 'administrator')
    and profile.approval_status = 'approved';

  if not found then
    raise exception 'approved content editor or administrator required'
      using errcode = '42501';
  end if;

  if p_drafts is null or jsonb_typeof(p_drafts) <> 'array' then
    raise exception 'draft import must be an array' using errcode = '22023';
  end if;

  if jsonb_array_length(p_drafts) not between 1 and 200 then
    raise exception 'draft import must contain 1 to 200 questions' using errcode = '22023';
  end if;

  select
    count(*)::integer,
    count(distinct trim(draft_value ->> 'questionId'))::integer
  into draft_count, distinct_question_id_count
  from jsonb_array_elements(p_drafts) as draft(draft_value);

  if exists (
    select 1
    from jsonb_array_elements(p_drafts) as draft(draft_value)
    where jsonb_typeof(draft_value) <> 'object'
      or char_length(trim(coalesce(draft_value ->> 'questionId', ''))) not between 1 and 120
      or trim(draft_value ->> 'questionId') !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,119}$'
  ) then
    raise exception 'draft import contains an invalid question id' using errcode = '22023';
  end if;

  if distinct_question_id_count <> draft_count then
    raise exception 'draft import question ids must be distinct' using errcode = '22023';
  end if;

  -- Validate every item before the first insert. PostgreSQL executes this RPC as
  -- one statement, so any later conflict also rolls back the complete import.
  for draft_record in
    select draft_value
    from jsonb_array_elements(p_drafts) as draft(draft_value)
  loop
    perform private.validate_question_content(draft_record -> 'content');
  end loop;

  for draft_record in
    select draft_value
    from jsonb_array_elements(p_drafts) as draft(draft_value)
  loop
    return query
    select created.*
    from public.create_question_draft(
      draft_record ->> 'questionId',
      draft_record -> 'content'
    ) as created;
  end loop;
end;
$$;

revoke execute on function public.import_question_drafts(jsonb) from public, anon;
grant execute on function public.import_question_drafts(jsonb) to authenticated;

create or replace function public.create_question_revision(
  p_question_id text,
  p_from_version integer,
  p_change_summary text,
  p_content jsonb
)
returns table (
  question_id text,
  question_version integer,
  question_status text,
  supersedes_version integer,
  change_summary text,
  created_by uuid,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_record public.content_reviewer_profiles%rowtype;
  latest_question private.question_versions%rowtype;
  saved_question private.question_versions%rowtype;
  transition_at timestamptz := now();
begin
  if auth.uid() is null
    or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) is true
  then
    raise exception 'approved content author authentication required'
      using errcode = '42501';
  end if;

  select profile.*
  into profile_record
  from public.content_reviewer_profiles profile
  where profile.user_id = auth.uid()
    and profile.reviewer_role in ('content_editor', 'administrator')
    and profile.approval_status = 'approved';

  if not found then
    raise exception 'approved content editor or administrator required'
      using errcode = '42501';
  end if;

  if p_question_id is null or char_length(trim(p_question_id)) not between 1 and 120
    or p_from_version is null or p_from_version < 1
  then
    raise exception 'source question version is invalid' using errcode = '22023';
  end if;

  if p_change_summary is null
    or char_length(trim(p_change_summary)) not between 4 and 500
  then
    raise exception 'revision summary must contain 4 to 500 characters'
      using errcode = '22023';
  end if;

  perform private.validate_question_content(p_content);

  select question.*
  into latest_question
  from private.question_versions question
  where question.question_id = trim(p_question_id)
  order by question.version desc
  limit 1
  for update;

  if not found then
    raise exception 'source question version not found' using errcode = 'P0002';
  end if;

  if latest_question.version <> p_from_version then
    raise exception 'revision must start from the latest question version'
      using errcode = '40001';
  end if;

  if latest_question.locked_at is null then
    raise exception 'finish the current draft before creating another revision'
      using errcode = 'P0001';
  end if;

  insert into private.question_versions (
    question_id,
    version,
    supersedes_version,
    change_summary,
    status,
    grade,
    skill,
    indicator,
    micro_skill,
    difficulty,
    modality,
    question_type,
    purpose,
    prompt,
    audio,
    image,
    options,
    correct_option_id,
    explanation,
    hints,
    variant_group,
    source,
    author,
    created_by,
    created_at
  )
  values (
    latest_question.question_id,
    latest_question.version + 1,
    latest_question.version,
    trim(p_change_summary),
    'draft',
    (p_content ->> 'grade')::smallint,
    trim(p_content ->> 'skill'),
    trim(p_content ->> 'indicator'),
    trim(p_content ->> 'microSkill'),
    (p_content ->> 'difficulty')::smallint,
    trim(p_content ->> 'modality'),
    trim(p_content ->> 'questionType'),
    trim(p_content ->> 'purpose'),
    trim(p_content ->> 'prompt'),
    p_content -> 'audio',
    p_content -> 'image',
    p_content -> 'options',
    trim(p_content ->> 'correctOptionId'),
    trim(p_content ->> 'explanation'),
    array(
      select jsonb_array_elements_text(p_content -> 'hints')
    ),
    trim(p_content ->> 'variantGroup'),
    p_content -> 'source',
    jsonb_build_object(
      'id', auth.uid()::text,
      'displayName', profile_record.display_name
    ),
    auth.uid(),
    transition_at
  )
  returning * into saved_question;

  insert into private.question_status_events (
    question_id,
    question_version,
    actor_id,
    event_type,
    from_status,
    to_status,
    note,
    details,
    created_at
  )
  values (
    saved_question.question_id,
    saved_question.version,
    auth.uid(),
    'revision_created',
    latest_question.status,
    saved_question.status,
    trim(p_change_summary),
    jsonb_build_object('supersedes_version', latest_question.version),
    transition_at
  );

  return query
  select
    saved_question.question_id,
    saved_question.version,
    saved_question.status,
    saved_question.supersedes_version,
    saved_question.change_summary,
    saved_question.created_by,
    saved_question.created_at;
end;
$$;

revoke execute on function public.create_question_revision(text, integer, text, jsonb) from public, anon;
grant execute on function public.create_question_revision(text, integer, text, jsonb) to authenticated;

create or replace function public.submit_question_for_review(
  p_question_id text,
  p_question_version integer,
  p_note text
)
returns table (
  question_id text,
  question_version integer,
  question_status text,
  locked_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_record public.content_reviewer_profiles%rowtype;
  question_record private.question_versions%rowtype;
  transition_at timestamptz := now();
begin
  if auth.uid() is null
    or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) is true
  then
    raise exception 'approved content author authentication required'
      using errcode = '42501';
  end if;

  select profile.*
  into profile_record
  from public.content_reviewer_profiles profile
  where profile.user_id = auth.uid()
    and profile.reviewer_role in ('content_editor', 'administrator')
    and profile.approval_status = 'approved';

  if not found then
    raise exception 'approved content editor or administrator required'
      using errcode = '42501';
  end if;

  if p_note is null or char_length(trim(p_note)) not between 4 and 1000 then
    raise exception 'review submission note must contain 4 to 1000 characters'
      using errcode = '22023';
  end if;

  select question.*
  into question_record
  from private.question_versions question
  where question.question_id = trim(p_question_id)
    and question.version = p_question_version
  for update;

  if not found then
    raise exception 'question version not found' using errcode = 'P0002';
  end if;

  if question_record.status <> 'draft' or question_record.locked_at is not null then
    raise exception 'only an unlocked draft can be submitted for review'
      using errcode = 'P0001';
  end if;

  update private.question_versions as question
  set
    status = 'in_review',
    locked_at = transition_at
  where question.question_id = question_record.question_id
    and question.version = question_record.version
  returning question.* into question_record;

  insert into private.question_status_events (
    question_id,
    question_version,
    actor_id,
    event_type,
    from_status,
    to_status,
    note,
    details,
    created_at
  )
  values (
    question_record.question_id,
    question_record.version,
    auth.uid(),
    'submitted_for_review',
    'draft',
    question_record.status,
    trim(p_note),
    jsonb_build_object('locked_at', transition_at),
    transition_at
  );

  return query
  select
    question_record.question_id,
    question_record.version,
    question_record.status,
    question_record.locked_at;
end;
$$;

revoke execute on function public.submit_question_for_review(text, integer, text) from public, anon;
grant execute on function public.submit_question_for_review(text, integer, text) to authenticated;

create or replace function private.prevent_question_version_content_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'question versions cannot be deleted' using errcode = '55000';
  end if;

  if (
    old.locked_at is not null
    or old.status <> 'draft'
    or new.status <> 'draft'
  )
    and row(
      old.question_id,
      old.version,
      old.supersedes_version,
      old.change_summary,
      old.grade,
      old.skill,
      old.indicator,
      old.micro_skill,
      old.difficulty,
      old.modality,
      old.question_type,
      old.purpose,
      old.prompt,
      old.audio,
      old.image,
      old.options,
      old.correct_option_id,
      old.explanation,
      old.hints,
      old.variant_group,
      old.source,
      old.author,
      old.created_by,
      old.created_at
    ) is distinct from row(
      new.question_id,
      new.version,
      new.supersedes_version,
      new.change_summary,
      new.grade,
      new.skill,
      new.indicator,
      new.micro_skill,
      new.difficulty,
      new.modality,
      new.question_type,
      new.purpose,
      new.prompt,
      new.audio,
      new.image,
      new.options,
      new.correct_option_id,
      new.explanation,
      new.hints,
      new.variant_group,
      new.source,
      new.author,
      new.created_by,
      new.created_at
    )
  then
    raise exception 'frozen question version content is immutable'
      using errcode = '55000';
  end if;

  if old.locked_at is not null and new.locked_at is distinct from old.locked_at then
    raise exception 'a frozen question version cannot be unlocked'
      using errcode = '55000';
  end if;

  if new.status in ('in_review', 'reviewed', 'published', 'disputed')
    and new.locked_at is null
  then
    raise exception 'a governed question version must be frozen'
      using errcode = '55000';
  end if;

  return new;
end;
$$;

revoke execute on function private.prevent_question_version_content_mutation()
from public, anon, authenticated;

create trigger question_versions_content_immutable
before update or delete on private.question_versions
for each row execute function private.prevent_question_version_content_mutation();

create or replace function private.prevent_question_governance_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception '% is append-only', tg_table_name using errcode = '55000';
end;
$$;

revoke execute on function private.prevent_question_governance_mutation()
from public, anon, authenticated;

create trigger question_reviews_immutable
before update or delete on private.question_reviews
for each row execute function private.prevent_question_governance_mutation();

create trigger question_status_events_immutable
before update or delete on private.question_status_events
for each row execute function private.prevent_question_governance_mutation();

create or replace function public.list_question_review_queue()
returns table (
  question_id text,
  question_version integer,
  question_status text,
  grade smallint,
  skill text,
  indicator text,
  micro_skill text,
  difficulty smallint,
  modality text,
  question_type text,
  purpose text,
  prompt text,
  audio jsonb,
  image jsonb,
  options jsonb,
  correct_option_id text,
  explanation text,
  hints text[],
  variant_group text,
  source jsonb,
  author jsonb,
  created_by uuid,
  supersedes_version integer,
  change_summary text,
  locked_at timestamptz,
  created_at timestamptz,
  approval_count integer,
  change_request_count integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    question.question_id,
    question.version,
    question.status,
    question.grade,
    question.skill,
    question.indicator,
    question.micro_skill,
    question.difficulty,
    question.modality,
    question.question_type,
    question.purpose,
    question.prompt,
    question.audio,
    question.image,
    question.options,
    question.correct_option_id,
    question.explanation,
    question.hints,
    question.variant_group,
    question.source,
    question.author,
    question.created_by,
    question.supersedes_version,
    question.change_summary,
    question.locked_at,
    question.created_at,
    coalesce(review_counts.approval_count, 0),
    coalesce(review_counts.change_request_count, 0)
  from public.content_reviewer_profiles profile
  cross join private.question_versions question
  left join lateral (
    select
      count(*) filter (where review.verdict = 'approved')::integer as approval_count,
      count(*) filter (where review.verdict = 'changes_requested')::integer
        as change_request_count
    from private.question_reviews review
    join public.content_reviewer_profiles reviewer
      on reviewer.user_id = review.reviewer_id
    where review.question_id = question.question_id
      and review.question_version = question.version
      and reviewer.reviewer_role = 'english_teacher'
      and reviewer.approval_status = 'approved'
  ) review_counts on true
  where profile.user_id = auth.uid()
    and profile.reviewer_role = 'english_teacher'
    and profile.approval_status = 'approved'
    and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) is false
    and question.status = 'in_review'
    and question.locked_at is not null
    and question.created_by is distinct from auth.uid()
    and not exists (
      select 1
      from private.question_reviews review
      where review.question_id = question.question_id
        and review.question_version = question.version
        and review.reviewer_id = auth.uid()
    )
  order by question.grade, question.micro_skill, question.created_at, question.question_id;
$$;

revoke execute on function public.list_question_review_queue() from public, anon;
grant execute on function public.list_question_review_queue() to authenticated;

create or replace function public.submit_question_review(
  p_question_id text,
  p_question_version integer,
  p_verdict text,
  p_criteria jsonb,
  p_note text
)
returns table (
  question_id text,
  question_version integer,
  question_status text,
  approval_count integer,
  change_request_count integer,
  reviewed_at timestamptz,
  review_recorded_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_record public.content_reviewer_profiles%rowtype;
  question_record private.question_versions%rowtype;
  saved_review_id uuid;
  saved_approval_count integer;
  saved_change_request_count integer;
  prior_status text;
  transition_at timestamptz := now();
begin
  if auth.uid() is null
    or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) is true
  then
    raise exception 'approved English-teacher reviewer authentication required'
      using errcode = '42501';
  end if;

  select profile.*
  into profile_record
  from public.content_reviewer_profiles profile
  where profile.user_id = auth.uid()
    and profile.reviewer_role = 'english_teacher'
    and profile.approval_status = 'approved';

  if not found then
    raise exception 'approved English-teacher reviewer required' using errcode = '42501';
  end if;

  if p_question_id is null or char_length(trim(p_question_id)) = 0
    or p_question_version is null or p_question_version < 1
  then
    raise exception 'question version is invalid' using errcode = '22023';
  end if;

  if p_verdict not in ('approved', 'changes_requested') then
    raise exception 'review verdict is invalid' using errcode = '22023';
  end if;

  if p_criteria is null or jsonb_typeof(p_criteria) <> 'object' then
    raise exception 'review criteria must be an object' using errcode = '22023';
  end if;

  if p_verdict = 'approved'
    and not p_criteria @> '{
      "english_correct": true,
      "answer_unique": true,
      "explanation_correct": true,
      "hint_safe": true,
      "asset_consistent": true,
      "rights_clear": true,
      "age_appropriate": true
    }'::jsonb
  then
    raise exception 'every review criterion must pass before approval'
      using errcode = '22023';
  end if;

  if p_note is null or char_length(trim(p_note)) not between 4 and 1000 then
    raise exception 'review note must contain 4 to 1000 characters' using errcode = '22023';
  end if;

  select question.*
  into question_record
  from private.question_versions question
  where question.question_id = trim(p_question_id)
    and question.version = p_question_version
  for update;

  if not found or question_record.status <> 'in_review' then
    raise exception 'question is not open for review' using errcode = 'P0001';
  end if;

  if question_record.created_by = auth.uid() then
    raise exception 'question authors cannot review their own version' using errcode = '42501';
  end if;

  prior_status := question_record.status;

  insert into private.question_reviews (
    question_id,
    question_version,
    reviewer_id,
    reviewer_role_snapshot,
    verdict,
    criteria,
    note,
    created_at
  )
  values (
    question_record.question_id,
    question_record.version,
    auth.uid(),
    profile_record.reviewer_role,
    p_verdict,
    p_criteria,
    trim(p_note),
    transition_at
  )
  returning id into saved_review_id;

  select
    count(distinct review.reviewer_id) filter (
      where review.verdict = 'approved'
    )::integer,
    count(distinct review.reviewer_id) filter (
      where review.verdict = 'changes_requested'
    )::integer
  into saved_approval_count, saved_change_request_count
  from private.question_reviews review
  join public.content_reviewer_profiles reviewer
    on reviewer.user_id = review.reviewer_id
  where review.question_id = question_record.question_id
    and review.question_version = question_record.version
    and reviewer.reviewer_role = 'english_teacher'
    and reviewer.approval_status = 'approved';

  if saved_change_request_count > 0 then
    update private.question_versions as question
    set status = 'disputed'
    where question.question_id = question_record.question_id
      and question.version = question_record.version
    returning question.* into question_record;
  elsif saved_approval_count >= 2 then
    update private.question_versions as question
    set
      status = 'reviewed',
      reviewed_at = transition_at
    where question.question_id = question_record.question_id
      and question.version = question_record.version
    returning question.* into question_record;
  end if;

  insert into private.question_status_events (
    question_id,
    question_version,
    actor_id,
    event_type,
    from_status,
    to_status,
    note,
    details,
    created_at
  )
  values (
    question_record.question_id,
    question_record.version,
    auth.uid(),
    'review_recorded',
    prior_status,
    question_record.status,
    trim(p_note),
    jsonb_build_object(
      'review_id', saved_review_id,
      'verdict', p_verdict,
      'criteria', p_criteria,
      'approval_count', saved_approval_count,
      'change_request_count', saved_change_request_count
    ),
    transition_at
  );

  if question_record.status <> prior_status then
    insert into private.question_status_events (
      question_id,
      question_version,
      actor_id,
      event_type,
      from_status,
      to_status,
      note,
      details,
      created_at
    )
    values (
      question_record.question_id,
      question_record.version,
      auth.uid(),
      case
        when question_record.status = 'reviewed' then 'marked_reviewed'
        else 'disputed'
      end,
      prior_status,
      question_record.status,
      case
        when question_record.status = 'reviewed' then 'Two distinct approved reviews recorded'
        else 'A reviewer requested changes'
      end,
      jsonb_build_object(
        'approval_count', saved_approval_count,
        'change_request_count', saved_change_request_count
      ),
      transition_at
    );
  end if;

  return query
  select
    question_record.question_id,
    question_record.version,
    question_record.status,
    saved_approval_count,
    saved_change_request_count,
    question_record.reviewed_at,
    transition_at;
exception
  when unique_violation then
    raise exception 'reviewer has already reviewed this question version'
      using errcode = '23505';
end;
$$;

revoke execute on function public.submit_question_review(text, integer, text, jsonb, text)
from public, anon;
grant execute on function public.submit_question_review(text, integer, text, jsonb, text)
to authenticated;

create or replace function public.publish_question_version(
  p_question_id text,
  p_question_version integer,
  p_note text
)
returns table (
  question_id text,
  question_version integer,
  question_status text,
  published_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_record public.content_reviewer_profiles%rowtype;
  question_record private.question_versions%rowtype;
  saved_approval_count integer;
  transition_at timestamptz := now();
begin
  if auth.uid() is null
    or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) is true
  then
    raise exception 'approved content administrator authentication required'
      using errcode = '42501';
  end if;

  select profile.*
  into profile_record
  from public.content_reviewer_profiles profile
  where profile.user_id = auth.uid()
    and profile.reviewer_role = 'administrator'
    and profile.approval_status = 'approved';

  if not found then
    raise exception 'approved content administrator required' using errcode = '42501';
  end if;

  if p_note is null or char_length(trim(p_note)) not between 4 and 1000 then
    raise exception 'publication note must contain 4 to 1000 characters' using errcode = '22023';
  end if;

  select question.*
  into question_record
  from private.question_versions question
  where question.question_id = trim(p_question_id)
    and question.version = p_question_version
  for update;

  if not found then
    raise exception 'question version not found' using errcode = 'P0002';
  end if;

  if question_record.status <> 'reviewed' then
    raise exception 'only a reviewed question version can be published' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from private.question_versions published
    where published.question_id = question_record.question_id
      and published.version <> question_record.version
      and published.status = 'published'
  ) then
    raise exception 'another published version must be retired first'
      using errcode = 'P0001';
  end if;

  select count(distinct review.reviewer_id)::integer
  into saved_approval_count
  from private.question_reviews review
  join public.content_reviewer_profiles reviewer
    on reviewer.user_id = review.reviewer_id
  where review.question_id = question_record.question_id
    and review.question_version = question_record.version
    and review.verdict = 'approved'
    and reviewer.reviewer_role = 'english_teacher'
    and reviewer.approval_status = 'approved';

  if saved_approval_count < 2 then
    raise exception 'two current approved English-teacher reviews are required'
      using errcode = 'P0001';
  end if;

  if not (
    (
      question_record.source ->> 'kind' = 'original'
      and question_record.source ->> 'usageRights' = 'original-for-project'
    )
    or (
      question_record.source ->> 'kind' = 'licensed'
      and question_record.source ->> 'usageRights' = 'licensed-for-publication'
    )
  ) then
    raise exception 'question source rights do not permit publication' using errcode = '42501';
  end if;

  if question_record.modality = 'audio'
    and lower(trim(coalesce(question_record.audio ->> 'src', ''))) like 'tts:%'
  then
    raise exception 'opaque audio asset is required for publication'
      using errcode = 'P0001';
  end if;

  update private.question_versions as question
  set
    status = 'published',
    published_at = now()
  where question.question_id = question_record.question_id
    and question.version = question_record.version
  returning question.* into question_record;

  insert into private.question_status_events (
    question_id,
    question_version,
    actor_id,
    event_type,
    from_status,
    to_status,
    note,
    details,
    created_at
  )
  values (
    question_record.question_id,
    question_record.version,
    auth.uid(),
    'published',
    'reviewed',
    question_record.status,
    trim(p_note),
    jsonb_build_object('approval_count', saved_approval_count),
    transition_at
  );

  return query
  select
    question_record.question_id,
    question_record.version,
    question_record.status,
    question_record.published_at;
end;
$$;

revoke execute on function public.publish_question_version(text, integer, text)
from public, anon;
grant execute on function public.publish_question_version(text, integer, text)
to authenticated;

create or replace function public.report_question_dispute(
  p_question_id text,
  p_question_version integer,
  p_note text
)
returns table (
  question_id text,
  question_version integer,
  question_status text,
  disputed_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_record public.content_reviewer_profiles%rowtype;
  question_record private.question_versions%rowtype;
  prior_status text;
  transition_at timestamptz := now();
begin
  if auth.uid() is null
    or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) is true
  then
    raise exception 'approved content reviewer authentication required' using errcode = '42501';
  end if;

  select profile.*
  into profile_record
  from public.content_reviewer_profiles profile
  where profile.user_id = auth.uid()
    and profile.reviewer_role in ('english_teacher', 'administrator')
    and profile.approval_status = 'approved';

  if not found then
    raise exception 'approved content reviewer required' using errcode = '42501';
  end if;

  if p_note is null or char_length(trim(p_note)) not between 4 and 1000 then
    raise exception 'dispute note must contain 4 to 1000 characters' using errcode = '22023';
  end if;

  select question.*
  into question_record
  from private.question_versions question
  where question.question_id = trim(p_question_id)
    and question.version = p_question_version
  for update;

  if not found then
    raise exception 'question version not found' using errcode = 'P0002';
  end if;

  if question_record.status not in ('in_review', 'reviewed', 'published') then
    raise exception 'question version cannot be disputed from its current status'
      using errcode = 'P0001';
  end if;

  prior_status := question_record.status;

  update private.question_versions as question
  set status = 'disputed'
  where question.question_id = question_record.question_id
    and question.version = question_record.version
  returning question.* into question_record;

  insert into private.question_status_events (
    question_id,
    question_version,
    actor_id,
    event_type,
    from_status,
    to_status,
    note,
    details,
    created_at
  )
  values (
    question_record.question_id,
    question_record.version,
    auth.uid(),
    'disputed',
    prior_status,
    question_record.status,
    trim(p_note),
    jsonb_build_object('reported_by_role', profile_record.reviewer_role),
    transition_at
  );

  return query
  select
    question_record.question_id,
    question_record.version,
    question_record.status,
    transition_at;
end;
$$;

revoke execute on function public.report_question_dispute(text, integer, text)
from public, anon;
grant execute on function public.report_question_dispute(text, integer, text)
to authenticated;

create or replace function public.retire_question_version(
  p_question_id text,
  p_question_version integer,
  p_note text
)
returns table (
  question_id text,
  question_version integer,
  question_status text,
  retired_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_record public.content_reviewer_profiles%rowtype;
  question_record private.question_versions%rowtype;
  prior_status text;
  transition_at timestamptz := now();
begin
  if auth.uid() is null
    or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) is true
  then
    raise exception 'approved content administrator authentication required'
      using errcode = '42501';
  end if;

  select profile.*
  into profile_record
  from public.content_reviewer_profiles profile
  where profile.user_id = auth.uid()
    and profile.reviewer_role = 'administrator'
    and profile.approval_status = 'approved';

  if not found then
    raise exception 'approved content administrator required' using errcode = '42501';
  end if;

  if p_note is null or char_length(trim(p_note)) not between 4 and 1000 then
    raise exception 'retirement note must contain 4 to 1000 characters' using errcode = '22023';
  end if;

  select question.*
  into question_record
  from private.question_versions question
  where question.question_id = trim(p_question_id)
    and question.version = p_question_version
  for update;

  if not found then
    raise exception 'question version not found' using errcode = 'P0002';
  end if;

  if question_record.status = 'retired' then
    raise exception 'question version is already retired' using errcode = 'P0001';
  end if;

  prior_status := question_record.status;

  update private.question_versions as question
  set status = 'retired'
  where question.question_id = question_record.question_id
    and question.version = question_record.version
  returning question.* into question_record;

  insert into private.question_status_events (
    question_id,
    question_version,
    actor_id,
    event_type,
    from_status,
    to_status,
    note,
    details,
    created_at
  )
  values (
    question_record.question_id,
    question_record.version,
    auth.uid(),
    'retired',
    prior_status,
    question_record.status,
    trim(p_note),
    '{}'::jsonb,
    transition_at
  );

  return query
  select
    question_record.question_id,
    question_record.version,
    question_record.status,
    transition_at;
end;
$$;

revoke execute on function public.retire_question_version(text, integer, text)
from public, anon;
grant execute on function public.retire_question_version(text, integer, text)
to authenticated;

create or replace function public.start_classroom_activity(p_activity_id uuid)
returns table (
  activity_id uuid,
  activity_status text,
  started_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null
    or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) is true
  then
    raise exception 'approved teacher authentication required' using errcode = '42501';
  end if;

  return query
  update public.classroom_activities as activity
  set
    status = 'active',
    started_at = now(),
    updated_at = now()
  where activity.id = p_activity_id
    and activity.teacher_id = auth.uid()
    and activity.status = 'waiting'
    and exists (
      select 1
      from public.teacher_profiles profile
      where profile.user_id = auth.uid()
        and profile.approval_status = 'approved'
    )
    and (
      select count(*)
      from public.activity_questions question
      where question.activity_id = activity.id
    ) = activity.question_count
  returning activity.id, activity.status, activity.started_at;

  if not found then
    raise exception 'activity cannot be started' using errcode = 'P0001';
  end if;
end;
$$;

revoke execute on function public.start_classroom_activity(uuid) from public, anon;
grant execute on function public.start_classroom_activity(uuid) to authenticated;

create or replace function public.end_classroom_activity(p_activity_id uuid)
returns table (
  activity_id uuid,
  activity_status text,
  ended_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null
    or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) is true
  then
    raise exception 'approved teacher authentication required' using errcode = '42501';
  end if;

  return query
  update public.classroom_activities as activity
  set
    status = 'ended',
    join_closes_at = least(activity.join_closes_at, now()),
    ended_at = now(),
    updated_at = now()
  where activity.id = p_activity_id
    and activity.teacher_id = auth.uid()
    and activity.status in ('waiting', 'active')
    and exists (
      select 1
      from public.teacher_profiles profile
      where profile.user_id = auth.uid()
        and profile.approval_status = 'approved'
    )
  returning activity.id, activity.status, activity.ended_at;

  if not found then
    raise exception 'activity cannot be ended' using errcode = 'P0001';
  end if;
end;
$$;

revoke execute on function public.end_classroom_activity(uuid) from public, anon;
grant execute on function public.end_classroom_activity(uuid) to authenticated;

create or replace function public.close_classroom_activity_join(p_activity_id uuid)
returns table (
  activity_id uuid,
  activity_status text,
  join_closes_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null
    or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) is true
  then
    raise exception 'approved teacher authentication required' using errcode = '42501';
  end if;

  return query
  update public.classroom_activities as activity
  set
    join_closes_at = now(),
    updated_at = now()
  where activity.id = p_activity_id
    and activity.teacher_id = auth.uid()
    and activity.status in ('waiting', 'active')
    and activity.join_closes_at > now()
    and exists (
      select 1
      from public.teacher_profiles profile
      where profile.user_id = auth.uid()
        and profile.approval_status = 'approved'
    )
  returning activity.id, activity.status, activity.join_closes_at;

  if not found then
    raise exception 'activity join is already closed' using errcode = 'P0001';
  end if;
end;
$$;

revoke execute on function public.close_classroom_activity_join(uuid) from public, anon;
grant execute on function public.close_classroom_activity_join(uuid) to authenticated;

create or replace function public.get_student_activity_state(p_activity_id uuid)
returns table (
  activity_status text,
  activity_title text,
  grade smallint,
  question_count smallint,
  contribution_count integer,
  repaired_points integer,
  boss_armor integer,
  participant_state text,
  answered_count integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    activity.status,
    activity.title,
    activity.grade,
    activity.question_count,
    coalesce(progress.contribution_count, 0),
    coalesce(progress.repaired_points, 0),
    coalesce(progress.boss_armor, 0),
    participant.state,
    (
      select count(*)::integer
      from public.activity_responses response
      where response.activity_id = activity.id
        and response.participant_id = participant.id
        and response.judgment_status = 'judged'
    )
  from public.activity_participants participant
  join public.classroom_activities activity on activity.id = participant.activity_id
  left join public.classroom_story_progress progress on progress.activity_id = activity.id
  where participant.activity_id = p_activity_id
    and participant.auth_user_id = auth.uid();
$$;

revoke execute on function public.get_student_activity_state(uuid) from public, anon;
grant execute on function public.get_student_activity_state(uuid) to authenticated;

create or replace function public.get_student_activity_questions(p_activity_id uuid)
returns table (
  position smallint,
  question_id text,
  question_version integer,
  grade smallint,
  micro_skill text,
  purpose text,
  modality text,
  question_type text,
  prompt text,
  options jsonb,
  audio_src text,
  image_src text,
  image_alt text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    question.position,
    question.question_id,
    question.question_version,
    activity.grade,
    activity.micro_skill,
    question.purpose,
    question.modality,
    question.question_type,
    question.prompt,
    question.options,
    question.audio_src,
    question.image_src,
    question.image_alt
  from public.activity_participants participant
  join public.classroom_activities activity on activity.id = participant.activity_id
  join public.activity_questions question on question.activity_id = activity.id
  where participant.activity_id = p_activity_id
    and participant.auth_user_id = auth.uid()
    and activity.status = 'active'
    and not exists (
      select 1
      from public.activity_responses response
      where response.activity_id = activity.id
        and response.participant_id = participant.id
        and response.question_id = question.question_id
        and response.question_version = question.question_version
        and response.judgment_status = 'judged'
    )
  order by question.position;
$$;

revoke execute on function public.get_student_activity_questions(uuid) from public, anon;
grant execute on function public.get_student_activity_questions(uuid) to authenticated;

create or replace function public.submit_classroom_response(
  p_activity_id uuid,
  p_participant_id uuid,
  p_question_id text,
  p_question_version integer,
  p_selected_option_id text,
  p_device_event_id uuid
)
returns table (
  submitted_response_id uuid,
  learning_outcome text,
  answer_explanation text,
  answer_correct_option_id text,
  shared_repaired_points integer,
  shared_boss_armor integer,
  updated_participant_state text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  participant_record public.activity_participants%rowtype;
  activity_record public.classroom_activities%rowtype;
  question_record private.question_versions%rowtype;
  existing_response public.activity_responses%rowtype;
  saved_response_id uuid;
  saved_outcome text;
  new_participant_state text;
  answered_count integer;
  needs_support boolean;
  is_correct boolean;
  repaired_increment integer;
  progress_repaired_points integer;
  progress_boss_armor integer;
begin
  if auth.uid() is null then
    raise exception 'authenticated participant required' using errcode = '42501';
  end if;

  select participant.*
  into participant_record
  from public.activity_participants participant
  join public.classroom_activities activity on activity.id = participant.activity_id
  where participant.id = p_participant_id
    and participant.activity_id = p_activity_id
    and participant.auth_user_id = auth.uid()
    and activity.status = 'active'
  for update of participant;

  if not found then
    raise exception 'active participant required' using errcode = '42501';
  end if;

  select activity.*
  into activity_record
  from public.classroom_activities activity
  where activity.id = p_activity_id;

  select private_question.*
  into question_record
  from public.activity_questions assigned_question
  join private.question_versions private_question
    on private_question.question_id = assigned_question.question_id
    and private_question.version = assigned_question.question_version
  where assigned_question.activity_id = p_activity_id
    and assigned_question.question_id = p_question_id
    and assigned_question.question_version = p_question_version;

  if not found then
    raise exception 'question is not assigned to this activity' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from jsonb_array_elements(question_record.options) option
    where option ->> 'id' = p_selected_option_id
  ) then
    raise exception 'selected option is invalid' using errcode = '22023';
  end if;

  select response.*
  into existing_response
  from public.activity_responses response
  where response.device_event_id = p_device_event_id;

  if found then
    if existing_response.activity_id <> p_activity_id
      or existing_response.participant_id <> p_participant_id
      or existing_response.question_id <> p_question_id
      or existing_response.question_version <> p_question_version
      or existing_response.selected_option_id <> p_selected_option_id
    then
      raise exception 'device event id already belongs to another response'
        using errcode = '23505';
    end if;

    select event.outcome
    into saved_outcome
    from public.classroom_learning_events event
    where event.response_id = existing_response.id;

    select progress.repaired_points, progress.boss_armor
    into progress_repaired_points, progress_boss_armor
    from public.classroom_story_progress progress
    where progress.activity_id = p_activity_id;

    return query
    select
      existing_response.id,
      saved_outcome,
      question_record.explanation,
      question_record.correct_option_id,
      progress_repaired_points,
      progress_boss_armor,
      participant_record.state;
    return;
  end if;

  select response.*
  into existing_response
  from public.activity_responses response
  where response.activity_id = p_activity_id
    and response.participant_id = p_participant_id
    and response.question_id = p_question_id
    and response.question_version = p_question_version;

  if found then
    select event.outcome
    into saved_outcome
    from public.classroom_learning_events event
    where event.response_id = existing_response.id;

    select progress.repaired_points, progress.boss_armor
    into progress_repaired_points, progress_boss_armor
    from public.classroom_story_progress progress
    where progress.activity_id = p_activity_id;

    return query
    select
      existing_response.id,
      saved_outcome,
      question_record.explanation,
      question_record.correct_option_id,
      progress_repaired_points,
      progress_boss_armor,
      participant_record.state;
    return;
  end if;

  is_correct := p_selected_option_id = question_record.correct_option_id;
  repaired_increment := case when is_correct then 1 else 0 end;
  saved_outcome := case
    when is_correct then 'independent_correct'
    else 'pending_support'
  end;

  insert into public.activity_responses (
    activity_id,
    participant_id,
    question_id,
    question_version,
    selected_option_id,
    hints_used,
    rescue_variant_correct,
    device_event_id,
    judgment_status,
    judged_at
  )
  values (
    p_activity_id,
    p_participant_id,
    p_question_id,
    p_question_version,
    p_selected_option_id,
    0,
    false,
    p_device_event_id,
    'judged',
    now()
  )
  returning id into saved_response_id;

  insert into public.classroom_learning_events (
    id,
    activity_id,
    participant_id,
    response_id,
    question_id,
    question_version,
    micro_skill,
    outcome,
    occurred_at,
    study_date
  )
  values (
    gen_random_uuid(),
    p_activity_id,
    p_participant_id,
    saved_response_id,
    p_question_id,
    p_question_version,
    question_record.micro_skill,
    saved_outcome,
    now(),
    (now() at time zone 'Asia/Taipei')::date
  );

  select count(*)
  into answered_count
  from public.activity_responses response
  where response.activity_id = p_activity_id
    and response.participant_id = p_participant_id
    and response.judgment_status = 'judged';

  select exists (
    select 1
    from public.classroom_learning_events event
    where event.activity_id = p_activity_id
      and event.participant_id = p_participant_id
      and event.outcome = 'pending_support'
  )
  into needs_support;

  new_participant_state := case
    when needs_support then 'may_need_help'
    when answered_count >= activity_record.question_count then 'completed'
    else 'in_progress'
  end;

  update public.activity_participants
  set
    state = new_participant_state,
    last_seen_at = now()
  where id = p_participant_id;

  insert into public.classroom_story_progress (activity_id, boss_armor)
  values (p_activity_id, activity_record.question_count)
  on conflict (activity_id) do nothing;

  update public.classroom_story_progress
  set
    contribution_count = contribution_count + 1,
    repaired_points = repaired_points + repaired_increment,
    boss_armor = greatest(boss_armor - repaired_increment, 0),
    updated_at = now()
  where activity_id = p_activity_id
  returning repaired_points, boss_armor
  into progress_repaired_points, progress_boss_armor;

  return query
  select
    saved_response_id,
    saved_outcome,
    question_record.explanation,
    question_record.correct_option_id,
    progress_repaired_points,
    progress_boss_armor,
    new_participant_state;
end;
$$;

revoke execute on function public.submit_classroom_response(uuid, uuid, text, integer, text, uuid) from public, anon;
grant execute on function public.submit_classroom_response(uuid, uuid, text, integer, text, uuid) to authenticated;

create or replace function public.list_activity_participant_status(p_activity_id uuid)
returns table (
  nickname text,
  participant_state text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    participant.nickname,
    participant.state
  from public.activity_participants participant
  join public.classroom_activities activity on activity.id = participant.activity_id
  join public.teacher_profiles profile on profile.user_id = activity.teacher_id
  where participant.activity_id = p_activity_id
    and activity.teacher_id = auth.uid()
    and profile.approval_status = 'approved'
    and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) is false
  order by participant.joined_at;
$$;

revoke execute on function public.list_activity_participant_status(uuid) from public, anon;
grant execute on function public.list_activity_participant_status(uuid) to authenticated;

create or replace function public.list_teacher_classrooms()
returns table (
  classroom_id uuid,
  classroom_title text,
  grade smallint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    classroom.id,
    classroom.title,
    classroom.grade
  from public.classrooms classroom
  join public.teacher_profiles profile on profile.user_id = classroom.teacher_id
  where classroom.teacher_id = auth.uid()
    and classroom.archived_at is null
    and profile.approval_status = 'approved'
    and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) is false
  order by classroom.title, classroom.created_at;
$$;

revoke execute on function public.list_teacher_classrooms() from public, anon;
grant execute on function public.list_teacher_classrooms() to authenticated;

create or replace function public.create_classroom_member(
  p_classroom_id uuid,
  p_display_alias text,
  p_member_code text,
  p_group_label text
)
returns table (
  member_id uuid,
  member_code text,
  display_alias text,
  group_label text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_member public.classroom_members%rowtype;
  normalized_member_code text := upper(trim(p_member_code));
  normalized_group_label text := nullif(trim(p_group_label), '');
begin
  if auth.uid() is null
    or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) is true
    or not exists (
      select 1
      from public.classrooms classroom
      join public.teacher_profiles profile on profile.user_id = classroom.teacher_id
      where classroom.id = p_classroom_id
        and classroom.teacher_id = auth.uid()
        and classroom.archived_at is null
        and profile.approval_status = 'approved'
    )
  then
    raise exception 'approved classroom owner required' using errcode = '42501';
  end if;

  if p_display_alias is null
    or char_length(trim(p_display_alias)) not between 1 and 24
  then
    raise exception 'display alias must contain 1 to 24 characters' using errcode = '22023';
  end if;

  if normalized_member_code is null
    or normalized_member_code !~ '^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$'
  then
    raise exception 'member code must contain 6 safe characters' using errcode = '22023';
  end if;

  if normalized_group_label is not null
    and char_length(normalized_group_label) > 24
  then
    raise exception 'group label must contain at most 24 characters' using errcode = '22023';
  end if;

  insert into public.classroom_members (
    classroom_id,
    member_code,
    display_alias,
    group_label
  )
  values (
    p_classroom_id,
    normalized_member_code,
    trim(p_display_alias),
    normalized_group_label
  )
  returning * into saved_member;

  return query
  select
    saved_member.id,
    saved_member.member_code,
    saved_member.display_alias,
    saved_member.group_label;
exception
  when unique_violation then
    raise exception 'member code already exists in this classroom' using errcode = '23505';
end;
$$;

revoke execute on function public.create_classroom_member(uuid, text, text, text) from public, anon;
grant execute on function public.create_classroom_member(uuid, text, text, text) to authenticated;

create or replace function public.list_classroom_members(p_classroom_id uuid)
returns table (
  member_id uuid,
  member_code text,
  display_alias text,
  group_label text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    member.id,
    member.member_code,
    member.display_alias,
    member.group_label
  from public.classroom_members member
  join public.classrooms classroom on classroom.id = member.classroom_id
  join public.teacher_profiles profile on profile.user_id = classroom.teacher_id
  where member.classroom_id = p_classroom_id
    and member.archived_at is null
    and classroom.teacher_id = auth.uid()
    and classroom.archived_at is null
    and profile.approval_status = 'approved'
    and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) is false
  order by member.group_label nulls last, member.display_alias, member.member_code;
$$;

revoke execute on function public.list_classroom_members(uuid) from public, anon;
grant execute on function public.list_classroom_members(uuid) to authenticated;

create or replace function public.archive_classroom_member(p_member_id uuid)
returns table (
  member_id uuid,
  archived_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null
    or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) is true
  then
    raise exception 'approved teacher authentication required' using errcode = '42501';
  end if;

  return query
  update public.classroom_members as member
  set
    archived_at = now(),
    updated_at = now()
  from public.classrooms classroom
  where member.id = p_member_id
    and member.classroom_id = classroom.id
    and member.archived_at is null
    and classroom.teacher_id = auth.uid()
    and exists (
      select 1
      from public.teacher_profiles profile
      where profile.user_id = auth.uid()
        and profile.approval_status = 'approved'
    )
    and not exists (
      select 1
      from public.activity_targets target
      join public.classroom_activities activity on activity.id = target.activity_id
      where target.member_id = member.id
        and activity.status in ('waiting', 'active')
    )
  returning member.id, member.archived_at;

  if not found then
    raise exception 'classroom member cannot be archived' using errcode = 'P0001';
  end if;
end;
$$;

revoke execute on function public.archive_classroom_member(uuid) from public, anon;
grant execute on function public.archive_classroom_member(uuid) to authenticated;

create or replace function public.list_teacher_activities(p_classroom_id uuid)
returns table (
  activity_id uuid,
  activity_title text,
  join_code text,
  activity_status text,
  join_closes_at timestamptz,
  question_count smallint,
  audience text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    activity.id,
    activity.title,
    activity.join_code,
    activity.status,
    activity.join_closes_at,
    activity.question_count,
    activity.audience,
    activity.created_at
  from public.classroom_activities activity
  join public.teacher_profiles profile on profile.user_id = activity.teacher_id
  where activity.classroom_id = p_classroom_id
    and activity.teacher_id = auth.uid()
    and profile.approval_status = 'approved'
    and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) is false
  order by activity.created_at desc
  limit 20;
$$;

revoke execute on function public.list_teacher_activities(uuid) from public, anon;
grant execute on function public.list_teacher_activities(uuid) to authenticated;

create or replace function public.create_teacher_classroom(
  p_title text,
  p_grade smallint
)
returns table (
  classroom_id uuid,
  classroom_title text,
  grade smallint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_classroom public.classrooms%rowtype;
begin
  if auth.uid() is null
    or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) is true
    or not exists (
      select 1
      from public.teacher_profiles profile
      where profile.user_id = auth.uid()
        and profile.approval_status = 'approved'
    )
  then
    raise exception 'approved teacher authentication required' using errcode = '42501';
  end if;

  if p_title is null or char_length(trim(p_title)) not between 1 and 80 then
    raise exception 'classroom title must contain 1 to 80 characters'
      using errcode = '22023';
  end if;

  if p_grade is null or p_grade not between 3 and 6 then
    raise exception 'classroom grade must be between 3 and 6'
      using errcode = '22023';
  end if;

  insert into public.classrooms (teacher_id, title, grade)
  values (auth.uid(), trim(p_title), p_grade)
  returning * into saved_classroom;

  return query
  select saved_classroom.id, saved_classroom.title, saved_classroom.grade;
end;
$$;

revoke execute on function public.create_teacher_classroom(text, smallint) from public, anon;
grant execute on function public.create_teacher_classroom(text, smallint) to authenticated;

create or replace function public.archive_teacher_classroom(p_classroom_id uuid)
returns table (
  classroom_id uuid,
  archived_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null
    or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) is true
  then
    raise exception 'approved teacher authentication required' using errcode = '42501';
  end if;

  return query
  update public.classrooms as classroom
  set
    archived_at = now(),
    updated_at = now()
  where classroom.id = p_classroom_id
    and classroom.teacher_id = auth.uid()
    and classroom.archived_at is null
    and exists (
      select 1
      from public.teacher_profiles profile
      where profile.user_id = auth.uid()
        and profile.approval_status = 'approved'
    )
    and not exists (
      select 1
      from public.classroom_activities activity
      where activity.classroom_id = classroom.id
        and activity.status in ('waiting', 'active')
    )
  returning classroom.id, classroom.archived_at;

  if not found then
    raise exception 'classroom cannot be archived' using errcode = 'P0001';
  end if;
end;
$$;

revoke execute on function public.archive_teacher_classroom(uuid) from public, anon;
grant execute on function public.archive_teacher_classroom(uuid) to authenticated;

create or replace function public.list_classroom_micro_skills(p_classroom_id uuid)
returns table (
  micro_skill text,
  available_questions bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    question.micro_skill,
    count(*) as available_questions
  from public.classrooms classroom
  join public.teacher_profiles profile on profile.user_id = classroom.teacher_id
  join private.question_versions question on question.grade = classroom.grade
  where classroom.id = p_classroom_id
    and classroom.teacher_id = auth.uid()
    and classroom.archived_at is null
    and profile.approval_status = 'approved'
    and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) is false
    and question.status = 'published'
    and question.purpose in ('practice', 'boss')
    and exists (
      select 1
      from private.question_reviews review
      join public.content_reviewer_profiles reviewer
        on reviewer.user_id = review.reviewer_id
      where review.question_id = question.question_id
        and review.question_version = question.version
        and review.verdict = 'approved'
        and reviewer.reviewer_role = 'english_teacher'
        and reviewer.approval_status = 'approved'
      group by review.question_id, review.question_version
      having count(distinct review.reviewer_id) >= 2
    )
  group by question.micro_skill
  having count(*) >= 3
  order by question.micro_skill;
$$;

revoke execute on function public.list_classroom_micro_skills(uuid) from public, anon;
grant execute on function public.list_classroom_micro_skills(uuid) to authenticated;

create or replace function public.create_classroom_activity(
  p_classroom_id uuid,
  p_title text,
  p_micro_skill text,
  p_question_count smallint,
  p_audience text,
  p_join_code text,
  p_target_member_ids uuid[]
)
returns table (
  activity_id uuid,
  join_code text,
  join_closes_at timestamptz,
  activity_status text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  classroom_record public.classrooms%rowtype;
  saved_activity_id uuid;
  saved_join_code text := upper(trim(p_join_code));
  saved_join_closes_at timestamptz := now() + interval '24 hours';
  target_member_ids uuid[] := coalesce(p_target_member_ids, '{}'::uuid[]);
  target_member_count integer;
  available_question_count integer;
begin
  if auth.uid() is null
    or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) is true
  then
    raise exception 'approved teacher authentication required' using errcode = '42501';
  end if;

  if p_title is null or char_length(trim(p_title)) not between 1 and 80 then
    raise exception 'activity title must contain 1 to 80 characters' using errcode = '22023';
  end if;

  if p_micro_skill is null
    or char_length(trim(p_micro_skill)) not between 1 and 80
  then
    raise exception 'micro skill must contain 1 to 80 characters' using errcode = '22023';
  end if;

  if p_question_count not in (3, 5) then
    raise exception 'question count must be 3 or 5' using errcode = '22023';
  end if;

  if p_audience not in ('whole_class', 'small_group', 'individual') then
    raise exception 'audience is invalid' using errcode = '22023';
  end if;

  if array_position(target_member_ids, null) is not null then
    raise exception 'target member identifiers are invalid' using errcode = '22023';
  end if;

  select count(distinct target.member_id)::integer
  into target_member_count
  from unnest(target_member_ids) as target(member_id);

  if target_member_count <> cardinality(target_member_ids) then
    raise exception 'target members must be distinct' using errcode = '22023';
  end if;

  if p_audience = 'whole_class' and cardinality(target_member_ids) <> 0 then
    raise exception 'whole class cannot have target members' using errcode = '22023';
  end if;

  if p_audience = 'small_group' and cardinality(target_member_ids) < 2 then
    raise exception 'small group requires at least two members' using errcode = '22023';
  end if;

  if p_audience = 'individual' and cardinality(target_member_ids) <> 1 then
    raise exception 'individual activity requires exactly one member' using errcode = '22023';
  end if;

  if saved_join_code is null
    or saved_join_code !~ '^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$'
  then
    raise exception 'join code is invalid' using errcode = '22023';
  end if;

  select classroom.*
  into classroom_record
  from public.classrooms classroom
  join public.teacher_profiles profile on profile.user_id = classroom.teacher_id
  where classroom.id = p_classroom_id
    and classroom.teacher_id = auth.uid()
    and classroom.archived_at is null
    and profile.approval_status = 'approved'
  for update of classroom;

  if not found then
    raise exception 'approved classroom owner required' using errcode = '42501';
  end if;

  select count(*)::integer
  into target_member_count
  from public.classroom_members member
  where member.classroom_id = classroom_record.id
    and member.archived_at is null
    and member.id = any(target_member_ids);

  if target_member_count <> cardinality(target_member_ids) then
    raise exception 'target members must belong to the active classroom' using errcode = '42501';
  end if;

  select count(*)
  into available_question_count
  from private.question_versions question
  where question.status = 'published'
    and question.grade = classroom_record.grade
    and question.micro_skill = trim(p_micro_skill)
    and question.purpose in ('practice', 'boss')
    and exists (
      select 1
      from private.question_reviews review
      join public.content_reviewer_profiles reviewer
        on reviewer.user_id = review.reviewer_id
      where review.question_id = question.question_id
        and review.question_version = question.version
        and review.verdict = 'approved'
        and reviewer.reviewer_role = 'english_teacher'
        and reviewer.approval_status = 'approved'
      group by review.question_id, review.question_version
      having count(distinct review.reviewer_id) >= 2
    );

  if available_question_count < p_question_count then
    raise exception 'not enough reviewed questions for this activity' using errcode = 'P0001';
  end if;

  insert into public.classroom_activities (
    classroom_id,
    teacher_id,
    title,
    grade,
    micro_skill,
    question_count,
    audience,
    join_code,
    join_closes_at
  )
  values (
    classroom_record.id,
    auth.uid(),
    trim(p_title),
    classroom_record.grade,
    trim(p_micro_skill),
    p_question_count,
    p_audience,
    saved_join_code,
    saved_join_closes_at
  )
  returning id into saved_activity_id;

  insert into public.activity_targets (
    activity_id,
    classroom_id,
    member_id
  )
  select
    saved_activity_id,
    classroom_record.id,
    target.member_id
  from unnest(target_member_ids) as target(member_id);

  insert into public.activity_questions (
    activity_id,
    position,
    question_id,
    question_version,
    purpose,
    modality,
    question_type,
    prompt,
    options,
    audio_src,
    image_src,
    image_alt
  )
  select
    saved_activity_id,
    row_number() over (
      order by question.published_at desc, question.question_id, question.version
    )::smallint,
    question.question_id,
    question.version,
    question.purpose,
    question.modality,
    question.question_type,
    question.prompt,
    question.options,
    question.audio ->> 'src',
    question.image ->> 'src',
    question.image ->> 'alt'
  from private.question_versions question
  where question.status = 'published'
    and question.grade = classroom_record.grade
    and question.micro_skill = trim(p_micro_skill)
    and question.purpose in ('practice', 'boss')
    and exists (
      select 1
      from private.question_reviews review
      join public.content_reviewer_profiles reviewer
        on reviewer.user_id = review.reviewer_id
      where review.question_id = question.question_id
        and review.question_version = question.version
        and review.verdict = 'approved'
        and reviewer.reviewer_role = 'english_teacher'
        and reviewer.approval_status = 'approved'
      group by review.question_id, review.question_version
      having count(distinct review.reviewer_id) >= 2
    )
  order by question.published_at desc, question.question_id, question.version
  limit p_question_count;

  insert into public.classroom_story_progress (activity_id, boss_armor)
  values (saved_activity_id, p_question_count);

  return query
  select
    saved_activity_id,
    saved_join_code,
    saved_join_closes_at,
    'waiting'::text;
end;
$$;

revoke execute on function public.create_classroom_activity(uuid, text, text, smallint, text, text, uuid[]) from public, anon;
grant execute on function public.create_classroom_activity(uuid, text, text, smallint, text, text, uuid[]) to authenticated;

create or replace function public.join_classroom_activity(
  p_join_code text,
  p_nickname text,
  p_member_code text
)
returns table (
  activity_id uuid,
  participant_id uuid,
  activity_title text,
  grade smallint,
  participant_state text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  activity_record public.classroom_activities%rowtype;
  saved_participant_id uuid;
  matched_member_id uuid;
  attempt_count integer;
  normalized_nickname text := trim(p_nickname);
  normalized_member_code text := nullif(upper(trim(p_member_code)), '');
begin
  if auth.uid() is null then
    raise exception 'anonymous authentication required' using errcode = '42501';
  end if;

  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) is false then
    raise exception 'anonymous authentication required' using errcode = '42501';
  end if;

  delete from private.activity_join_attempts attempt
  where attempt.auth_user_id = auth.uid()
    and attempt.attempted_at < now() - interval '1 day';

  select count(*)::integer
  into attempt_count
  from private.activity_join_attempts attempt
  where attempt.auth_user_id = auth.uid()
    and attempt.attempted_at >= now() - interval '10 minutes';

  if attempt_count >= 12 then
    return;
  end if;

  insert into private.activity_join_attempts (auth_user_id)
  values (auth.uid());

  if p_join_code is null
    or upper(trim(p_join_code)) !~ '^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$'
  then
    return;
  end if;

  if normalized_nickname is null
    or char_length(normalized_nickname) not between 1 and 12
  then
    raise exception 'nickname must contain 1 to 12 characters' using errcode = '22023';
  end if;

  if normalized_member_code is not null
    and normalized_member_code !~ '^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$'
  then
    return;
  end if;

  select activity.*
  into activity_record
  from public.classroom_activities activity
  where activity.join_code = upper(trim(p_join_code))
    and activity.status in ('waiting', 'active')
    and activity.join_closes_at > now()
  for update;

  if not found then
    return;
  end if;

  if activity_record.audience in ('small_group', 'individual') then
    if normalized_member_code is null then
      return;
    end if;

    select member.id
    into matched_member_id
    from public.classroom_members member
    join public.activity_targets target
      on target.member_id = member.id
      and target.classroom_id = member.classroom_id
    where target.activity_id = activity_record.id
      and member.classroom_id = activity_record.classroom_id
      and member.member_code = normalized_member_code
      and member.archived_at is null;

    if not found then
      return;
    end if;
  elsif normalized_member_code is not null then
    select member.id
    into matched_member_id
    from public.classroom_members member
    where member.classroom_id = activity_record.classroom_id
      and member.member_code = normalized_member_code
      and member.archived_at is null;

    if not found then
      return;
    end if;
  end if;

  begin
    insert into public.activity_participants (
      activity_id,
      auth_user_id,
      classroom_member_id,
      nickname
    )
    values (
      activity_record.id,
      auth.uid(),
      matched_member_id,
      normalized_nickname
    )
    on conflict (activity_id, auth_user_id)
    do update set
      nickname = excluded.nickname,
      last_seen_at = now()
    returning id into saved_participant_id;
  exception
    when unique_violation then
      return;
  end;

  return query
  select
    activity_record.id,
    saved_participant_id,
    activity_record.title,
    activity_record.grade,
    'joined'::text;
end;
$$;

revoke execute on function public.join_classroom_activity(text, text, text) from public, anon;
grant execute on function public.join_classroom_activity(text, text, text) to authenticated;

create or replace function public.get_activity_learning_evidence(p_activity_id uuid)
returns table (
  activity_id uuid,
  activity_title text,
  activity_status text,
  audience text,
  micro_skill text,
  question_count smallint,
  participant_count bigint,
  responding_participant_count bigint,
  completed_participant_count bigint,
  question_position smallint,
  question_id text,
  response_count bigint,
  independent_correct_count bigint,
  pending_support_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with owned_activity as (
    select activity.*
    from public.classroom_activities activity
    join public.teacher_profiles profile on profile.user_id = activity.teacher_id
    where activity.id = p_activity_id
      and activity.teacher_id = auth.uid()
      and profile.approval_status = 'approved'
      and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) is false
  ),
  participant_response_counts as (
    select
      participant.id as participant_id,
      count(event.id)::integer as answered_count
    from owned_activity activity
    join public.activity_participants participant
      on participant.activity_id = activity.id
    left join public.classroom_learning_events event
      on event.activity_id = activity.id
      and event.participant_id = participant.id
    group by participant.id
  ),
  participant_summary as (
    select
      count(distinct participant.id) as participant_count,
      count(distinct participant.id) filter (
        where coalesce(response_count.answered_count, 0) > 0
      ) as responding_participant_count,
      count(distinct participant.id) filter (
        where coalesce(response_count.answered_count, 0) >= activity.question_count
      ) as completed_participant_count
    from owned_activity activity
    left join public.activity_participants participant
      on participant.activity_id = activity.id
    left join participant_response_counts response_count
      on response_count.participant_id = participant.id
    group by activity.id, activity.question_count
  ),
  question_summary as (
    select
      question.activity_id,
      question.position,
      question.question_id,
      count(event.id) as response_count,
      count(event.id) filter (
        where event.outcome = 'independent_correct'
      ) as independent_correct_count,
      count(event.id) filter (
        where event.outcome = 'pending_support'
      ) as pending_support_count
    from owned_activity activity
    join public.activity_questions question on question.activity_id = activity.id
    left join public.classroom_learning_events event
      on event.activity_id = question.activity_id
      and event.question_id = question.question_id
      and event.question_version = question.question_version
    group by question.activity_id, question.position, question.question_id
  )
  select
    activity.id,
    activity.title,
    activity.status,
    activity.audience,
    activity.micro_skill,
    activity.question_count,
    participant.participant_count,
    participant.responding_participant_count,
    participant.completed_participant_count,
    question.position,
    question.question_id,
    question.response_count,
    question.independent_correct_count,
    question.pending_support_count
  from owned_activity activity
  cross join participant_summary participant
  join question_summary question on question.activity_id = activity.id
  order by question.position;
$$;

revoke execute on function public.get_activity_learning_evidence(uuid) from public, anon;
grant execute on function public.get_activity_learning_evidence(uuid) to authenticated;

create or replace function private.prevent_classroom_learning_event_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'classroom learning events are immutable' using errcode = '55000';
end;
$$;

revoke execute on function private.prevent_classroom_learning_event_mutation()
from public, anon, authenticated;

create trigger classroom_learning_events_immutable
before update or delete on public.classroom_learning_events
for each row execute function private.prevent_classroom_learning_event_mutation();
