-- TORIAI Supabase テーブル作成SQL
-- Supabase Dashboard > SQL Editor で実行

-- 切断作業履歴
create table if not exists cut_history (
  device_id text primary key,
  data jsonb not null default '[]',
  updated_at timestamptz default now()
);

-- 在庫
create table if not exists inventory (
  device_id text primary key,
  data jsonb not null default '[]',
  updated_at timestamptz default now()
);

-- 手持ち残材
create table if not exists remnants (
  device_id text primary key,
  data jsonb not null default '[]',
  updated_at timestamptz default now()
);

-- 重量計算履歴
create table if not exists weight_history (
  device_id text primary key,
  data jsonb not null default '[]',
  updated_at timestamptz default now()
);

-- 重量計算リスト
create table if not exists weight_calcs (
  device_id text primary key,
  data jsonb not null default '[]',
  updated_at timestamptz default now()
);

-- RLS無効化（認証なしのため全アクセス許可）
alter table cut_history    disable row level security;
alter table inventory      disable row level security;
alter table remnants       disable row level security;
alter table weight_history disable row level security;
alter table weight_calcs   disable row level security;
