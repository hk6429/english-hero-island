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

function functionBody(name: string, schema = "public"): string | undefined {
  return migration.match(
    new RegExp(`create or replace function ${schema}\\.${name}[\\s\\S]*?\\$\\$;`),
  )?.[0];
}

describe("question governance migration", () => {
  it("stores immutable byte and rights receipts separately from question content", () => {
    const assetEvidenceTable = migration.match(
      /create table private\.question_asset_evidence[\s\S]*?\n\);/,
    )?.[0];

    expect(assetEvidenceTable).toBeDefined();
    expect(assetEvidenceTable).toContain("question_id text not null");
    expect(assetEvidenceTable).toContain("question_version integer not null");
    expect(assetEvidenceTable).toContain("asset_kind text not null");
    expect(assetEvidenceTable).toContain("asset_locator text not null");
    expect(assetEvidenceTable).toContain("asset_sha256 text not null");
    expect(assetEvidenceTable).toContain("byte_length bigint not null");
    expect(assetEvidenceTable).toContain("mime_type text not null");
    expect(assetEvidenceTable).toContain("rights_source_kind text not null");
    expect(assetEvidenceTable).toContain("rights_usage_rights text not null");
    expect(assetEvidenceTable).toContain("rights_evidence_sha256 text not null");
    expect(assetEvidenceTable).toContain("manifest_sha256 text not null");
    expect(assetEvidenceTable).toContain("question_bank_sha256 text not null");
    expect(assetEvidenceTable).toContain(
      "primary key (question_id, question_version, asset_kind)",
    );
    expect(migration).toContain(
      "create trigger question_asset_evidence_immutable",
    );
    expect(migration).toContain(
      "alter table private.question_asset_evidence force row level security",
    );
    expect(migration).toMatch(
      /revoke all on private\.question_asset_evidence\s+from public, anon, authenticated, service_role/,
    );
    expect(migration).not.toContain(
      "grant insert on private.question_asset_evidence to service_role",
    );
  });

  it("registers byte evidence through one narrow trusted-worker RPC without direct governance DML", () => {
    const body = functionBody("register_question_asset_evidence");

    expect(body).toBeDefined();
    expect(body).toContain("security definer");
    expect(body).toContain("set search_path = ''");
    expect(body).toContain("auth.jwt() ->> 'role'");
    expect(body).toContain("'service_role'");
    expect(body).toContain("from private.question_versions question");
    expect(body).toContain("for update");
    expect(body).toContain("question_record.status <> 'draft'");
    expect(body).toContain("question_record.locked_at is not null");
    expect(body).toContain("question_record.modality <> p_asset_kind");
    expect(body).toContain("question_record.audio ->> 'src'");
    expect(body).toContain("question_record.image ->> 'src'");
    expect(body).toContain("insert into private.question_asset_evidence");
    expect(migration).toMatch(
      /revoke execute on function public\.register_question_asset_evidence\([\s\S]*?\)\s+from public, anon, authenticated/,
    );
    expect(migration).toMatch(
      /grant execute on function public\.register_question_asset_evidence\([\s\S]*?\)\s+to service_role/,
    );
    expect(migration).not.toContain(
      "grant select, insert, update on private.question_versions to service_role",
    );
    expect(migration).not.toContain(
      "grant select, insert on private.question_status_events to service_role",
    );
  });

  it("serializes shared locator registration and rejects conflicting global receipts", () => {
    const body = functionBody(
      "enforce_question_asset_receipt_consistency",
      "private",
    );

    expect(body).toBeDefined();
    expect(body).toContain("pg_catalog.pg_advisory_xact_lock");
    expect(body).toContain("pg_catalog.hashtextextended");
    expect(body).toContain("from private.question_asset_evidence existing");
    expect(body).toContain("existing.asset_locator = new.asset_locator");
    expect(body).toContain("existing.byte_length is distinct from new.byte_length");
    expect(body).toContain("existing.mime_type is distinct from new.mime_type");
    expect(body).toContain(
      "existing.rights_evidence_locator = new.rights_evidence_locator",
    );
    expect(body).toMatch(
      /existing\.rights_evidence_byte_length\s+is distinct from new\.rights_evidence_byte_length/,
    );
    expect(body).toContain("conflicting byte receipt already exists for asset locator");
    expect(body).toContain("conflicting rights receipt already exists for locator");
    expect(migration).toContain(
      "create trigger question_asset_evidence_consistency",
    );
  });

  it("blocks formal review until the required byte receipt is bound into the frozen snapshot", () => {
    const submit = functionBody("submit_question_for_review");
    const queue = functionBody("list_question_review_queue");

    expect(submit).toContain("saved_asset_evidence jsonb");
    expect(submit).toContain("from private.question_asset_evidence evidence");
    expect(submit).toContain("question_record.modality in ('audio', 'image')");
    expect(submit).toContain("question_record.modality = 'text'");
    expect(submit).toContain("verified production asset evidence is required");
    expect(submit).toContain("'assetevidence', saved_asset_evidence");
    expect(submit).toContain("'asset_evidence', saved_asset_evidence");
    expect(queue).toContain("asset_evidence jsonb");
    expect(queue).toContain("question.review_snapshot -> 'assetevidence'");
  });

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
    expect(body).not.toContain("approval_count");
    expect(body).not.toContain("change_request_count");
    expect(migration).toContain(
      "grant execute on function public.list_question_review_queue() to authenticated",
    );
  });

  it("keeps other reviewers' decisions unreachable through general governance RPCs", () => {
    const search = functionBody("search_question_bank");
    const versions = functionBody("list_question_versions");

    expect(search).toMatch(
      /profile_record\.reviewer_role = 'english_teacher'\s+and p_status is distinct from 'published'/,
    );
    expect(search).toContain(
      "english-teacher question search is limited to published content",
    );
    expect(versions).toContain(
      "profile.reviewer_role in ('content_editor', 'administrator')",
    );
    expect(versions).not.toContain(
      "profile.reviewer_role in ('english_teacher', 'content_editor', 'administrator')",
    );
  });

  it("returns the frozen content hash that the reviewer is being asked to sign", () => {
    const body = functionBody("list_question_review_queue");

    expect(body).toContain("content_sha256 text");
    expect(body).toContain("content_hash_schema text");
    expect(body).toContain("question.content_sha256");
    expect(body).toContain("question.content_hash_schema");
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

  it("keeps reviewer eligibility stable for the duration of the review transaction", () => {
    const body = functionBody("submit_question_review");

    expect(body).toMatch(
      /from public\.content_reviewer_profiles profile[\s\S]*?profile\.approval_status = 'approved'\s+for share;/,
    );
  });

  it("records a review only against the exact frozen content hash shown to the reviewer", () => {
    const reviewTable = migration.match(
      /create table private\.question_reviews[\s\S]*?\n\);/,
    )?.[0];
    const body = functionBody("submit_question_review");

    expect(reviewTable).toContain("acknowledged_content_sha256 text not null");
    expect(reviewTable).toContain(
      "acknowledged_content_hash_schema text not null",
    );
    expect(body).toContain("p_expected_content_sha256 text");
    expect(body).toContain("p_expected_content_hash_schema text");
    expect(body).toContain(
      "question_record.content_sha256 is distinct from p_expected_content_sha256",
    );
    expect(body).toContain(
      "question_record.content_hash_schema is distinct from p_expected_content_hash_schema",
    );
    expect(body).toContain("acknowledged_content_sha256,");
    expect(body).toContain("acknowledged_content_hash_schema,");
    expect(body).toContain("question_record.content_sha256,");
    expect(body).toContain("question_record.content_hash_schema,");
  });

  it("prevents privileged direct inserts from bypassing the frozen receipt binding", () => {
    const questionTable = migration.match(
      /create table private\.question_versions[\s\S]*?\n\);/,
    )?.[0];
    const reviewTable = migration.match(
      /create table private\.question_reviews[\s\S]*?\n\);/,
    )?.[0];

    expect(questionTable).toContain(
      "unique (question_id, version, content_sha256, content_hash_schema)",
    );
    expect(reviewTable).toContain(
      "foreign key (question_id, question_version, acknowledged_content_sha256, acknowledged_content_hash_schema)",
    );
    expect(reviewTable).toContain(
      "references private.question_versions(question_id, version, content_sha256, content_hash_schema)",
    );
    expect(migration).not.toContain(
      "grant select, insert on private.question_reviews to service_role",
    );
    expect(migration).toContain(
      "grant select on private.question_reviews to service_role",
    );
  });

  it("returns and logs the server-authoritative review acknowledgement", () => {
    const body = functionBody("submit_question_review");

    expect(body).toContain("review_id uuid");
    expect(body).toContain("acknowledged_content_sha256 text");
    expect(body).toContain("acknowledged_content_hash_schema text");
    expect(body).toContain("'acknowledged_content_sha256', question_record.content_sha256");
    expect(body).toContain(
      "'acknowledged_content_hash_schema', question_record.content_hash_schema",
    );
    expect(body).toContain("saved_review_id,");
    expect(body).toContain("question_record.content_sha256,");
    expect(body).toContain("question_record.content_hash_schema,");
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

  it("fails publication closed when frozen byte receipts, rights, or media locators are invalid", () => {
    const questionTable = migration.match(
      /create table private\.question_versions[\s\S]*?\n\);/,
    )?.[0];
    const body = functionBody("publish_question_version");

    expect(questionTable).toMatch(
      /status <> 'published'[\s\S]*?coalesce\([\s\S]*?source ->> 'kind'[\s\S]*?false\s*\)/,
    );
    expect(body).toContain("current_asset_evidence jsonb");
    expect(body).toContain("current_asset_evidence_count integer");
    expect(body).toContain("question_record.review_snapshot -> 'assetevidence'");
    expect(body).toContain("from private.question_asset_evidence evidence");
    expect(body).toContain(
      "current_asset_evidence is distinct from frozen_asset_evidence",
    );
    expect(body).toContain("question_record.modality in ('audio', 'image')");
    expect(body).toContain("current_asset_evidence_count <> 1");
    expect(body).toContain("question_record.modality = 'text'");
    expect(body).toContain("current_asset_evidence_count <> 0");
    expect(body).toContain("like 'tts:%'");
    expect(body).toContain("like 'scene:%'");
    expect(body).toContain("like 'data:%'");
    expect(body).toMatch(
      /if not coalesce\([\s\S]*?question_record\.source ->> 'kind'[\s\S]*?false\s*\)/,
    );
    expect(body).toContain("'asset_evidence', current_asset_evidence");
  });

  it("locks administrator and qualifying reviewer profiles through publication", () => {
    const body = functionBody("publish_question_version");

    expect(body).toMatch(
      /from public\.content_reviewer_profiles profile[\s\S]*?profile\.approval_status = 'approved'\s+for share;/,
    );
    expect(body).toMatch(
      /perform 1[\s\S]*?from public\.content_reviewer_profiles reviewer[\s\S]*?for share of reviewer;/,
    );
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
