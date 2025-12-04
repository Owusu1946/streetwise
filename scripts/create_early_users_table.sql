-- Create early_users table for collecting feedback and early access signups
-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS early_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  feedback TEXT NOT NULL,
  location GEOMETRY(Point, 4326),
  timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Add constraints
  CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_early_users_created_at ON early_users(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_early_users_email ON early_users(email);

-- Enable Row Level Security (RLS)
ALTER TABLE early_users ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to insert (for public feedback submission)
CREATE POLICY "Anyone can submit feedback"
  ON early_users
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Create policy to allow only authenticated users to read (for admin viewing)
CREATE POLICY "Authenticated users can read early_users"
  ON early_users
  FOR SELECT
  TO authenticated
  USING (true);

-- Grant permissions
GRANT INSERT ON early_users TO anon;
GRANT ALL ON early_users TO authenticated;

COMMENT ON TABLE early_users IS 'Stores early user signups and feedback for Streetwise app';
COMMENT ON COLUMN early_users.email IS 'User email address for notifications';
COMMENT ON COLUMN early_users.feedback IS 'User feedback on what features they want';
COMMENT ON COLUMN early_users.location IS 'User location when submitting feedback (optional)';
COMMENT ON COLUMN early_users.timestamp IS 'When user submitted the feedback';
