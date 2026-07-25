import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/api-auth';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Require admin auth for accessing submissions via API
    if (!verifyAdminRequest(request)) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin authentication required.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const refId = searchParams.get('refId');
    const taskId = searchParams.get('taskId');

    const supabase = getServiceSupabase();
    if (supabase) {
      let query = supabase.from('submissions').select('*');

      if (refId) {
        query = query.eq('ref_id', refId);
      }
      if (taskId) {
        query = query.eq('task_id', taskId);
      }

      const { data, error } = await query.order('submitted_at', { ascending: false });

      if (!error && data) {
        return NextResponse.json({ submissions: data });
      }
    }

    return NextResponse.json({ submissions: [] });
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch submissions' },
      { status: 500 }
    );
  }
}
