create schema if not exists private;

create table public.teacher_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 80),
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
    check (member_code ~ '^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{2,8}$'),
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

create table private.question_versions (
  question_id text not null,
  version integer not null check (version > 0),
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
  reviewers jsonb not null default '[]'::jsonb check (jsonb_typeof(reviewers) = 'array'),
  reviewed_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (question_id, version),
  check (
    status <> 'published'
    or (
      jsonb_array_length(reviewers) >= 2
      and reviewed_at is not null
      and published_at is not null
    )
  )
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

alter publication supabase_realtime add table public.activity_participants;

alter table public.teacher_profiles enable row level security;
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

alter table public.teacher_profiles force row level security;
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

revoke all on public.teacher_profiles from anon, authenticated;
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

grant usage on schema public to authenticated;
grant select on public.teacher_profiles to authenticated;
grant update (display_name) on public.teacher_profiles to authenticated;
grant select on public.classrooms to authenticated;
grant select on public.classroom_members to authenticated;
grant select, delete on public.classroom_activities to authenticated;
grant select on public.activity_targets to authenticated;
grant select on public.activity_participants to authenticated;
grant select on public.activity_questions to authenticated;
grant select on public.activity_responses to authenticated;
grant select on public.classroom_learning_events to authenticated;
grant select on public.classroom_story_progress to authenticated;

grant usage on schema private to service_role;
grant select, insert, update on private.question_versions to service_role;

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

create policy activity_participants_teacher_select
on public.activity_participants for select
to authenticated
using (
  exists (
    select 1 from public.classroom_activities activity
    where activity.id = public.activity_participants.activity_id
      and activity.teacher_id = (select auth.uid())
  )
);

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

create policy activity_responses_select_self
on public.activity_responses for select
to authenticated
using (
  exists (
    select 1 from public.activity_participants participant
    where participant.id = public.activity_responses.participant_id
      and participant.auth_user_id = (select auth.uid())
  )
);

create policy activity_responses_teacher_select
on public.activity_responses for select
to authenticated
using (
  exists (
    select 1 from public.classroom_activities activity
    where activity.id = public.activity_responses.activity_id
      and activity.teacher_id = (select auth.uid())
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

create policy classroom_learning_events_select_self
on public.classroom_learning_events for select
to authenticated
using (
  exists (
    select 1 from public.activity_participants participant
    where participant.id = public.classroom_learning_events.participant_id
      and participant.auth_user_id = (select auth.uid())
  )
);

create policy classroom_learning_events_teacher_select
on public.classroom_learning_events for select
to authenticated
using (
  exists (
    select 1 from public.classroom_activities activity
    where activity.id = public.classroom_learning_events.activity_id
      and activity.teacher_id = (select auth.uid())
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
    or normalized_member_code !~ '^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{2,8}$'
  then
    raise exception 'member code must contain 2 to 8 safe characters' using errcode = '22023';
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
    and jsonb_array_length(question.reviewers) >= 2
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
    and jsonb_array_length(question.reviewers) >= 2;

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
    and jsonb_array_length(question.reviewers) >= 2
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
  normalized_nickname text := trim(p_nickname);
  normalized_member_code text := nullif(upper(trim(p_member_code)), '');
begin
  if auth.uid() is null then
    raise exception 'anonymous authentication required' using errcode = '42501';
  end if;

  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) is false then
    raise exception 'anonymous authentication required' using errcode = '42501';
  end if;

  if p_join_code is null
    or upper(trim(p_join_code)) !~ '^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$'
  then
    raise exception 'activity code is invalid or expired' using errcode = '22023';
  end if;

  if normalized_nickname is null
    or char_length(normalized_nickname) not between 1 and 12
  then
    raise exception 'nickname must contain 1 to 12 characters' using errcode = '22023';
  end if;

  if normalized_member_code is not null
    and normalized_member_code !~ '^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{2,8}$'
  then
    raise exception 'activity code or learner code is invalid' using errcode = '22023';
  end if;

  select activity.*
  into activity_record
  from public.classroom_activities activity
  where activity.join_code = upper(trim(p_join_code))
    and activity.status in ('waiting', 'active')
    and activity.join_closes_at > now()
  for update;

  if not found then
    raise exception 'activity code is invalid or expired' using errcode = 'P0002';
  end if;

  if activity_record.audience in ('small_group', 'individual') then
    if normalized_member_code is null then
      raise exception 'activity code or learner code is invalid' using errcode = 'P0002';
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
      raise exception 'activity code or learner code is invalid' using errcode = 'P0002';
    end if;
  elsif normalized_member_code is not null then
    select member.id
    into matched_member_id
    from public.classroom_members member
    where member.classroom_id = activity_record.classroom_id
      and member.member_code = normalized_member_code
      and member.archived_at is null;

    if not found then
      raise exception 'activity code or learner code is invalid' using errcode = 'P0002';
    end if;
  end if;

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

  return query
  select
    activity_record.id,
    saved_participant_id,
    activity_record.title,
    activity_record.grade,
    'joined'::text;
exception
  when unique_violation then
    raise exception 'learner code is already joined to this activity' using errcode = '23505';
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
