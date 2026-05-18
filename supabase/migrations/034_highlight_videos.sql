-- ============================================================
-- 034_highlight_videos.sql
-- Mux-powered highlight video clips for athletes.
-- Each row = one uploaded clip; reel_order determines public
-- display sequence on the athlete's profile.
-- ============================================================

CREATE TABLE IF NOT EXISTS highlight_videos (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Mux upload / asset tracking
  mux_upload_id     TEXT,                          -- Mux direct-upload ID (while uploading)
  mux_asset_id      TEXT,                          -- Mux asset ID (once processing starts)
  mux_playback_id   TEXT,                          -- Mux playback ID (once ready)

  -- Clip metadata
  title             TEXT        NOT NULL DEFAULT 'Untitled Clip',
  status            TEXT        NOT NULL DEFAULT 'uploading',
  -- status values: uploading | processing | ready | errored

  duration          FLOAT,                         -- total duration in seconds (from Mux)

  -- Trim points (stored as metadata; applied at playback time via player startTime)
  start_time        FLOAT       NOT NULL DEFAULT 0,
  end_time          FLOAT,                         -- NULL = play to end

  -- Overlay metadata (CSS overlay shown on player — NOT burned into video)
  overlay_name      TEXT,
  overlay_position  TEXT,
  overlay_jersey    TEXT,

  -- Reel ordering (lower = plays first on public profile)
  reel_order        INTEGER     NOT NULL DEFAULT 0,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Row-level security
ALTER TABLE highlight_videos ENABLE ROW LEVEL SECURITY;

-- Athletes can do everything with their own clips
CREATE POLICY "Athletes manage own highlight_videos"
  ON highlight_videos
  FOR ALL
  USING (auth.uid() = athlete_id);

-- Anyone (coaches, unauthenticated) can read ready clips
CREATE POLICY "Public can read ready highlight_videos"
  ON highlight_videos
  FOR SELECT
  USING (status = 'ready');

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION _update_highlight_videos_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER highlight_videos_updated_at
  BEFORE UPDATE ON highlight_videos
  FOR EACH ROW EXECUTE FUNCTION _update_highlight_videos_updated_at();

-- Index for quick athlete lookups sorted by reel order
CREATE INDEX IF NOT EXISTS highlight_videos_athlete_order
  ON highlight_videos (athlete_id, reel_order);
