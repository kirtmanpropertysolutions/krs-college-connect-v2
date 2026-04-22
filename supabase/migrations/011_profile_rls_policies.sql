-- Fix RLS policies for profiles and athletes tables
-- Migration 011: Profile RLS Policies

-- Fix profiles table RLS policies
-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users read own profile" ON profiles;
DROP POLICY IF EXISTS "Users update own profile" ON profiles;
DROP POLICY IF EXISTS "Users insert own profile" ON profiles;

-- Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create comprehensive RLS policies for profiles
CREATE POLICY "Users read own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Users insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- Fix athletes table RLS policies
-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Athletes read own data" ON athletes;
DROP POLICY IF EXISTS "Athletes update own data" ON athletes;
DROP POLICY IF EXISTS "Athletes insert own data" ON athletes;

-- Ensure RLS is enabled
ALTER TABLE athletes ENABLE ROW LEVEL SECURITY;

-- Create comprehensive RLS policies for athletes
CREATE POLICY "Athletes read own data"
  ON athletes FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Athletes update own data"
  ON athletes FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Athletes insert own data"
  ON athletes FOR INSERT
  WITH CHECK (user_id = auth.uid());