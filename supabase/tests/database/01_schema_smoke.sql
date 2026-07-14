-- 真實 PostgreSQL runtime 驗證：schema 煙霧測試（P0-2 第一階段）。
-- 這裡驗證 migration 真的可執行後的實際結果，不是 regex 比對 SQL 字串。
begin;
create extension if not exists pgtap with schema extensions;
set search_path to public, extensions;

select plan(19);

-- 11 個 public 資料表
select has_table('public', 'activity_participants', 'public.activity_participants 存在');
select has_table('public', 'activity_questions', 'public.activity_questions 存在');
select has_table('public', 'activity_responses', 'public.activity_responses 存在');
select has_table('public', 'activity_targets', 'public.activity_targets 存在');
select has_table('public', 'classroom_activities', 'public.classroom_activities 存在');
select has_table('public', 'classroom_learning_events', 'public.classroom_learning_events 存在');
select has_table('public', 'classroom_members', 'public.classroom_members 存在');
select has_table('public', 'classroom_story_progress', 'public.classroom_story_progress 存在');
select has_table('public', 'classrooms', 'public.classrooms 存在');
select has_table('public', 'content_reviewer_profiles', 'public.content_reviewer_profiles 存在');
select has_table('public', 'teacher_profiles', 'public.teacher_profiles 存在');

-- 5 個 private 資料表
select has_table('private', 'activity_join_attempts', 'private.activity_join_attempts 存在');
select has_table('private', 'question_asset_evidence', 'private.question_asset_evidence 存在');
select has_table('private', 'question_reviews', 'private.question_reviews 存在');
select has_table('private', 'question_status_events', 'private.question_status_events 存在');
select has_table('private', 'question_versions', 'private.question_versions 存在');

-- 每一個 public 資料表都必須啟用 RLS
select is(
  (select count(*)::int from pg_tables where schemaname = 'public' and rowsecurity),
  11,
  '全部 11 個 public 資料表都啟用 RLS'
);

-- 32 個 public RPC，且全部是 security definer
select is(
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'),
  32,
  'public schema 有 32 個函式'
);
select is(
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.prosecdef),
  32,
  '32 個 public 函式全部是 security definer'
);

select * from finish();
rollback;
