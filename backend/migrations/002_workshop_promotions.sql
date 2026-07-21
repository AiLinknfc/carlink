-- Migration: Add promotion fields to workshops table
-- Run this against your Supabase/PostgreSQL database

ALTER TABLE workshops
  ADD COLUMN IF NOT EXISTS stamps_required INTEGER NOT NULL DEFAULT 6,
  ADD COLUMN IF NOT EXISTS promotion_description TEXT NOT NULL DEFAULT '';
