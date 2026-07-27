import { NextResponse } from 'next/server';

// ONE-TIME migration endpoint
// After running, delete this file and redeploy
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');
  
  if (key !== 'migrate2024') {
    return NextResponse.json({ error: 'Invalid key. Use ?key=migrate2024' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Missing Supabase credentials' }, { status: 500 });
  }

  const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '');
  const apiUrl = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;

  const sqlStatements = [
    `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;`,
    `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS required_screenshots TEXT[] DEFAULT ARRAY['initial'];`,
    `ALTER TABLE submissions ADD COLUMN IF NOT EXISTS screenshots JSONB DEFAULT '[]'::jsonb;`,
    `ALTER TABLE submissions ADD COLUMN IF NOT EXISTS edit_history JSONB DEFAULT '[]'::jsonb;`,
    `ALTER TABLE submissions ADD COLUMN IF NOT EXISTS show_to_client BOOLEAN DEFAULT false;`,
    `CREATE TABLE IF NOT EXISTS chat_messages (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      ref_id TEXT,
      sender_name TEXT NOT NULL,
      sender_role TEXT NOT NULL CHECK (sender_role IN ('admin', 'worker')),
      message TEXT NOT NULL,
      submission_ref_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );`,
  ];

  const results = [];

  for (const sql of sqlStatements) {
    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ query: sql }),
      });
      
      const text = await res.text();
      results.push({
        sql: sql.substring(0, 60) + '...',
        status: res.status,
        ok: res.ok,
        response: text.substring(0, 200),
      });
    } catch (e: any) {
      results.push({
        sql: sql.substring(0, 60) + '...',
        status: 0,
        ok: false,
        response: e.message,
      });
    }
  }

  // Try to refresh schema cache
  try {
    await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ query: `NOTIFY pgrst, 'reload schema';` }),
    });
    results.push({ sql: 'REFRESH SCHEMA CACHE', status: 200, ok: true, response: 'Sent' });
  } catch (e: any) {
    results.push({ sql: 'REFRESH SCHEMA CACHE', status: 0, ok: false, response: e.message });
  }

  return NextResponse.json({ 
    message: 'Migration attempted',
    projectRef,
    supabaseUrl,
    results,
    supabaseDashboardUrl: `https://supabase.com/dashboard/project/${projectRef}/sql/new`,
    sqlToRun: `-- Copy and paste this into the SQL Editor:\n\n${sqlStatements.join('\n')}\n\nNOTIFY pgrst, 'reload schema';`
  });
}
