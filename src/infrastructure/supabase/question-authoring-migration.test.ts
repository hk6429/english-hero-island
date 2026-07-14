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

function functionBody(name: string): string | undefined {
  return migration.match(
    new RegExp(`create or replace function public\\.${name}[\\s\\S]*?\\$\\$;`),
  )?.[0];
}

function privateFunctionBody(name: string): string | undefined {
  return migration.match(
    new RegExp(`create or replace function private\\.${name}[\\s\\S]*?\\$\\$;`),
  )?.[0];
}

describe("question authoring migration", () => {
  it("creates a server-authored draft only for an approved editor or administrator", () => {
    const body = functionBody("create_question_draft");

    expect(body).toBeDefined();
    expect(body).toContain("security definer");
    expect(body).toContain("set search_path = ''");
    expect(body).toContain("coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) is true");
    expect(body).toContain("profile.reviewer_role in ('content_editor', 'administrator')");
    expect(body).toContain("profile.approval_status = 'approved'");
    expect(body).toContain("insert into private.question_versions");
    expect(body).toContain("auth.uid()");
    expect(body).toContain("'id', auth.uid()::text");
    expect(body).toContain("'draft'");
    expect(migration).toContain(
      "revoke execute on function public.create_question_draft(text, jsonb) from public, anon",
    );
    expect(migration).toContain(
      "grant execute on function public.create_question_draft(text, jsonb) to authenticated",
    );
  });

  it("validates canonical content before any draft insert", () => {
    const createDraft = functionBody("create_question_draft");
    const validator = privateFunctionBody("validate_question_content");

    expect(createDraft).toContain("private.validate_question_content(p_content)");
    expect(validator).toBeDefined();
    expect(validator).toContain("jsonb_typeof(p_content) <> 'object'");
    expect(validator).toContain("jsonb_array_length(p_content -> 'options') not between 2 and 6");
    expect(validator).toContain("count(distinct option_value ->> 'id')");
    expect(validator).toContain("(select count(*) from jsonb_object_keys(option_value)) <> 2");
    expect(validator).toContain("jsonb_typeof(option_value -> 'id') <> 'string'");
    expect(validator).toContain("jsonb_typeof(option_value -> 'text') <> 'string'");
    expect(validator).toContain("option_value ->> 'id' = p_content ->> 'correctoptionid'");
    expect(validator).toContain("modality = 'audio'");
    expect(validator).toContain("modality = 'image'");
    expect(validator).toContain(
      "coalesce(p_content -> 'source' ->> 'kind', '') not in",
    );
    expect(migration).toContain(
      "revoke execute on function private.validate_question_content(jsonb) from public, anon, authenticated",
    );
  });

  it("imports drafts as one all-or-nothing statement", () => {
    const body = functionBody("import_question_drafts");

    expect(body).toBeDefined();
    expect(body).toContain("security definer");
    expect(body).toContain("set search_path = ''");
    expect(body).toContain("profile.reviewer_role in ('content_editor', 'administrator')");
    expect(body).toContain("profile.approval_status = 'approved'");
    expect(body).toContain("jsonb_typeof(p_drafts) <> 'array'");
    expect(body).toContain("private.validate_question_content(draft_record -> 'content')");
    expect(body).toContain("public.create_question_draft(");
    expect(body).not.toMatch(/exception\s+when/);
    expect(migration).toContain(
      "revoke execute on function public.import_question_drafts(jsonb) from public, anon",
    );
    expect(migration).toContain(
      "grant execute on function public.import_question_drafts(jsonb) to authenticated",
    );
  });

  it("creates only the next linear draft version from the latest frozen version", () => {
    const body = functionBody("create_question_revision");

    expect(body).toBeDefined();
    expect(body).toContain("security definer");
    expect(body).toContain("set search_path = ''");
    expect(body).toContain("profile.reviewer_role in ('content_editor', 'administrator')");
    expect(body).toContain("order by question.version desc");
    expect(body).toContain("for update");
    expect(body).toContain("latest_question.version <> p_from_version");
    expect(body).toContain("latest_question.locked_at is null");
    expect(body).toContain("private.validate_question_content(p_content)");
    expect(body).toContain("latest_question.version + 1");
    expect(body).toContain("latest_question.version,");
    expect(body).toContain("'revision_created'");
    expect(body).toContain("auth.uid()");
    expect(migration).toContain(
      "revoke execute on function public.create_question_revision(text, integer, text, jsonb) from public, anon",
    );
    expect(migration).toContain(
      "grant execute on function public.create_question_revision(text, integer, text, jsonb) to authenticated",
    );
  });

  it("submits a draft for review by freezing it and recording the transition", () => {
    const body = functionBody("submit_question_for_review");

    expect(body).toBeDefined();
    expect(body).toContain("security definer");
    expect(body).toContain("set search_path = ''");
    expect(body).toContain("profile.reviewer_role in ('content_editor', 'administrator')");
    expect(body).toMatch(
      /from public\.content_reviewer_profiles profile[\s\S]*?profile\.approval_status = 'approved'\s+for share;/,
    );
    expect(body).toContain("question_record.status <> 'draft'");
    expect(body).toContain("for update");
    expect(body).toContain("status = 'in_review'");
    expect(body).toContain("locked_at = transition_at");
    expect(body).toContain("'submitted_for_review'");
    expect(body).toContain("insert into private.question_status_events");
    expect(migration).toContain(
      "revoke execute on function public.submit_question_for_review(text, integer, text) from public, anon",
    );
    expect(migration).toContain(
      "grant execute on function public.submit_question_for_review(text, integer, text) to authenticated",
    );
  });

  it("creates and locks a server-side content receipt in the review transaction", () => {
    const questionTable = migration.match(
      /create table private\.question_versions[\s\S]*?\n\);/,
    )?.[0];
    const body = functionBody("submit_question_for_review");
    const guard = privateFunctionBody("prevent_question_version_content_mutation");

    expect(questionTable).toContain("review_snapshot jsonb");
    expect(questionTable).toMatch(
      /locked_at is not null\s+and review_snapshot is not null\s+and jsonb_typeof\(review_snapshot\) = 'object'/,
    );
    expect(questionTable).toContain("content_sha256 text");
    expect(questionTable).toContain("content_hash_schema text");
    expect(questionTable).toContain("content_hashed_at timestamptz");
    expect(questionTable).toContain("^[0-9a-f]{64}$");
    expect(questionTable).toContain(
      "question-review-snapshot-pg-jsonb-text-v1",
    );
    expect(body).toContain("saved_review_snapshot := jsonb_build_object(");
    expect(body).toContain("'questionid', question_record.question_id");
    expect(body).toContain("pg_catalog.sha256(");
    expect(body).toContain("saved_review_snapshot::text");
    expect(body).toContain("review_snapshot = saved_review_snapshot");
    expect(body).toContain("content_sha256 = saved_content_sha256");
    expect(body).toContain("content_hash_schema = saved_content_hash_schema");
    expect(body).toContain("content_hashed_at = transition_at");
    expect(body).toContain("content_sha256 text");
    expect(body).toContain("content_hash_schema text");
    expect(body).toContain("content_hashed_at timestamptz");
    expect(body).toContain("'content_sha256', question_record.content_sha256");
    expect(guard).toContain("old.review_snapshot");
    expect(guard).toContain("new.content_sha256");
  });

  it("prevents deletion of any version and content changes after a version is frozen", () => {
    const guard = privateFunctionBody("prevent_question_version_content_mutation");

    expect(guard).toBeDefined();
    expect(guard).toContain("tg_op = 'delete'");
    expect(guard).toContain("old.locked_at is not null");
    expect(guard).toContain("or old.status <> 'draft'");
    expect(guard).toContain("or new.status <> 'draft'");
    expect(guard).toContain("old.prompt");
    expect(guard).toContain("new.prompt");
    expect(guard).toContain("old.created_by");
    expect(guard).toContain("new.created_by");
    expect(migration).toContain("create trigger question_versions_content_immutable");
    expect(migration).toContain(
      "before update or delete on private.question_versions",
    );
    expect(migration).not.toContain(
      "grant delete on private.question_versions to authenticated",
    );
    expect(migration).not.toContain(
      "grant delete on private.question_versions to service_role",
    );
  });

  it("returns only the authenticated user's normalized governance profile", () => {
    const body = functionBody("get_content_governance_profile");

    expect(body).toBeDefined();
    expect(body).toContain("returns table (");
    expect(body).toContain("user_id uuid");
    expect(body).toContain("display_name text");
    expect(body).toContain("reviewer_role text");
    expect(body).toContain("approval_status text");
    expect(body).toContain("security definer");
    expect(body).toContain("set search_path = ''");
    expect(body).toContain("auth.uid() is null");
    expect(body).toContain("is_anonymous");
    expect(body).toContain("profile.user_id = auth.uid()");
    expect(migration).toContain(
      "revoke execute on function public.get_content_governance_profile() from public, anon",
    );
    expect(migration).toContain(
      "grant execute on function public.get_content_governance_profile() to authenticated",
    );
  });

  it("searches and filters every governed version for approved governors", () => {
    const body = functionBody("search_question_bank");
    const questionTable = migration.match(
      /create table private\.question_versions[\s\S]*?\n\);/,
    )?.[0];

    expect(questionTable).toContain("search_vector tsvector generated always as");
    expect(migration).toContain(
      "create index question_versions_search_idx on private.question_versions using gin (search_vector)",
    );
    expect(body).toBeDefined();
    expect(body).toContain("security definer");
    expect(body).toContain("set search_path = ''");
    expect(body).toContain(
      "profile.reviewer_role in ('english_teacher', 'content_editor', 'administrator')",
    );
    expect(body).toMatch(
      /profile_record\.reviewer_role = 'english_teacher'\s+and p_status is distinct from 'published'/,
    );
    expect(body).toContain("profile.approval_status = 'approved'");
    expect(body).not.toContain("distinct on (question.question_id)");
    expect(body).toContain("from private.question_versions latest");
    expect(body).toContain("websearch_to_tsquery('simple', trim(p_query))");
    expect(body).toContain("p_grade is null or latest.grade = p_grade");
    expect(body).toContain("p_status is null or latest.status = p_status");
    expect(body).toContain("audio jsonb");
    expect(body).toContain("image jsonb");
    expect(body).toContain("options jsonb");
    expect(body).toContain("correct_option_id text");
    expect(body).toContain("explanation text");
    expect(body).toContain("hints text[]");
    expect(body).toContain("variant_group text");
    expect(body).toContain("source jsonb");
    expect(body).toContain("supersedes_version integer");
    expect(body).toContain("change_summary text");
    expect(body).toContain("approval_count integer");
    expect(body).toContain("change_request_count integer");
    expect(body).toContain("private.question_reviews review");
    expect(body).toContain("reviewer.approval_status = 'approved'");
    expect(body).toContain("p_cursor_created_at is null");
    expect(body).toContain("p_cursor_question_version");
    expect(body).not.toMatch(/\boffset\b/);
    expect(migration).toContain(
      "revoke execute on function public.search_question_bank(text, smallint, text, text, text, text, smallint, timestamptz, text, integer, integer) from public, anon",
    );
    expect(migration).toContain(
      "grant execute on function public.search_question_bank(text, smallint, text, text, text, text, smallint, timestamptz, text, integer, integer) to authenticated",
    );
  });

  it("lists every governed version with full comparison content and review counts", () => {
    const body = functionBody("list_question_versions");

    expect(body).toBeDefined();
    expect(body).toContain("security definer");
    expect(body).toContain("set search_path = ''");
    expect(body).toContain(
      "profile.reviewer_role in ('content_editor', 'administrator')",
    );
    expect(body).not.toContain(
      "profile.reviewer_role in ('english_teacher', 'content_editor', 'administrator')",
    );
    expect(body).toContain("profile.approval_status = 'approved'");
    expect(body).toContain("question.options");
    expect(body).toContain("question.correct_option_id");
    expect(body).toContain("question.explanation");
    expect(body).toContain("question.source");
    expect(body).toContain("question.supersedes_version");
    expect(body).toContain("private.question_reviews review");
    expect(body).toContain("reviewer.approval_status = 'approved'");
    expect(body).toContain("order by question.version desc");
    expect(migration).toContain(
      "revoke execute on function public.list_question_versions(text) from public, anon",
    );
    expect(migration).toContain(
      "grant execute on function public.list_question_versions(text) to authenticated",
    );
  });

  it("exposes only anonymous per-version quality aggregates to approved governors", () => {
    const body = functionBody("list_question_quality_signals");

    expect(body).toBeDefined();
    expect(body).toContain("security definer");
    expect(body).toContain("set search_path = ''");
    expect(body).toContain(
      "profile.reviewer_role in ('english_teacher', 'content_editor', 'administrator')",
    );
    expect(body).toContain("profile.approval_status = 'approved'");
    expect(body).toContain("left join public.classroom_learning_events event");
    expect(body).toContain("count(event.id) as response_count");
    expect(body).toContain("event.outcome = 'independent_correct'");
    expect(body).toContain("event.outcome = 'assisted_correct'");
    expect(body).toContain("event.outcome = 'rescued'");
    expect(body).toContain("event.outcome = 'pending_support'");
    expect(body).toContain("question.status = 'disputed'");
    expect(body).not.toContain("participant_id");
    expect(body).not.toContain("nickname");
    expect(body).not.toContain("selected_option_id");
    expect(migration).toContain(
      "create index classroom_learning_events_question_version_outcome_idx",
    );
    expect(migration).toContain(
      "revoke execute on function public.list_question_quality_signals(smallint, text, text, text) from public, anon",
    );
    expect(migration).toContain(
      "grant execute on function public.list_question_quality_signals(smallint, text, text, text) to authenticated",
    );
  });
});
