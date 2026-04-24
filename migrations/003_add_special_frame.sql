-- Migration: Add special_frame to profiles
-- This allows overriding the point-based rank frame for specific users.

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS special_frame text;
