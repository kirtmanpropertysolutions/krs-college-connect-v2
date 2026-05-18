-- ============================================================
-- Migration 033: Clean up duplicate Mountain West school entries
-- Applied: 2026-05-14
-- ============================================================
-- Four duplicate pairs were found from Mountain West schools
-- being added in multiple rounds with slightly different name
-- formats. For each pair:
--   1. The more complete row's data was merged into the kept row
--   2. All coaches were re-pointed to the kept school
--   3. The duplicate row was deleted
--
-- No school_notes or outreach_log rows were affected (none
-- referenced any of the removed school IDs).
--
-- Additional duplicate scan performed: no other duplicates
-- found beyond these four pairs.
-- ============================================================

-- ----------------------------------------------------------
-- PAIR 1
--   Removed:  "Air Force Academy"               (74596a48-cd30-41b5-8721-31a722391fcd)
--   Kept:     "United States Air Force Academy" (c6fb73e2-d206-4f02-a24b-0ddec1034586)
--   Merged:   email_domain, enrollment, academic_rank, primary_color, secondary_color
--   Coaches reassigned: 3 (Head Coach, Assistant Coach, Support Staff — all unverified)
-- ----------------------------------------------------------

UPDATE schools SET
  email_domain    = 'usafa.edu',
  enrollment      = 4000,
  academic_rank   = 26,
  primary_color   = '#004F98',
  secondary_color = '#8A8B8C'
WHERE id = 'c6fb73e2-d206-4f02-a24b-0ddec1034586';

UPDATE coaches SET school_id = 'c6fb73e2-d206-4f02-a24b-0ddec1034586'
WHERE school_id = '74596a48-cd30-41b5-8721-31a722391fcd';

DELETE FROM schools WHERE id = '74596a48-cd30-41b5-8721-31a722391fcd';

-- ----------------------------------------------------------
-- PAIR 2
--   Removed:  "California State University, Fresno" (1a01b61a-7c0c-435c-bf83-eff610a2e583)
--   Kept:     "Fresno State University"             (c21426d6-8564-41c7-b95f-8019e73b14dc)
--   Merged:   email_domain, enrollment, academic_rank, primary_color, secondary_color
--   Coaches reassigned: 2 (Head Coach, Assistant Coach — both unverified)
-- ----------------------------------------------------------

UPDATE schools SET
  email_domain    = 'fresnostate.edu',
  enrollment      = 25000,
  academic_rank   = 143,
  primary_color   = '#E31837',
  secondary_color = '#002856'
WHERE id = 'c21426d6-8564-41c7-b95f-8019e73b14dc';

UPDATE coaches SET school_id = 'c21426d6-8564-41c7-b95f-8019e73b14dc'
WHERE school_id = '1a01b61a-7c0c-435c-bf83-eff610a2e583';

DELETE FROM schools WHERE id = '1a01b61a-7c0c-435c-bf83-eff610a2e583';

-- ----------------------------------------------------------
-- PAIR 3
--   Removed:  "University of Nevada, Las Vegas" (6218428c-76b1-42e0-b296-3282bff72373)
--   Kept:     "University of Nevada Las Vegas"  (5516174d-e4f8-4f3a-a0a7-9f1bbdb6ef68)
--   Merged:   email_domain, enrollment, academic_rank
--   Corrected: region from 'Southwest' → 'Mountain West'
--   Coaches reassigned: 5 (Head Coach unverified, Assistant Coach unverified,
--                          Kacey Bingham, Austin Rios, Diera Walton)
-- ----------------------------------------------------------

UPDATE schools SET
  email_domain  = 'unlv.edu',
  enrollment    = 31000,
  academic_rank = 258,
  region        = 'Mountain West'
WHERE id = '5516174d-e4f8-4f3a-a0a7-9f1bbdb6ef68';

UPDATE coaches SET school_id = '5516174d-e4f8-4f3a-a0a7-9f1bbdb6ef68'
WHERE school_id = '6218428c-76b1-42e0-b296-3282bff72373';

DELETE FROM schools WHERE id = '6218428c-76b1-42e0-b296-3282bff72373';

-- ----------------------------------------------------------
-- PAIR 4
--   Removed:  "University of Nevada, Reno" (ffad854e-b676-4a72-87e2-da04645f826d)
--   Kept:     "University of Nevada"       (83bcccfb-774a-43b7-8d27-89e67d01e08b)
--   Merged:   email_domain, enrollment, academic_rank, primary_color, secondary_color
--   Coaches reassigned: 6 (Head Coach unverified, Assistant Coach unverified,
--                          Jeremy Evans, Lauren Wolcott, Jenn Kovisto, Tristan Estipona)
-- ----------------------------------------------------------

UPDATE schools SET
  email_domain    = 'unr.edu',
  enrollment      = 21000,
  academic_rank   = 254,
  primary_color   = '#003366',
  secondary_color = '#C0C0C0'
WHERE id = '83bcccfb-774a-43b7-8d27-89e67d01e08b';

UPDATE coaches SET school_id = '83bcccfb-774a-43b7-8d27-89e67d01e08b'
WHERE school_id = 'ffad854e-b676-4a72-87e2-da04645f826d';

DELETE FROM schools WHERE id = 'ffad854e-b676-4a72-87e2-da04645f826d';
