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
    return NextResponse.json({ error: 'Missing credentials' }, { status: 500 });
  }

  const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '');
  const results: any[] = [];

  const allSql = `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS required_screenshots TEXT[] DEFAULT ARRAY['initial'];
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS screenshots JSONB DEFAULT '[]'::jsonb;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS edit_history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS show_to_client BOOLEAN DEFAULT false;
NOTIFY pgrst, 'reload schema';`;

  // Try Supabase pg-meta endpoint (this IS different from what we tried before)
  try {
    const res = await fetch(`${supabaseUrl}/pg/api/v1/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey,
      },
      body: JSON.stringify({ query: allSql }),
    });
    const text = await res.text();
    results.push({ method: 'pg-meta /pg/api/v1/query', status: res.status, ok: res.ok, response: text.substring(0, 300) });
  } catch (e: any) {
    results.push({ method: 'pg-meta', status: 0, ok: false, error: e.message });
  }

  // Try pg-meta v1.7+ endpoint
  try {
    const res = await fetch(`${supabaseUrl}/pg/api/v1/sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey,
      },
      body: JSON.stringify({ query: allSql }),
    });
    const text = await res.text();
    results.push({ method: 'pg-meta /pg/api/v1/sql', status: res.status, ok: res.ok, response: text.substring(0, 300) });
  } catch (e: any) {
    results.push({ method: 'pg-meta sql', status: 0, ok: false, error: e.message });
  }

  // Try the Supabase management API with Bearer token (some versions accept service key)
  try {
    const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ query: allSql }),
    });
    const text = await res.text();
    results.push({ method: 'Management API v1', status: res.status, ok: res.ok, response: text.substring(0, 300) });
  } catch (e: any) {
    results.push({ method: 'Management API', status: 0, ok: false, error: e.message });
  }

  const anySuccess = results.some(r => r.ok);

  return NextResponse.json({
    projectRef,
    anySuccess,
    results,
    sqlEditorLink: `https://supabase.com/dashboard/project/${projectRef}/sql/new`,
    sql: allSql,
  });
}
