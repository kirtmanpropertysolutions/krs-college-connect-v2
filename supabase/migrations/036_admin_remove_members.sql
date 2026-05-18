-- 036_admin_remove_members.sql
-- Allow org admins to remove members from their own org (soft removal —
-- AdminAthletes UI deletes the org_members row + nulls profiles.org_id;
-- the user's auth + profile + recruiting data are preserved).
CREATE POLICY "Admins remove org members"
  ON org_members
  FOR DELETE
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
    AND user_id <> auth.uid()
  );

CREATE POLICY "Admins update org member profiles"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
    AND id <> auth.uid()
  )
  WITH CHECK (
    org_id IS NULL
    OR org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
