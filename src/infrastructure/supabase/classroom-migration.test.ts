import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260714060651_create_classroom_core.sql",
  ),
  "utf8",
).toLowerCase();

describe("classroom core migration", () => {
  it("creates every exposed classroom table with RLS and explicit least-privilege grants", () => {
    const exposedTables = [
      "teacher_profiles",
      "classrooms",
      "classroom_members",
      "classroom_activities",
      "activity_targets",
      "activity_participants",
      "activity_questions",
      "activity_responses",
      "classroom_learning_events",
      "classroom_story_progress",
    ];

    for (const table of exposedTables) {
      expect(migration).toContain(`create table public.${table}`);
      expect(migration).toContain(`alter table public.${table} enable row level security`);
    }

    expect(migration).toContain("create table private.question_versions");
    expect(migration).toContain("grant usage on schema public to authenticated");
    expect(migration).toContain("grant select");
    expect(migration).not.toMatch(/grant all/);
    expect(migration).not.toMatch(/to anon\b/);
  });

  it("qualifies every outer row reference inside RLS subqueries", () => {
    const requiredOuterReferences = [
      "activity.id = public.activity_participants.activity_id",
      "activity.id = public.activity_questions.activity_id",
      "participant.activity_id = public.activity_questions.activity_id",
      "participant.id = public.activity_responses.participant_id",
      "participant.activity_id = public.activity_responses.activity_id",
      "question.activity_id = public.activity_responses.activity_id",
      "question.question_id = public.activity_responses.question_id",
      "question.question_version = public.activity_responses.question_version",
      "participant.id = public.classroom_learning_events.participant_id",
      "activity.id = public.classroom_learning_events.activity_id",
      "participant.activity_id = public.classroom_story_progress.activity_id",
      "activity.id = public.classroom_story_progress.activity_id",
    ];

    for (const reference of requiredOuterReferences) {
      expect(migration).toContain(reference);
    }
  });

  it("joins a live activity only through an authenticated anonymous RPC", () => {
    expect(migration).toContain(
      "create or replace function public.join_classroom_activity",
    );
    expect(migration).toMatch(
      /join_classroom_activity[\s\S]*?security definer[\s\S]*?set search_path = ''/,
    );
    expect(migration).toContain("auth.uid() is null");
    expect(migration).toContain("auth.jwt() ->> 'is_anonymous'");
    expect(migration).toContain("activity.join_code = upper(trim(p_join_code))");
    expect(migration).toContain("activity.join_closes_at > now()");
    expect(migration).toContain("insert into public.activity_participants");
    expect(migration).toContain(
      "grant execute on function public.join_classroom_activity(text, text, text) to authenticated",
    );
    expect(migration).toContain(
      "revoke execute on function public.join_classroom_activity(text, text, text) from public, anon",
    );
  });

  it("creates an activity transactionally from reviewed published questions", () => {
    const createActivityFunction = migration.match(
      /create or replace function public\.create_classroom_activity[\s\S]*?\$\$;/,
    )?.[0];

    expect(createActivityFunction).toBeDefined();
    expect(createActivityFunction).toContain("security definer");
    expect(createActivityFunction).toContain("set search_path = ''");
    expect(createActivityFunction).toContain("profile.approval_status = 'approved'");
    expect(createActivityFunction).toContain("question.status = 'published'");
    expect(createActivityFunction).toContain(
      "jsonb_array_length(question.reviewers) >= 2",
    );
    expect(createActivityFunction).toContain(
      "insert into public.activity_questions",
    );
    expect(createActivityFunction).not.toContain("correct_option_id");
    expect(createActivityFunction).not.toContain("explanation");
    expect(createActivityFunction).not.toContain("hints");
    expect(migration).toContain(
      "grant execute on function public.create_classroom_activity(uuid, text, text, smallint, text, text, uuid[]) to authenticated",
    );
  });

  it("lists only reviewed published micro skills for an approved classroom owner", () => {
    const listSkillsFunction = migration.match(
      /create or replace function public\.list_classroom_micro_skills[\s\S]*?\$\$;/,
    )?.[0];

    expect(listSkillsFunction).toBeDefined();
    expect(listSkillsFunction).toContain("security definer");
    expect(listSkillsFunction).toContain("profile.approval_status = 'approved'");
    expect(listSkillsFunction).toContain("question.status = 'published'");
    expect(listSkillsFunction).toContain(
      "jsonb_array_length(question.reviewers) >= 2",
    );
    expect(listSkillsFunction).not.toContain("correct_option_id");
    expect(listSkillsFunction).not.toContain("explanation");
    expect(listSkillsFunction).not.toContain("hints");
    expect(migration).toContain(
      "grant execute on function public.list_classroom_micro_skills(uuid) to authenticated",
    );
  });

  it("lists only the approved teacher's active classrooms", () => {
    const listClassroomsFunction = migration.match(
      /create or replace function public\.list_teacher_classrooms[\s\S]*?\$\$;/,
    )?.[0];

    expect(listClassroomsFunction).toBeDefined();
    expect(listClassroomsFunction).toContain("security definer");
    expect(listClassroomsFunction).toContain("classroom.teacher_id = auth.uid()");
    expect(listClassroomsFunction).toContain("classroom.archived_at is null");
    expect(listClassroomsFunction).toContain("profile.approval_status = 'approved'");
    expect(migration).toContain(
      "grant execute on function public.list_teacher_classrooms() to authenticated",
    );
  });

  it("rejects a published question version without two reviews and review dates", () => {
    const questionTable = migration.match(
      /create table private\.question_versions[\s\S]*?\n\);/,
    )?.[0];

    expect(questionTable).toBeDefined();
    expect(questionTable).toContain("status <> 'published'");
    expect(questionTable).toContain("jsonb_array_length(reviewers) >= 2");
    expect(questionTable).toContain("reviewed_at is not null");
    expect(questionTable).toContain("published_at is not null");
  });

  it("exposes only support-oriented participant status to the owning teacher", () => {
    const participantStatusFunction = migration.match(
      /create or replace function public\.list_activity_participant_status[\s\S]*?\$\$;/,
    )?.[0];

    expect(participantStatusFunction).toBeDefined();
    expect(participantStatusFunction).toContain("security definer");
    expect(participantStatusFunction).toContain("activity.teacher_id = auth.uid()");
    expect(participantStatusFunction).toContain("participant.nickname");
    expect(participantStatusFunction).toContain("participant.state");
    expect(participantStatusFunction).not.toContain("auth_user_id");
    expect(migration).toContain(
      "grant execute on function public.list_activity_participant_status(uuid) to authenticated",
    );
    expect(migration).toContain(
      "alter publication supabase_realtime add table public.activity_participants",
    );
  });

  it("lets only the approved owning teacher activate a complete activity", () => {
    const startActivityFunction = migration.match(
      /create or replace function public\.start_classroom_activity[\s\S]*?\$\$;/,
    )?.[0];

    expect(startActivityFunction).toBeDefined();
    expect(startActivityFunction).toContain("security definer");
    expect(startActivityFunction).toContain("activity.teacher_id = auth.uid()");
    expect(startActivityFunction).toContain("profile.approval_status = 'approved'");
    expect(startActivityFunction).toContain("activity.status = 'waiting'");
    expect(startActivityFunction).toContain(") = activity.question_count");
    expect(startActivityFunction).toContain("status = 'active'");
    expect(migration).toContain(
      "grant execute on function public.start_classroom_activity(uuid) to authenticated",
    );
  });

  it("ends waiting or active activities through an approved-teacher lifecycle RPC", () => {
    const endFunction = migration.match(
      /create or replace function public\.end_classroom_activity[\s\S]*?\$\$;/,
    )?.[0];

    expect(endFunction).toBeDefined();
    expect(endFunction).toContain("security definer");
    expect(endFunction).toContain("activity.teacher_id = auth.uid()");
    expect(endFunction).toContain("activity.status in ('waiting', 'active')");
    expect(endFunction).toContain("status = 'ended'");
    expect(endFunction).toContain("join_closes_at = least(activity.join_closes_at, now())");
    expect(migration).toContain(
      "grant execute on function public.end_classroom_activity(uuid) to authenticated",
    );
  });

  it("lets the owner revoke new joins without ending current participants", () => {
    const closeJoinFunction = migration.match(
      /create or replace function public\.close_classroom_activity_join[\s\S]*?\$\$;/,
    )?.[0];

    expect(closeJoinFunction).toBeDefined();
    expect(closeJoinFunction).toContain("security definer");
    expect(closeJoinFunction).toContain("activity.teacher_id = auth.uid()");
    expect(closeJoinFunction).toContain("activity.status in ('waiting', 'active')");
    expect(closeJoinFunction).toContain("join_closes_at = now()");
    expect(closeJoinFunction).not.toContain("status = 'ended'");
    expect(migration).toContain(
      "grant execute on function public.close_classroom_activity_join(uuid) to authenticated",
    );
  });

  it("lets a joined anonymous participant poll only safe activity state", () => {
    const studentStateFunction = migration.match(
      /create or replace function public\.get_student_activity_state[\s\S]*?\$\$;/,
    )?.[0];

    expect(studentStateFunction).toBeDefined();
    expect(studentStateFunction).toContain("security definer");
    expect(studentStateFunction).toContain("participant.auth_user_id = auth.uid()");
    expect(studentStateFunction).toContain("activity.status");
    expect(studentStateFunction).toContain("progress.repaired_points");
    expect(studentStateFunction).not.toContain("correct_option_id");
    expect(studentStateFunction).not.toContain("teacher_id");
    expect(migration).toContain(
      "grant execute on function public.get_student_activity_state(uuid) to authenticated",
    );
  });

  it("returns answer-free questions only after the participant's activity is active", () => {
    const studentQuestionsFunction = migration.match(
      /create or replace function public\.get_student_activity_questions[\s\S]*?\$\$;/,
    )?.[0];

    expect(studentQuestionsFunction).toBeDefined();
    expect(studentQuestionsFunction).toContain("security definer");
    expect(studentQuestionsFunction).toContain("participant.auth_user_id = auth.uid()");
    expect(studentQuestionsFunction).toContain("activity.status = 'active'");
    expect(studentQuestionsFunction).toContain("question.options");
    expect(studentQuestionsFunction).not.toContain("correct_option_id");
    expect(studentQuestionsFunction).not.toContain("explanation");
    expect(studentQuestionsFunction).not.toContain("hints");
    expect(studentQuestionsFunction).toContain("not exists");
    expect(studentQuestionsFunction).toContain("public.activity_responses response");
    expect(migration).toContain(
      "grant execute on function public.get_student_activity_questions(uuid) to authenticated",
    );
  });

  it("restores participant progress and returns the exact saved activity expiry", () => {
    const stateFunction = migration.match(
      /create or replace function public\.get_student_activity_state[\s\S]*?\$\$;/,
    )?.[0];
    const createFunction = migration.match(
      /create or replace function public\.create_classroom_activity[\s\S]*?\$\$;/,
    )?.[0];

    expect(stateFunction).toContain("participant_state text");
    expect(stateFunction).toContain("answered_count integer");
    expect(stateFunction).toContain("public.activity_responses response");
    expect(createFunction).toContain("saved_join_closes_at timestamptz");
    expect(createFunction).toContain("saved_join_closes_at,");
  });

  it("judges a response server-side and records one immutable learning contribution", () => {
    const submitResponseFunction = migration.match(
      /create or replace function public\.submit_classroom_response[\s\S]*?\$\$;/,
    )?.[0];

    expect(submitResponseFunction).toBeDefined();
    expect(submitResponseFunction).toContain("security definer");
    expect(submitResponseFunction).toContain("participant.auth_user_id = auth.uid()");
    expect(submitResponseFunction).toContain("activity.status = 'active'");
    expect(submitResponseFunction).toContain("question_record.correct_option_id");
    expect(submitResponseFunction).toContain("insert into public.activity_responses");
    expect(submitResponseFunction).toContain("judgment_status");
    expect(submitResponseFunction).toContain("'judged'");
    expect(submitResponseFunction).toContain("insert into public.classroom_learning_events");
    expect(submitResponseFunction).toContain("update public.activity_participants");
    expect(submitResponseFunction).toContain("update public.classroom_story_progress");
    expect(submitResponseFunction).toContain("p_device_event_id");
    expect(submitResponseFunction?.match(/into existing_response/g)).toHaveLength(2);
    expect(submitResponseFunction).toContain("response.participant_id = p_participant_id");
    expect(submitResponseFunction).toContain("response.question_id = p_question_id");
    expect(migration).not.toContain(
      "grant select, insert on public.activity_responses to authenticated",
    );
    expect(migration).toContain(
      "grant execute on function public.submit_classroom_response(uuid, uuid, text, integer, text, uuid) to authenticated",
    );
  });

  it("prevents a participant from contributing twice for the same assigned question", () => {
    const responseTable = migration.match(
      /create table public\.activity_responses[\s\S]*?\n\);/,
    )?.[0];

    expect(responseTable).toBeDefined();
    expect(responseTable).toContain(
      "unique (participant_id, activity_id, question_id, question_version)",
    );
  });

  it("prevents teachers from bypassing lifecycle RPCs with direct activity updates", () => {
    expect(migration).toContain(
      "grant select, delete on public.classroom_activities to authenticated",
    );
    expect(migration).not.toContain(
      "grant select, update, delete on public.classroom_activities to authenticated",
    );
  });

  it("manages classrooms through approved-teacher RPCs instead of direct table writes", () => {
    const createClassroomFunction = migration.match(
      /create or replace function public\.create_teacher_classroom[\s\S]*?\$\$;/,
    )?.[0];
    const archiveClassroomFunction = migration.match(
      /create or replace function public\.archive_teacher_classroom[\s\S]*?\$\$;/,
    )?.[0];

    expect(migration).toContain("grant select on public.classrooms to authenticated");
    expect(migration).not.toContain(
      "grant select, insert, update, delete on public.classrooms to authenticated",
    );
    expect(createClassroomFunction).toContain("profile.approval_status = 'approved'");
    expect(createClassroomFunction).toContain("insert into public.classrooms");
    expect(archiveClassroomFunction).toContain("activity.status in ('waiting', 'active')");
    expect(archiveClassroomFunction).toContain("archived_at = now()");
    expect(migration).toContain(
      "grant execute on function public.create_teacher_classroom(text, smallint) to authenticated",
    );
    expect(migration).toContain(
      "grant execute on function public.archive_teacher_classroom(uuid) to authenticated",
    );
  });

  it("lists only the owning teacher's recent classroom activities", () => {
    const listActivitiesFunction = migration.match(
      /create or replace function public\.list_teacher_activities[\s\S]*?\$\$;/,
    )?.[0];

    expect(listActivitiesFunction).toBeDefined();
    expect(listActivitiesFunction).toContain("security definer");
    expect(listActivitiesFunction).toContain("activity.teacher_id = auth.uid()");
    expect(listActivitiesFunction).toContain("activity.classroom_id = p_classroom_id");
    expect(listActivitiesFunction).toContain("limit 20");
    expect(migration).toContain(
      "grant execute on function public.list_teacher_activities(uuid) to authenticated",
    );
  });

  it("manages a pseudonymous classroom roster without collecting student identity", () => {
    const memberTable = migration.match(
      /create table public\.classroom_members[\s\S]*?\n\);/,
    )?.[0];

    expect(memberTable).toBeDefined();
    expect(memberTable).toContain("member_code text");
    expect(memberTable).toContain("display_alias text");
    expect(memberTable).toContain("group_label text");
    expect(memberTable).not.toMatch(/real_name|email|birthday/);
    expect(migration).toContain(
      "grant execute on function public.create_classroom_member(uuid, text, text, text) to authenticated",
    );
    expect(migration).toContain(
      "grant execute on function public.list_classroom_members(uuid) to authenticated",
    );
    expect(migration).toContain(
      "grant execute on function public.archive_classroom_member(uuid) to authenticated",
    );
  });

  it("stores same-classroom activity targets and enforces audience cardinality", () => {
    const targetTable = migration.match(
      /create table public\.activity_targets[\s\S]*?\n\);/,
    )?.[0];
    const createActivityFunction = migration.match(
      /create or replace function public\.create_classroom_activity[\s\S]*?\$\$;/,
    )?.[0];

    expect(targetTable).toBeDefined();
    expect(targetTable).toContain("foreign key (activity_id, classroom_id)");
    expect(targetTable).toContain("foreign key (member_id, classroom_id)");
    expect(createActivityFunction).toContain("p_target_member_ids uuid[]");
    expect(createActivityFunction).toContain("small group requires at least two members");
    expect(createActivityFunction).toContain("individual activity requires exactly one member");
    expect(createActivityFunction).toContain("whole class cannot have target members");
    expect(createActivityFunction).toContain("insert into public.activity_targets");
  });

  it("admits targeted students only when their learner code is on the activity target list", () => {
    const joinFunction = migration.match(
      /create or replace function public\.join_classroom_activity[\s\S]*?\$\$;/,
    )?.[0];

    expect(joinFunction).toContain("p_member_code text");
    expect(joinFunction).toContain("public.classroom_members member");
    expect(joinFunction).toContain("public.activity_targets target");
    expect(joinFunction).toContain("target.activity_id = activity_record.id");
    expect(joinFunction).toContain("classroom_member_id");
    expect(joinFunction).not.toContain("member.display_alias =");
  });
});
