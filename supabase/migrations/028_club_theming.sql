-- Club Theming System
-- Migration 028: Add theme support for multi-tenant club branding

-- Add theme columns to existing organizations table
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS theme_primary TEXT DEFAULT '#dc2626',
  ADD COLUMN IF NOT EXISTS theme_secondary TEXT DEFAULT '#fbbf24',
  ADD COLUMN IF NOT EXISTS theme_neutral_dark TEXT DEFAULT '#0a0e1a',
  ADD COLUMN IF NOT EXISTS theme_logo_url TEXT,
  ADD COLUMN IF NOT EXISTS theme_logo_dark_url TEXT;

-- Add light/dark preference to athlete profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS color_mode TEXT DEFAULT 'dark' CHECK (color_mode IN ('light', 'dark', 'auto'));

-- Backfill Eastside FC's actual colors (the pilot club)
UPDATE organizations
SET
  theme_primary = '#dc2626',
  theme_secondary = '#fbbf24',
  theme_neutral_dark = '#0a0e1a'
WHERE name ILIKE '%Eastside%';