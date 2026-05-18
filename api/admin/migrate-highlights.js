export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing Supabase environment variables')
      return res.status(500).json({ error: 'Server configuration error' })
    }

    console.log('Attempting to create highlights table via direct SQL execution...')

    // Create the migration SQL
    const migrationSQL = `
      -- Create highlights table
      CREATE TABLE IF NOT EXISTS highlights (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        athlete_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        url text NOT NULL,
        title text,
        recorded_date date,
        source text,
        thumbnail_url text,
        is_primary boolean DEFAULT false,
        tags text[],
        view_count integer DEFAULT 0,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );

      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_highlights_athlete ON highlights (athlete_id);
      CREATE INDEX IF NOT EXISTS idx_highlights_primary ON highlights (athlete_id, is_primary) WHERE is_primary = true;

      -- Enable RLS
      ALTER TABLE highlights ENABLE ROW LEVEL SECURITY;

      -- Create RLS policy
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies
          WHERE tablename = 'highlights'
          AND policyname = 'athletes manage own highlights'
        ) THEN
          CREATE POLICY "athletes manage own highlights"
            ON highlights
            USING (athlete_id = auth.uid());
        END IF;
      END $$;

      -- Create unique constraint for primary highlights
      CREATE UNIQUE INDEX IF NOT EXISTS idx_highlights_one_primary_per_athlete
        ON highlights (athlete_id)
        WHERE is_primary = true;

      -- Add table comment
      COMMENT ON TABLE highlights IS 'Athlete highlight videos from various platforms';
    `

    // Execute via direct HTTP request to Supabase SQL endpoint
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sql: migrationSQL
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('HTTP request failed:', error)

      // If the direct SQL approach fails, return a helpful message
      return res.status(200).json({
        success: false,
        message: 'Direct SQL execution not available. Please apply migration manually via Supabase dashboard.',
        instructions: {
          step1: 'Go to your Supabase project dashboard',
          step2: 'Navigate to SQL Editor',
          step3: 'Run the migration file: supabase/migrations/024_highlights.sql',
          migrationContent: migrationSQL
        }
      })
    }

    const result = await response.json()
    console.log('SQL execution result:', result)

    return res.status(200).json({
      success: true,
      message: 'Migration attempted via API',
      result
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return res.status(500).json({
      error: 'Unexpected error',
      details: error.message
    })
  }
}