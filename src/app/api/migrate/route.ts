import { NextResponse } from 'next/server';

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '');

  const sql = `-- ===== PASTE THIS IN SUPABASE SQL EDITOR =====
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS required_screenshots TEXT[] DEFAULT ARRAY['initial'];
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS screenshots JSONB DEFAULT '[]'::jsonb;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS edit_history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS show_to_client BOOLEAN DEFAULT false;
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ref_id TEXT,
  sender_name TEXT NOT NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('admin', 'worker')),
  message TEXT NOT NULL,
  submission_ref_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
NOTIFY pgrst, 'reload schema';`;

  return NextResponse.json({
    supabaseUrl,
    projectRef,
    sqlEditorUrl: projectRef ? `https://supabase.com/dashboard/project/${projectRef}/sql/new` : 'Could not determine project ref',
    sql,
    whatToDo: [
      `1. Click the SQL Editor link above`,
      `2. Paste the SQL into the editor`,
      `3. Click "Run" or Ctrl+Enter`,
      `4. That's it!`,
    ],
  });
}
