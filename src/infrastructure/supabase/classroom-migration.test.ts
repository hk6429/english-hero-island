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
      "content_reviewer_profiles",
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

    const governedPrivateTables = [
      "question_versions",
      "question_reviews",
      "question_status_events",
    ];

    for (const table of governedPrivateTables) {
      expect(migration).toContain(`create table private.${table}`);
      expect(migration).toContain(
        `alter table private.${table} enable row level security`,
      );
      expect(migration).toContain(
        `alter table private.${table} force row level security`,
      );
      expect(migration).toContain(
        `revoke all on private.${table} from public, anon, authenticated`,
      );
    }

    expect(migration).toContain(
      "create policy content_reviewer_profiles_select_own",
    );
    expect(migration).toContain("grant usage on schema public to authenticated");
    expect(migration).toContain("grant select");
    expect(migration).not.toMatch(/grant all/);
    expect(migration).not.toMatch(/to anon\b/);
  });

  it("qualifies every outer row reference inside RLS subqueries", () => {
    const requiredOuterReferences = [
      "activity.id = public.activity_questions.activity_id",
      "participant.activity_id = public.activity_questions.activity_id",
      "participant.id = public.activity_responses.participant_id",
      "participant.activity_id = public.activity_responses.activity_id",
      "question.activity_id = public.activity_responses.activity_id",
      "question.question_id = public.activity_responses.question_id",
      "question.question_version = public.activity_responses.question_version",
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

  it("creates an activity transactionally from published questions with two current approved reviews", () => {
    const createActivityFunction = migration.match(
      /create or replace function public\.create_classroom_activity[\s\S]*?\$\$;/,
    )?.[0];

    expect(createActivityFunction).toBeDefined();
    expect(createActivityFunction).toContain("security definer");
    expect(createActivityFunction).toContain("set search_path = ''");
    expect(createActivityFunction).toContain("profile.approval_status = 'approved'");
    expect(createActivityFunction).toContain("question.status = 'published'");
    expect(createActivityFunction).toContain("private.question_reviews review");
    expect(createActivityFunction).toContain(
      "public.content_reviewer_profiles reviewer",
    );
    expect(createActivityFunction).toContain("review.verdict = 'approved'");
    expect(createActivityFunction).toContain(
      "reviewer.reviewer_role = 'english_teacher'",
    );
    expect(createActivityFunction).toContain(
      "reviewer.approval_status = 'approved'",
    );
    expect(createActivityFunction).toContain(
      "count(distinct review.reviewer_id) >= 2",
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

  it("lists only micro skills backed by two current approved reviews", () => {
    const listSkillsFunction = migration.match(
      /create or replace function public\.list_classroom_micro_skills[\s\S]*?\$\$;/,
    )?.[0];

    expect(listSkillsFunction).toBeDefined();
    expect(listSkillsFunction).toContain("security definer");
    expect(listSkillsFunction).toContain("profile.approval_status = 'approved'");
    expect(listSkillsFunction).toContain("question.status = 'published'");
    expect(listSkillsFunction).toContain("private.question_reviews review");
    expect(listSkillsFunction).toContain(
      "public.content_reviewer_profiles reviewer",
    );
    expect(listSkillsFunction).toContain("review.verdict = 'approved'");
    expect(listSkillsFunction).toContain(
      "reviewer.reviewer_role = 'english_teacher'",
    );
    expect(listSkillsFunction).toContain(
      "reviewer.approval_status = 'approved'",
    );
    expect(listSkillsFunction).toContain(
      "count(distinct review.reviewer_id) >= 2",
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

  it("keeps review identities normalized and governance history append-only", () => {
    const questionTable = migration.match(
      /create table private\.question_versions[\s\S]*?\n\);/,
    )?.[0];
    const reviewTable = migration.match(
      /create table private\.question_reviews[\s\S]*?\n\);/,
    )?.[0];
    const statusEventTable = migration.match(
      /create table private\.question_status_events[\s\S]*?\n\);/,
    )?.[0];

    expect(questionTable).toBeDefined();
    expect(reviewTable).toBeDefined();
    expect(statusEventTable).toBeDefined();
    expect(questionTable).toContain("status <> 'published'");
    expect(questionTable).not.toContain("reviewers jsonb");
    expect(questionTable).toContain("reviewed_at is not null");
    expect(questionTable).toContain("published_at is not null");
    expect(reviewTable).toContain(
      "unique (question_id, question_version, reviewer_id)",
    );
    expect(migration).toContain("question_reviews_immutable");
    expect(migration).toContain("question_status_events_immutable");
    expect(migration).not.toContain(
      "grant update on private.question_reviews to authenticated",
    );
    expect(migration).not.toContain(
      "grant update on private.question_status_events to authenticated",
    );
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
    expect(migration).not.toContain(
      "alter publication supabase_realtime add table public.activity_participants",
    );
    expect(migration).not.toContain("create policy activity_participants_teacher_select");
  });

  it("does not let teacher browsers read identifiable response or learning-event rows", () => {
    expect(migration).not.toContain(
      "grant select on public.activity_responses to authenticated",
    );
    expect(migration).not.toContain(
      "grant select on public.classroom_learning_events to authenticated",
    );
    expect(migration).not.toContain("create policy activity_responses_teacher_select");
    expect(migration).not.toContain(
      "create policy classroom_learning_events_teacher_select",
    );
    expect(migration).not.toContain("create policy activity_responses_select_self");
    expect(migration).not.toContain(
      "create policy classroom_learning_events_select_self",
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
    expect(submitResponseFunction).toContain("activity_record.status <> 'active'");
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
      "grant execute on function public.submit_classroom_response(uuid, uuid, text, integer, text, integer, uuid) to authenticated",
    );
  });

  it("records revealed classroom support without counting it as independent evidence", () => {
    const submitResponseFunction = migration.match(
      /create or replace function public\.submit_classroom_response[\s\S]*?\$\$;/,
    )?.[0];

    expect(submitResponseFunction).toContain("p_hints_used integer");
    expect(submitResponseFunction).toContain(
      "p_hints_used is null or p_hints_used not between 0 and 1",
    );
    expect(submitResponseFunction).toContain(
      "existing_response.hints_used <> p_hints_used",
    );
    expect(submitResponseFunction).toContain(
      "when is_correct and p_hints_used = 0 then 'independent_correct'",
    );
    expect(submitResponseFunction).toContain(
      "when is_correct then 'assisted_correct'",
    );
    expect(submitResponseFunction).toContain("p_hints_used,");
    expect(migration).toContain(
      "grant execute on function public.submit_classroom_response(uuid, uuid, text, integer, text, integer, uuid) to authenticated",
    );
  });

  it("replays an exact committed device event after closure and rejects conflicting retries", () => {
    const submitResponseFunction = migration.match(
      /create or replace function public\.submit_classroom_response[\s\S]*?\$\$;/,
    )?.[0];

    expect(submitResponseFunction).toBeDefined();
    expect(
      submitResponseFunction?.match(
        /existing_response\.selected_option_id <> p_selected_option_id/g,
      ),
    ).toHaveLength(2);
    expect(
      submitResponseFunction?.match(/existing_response\.hints_used <> p_hints_used/g),
    ).toHaveLength(2);
    expect(
      submitResponseFunction?.indexOf("where response.device_event_id = p_device_event_id"),
    ).toBeLessThan(
      submitResponseFunction?.indexOf("if activity_record.status <> 'active' then") ??
        -1,
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
    expect(memberTable).toContain("{6}$");
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
    expect(joinFunction).toContain("private.activity_join_attempts");
    expect(joinFunction).toContain("interval '10 minutes'");
    expect(joinFunction).toContain("attempt_count >= 12");
    expect(joinFunction).not.toContain("member.display_alias =");
    expect(joinFunction).not.toContain("learner code is already joined");
  });

  it("returns only anonymous aggregates for an owned activity learning report", () => {
    const evidenceFunction = migration.match(
      /create or replace function public\.get_activity_learning_evidence[\s\S]*?\$\$;/,
    )?.[0];

    expect(evidenceFunction).toBeDefined();
    expect(evidenceFunction).toContain("security definer");
    expect(evidenceFunction).toContain("set search_path = ''");
    expect(evidenceFunction).toContain("activity.teacher_id = auth.uid()");
    expect(evidenceFunction).toContain("profile.approval_status = 'approved'");
    expect(evidenceFunction).toContain("public.activity_questions question");
    expect(evidenceFunction).toContain("public.classroom_learning_events event");
    expect(evidenceFunction).toContain("count(distinct participant.id)");
    expect(evidenceFunction).toContain("independent_correct_count");
    expect(evidenceFunction).toContain("assisted_correct_count");
    expect(evidenceFunction).toContain("where event.outcome = 'assisted_correct'");
    expect(evidenceFunction).toContain("rescued_count");
    expect(evidenceFunction).toContain("where event.outcome = 'rescued'");
    expect(evidenceFunction).toContain("pending_support_count");
    expect(evidenceFunction).not.toMatch(/nickname|auth_user_id|selected_option_id/);
    expect(evidenceFunction).not.toMatch(/correct_option_id|explanation|prompt/);
    expect(migration).toContain(
      "grant execute on function public.get_activity_learning_evidence(uuid) to authenticated",
    );
    expect(migration).toContain(
      "revoke execute on function public.get_activity_learning_evidence(uuid) from public, anon",
    );
  });
});
