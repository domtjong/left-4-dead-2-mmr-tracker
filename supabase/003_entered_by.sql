-- Migration: record who entered each match (they sign their name in the
-- new-match confirm step). Display only — not used in MMR.
-- Run once in Supabase Dashboard → SQL Editor. Idempotent.
alter table matches add column if not exists entered_by text;
