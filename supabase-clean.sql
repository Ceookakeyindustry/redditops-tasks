-- ===== RUN THIS ONCE IN SUPABASE SQL EDITOR =====

-- ==========================================
-- STEP 1: ADD NEW COLUMNS TO EXISTING TABLES
-- ==========================================
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS required_screenshots TEXT[] DEFAULT ARRAY['initial'];

ALTER TABLE submissions ADD COLUMN IF NOT EXISTS screenshots JSONB DEFAULT '[]'::jsonb;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS edit_history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS show_to_client BOOLEAN DEFAULT false;

-- ==========================================
-- STEP 2: CREATE ADMINS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS admins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('operations', 'client')),
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admins_username ON admins(username);
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- STEP 3: CREATE ALL TABLES (IF NOT EXISTS = no errors)
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
  reddit_post_url TEXT, comment_text TEXT,
  target_subreddits TEXT, suggested_title TEXT, suggested_body TEXT,
  images TEXT[], video TEXT,
  access_code_disabled BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT false,
  required_screenshots TEXT[] DEFAULT ARRAY['initial'],
  access_logs JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available','assigned','submitted','approved','expired')),
  discord_user_id TEXT, assigned_discord_username TEXT,
  assigned_at TIMESTAMPTZ, expires_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ref_id TEXT UNIQUE NOT NULL,
  task_id TEXT NOT NULL REFERENCES tasks(task_id) ON DELETE CASCADE,
  discord_username TEXT NOT NULL, proof_link TEXT NOT NULL, note TEXT,
  payment DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  rejection_reason TEXT, admin_note TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  is_paid BOOLEAN DEFAULT false, paid_at TIMESTAMPTZ,
  screenshots JSONB DEFAULT '[]'::jsonb,
  edit_history JSONB DEFAULT '[]'::jsonb,
  show_to_client BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS action_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(task_id) ON DELETE CASCADE,
  action TEXT NOT NULL, performed_by TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ref_id TEXT,
  sender_name TEXT NOT NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('admin', 'worker')),
  message TEXT NOT NULL,
  submission_ref_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  discord_user_id TEXT UNIQUE NOT NULL,
  method_type TEXT NOT NULL CHECK (method_type IN ('UPI','CRYPTO','PAYPAL')),
  method_details TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- STEP 4: DROP OLD POLICIES
-- ==========================================
DROP POLICY IF EXISTS "Anyone can view available tasks" ON tasks;
DROP POLICY IF EXISTS "Admin can insert tasks" ON tasks;
DROP POLICY IF EXISTS "Admin can update tasks" ON tasks;
DROP POLICY IF EXISTS "Admin can delete tasks" ON tasks;
DROP POLICY IF EXISTS "Anyone can submit" ON submissions;
DROP POLICY IF EXISTS "Anyone can view their submission" ON submissions;
DROP POLICY IF EXISTS "Admin can update submissions" ON submissions;
DROP POLICY IF EXISTS "Anyone can view payment methods" ON payment_methods;
DROP POLICY IF EXISTS "Anyone can insert payment methods" ON payment_methods;
DROP POLICY IF EXISTS "Anyone can update payment methods" ON payment_methods;
DROP POLICY IF EXISTS "Admin can view action logs" ON action_logs;
DROP POLICY IF EXISTS "Admin can insert action logs" ON action_logs;
DROP POLICY IF EXISTS "Admin can view admins" ON admins;
DROP POLICY IF EXISTS "Admin can insert admins" ON admins;
DROP POLICY IF EXISTS "Admin can update admins" ON admins;
DROP POLICY IF EXISTS "Anyone can view chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Anyone can insert chat messages" ON chat_messages;

-- ==========================================
-- STEP 5: CREATE INDEXES
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_expires_at ON tasks(expires_at);
CREATE INDEX IF NOT EXISTS idx_payment_methods_discord_user_id ON payment_methods(discord_user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_task_id ON tasks(task_id);
CREATE INDEX IF NOT EXISTS idx_submissions_ref_id ON submissions(ref_id);
CREATE INDEX IF NOT EXISTS idx_admins_username ON admins(username);

-- ==========================================
-- STEP 6: RECREATE ALL POLICIES
-- ==========================================
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view available tasks" ON tasks FOR SELECT USING (is_active = true AND status IN ('available', 'assigned'));
CREATE POLICY "Admin can insert tasks" ON tasks FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Admin can update tasks" ON tasks FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Admin can delete tasks" ON tasks FOR DELETE USING (auth.role() = 'authenticated');

ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit" ON submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view their submission" ON submissions FOR SELECT USING (true);
CREATE POLICY "Admin can update submissions" ON submissions FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Anyone can view payment methods" ON payment_methods FOR SELECT USING (true);
CREATE POLICY "Anyone can insert payment methods" ON payment_methods FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update payment methods" ON payment_methods FOR UPDATE USING (true);

CREATE POLICY "Admin can view action logs" ON action_logs FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin can insert action logs" ON action_logs FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Anyone can view admins" ON admins FOR SELECT USING (true);
CREATE POLICY "Admin can insert admins" ON admins FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Admin can update admins" ON admins FOR UPDATE USING (auth.role() = 'authenticated');

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view chat messages" ON chat_messages FOR SELECT USING (true);
CREATE POLICY "Anyone can insert chat messages" ON chat_messages FOR INSERT WITH CHECK (true);
