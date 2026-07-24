-- RedditOps Tasks - Supabase Database Schema
-- Run this in the Supabase SQL Editor to set up your database

-- ==========================================
-- TASKS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id TEXT UNIQUE NOT NULL,
  access_code TEXT NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('comment', 'post')),
  payment DECIMAL(10, 2) NOT NULL,
  requirements TEXT,
  instructions TEXT,
  max_completions INTEGER,
  completed_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Comment-specific
  reddit_post_url TEXT,
  comment_text TEXT,
  -- Post-specific
  target_subreddits TEXT,
  suggested_title TEXT,
  suggested_body TEXT,
  images TEXT[],
  video TEXT,
  -- Access control
  access_code_disabled BOOLEAN DEFAULT false,
  access_logs JSONB DEFAULT '[]'::jsonb
);

-- ==========================================
-- SUBMISSIONS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ref_id TEXT UNIQUE NOT NULL,
  task_id TEXT NOT NULL REFERENCES tasks(task_id) ON DELETE CASCADE,
  discord_username TEXT NOT NULL,
  proof_link TEXT NOT NULL,
  note TEXT,
  payment DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  admin_note TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- INDEXES
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_tasks_task_id ON tasks(task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_is_active ON tasks(is_active);
CREATE INDEX IF NOT EXISTS idx_submissions_ref_id ON submissions(ref_id);
CREATE INDEX IF NOT EXISTS idx_submissions_task_id ON submissions(task_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);

-- ==========================================
-- ROW LEVEL SECURITY
-- ==========================================
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- Tasks: Public read access for active tasks
CREATE POLICY "Anyone can view active tasks"
  ON tasks FOR SELECT
  USING (is_active = true);

-- Tasks: Only authenticated admin can modify
CREATE POLICY "Admin can insert tasks"
  ON tasks FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admin can update tasks"
  ON tasks FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admin can delete tasks"
  ON tasks FOR DELETE
  USING (auth.role() = 'authenticated');

-- Submissions: Public can insert
CREATE POLICY "Anyone can submit"
  ON submissions FOR INSERT
  WITH CHECK (true);

-- Submissions: Anyone can view by ref_id
CREATE POLICY "Anyone can view their submission"
  ON submissions FOR SELECT
  USING (true);

-- Submissions: Admin can update
CREATE POLICY "Admin can update submissions"
  ON submissions FOR UPDATE
  USING (auth.role() = 'authenticated');
