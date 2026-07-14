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

describe("question governance migration", () => {
  it("normalizes approved reviewer identities and immutable per-version reviews", () => {
    const questionTable = migration.match(
      /create table private\.question_versions[\s\S]*?\n\);/,
    )?.[0];
    const reviewTable = migration.match(
      /create table private\.question_reviews[\s\S]*?\n\);/,
    )?.[0];

    expect(migration).toContain("create table public.content_reviewer_profiles");
    expect(migration).toContain(
      "alter table public.content_reviewer_profiles enable row level security",
    );
    expect(questionTable).toContain("created_by uuid");
    expect(questionTable).toContain("supersedes_version integer");
    expect(questionTable).toContain("change_summary text");
    expect(questionTable).not.toContain("reviewers jsonb");
    expect(reviewTable).toContain("reviewer_id uuid not null");
    expect(reviewTable).toContain("verdict text not null");
    expect(reviewTable).toContain("criteria jsonb not null");
    expect(reviewTable).toContain(
      "unique (question_id, question_version, reviewer_id)",
    );
    expect(migration).toContain("question_reviews_immutable");
  });

  it("keeps append-only status events for every governed version transition", () => {
    const eventTable = migration.match(
      /create table private\.question_status_events[\s\S]*?\n\);/,
    )?.[0];

    expect(eventTable).toBeDefined();
    expect(eventTable).toContain("question_id text not null");
    expect(eventTable).toContain("question_version integer not null");
    expect(eventTable).toContain("actor_id uuid");
    expect(eventTable).toContain("from_status text");
    expect(eventTable).toContain("to_status text not null");
    expect(eventTable).toContain("note text not null");
    expect(migration).toContain("question_status_events_immutable");
  });

  it("lists a frozen review queue only for approved English-teacher reviewers", () => {
    const body = functionBody("list_question_review_queue");

    expect(body).toBeDefined();
    expect(body).toContain("security definer");
    expect(body).toContain("set search_path = ''");
    expect(body).toContain("profile.reviewer_role = 'english_teacher'");
    expect(body).toContain("profile.approval_status = 'approved'");
    expect(body).toContain("question.status = 'in_review'");
    expect(body).toContain("question.created_by is distinct from auth.uid()");
    expect(body).toContain("review.reviewer_id = auth.uid()");
    expect(migration).toContain(
      "grant execute on function public.list_question_review_queue() to authenticated",
    );
  });

  it("records one review per real reviewer and never auto-publishes after two approvals", () => {
    const body = functionBody("submit_question_review");

    expect(body).toBeDefined();
    expect(body).toContain("profile.reviewer_role = 'english_teacher'");
    expect(body).toContain("question_record.created_by = auth.uid()");
    expect(body).toContain("insert into private.question_reviews");
    expect(body).toContain("count(distinct review.reviewer_id)");
    expect(body).toContain("status = 'reviewed'");
    expect(body).toContain("status = 'disputed'");
    expect(body).not.toContain("status = 'published'");
    expect(body).toContain("insert into private.question_status_events");
  });

  it("accepts exactly seven boolean criteria and requires a failed item for change requests", () => {
    const body = functionBody("submit_question_review");

    expect(body).toContain("jsonb_object_keys(p_criteria)");
    expect(body).toContain("jsonb_typeof(criterion.value) <> 'boolean'");
    expect(body).toContain("jsonb_each(p_criteria) as criterion");
    expect(body).toContain("p_criteria ?& array[");
    expect(body).toContain("jsonb_typeof(criterion.value) = 'boolean'");
    expect(body).toContain("criterion.value = 'false'::jsonb");
    expect(body).toContain("change requests must fail at least one review criterion");
  });

  it("publishes only through a separate administrator action with two current approvals", () => {
    const body = functionBody("publish_question_version");

    expect(body).toBeDefined();
    expect(body).toContain("profile.reviewer_role = 'administrator'");
    expect(body).toContain("question_record.status <> 'reviewed'");
    expect(body).toContain("count(distinct review.reviewer_id)");
    expect(body).toContain("review.verdict = 'approved'");
    expect(body).toContain("reviewer.approval_status = 'approved'");
    expect(body).toContain("another published version must be retired first");
    expect(body).toContain("opaque audio asset is required for publication");
    expect(body).toContain("like 'tts:%'");
    expect(body).toContain("status = 'published'");
    expect(body).toContain("published_at = now()");
    expect(body).toContain("insert into private.question_status_events");
    expect(migration).toContain(
      "create unique index question_versions_one_published_idx",
    );
    expect(migration).toContain("where status = 'published'");
  });

  it("supports dispute and retirement without deleting historical versions", () => {
    const dispute = functionBody("report_question_dispute");
    const retire = functionBody("retire_question_version");

    expect(dispute).toContain("status = 'disputed'");
    expect(dispute).toContain("insert into private.question_status_events");
    expect(retire).toContain("profile.reviewer_role = 'administrator'");
    expect(retire).toContain("status = 'retired'");
    expect(retire).not.toMatch(/delete from private\.question_versions/);
  });

  it("selects classroom content from normalized approvals instead of JSON length", () => {
    const listSkills = functionBody("list_classroom_micro_skills");
    const createActivity = functionBody("create_classroom_activity");

    expect(listSkills).toContain("private.question_reviews review");
    expect(createActivity).toContain("private.question_reviews review");
    expect(listSkills).toContain("count(distinct review.reviewer_id) >= 2");
    expect(createActivity).toContain("count(distinct review.reviewer_id) >= 2");
    expect(migration).not.toContain("jsonb_array_length(question.reviewers) >= 2");
  });
});
