-- User profiles table for approval workflow
CREATE TABLE user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  approved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT USING (auth.uid() = id);

-- Service role (admin API) can do everything — no user-level insert/update/delete policies needed
-- Admin operations go through the service role key

-- Index for quick lookup of pending users
CREATE INDEX idx_user_profiles_approved ON user_profiles(approved);
