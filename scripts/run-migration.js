// Run this with: node scripts/run-migration.js
// It needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in environment

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SERVICE_ROLE_KEY env vars');
  console.error('Set them and try again');
  process.exit(1);
}

const sql = `
-- Add new columns to existing tables
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS required_screenshots TEXT[] DEFAULT ARRAY['initial'];
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS screenshots JSONB DEFAULT '[]'::jsonb;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS edit_history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS show_to_client BOOLEAN DEFAULT false;

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ref_id TEXT,
  sender_name TEXT NOT NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('admin', 'worker')),
  message TEXT NOT NULL,
  submission_ref_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
`;

async function runMigration() {
  const url = `${SUPABASE_URL}/rest/v1/`;
  
  console.log('Running SQL migration...');
  console.log('Supabase URL:', SUPABASE_URL);
  
  // Use the Supabase SQL endpoint
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  }).catch(() => null);

  if (!response) {
    // Try direct SQL query via the management API
    console.log('Trying direct SQL execution...');
    const projectRef = SUPABASE_URL.replace('https://', '').replace('.supabase.co', '');
    console.log('Project ref:', projectRef);
    
    const mgmtResponse = await fetch(
      `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SERVICE_KEY}`,
        },
        body: JSON.stringify({ query: sql }),
      }
    ).catch(e => {
      console.error('Management API error:', e.message);
      return null;
    });

    if (mgmtResponse && mgmtResponse.ok) {
      console.log('✅ Migration completed successfully via Management API');
      return;
    }
    
    console.log('⚠️ Could not run SQL automatically.');
    console.log('');
    console.log('You need to run this SQL manually in Supabase SQL Editor:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(sql);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    return;
  }
  
  if (response.ok) {
    console.log('✅ Migration completed successfully!');
  } else {
    const text = await response.text();
    console.error('❌ Migration failed:', text);
  }
}

runMigration().catch(console.error);
