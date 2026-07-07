-- Migration: durable app log so errors persist beyond Vercel's log retention
-- and can be reviewed later (e.g. select * from app_logs order by created_at desc).
-- Run once in Supabase Dashboard → SQL Editor. Idempotent.
create table if not exists app_logs (
  id         uuid        primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  level      text        not null default 'error', -- 'error' | 'event'
  event      text        not null,
  message    text,
  data       jsonb
);
create index if not exists app_logs_created_at_idx on app_logs (created_at desc);
create index if not exists app_logs_level_idx       on app_logs (level);
