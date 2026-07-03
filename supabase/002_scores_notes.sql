-- Migration: add per-game scores + note to matches (display only; not in MMR).
-- Run once in Supabase Dashboard → SQL Editor. Idempotent.
alter table matches add column if not exists win_score  integer;
alter table matches add column if not exists lose_score integer;
alter table matches add column if not exists note       text;
