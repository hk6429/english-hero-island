-- 真實 PostgreSQL runtime 驗證：以真實 caller role + request.jwt.claims 驗證行為。
-- 不用 postgres 超級使用者跑斷言（BYPASSRLS 會產生假陽性）。
begin;
create extension if not exists pgtap with schema extensions;
set search_path to public, extensions;

select plan(4);

-- 模擬一個沒有任何 profile 的 authenticated 使用者
set local role authenticated;
set local request.jwt.claims to
  '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';

select is(
  (select count(*)::int from public.classrooms),
  0,
  '陌生 authenticated 使用者透過 RLS 看不到任何教室'
);

select throws_ok(
  $q$insert into public.classrooms (id) values (gen_random_uuid())$q$,
  '42501',
  null,
  'authenticated 不能直接 INSERT public.classrooms（無 INSERT grant）'
);

select throws_ok(
  $q$select public.create_teacher_classroom('未授權班級', 3::smallint)$q$,
  '42501',
  'approved teacher authentication required',
  '沒有教師 profile 的使用者不能建立教室（RPC 內部把關）'
);

-- anon 連 RPC 都不能執行
set local role anon;
set local request.jwt.claims to '{"role":"anon"}';

select throws_ok(
  $q$select public.create_teacher_classroom('匿名班級', 3::smallint)$q$,
  '42501',
  null,
  'anon 不能執行 create_teacher_classroom'
);

reset role;
select * from finish();
rollback;
