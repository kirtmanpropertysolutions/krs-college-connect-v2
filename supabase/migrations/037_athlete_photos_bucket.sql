-- 037_athlete_photos_bucket.sql
-- Public storage bucket for athlete profile photos. Public-read so
-- coaches can load the photo on the public profile at /p/{id}.
-- Writes are scoped via storage.objects policies to the
-- {auth.uid()}/ folder prefix.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'athlete-photos',
  'athlete-photos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public read athlete photos" ON storage.objects;
CREATE POLICY "Public read athlete photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'athlete-photos');

DROP POLICY IF EXISTS "Athletes upload own photos" ON storage.objects;
CREATE POLICY "Athletes upload own photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'athlete-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Athletes update own photos" ON storage.objects;
CREATE POLICY "Athletes update own photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'athlete-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Athletes delete own photos" ON storage.objects;
CREATE POLICY "Athletes delete own photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'athlete-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
