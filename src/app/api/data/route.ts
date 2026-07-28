import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

function formatTask(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    taskId: row.task_id,
    accessCode: row.access_code,
    title: row.title,
    type: row.type,
    payment: parseFloat(row.payment),
    requirements: row.requirements || '',
    instructions: row.instructions || '',
    maxCompletions: row.max_completions,
    completedCount: row.completed_count || 0,
    isActive: row.is_active,
    createdAt: row.created_at,
    redditPostUrl: row.reddit_post_url,
    commentText: row.comment_text,
    targetSubreddits: row.target_subreddits,
    suggestedTitle: row.suggested_title,
    suggestedBody: row.suggested_body,
    images: row.images,
    video: row.video,
    accessCodeDisabled: row.access_code_disabled || false,
    isPublic: row.is_public || false,
    accessLogs: row.access_logs || [],
    status: row.status || 'available',
    discordUserId: row.discord_user_id,
    assignedDiscordUsername: row.assigned_discord_username,
    assignedAt: row.assigned_at,
    expiresAt: row.expires_at,
    requiredScreenshots: row.required_screenshots || ['initial'],
  };
}

function formatSubmission(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    refId: row.ref_id,
    taskId: row.task_id,
    discordUsername: row.discord_username,
    proofLink: row.proof_link,
    note: row.note,
    payment: parseFloat(row.payment),
    status: row.status,
    rejectionReason: row.rejection_reason,
    adminNote: row.admin_note,
    submittedAt: row.submitted_at,
    paidAt: row.paid_at,
    screenshots: row.screenshots || [],
    editHistory: row.edit_history || [],
    showToClient: row.show_to_client || false,
    labels: row.labels || [],
    customLabel: '' as string | undefined, // Loaded separately to avoid schema issues
  };
}

// ----- GET Handler -----
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  const sb = getServiceSupabase();
  if (!sb) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }
  const supabase = sb as any;

  try {
    switch (type) {
      // --- Tasks ---
      case 'tasks': {
        const active = searchParams.get('active');
        const status = searchParams.get('status');

        let query = supabase.from('tasks').select('*');
        if (active === 'true') query = query.eq('is_active', true);
        if (status) query = query.eq('status', status);
        query = query.order('created_at', { ascending: false });

        const { data, error } = await query;
        if (error) throw error;
        return NextResponse.json({ tasks: (data || []).map(formatTask) });
      }

      case 'task': {
        const taskId = searchParams.get('taskId');
        const accessCode = searchParams.get('accessCode');
        if (!taskId) return NextResponse.json({ error: 'taskId required' }, { status: 400 });

        let query = supabase.from('tasks').select('*').eq('task_id', taskId);
        if (accessCode) query = query.eq('access_code', accessCode).eq('access_code_disabled', false);

        const { data, error } = await query.single();
        if (error) {
          if (error.code === 'PGRST116') return NextResponse.json({ task: null });
          throw error;
        }
        return NextResponse.json({ task: formatTask(data) });
      }

      // --- Submissions ---
      case 'submissions': {
        const taskIdFilter = searchParams.get('taskId');
        let query = supabase.from('submissions').select('*');
        if (taskIdFilter) query = query.eq('task_id', taskIdFilter);
        query = query.order('submitted_at', { ascending: false });

        const { data, error } = await query;
        if (error) throw error;
        return NextResponse.json({ submissions: (data || []).map(formatSubmission) });
      }

      case 'submission': {
        const refId = searchParams.get('refId');
        if (!refId) return NextResponse.json({ error: 'refId required' }, { status: 400 });

        const { data, error } = await supabase
          .from('submissions')
          .select('*')
          .eq('ref_id', refId)
          .single();

        if (error) {
          if (error.code === 'PGRST116') return NextResponse.json({ submission: null });
          throw error;
        }
        return NextResponse.json({ submission: formatSubmission(data) });
      }

      // --- Dashboard Stats ---
      case 'dashboard': {
        // Fetch tasks and submissions separately to handle errors independently
        // Note: .catch() doesn't work on Supabase query builders (not native Promises)
        let tasksData: any[] = [];
        let submissionsData: any[] = [];

        try {
          const taskQuery = supabase.from('tasks').select('*');
          const taskResult = await taskQuery;
          if (!taskResult.error && taskResult.data) tasksData = taskResult.data;
        } catch { console.warn('Dashboard tasks query failed'); }

        try {
          const subQuery = supabase.from('submissions').select('*');
          const subResult = await subQuery;
          if (!subResult.error && subResult.data) submissionsData = subResult.data;
        } catch { console.warn('Dashboard submissions query failed'); }

        const tasks = tasksData.map(formatTask).filter(Boolean);
        const submissions = submissionsData.map(formatSubmission).filter(Boolean);
        
        const inProgress = ['submitted', 'in_review', '24hr_pending', '24hr_done', '48hr_pending', '48hr_done', 'processing'];
        const paidSubs = submissions.filter((s: any) => s.status === 'paid');

        const stats = {
          totalTasks: tasks.length,
          activeTasks: tasks.filter((t: any) => t.isActive).length,
          totalSubmissions: submissions.length,
          pendingSubmissions: submissions.filter((s: any) => inProgress.includes(s.status)).length,
          inProgressSubmissions: submissions.filter((s: any) => inProgress.includes(s.status)).length,
          paidSubmissions: paidSubs.length,
          rejectedSubmissions: submissions.filter((s: any) => s.status === 'rejected').length,
          totalPayout: paidSubs.reduce((sum: number, s: any) => sum + (s.payment || 0), 0),
        };

        return NextResponse.json({ stats });
      }

      // --- Action Logs ---
      case 'actionLogs': {
        const logTaskId = searchParams.get('taskId');
        let logQuery = supabase.from('action_logs').select('*');
        if (logTaskId) logQuery = logQuery.eq('task_id', logTaskId);
        logQuery = logQuery.order('created_at', { ascending: false });

        const { data, error } = await logQuery;
        if (error) throw error;
        return NextResponse.json({ actionLogs: data || [] });
      }

      // --- Payment Method ---
      case 'payment': {
        const discordUserId = searchParams.get('userId');
        if (!discordUserId) return NextResponse.json({ payment: null });

        const { data: pmt, error } = await supabase
          .from('payment_methods')
          .select('*')
          .eq('discord_user_id', discordUserId)
          .single();

        if (error) {
          if (error.code === 'PGRST116') return NextResponse.json({ payment: null });
          throw error;
        }
        return NextResponse.json({
          payment: {
            id: (pmt as any).id,
            discordUserId: (pmt as any).discord_user_id,
            methodType: (pmt as any).method_type,
            methodDetails: (pmt as any).method_details,
            createdAt: (pmt as any).created_at,
            updatedAt: (pmt as any).updated_at,
          },
        });
      }

      default:
        return NextResponse.json({ error: 'Unknown type' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('API /api/data GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

const supabaseUrlForMigration = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const projectRef = supabaseUrlForMigration.replace('https://', '').replace('.supabase.co', '');
const sqlEditorLink = projectRef ? `https://supabase.com/dashboard/project/${projectRef}/sql/new` : 'https://supabase.com/dashboard';

function isColumnError(error: any): boolean {
  const msg = error?.message || '';
  return msg.includes('column') && (msg.includes('does not exist') || msg.includes('not found') || msg.includes('schema cache'));
}

function migrationErrorResponse() {
  return {
    error: 'Database needs a quick migration. Click the link and run the SQL.',
    sqlEditorLink,
    sql: `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS required_screenshots TEXT[] DEFAULT ARRAY['initial'];
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS screenshots JSONB DEFAULT '[]'::jsonb;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS edit_history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS show_to_client BOOLEAN DEFAULT false;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS labels JSONB DEFAULT '[]'::jsonb;
NOTIFY pgrst, 'reload schema';`,
  };
}

// ----- POST Handler -----
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action, taskId, refId, data } = body;

  const sb = getServiceSupabase();
  if (!sb) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }
  const supabase = sb as any;

  try {
    switch (action) {
      // --- Create Task ---
      case 'createTask': {
        const { taskId: newId, ...taskData } = data;
        const dbData: any = {};
        for (const [key, value] of Object.entries(taskData)) {
          const snakeKey = camelToSnake(key);
          dbData[snakeKey] = value ?? null;
        }
        dbData.task_id = newId;

        const { data: result, error } = await (supabase as any)
          .from('tasks')
          .insert(dbData)
          .select()
          .single();

        if (error) {
          if (isColumnError(error)) {
            return NextResponse.json(migrationErrorResponse(), { status: 400 });
          }
          throw error;
        }
        return NextResponse.json({ task: formatTask(result) });
      }

      // --- Update Task ---
      case 'updateTask': {
        if (!taskId) return NextResponse.json({ error: 'taskId required' }, { status: 400 });

        const dbUpdates: any = {};
        for (const [key, value] of Object.entries(data || {})) {
          if (value === undefined) continue;
          const snakeKey = camelToSnake(key);
          dbUpdates[snakeKey] = value;
        }

        const { data: result, error } = await (supabase as any)
          .from('tasks')
          .update(dbUpdates)
          .eq('task_id', taskId)
          .select()
          .single();

        if (error) {
          if (isColumnError(error)) {
            return NextResponse.json(migrationErrorResponse(), { status: 400 });
          }
          throw error;
        }
        return NextResponse.json({ task: formatTask(result) });
      }

      // --- Delete Task ---
      case 'deleteTask': {
        if (!taskId) return NextResponse.json({ error: 'taskId required' }, { status: 400 });

        const { error } = await supabase.from('tasks').delete().eq('task_id', taskId);
        if (error) throw error;
        return NextResponse.json({ success: true });
      }

      // --- Log Access ---
      case 'logAccess': {
        const { ipAddress, success } = body;
        if (!taskId) return NextResponse.json({ error: 'taskId required' }, { status: 400 });

        // First get current task
        const { data: task } = await (supabase as any)
          .from('tasks')
          .select('access_logs')
          .eq('task_id', taskId)
          .single();

        const logs = (task?.access_logs as any[]) || [];
        logs.push({ timestamp: new Date().toISOString(), ipAddress, success });

        await (supabase as any)
          .from('tasks')
          .update({ access_logs: logs })
          .eq('task_id', taskId);

        return NextResponse.json({ success: true });
      }

      // --- Create Submission ---
      case 'createSubmission': {
        if (!data) return NextResponse.json({ error: 'data required' }, { status: 400 });
        if (!data.refId) return NextResponse.json({ error: 'refId is required' }, { status: 400 });
        if (!data.taskId) return NextResponse.json({ error: 'taskId is required' }, { status: 400 });
        if (!data.discordUsername) return NextResponse.json({ error: 'discordUsername is required' }, { status: 400 });
        if (!data.payment && data.payment !== 0) return NextResponse.json({ error: 'payment is required' }, { status: 400 });

        // Verify task exists
        const { data: existingTask, error: taskError } = await supabase
          .from('tasks')
          .select('task_id')
          .eq('task_id', data.taskId)
          .single();

        if (taskError || !existingTask) {
          return NextResponse.json({ error: `Task "${data.taskId}" not found` }, { status: 400 });
        }

        const dbData: any = {};
        for (const [key, value] of Object.entries(data)) {
          const snakeKey = camelToSnake(key);
          dbData[snakeKey] = value ?? null;
        }

        const { data: result, error } = await (supabase as any)
          .from('submissions')
          .insert(dbData)
          .select()
          .single();

        if (error) {
          if (isColumnError(error)) {
            return NextResponse.json(migrationErrorResponse(), { status: 400 });
          }
          throw error;
        }
        return NextResponse.json({ submission: formatSubmission(result) });
      }

      // --- Update Submission ---
      case 'updateSubmission': {
        if (!refId) return NextResponse.json({ error: 'refId required' }, { status: 400 });

        const dbUpdates: any = {};
        for (const [key, value] of Object.entries(data || {})) {
          if (value === undefined) continue;
          const snakeKey = camelToSnake(key);
          dbUpdates[snakeKey] = value;
        }

        const { data: result, error } = await (supabase as any)
          .from('submissions')
          .update(dbUpdates)
          .eq('ref_id', refId)
          .select()
          .single();

        if (error) {
          if (isColumnError(error)) {
            return NextResponse.json(migrationErrorResponse(), { status: 400 });
          }
          throw error;
        }
        return NextResponse.json({ submission: formatSubmission(result) });
      }

      // --- Add Action Log ---
      case 'addActionLog': {
        const { performedBy, details, logAction } = body;
        if (!taskId || !logAction) {
          return NextResponse.json({ error: 'taskId and logAction required' }, { status: 400 });
        }

        const { data: result, error } = await (supabase as any)
          .from('action_logs')
          .insert({
            task_id: taskId,
            action: logAction,
            performed_by: performedBy || 'system',
            details: details || {},
          })
          .select()
          .single();

        if (error) throw error;
        return NextResponse.json({ actionLog: result });
      }

      // --- Check & Expire Tasks ---
      case 'checkExpire': {
        const now = new Date().toISOString();

        const { data: expiredTasks, error: fetchError } = await supabase
          .from('tasks')
          .select('*')
          .eq('status', 'assigned')
          .lte('expires_at', now);

        if (fetchError) throw fetchError;

        if (expiredTasks && expiredTasks.length > 0) {
          for (const task of expiredTasks) {
            // Generate code using same chars as website (A-Z, 0-9)
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let newCode = '';
            for (let i = 0; i < 6; i++) {
              newCode += chars.charAt(Math.floor(Math.random() * chars.length));
            }

            await (supabase as any)
              .from('tasks')
              .update({
                access_code: newCode,
                access_code_disabled: false,
                status: 'available',
                discord_user_id: null,
                assigned_discord_username: null,
                assigned_at: null,
                expires_at: null,
              })
              .eq('task_id', task.task_id);

            await (supabase as any)
              .from('action_logs')
              .insert({
                task_id: task.task_id,
                action: 'expired',
                performed_by: 'system',
                details: { previouslyAssignedTo: task.assigned_discord_username },
              });
          }
        }

        return NextResponse.json({ expired: (expiredTasks || []).length });
      }

      // --- Set Payment Method ---
      case 'setPayment': {
        const { discordUserId, methodType, methodDetails } = body;
        if (!discordUserId || !methodType || !methodDetails) {
          return NextResponse.json({ error: 'discordUserId, methodType, methodDetails required' }, { status: 400 });
        }

        const { data: result, error } = await (supabase as any)
          .from('payment_methods')
          .upsert({
            discord_user_id: discordUserId,
            method_type: methodType,
            method_details: methodDetails,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'discord_user_id',
            ignoreDuplicates: false,
          })
          .select()
          .single();

        if (error) throw error;
        return NextResponse.json({
          payment: {
            id: result.id,
            discordUserId: result.discord_user_id,
            methodType: result.method_type,
            methodDetails: result.method_details,
            createdAt: result.created_at,
            updatedAt: result.updated_at,
          },
        });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error: any) {
    console.error('API /api/data POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
