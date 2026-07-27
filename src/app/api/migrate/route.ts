import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');

  if (key !== 'migrate2024') {
    return NextResponse.json({ error: 'Use ?key=migrate2024' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Missing credentials on this deployment' }, { status: 500 });
  }

  const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '');
  const results: any[] = [];

  const sql = `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;
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

  // Try 1: Supabase internal SQL API (used by the dashboard editor)
  try {
    const res1 = await fetch(`${supabaseUrl}/api/sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey,
      },
      body: JSON.stringify({ query: sql }),
    });
    const text1 = await res1.text();
    results.push({ method: 'Supabase API SQL', status: res1.status, ok: res1.ok, response: text1.substring(0, 200) });
  } catch (e: any) {
    results.push({ method: 'Supabase API SQL', status: 0, ok: false, response: e.message });
  }

  // Try 2: Management API
  try {
    const res2 = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ query: sql }),
    });
    const text2 = await res2.text();
    results.push({ method: 'Management API', status: res2.status, ok: res2.ok, response: text2.substring(0, 200) });
  } catch (e: any) {
    results.push({ method: 'Management API', status: 0, ok: false, response: e.message });
  }

  // Try 3: pg_try via postgrest (exec_sql function)
  try {
    const res3 = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey,
      },
      body: JSON.stringify({ query_text: sql }),
    });
    const text3 = await res3.text();
    results.push({ method: 'RPC exec_sql', status: res3.status, ok: res3.ok, response: text3.substring(0, 200) });
  } catch (e: any) {
    results.push({ method: 'RPC exec_sql', status: 0, ok: false, response: e.message });
  }

  return NextResponse.json({
    projectRef,
    anySuccess: results.some(r => r.ok),
    results,
    sqlEditorLink: `https://supabase.com/dashboard/project/${projectRef}/sql/new`,
  });
}
