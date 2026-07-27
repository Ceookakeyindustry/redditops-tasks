import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const refId = searchParams.get('refId');

    const sb = getServiceSupabase();
    if (!sb) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }
    const supabase = sb as any;

    let query = supabase
      .from('chat_messages')
      .select('*')
      .order('created_at', { ascending: true });

    if (refId) {
      query = query.or(`ref_id.is.null,ref_id.eq.${refId}`);
    }

    const { data, error } = await query.limit(100);

    if (error) throw error;

    const messages = (data || []).map((row: any) => ({
      id: row.id,
      refId: row.ref_id,
      senderName: row.sender_name,
      senderRole: row.sender_role,
      message: row.message,
      submissionRefId: row.submission_ref_id,
      createdAt: row.created_at,
    }));

    return NextResponse.json({ messages });
  } catch (error: any) {
    console.error('Chat GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, refId, senderName, senderRole, message, submissionRefId } = body;

    if (action === 'sendChat') {
      if (!senderName || !senderRole || !message) {
        return NextResponse.json(
          { error: 'senderName, senderRole, and message are required' },
          { status: 400 }
        );
      }

      const sb = getServiceSupabase();
      if (!sb) {
        return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
      }
      const supabase = sb as any;

      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          ref_id: refId || null,
          sender_name: senderName,
          sender_role: senderRole,
          message,
          submission_ref_id: submissionRefId || null,
        })
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({
        message: {
          id: data.id,
          refId: data.ref_id,
          senderName: data.sender_name,
          senderRole: data.sender_role,
          message: data.message,
          submissionRefId: data.submission_ref_id,
          createdAt: data.created_at,
        },
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    console.error('Chat POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
