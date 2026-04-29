-- ============================================================
-- TORIAI Supabase schema v1 : Auth + 事業所共有
-- Supabase ダッシュボード → SQL Editor にそのままコピペ実行
-- ============================================================
-- 既に device_id ベースのテーブル (cut_history / inventory / remnants ...
-- custom_materials / weight_calcs / weight_history) がある場合、
-- それらはこのスキーマとは別物として並走させる（移行期間中のみ）。
-- 事業所共有版は既存名と衝突しないよう `org_` 接頭辞を付ける。
-- ============================================================

-- ── 拡張 ─────────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ── 既存 device_id テーブルの復旧 ───────────────────────────
-- 初回実行で既存テーブル名に衝突して止まった場合、旧テーブル側の RLS だけ
-- 有効化済みになっている可能性がある。org_id を持たない旧テーブルだけ戻す。
do $$
begin
  if to_regclass('public.inventory') is not null
     and not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'inventory' and column_name = 'org_id') then
    alter table public.inventory disable row level security;
  end if;
  if to_regclass('public.remnants') is not null
     and not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'remnants' and column_name = 'org_id') then
    alter table public.remnants disable row level security;
  end if;
  if to_regclass('public.custom_materials') is not null
     and not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'custom_materials' and column_name = 'org_id') then
    alter table public.custom_materials disable row level security;
  end if;
  if to_regclass('public.weight_calcs') is not null
     and not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'weight_calcs' and column_name = 'org_id') then
    alter table public.weight_calcs disable row level security;
  end if;
end $$;

-- ── プロファイル（auth.users と 1:1） ────────────────────────
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

-- auth.users が作成されたら profiles にも自動追加
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function handle_new_user();

-- ── 事業所 ──────────────────────────────────────────────────
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  short_id text unique not null,          -- 人が読める ID (例: org_a1b2c3)
  name text not null,
  plan text not null default 'free',      -- free / starter / team / business
  seat_limit int not null default 1,      -- プラン別 seat 上限 (free=1, starter=5, team=15, business=999)
  archived_at timestamptz,                -- ダウングレード時 30 日アーカイブ
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── 所属 ────────────────────────────────────────────────────
create table if not exists org_members (
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',    -- owner / member
  joined_at timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index if not exists idx_org_members_user on org_members(user_id);

-- ── 招待（6 桁コード + メールリンク両対応） ────────────────
create table if not exists invitations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  code text unique,                       -- 6 桁数字
  email text,                             -- メール招待時のみ
  invited_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_invitations_code on invitations(code) where accepted_at is null;

-- ── 案件（物件） ────────────────────────────────────────────
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  shared_in_org boolean not null default false,  -- 事業所共有トグル
  owner_user_id uuid references auth.users(id) on delete set null,
  customer_name text,
  job_name text not null,
  due_date date,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_projects_org on projects(org_id);

-- ── 案件担当者（複数OK） ────────────────────────────────────
create table if not exists project_assignees (
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key (project_id, user_id)
);

-- ── 在庫（事業所共有） ──────────────────────────────────────
create table if not exists org_inventory (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  kind text,
  spec text,
  length_mm int,
  qty int not null default 0,
  project_id uuid references projects(id) on delete set null,
  note text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists idx_org_inventory_org on org_inventory(org_id);

-- ── 残材（事業所共有） ──────────────────────────────────────
create table if not exists org_remnants (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  kind text,
  spec text,
  length_mm int,
  qty int not null default 1,
  source_project_id uuid references projects(id) on delete set null,
  note text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists idx_org_remnants_org on org_remnants(org_id);

-- ── 切断計画（案件スコープ） ───────────────────────────────
create table if not exists cut_plans (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists idx_cut_plans_project on cut_plans(project_id);

-- ── 重量計算の保存（個人 + optional 案件） ─────────────────
create table if not exists org_weight_calcs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists idx_org_weight_calcs_user on org_weight_calcs(user_id);

-- ── カスタム鋼材（事業所共有） ─────────────────────────────
create table if not exists org_custom_materials (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  owner_user_id uuid references auth.users(id) on delete cascade,
  kind text,
  spec text,
  dims jsonb,
  weight_per_m numeric,
  shared boolean not null default false,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- ── カスタム定尺（事業所共有） ─────────────────────────────
create table if not exists org_custom_stock_lengths (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  kind text,
  spec text,                              -- null なら鋼種全体、指定なら規格単位
  lengths int[] not null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- ============================================================
-- ヘルパー関数 : 現在ユーザーが org のメンバー / オーナーか
-- ============================================================
create or replace function is_org_member(target_org uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from org_members
    where org_id = target_org and user_id = auth.uid()
  );
$$;

create or replace function is_org_owner(target_org uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from org_members
    where org_id = target_org and user_id = auth.uid() and role = 'owner'
  );
$$;

-- ============================================================
-- RLS 有効化
-- ============================================================
alter table profiles enable row level security;
alter table organizations enable row level security;
alter table org_members enable row level security;
alter table invitations enable row level security;
alter table projects enable row level security;
alter table project_assignees enable row level security;
alter table org_inventory enable row level security;
alter table org_remnants enable row level security;
alter table cut_plans enable row level security;
alter table org_weight_calcs enable row level security;
alter table org_custom_materials enable row level security;
alter table org_custom_stock_lengths enable row level security;

-- ── profiles : 自分の行だけ読める／更新できる ────────────
drop policy if exists "profile self select" on profiles;
create policy "profile self select" on profiles
  for select using (id = auth.uid());
drop policy if exists "profile self update" on profiles;
create policy "profile self update" on profiles
  for update using (id = auth.uid());

-- ── organizations : メンバーが読む / 作成は誰でも (Trigger で自分をOwner登録) / 更新はOwner ──
drop policy if exists "org read by member" on organizations;
create policy "org read by member" on organizations
  for select using (is_org_member(id));
drop policy if exists "org insert by authed" on organizations;
create policy "org insert by authed" on organizations
  for insert with check (auth.uid() is not null);
drop policy if exists "org update by owner" on organizations;
create policy "org update by owner" on organizations
  for update using (is_org_owner(id));

-- ── org_members : メンバーが閲覧、オーナーがinsert/update/delete、本人はselfのdelete可 ──
drop policy if exists "members read" on org_members;
create policy "members read" on org_members
  for select using (is_org_member(org_id));
drop policy if exists "members insert" on org_members;
create policy "members insert" on org_members
  for insert with check (
    -- 既に Owner が居る場合のみ Owner が追加 (Trigger 経由の初期 Owner は security definer)
    is_org_owner(org_id)
  );
drop policy if exists "members update by owner" on org_members;
create policy "members update by owner" on org_members
  for update using (is_org_owner(org_id));
drop policy if exists "members delete by owner or self" on org_members;
create policy "members delete by owner or self" on org_members
  for delete using (is_org_owner(org_id) or user_id = auth.uid());

-- ── invitations : 対象 org メンバー読み / Owner 作成・削除 ──
drop policy if exists "inv read" on invitations;
create policy "inv read" on invitations
  for select using (is_org_member(org_id));
drop policy if exists "inv insert by owner" on invitations;
create policy "inv insert by owner" on invitations
  for insert with check (is_org_owner(org_id));
drop policy if exists "inv delete by owner" on invitations;
create policy "inv delete by owner" on invitations
  for delete using (is_org_owner(org_id));

-- ── projects : shared_in_org または 作成者／担当者のみ ────
drop policy if exists "proj read" on projects;
create policy "proj read" on projects
  for select using (
    is_org_member(org_id) and (
      shared_in_org
      or owner_user_id = auth.uid()
      or exists (select 1 from project_assignees pa where pa.project_id = projects.id and pa.user_id = auth.uid())
    )
  );
drop policy if exists "proj insert" on projects;
create policy "proj insert" on projects
  for insert with check (is_org_member(org_id));
drop policy if exists "proj update" on projects;
create policy "proj update" on projects
  for update using (
    is_org_member(org_id) and (
      shared_in_org
      or owner_user_id = auth.uid()
      or exists (select 1 from project_assignees pa where pa.project_id = projects.id and pa.user_id = auth.uid())
    )
  );
drop policy if exists "proj delete" on projects;
create policy "proj delete" on projects
  for delete using (owner_user_id = auth.uid() or is_org_owner(org_id));

-- ── project_assignees : アクセス可能な案件に限る ─────────
drop policy if exists "pa read" on project_assignees;
create policy "pa read" on project_assignees
  for select using (
    exists (select 1 from projects p where p.id = project_assignees.project_id and is_org_member(p.org_id))
  );
drop policy if exists "pa all by project owner or org owner" on project_assignees;
create policy "pa all by project owner or org owner" on project_assignees
  for all using (
    exists (
      select 1 from projects p where p.id = project_assignees.project_id and (
        p.owner_user_id = auth.uid() or is_org_owner(p.org_id)
      )
    )
  );

-- ── org_inventory / org_remnants : 事業所メンバーは全 CRUD ───────
drop policy if exists "org inv all" on org_inventory;
create policy "org inv all" on org_inventory
  for all using (is_org_member(org_id)) with check (is_org_member(org_id));
drop policy if exists "org rem all" on org_remnants;
create policy "org rem all" on org_remnants
  for all using (is_org_member(org_id)) with check (is_org_member(org_id));

-- ── cut_plans : 親 project のアクセス権に依存 ──────────
drop policy if exists "cp all" on cut_plans;
create policy "cp all" on cut_plans
  for all using (
    exists (
      select 1 from projects p where p.id = cut_plans.project_id and is_org_member(p.org_id)
      and (p.shared_in_org or p.owner_user_id = auth.uid()
        or exists (select 1 from project_assignees pa where pa.project_id = p.id and pa.user_id = auth.uid()))
    )
  );

-- ── org_weight_calcs : 本人スコープ ───────────────────────────
drop policy if exists "org wc all" on org_weight_calcs;
create policy "org wc all" on org_weight_calcs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── org_custom_materials / org_custom_stock_lengths : 事業所共有 ──
drop policy if exists "org cm all" on org_custom_materials;
create policy "org cm all" on org_custom_materials
  for all using (is_org_member(org_id)) with check (is_org_member(org_id));
drop policy if exists "org csl all" on org_custom_stock_lengths;
create policy "org csl all" on org_custom_stock_lengths
  for all using (is_org_member(org_id)) with check (is_org_member(org_id));

-- ============================================================
-- Trigger : 事業所作成時に作成者を Owner として自動登録
-- ============================================================
create or replace function add_creator_as_owner()
returns trigger language plpgsql security definer as $$
begin
  new.created_by = coalesce(new.created_by, auth.uid());
  insert into org_members (org_id, user_id, role)
    values (new.id, auth.uid(), 'owner')
    on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists trg_add_creator_as_owner on organizations;
create trigger trg_add_creator_as_owner
after insert on organizations
for each row execute function add_creator_as_owner();

-- ============================================================
-- RPC : 招待コードを受け入れる（6 桁コード or invite id）
-- ============================================================
create or replace function accept_invitation(p_code text)
returns uuid language plpgsql security definer as $$
declare
  v_invite invitations%rowtype;
  v_seat_count int;
  v_seat_limit int;
begin
  select * into v_invite from invitations
    where code = p_code and accepted_at is null and expires_at > now()
    limit 1;
  if not found then
    raise exception 'Invalid or expired invitation code' using errcode = 'P0001';
  end if;

  -- seat limit チェック
  select count(*) into v_seat_count from org_members where org_id = v_invite.org_id;
  select seat_limit into v_seat_limit from organizations where id = v_invite.org_id;
  if v_seat_count >= v_seat_limit then
    raise exception 'Seat limit reached (%/%)', v_seat_count, v_seat_limit using errcode = 'P0002';
  end if;

  insert into org_members (org_id, user_id, role)
    values (v_invite.org_id, auth.uid(), 'member')
    on conflict do nothing;
  update invitations set accepted_at = now(), accepted_by = auth.uid()
    where id = v_invite.id;
  return v_invite.org_id;
end;
$$;

grant execute on function accept_invitation(text) to authenticated;

-- ============================================================
-- RPC : Owner 権限譲渡（2 段階を 1 トランザクションで）
-- ============================================================
create or replace function transfer_ownership(p_org uuid, p_new_owner uuid)
returns void language plpgsql security definer as $$
begin
  if not is_org_owner(p_org) then
    raise exception 'Only current owner can transfer ownership' using errcode = 'P0003';
  end if;
  -- 新 Owner を昇格
  update org_members set role = 'owner'
    where org_id = p_org and user_id = p_new_owner;
  -- 自分を降格
  update org_members set role = 'member'
    where org_id = p_org and user_id = auth.uid();
end;
$$;

grant execute on function transfer_ownership(uuid, uuid) to authenticated;

-- ============================================================
-- 完了
-- ============================================================
