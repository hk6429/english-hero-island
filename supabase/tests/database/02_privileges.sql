-- 真實 PostgreSQL runtime 驗證：anon / authenticated 權限面（P0-2 第一階段）。
begin;
create extension if not exists pgtap with schema extensions;
set search_path to public, extensions;

select plan(5);

-- anon 對 public 資料表沒有任何 table 權限
select is(
  (select count(*)::int from information_schema.role_table_grants
   where table_schema = 'public' and grantee = 'anon'),
  0,
  'anon 對 public 資料表沒有任何權限'
);

-- authenticated 的 table 權限精確固定：9 個表 SELECT，
-- 只有 classroom_activities 另有 DELETE（是否為刻意例外仍待決策，
-- 見 docs/claude-code-handoff.md 第五節；此測試先把現況釘住，改變即紅燈）。
-- activity_responses 與 classroom_learning_events 完全沒有 grant。
select is(
  (select string_agg(
     table_name::text || ':' || privilege_type::text, ';'
     order by table_name::text collate "C", privilege_type::text collate "C")
   from information_schema.role_table_grants
   where table_schema = 'public' and grantee = 'authenticated'),
  'activity_participants:SELECT;'
  || 'activity_questions:SELECT;'
  || 'activity_targets:SELECT;'
  || 'classroom_activities:DELETE;'
  || 'classroom_activities:SELECT;'
  || 'classroom_members:SELECT;'
  || 'classroom_story_progress:SELECT;'
  || 'classrooms:SELECT;'
  || 'content_reviewer_profiles:SELECT;'
  || 'teacher_profiles:SELECT',
  'authenticated 的 public 資料表權限與凍結清單完全一致'
);

-- anon 不能執行任何 public 函式
select is(
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute')),
  0,
  'anon 不能執行任何 public 函式'
);

-- authenticated 可執行 31 個；唯一例外是 register_question_asset_evidence
select is(
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and has_function_privilege('authenticated', p.oid, 'execute')),
  31,
  'authenticated 可執行 31 個 public 函式'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.register_question_asset_evidence(text, integer, text, text, text, bigint, text, text, text, text, text, bigint, text, text)'::regprocedure,
    'execute'
  ),
  'register_question_asset_evidence 不開放給 authenticated（僅信任後端）'
);

select * from finish();
rollback;
