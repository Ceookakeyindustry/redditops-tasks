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
  is_public BOOLEAN DEFAULT false,
  access_logs JSONB DEFAULT '[]'::jsonb,
  -- Discord Assignment fields
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'assigned', 'submitted', 'approved', 'expired')),
  discord_user_id TEXT,
  assigned_discord_username TEXT,
  assigned_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  -- Screenshot requirements
  required_screenshots TEXT[] DEFAULT ARRAY['initial']
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
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  is_paid BOOLEAN DEFAULT false,
  paid_at TIMESTAMPTZ,
  -- Screenshots storage
  screenshots JSONB DEFAULT '[]'::jsonb,
  -- Edit history
  edit_history JSONB DEFAULT '[]'::jsonb,
  -- Client review flag
  show_to_client BOOLEAN DEFAULT false
);

-- ==========================================
-- ACTION LOGS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS action_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(task_id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  performed_by TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- ADMINS TABLE (for dual role support)
-- ==========================================
CREATE TABLE IF NOT EXISTS admins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('operations', 'client')),
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- CHAT MESSAGES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ref_id TEXT,
  sender_name TEXT NOT NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('admin', 'worker')),
  message TEXT NOT NULL,
  submission_ref_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_ref_id ON chat_messages(ref_id);

-- ==========================================
-- PAYMENT METHODS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  discord_user_id TEXT UNIQUE NOT NULL,
  method_type TEXT NOT NULL CHECK (method_type IN ('UPI', 'CRYPTO', 'PAYPAL')),
  method_details TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- INDEXES
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_tasks_task_id ON tasks(task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_is_active ON tasks(is_active);
CREATE INDEX IF NOT EXISTS idx_tasks_expires_at ON tasks(expires_at);
CREATE INDEX IF NOT EXISTS idx_submissions_ref_id ON submissions(ref_id);
CREATE INDEX IF NOT EXISTS idx_submissions_task_id ON submissions(task_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_action_logs_task_id ON action_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_action_logs_created_at ON action_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_payment_methods_discord_user_id ON payment_methods(discord_user_id);
CREATE INDEX IF NOT EXISTS idx_admins_username ON admins(username);

-- ==========================================
-- ROW LEVEL SECURITY
-- ==========================================
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Tasks: Public read access for available/active tasks
CREATE POLICY "Anyone can view available tasks"
  ON tasks FOR SELECT
  USING (is_active = true AND status IN ('available', 'assigned'));

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

-- Payment Methods: Anyone can view/insert their own
CREATE POLICY "Anyone can view payment methods"
  ON payment_methods FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert payment methods"
  ON payment_methods FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update payment methods"
  ON payment_methods FOR UPDATE
  USING (true);

-- Action Logs: Admin only
CREATE POLICY "Admin can view action logs"
  ON action_logs FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admin can insert action logs"
  ON action_logs FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Admins: Admin can select
CREATE POLICY "Admin can view admins"
  ON admins FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admin can insert admins"
  ON admins FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admin can update admins"
  ON admins FOR UPDATE
  USING (auth.role() = 'authenticated');
