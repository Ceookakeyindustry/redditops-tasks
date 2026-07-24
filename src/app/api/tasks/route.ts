import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');
    const includeInactive = searchParams.get('includeInactive') === 'true';

    // Try Supabase first
    const supabase = getServiceSupabase();
    if (supabase) {
      let query = supabase.from('tasks').select('*');

      if (taskId) {
        query = query.eq('task_id', taskId);
      }
      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (!error && data) {
        return NextResponse.json({ tasks: data });
      }
    }

    // Fallback to local store (server-side)
    return NextResponse.json({ tasks: [] });
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}
