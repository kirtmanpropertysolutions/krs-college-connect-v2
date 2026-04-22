-- Add missing athlete profile fields
-- Migration 010: Athlete Profile Fields

-- Personal Info fields
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'athletes' AND column_name = 'club_team') THEN
    ALTER TABLE athletes ADD COLUMN club_team text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'athletes' AND column_name = 'high_school') THEN
    ALTER TABLE athletes ADD COLUMN high_school text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'athletes' AND column_name = 'city') THEN
    ALTER TABLE athletes ADD COLUMN city text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'athletes' AND column_name = 'state') THEN
    ALTER TABLE athletes ADD COLUMN state text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'athletes' AND column_name = 'jersey_number') THEN
    ALTER TABLE athletes ADD COLUMN jersey_number integer;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'athletes' AND column_name = 'dominant_foot') THEN
    ALTER TABLE athletes ADD COLUMN dominant_foot text CHECK (dominant_foot IN ('Left', 'Right', 'Both'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'athletes' AND column_name = 'weight') THEN
    ALTER TABLE athletes ADD COLUMN weight integer;
  END IF;
END $$;

-- Academic Info fields
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'athletes' AND column_name = 'sat_score') THEN
    ALTER TABLE athletes ADD COLUMN sat_score integer;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'athletes' AND column_name = 'act_score') THEN
    ALTER TABLE athletes ADD COLUMN act_score integer;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'athletes' AND column_name = 'intended_major') THEN
    ALTER TABLE athletes ADD COLUMN intended_major text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'athletes' AND column_name = 'academic_interests') THEN
    ALTER TABLE athletes ADD COLUMN academic_interests text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'athletes' AND column_name = 'honors_ap_classes') THEN
    ALTER TABLE athletes ADD COLUMN honors_ap_classes text;
  END IF;
END $$;

-- Soccer Stats fields
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'athletes' AND column_name = 'goals') THEN
    ALTER TABLE athletes ADD COLUMN goals integer DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'athletes' AND column_name = 'assists') THEN
    ALTER TABLE athletes ADD COLUMN assists integer DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'athletes' AND column_name = 'minutes_played') THEN
    ALTER TABLE athletes ADD COLUMN minutes_played integer DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'athletes' AND column_name = 'games_played') THEN
    ALTER TABLE athletes ADD COLUMN games_played integer DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'athletes' AND column_name = 'clean_sheets') THEN
    ALTER TABLE athletes ADD COLUMN clean_sheets integer DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'athletes' AND column_name = 'shots_on_goal') THEN
    ALTER TABLE athletes ADD COLUMN shots_on_goal integer DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'athletes' AND column_name = 'pass_completion_percent') THEN
    ALTER TABLE athletes ADD COLUMN pass_completion_percent numeric(5,2);
  END IF;
END $$;

-- Social Media fields
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'athletes' AND column_name = 'instagram_url') THEN
    ALTER TABLE athletes ADD COLUMN instagram_url text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'athletes' AND column_name = 'twitter_url') THEN
    ALTER TABLE athletes ADD COLUMN twitter_url text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'athletes' AND column_name = 'tiktok_url') THEN
    ALTER TABLE athletes ADD COLUMN tiktok_url text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'athletes' AND column_name = 'youtube_url') THEN
    ALTER TABLE athletes ADD COLUMN youtube_url text;
  END IF;
END $$;

-- Highlight Reels fields
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'athletes' AND column_name = 'hudl_url') THEN
    ALTER TABLE athletes ADD COLUMN hudl_url text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'athletes' AND column_name = 'youtube_highlights_url') THEN
    ALTER TABLE athletes ADD COLUMN youtube_highlights_url text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'athletes' AND column_name = 'veo_link_url') THEN
    ALTER TABLE athletes ADD COLUMN veo_link_url text;
  END IF;
END $$;

-- Profile Photo field
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'athletes' AND column_name = 'profile_photo_url') THEN
    ALTER TABLE athletes ADD COLUMN profile_photo_url text;
  END IF;
END $$;