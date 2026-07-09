-- Migration: drop the orphaned app_logs table. It was created by a since-removed
-- migration (003_app_logs.sql) when durable DB logging was briefly wired up;
-- that feature was reverted (logs go to the Vercel console only), so the table
-- has no schema file and nothing writes to it. Safe to drop.
-- Run once in Supabase Dashboard → SQL Editor.
drop table if exists app_logs;
