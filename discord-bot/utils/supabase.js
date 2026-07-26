const { createClient } = require('@supabase/supabase-js');

let supabaseClient = null;

/**
 * Get Supabase service client (for admin operations)
 */
function getSupabase() {
  if (supabaseClient) return supabaseClient;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn('❌ Supabase not configured: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return null;
  }

  supabaseClient = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabaseClient;
}

/**
 * Convert snake_case DB row to camelCase task object
 */
function formatTask(row) {
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
    accessLogs: row.access_logs || [],
    status: row.status || 'available',
    discordUserId: row.discord_user_id,
    assignedDiscordUsername: row.assigned_discord_username,
    assignedAt: row.assigned_at,
    expiresAt: row.expires_at,
  };
}

function formatSubmission(row) {
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
    isPaid: row.is_paid || false,
    paidAt: row.paid_at,
  };
}

/**
 * Get a task by its task ID
 */
async function getTask(taskId) {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('task_id', taskId)
    .single();

  if (error) {
    console.error(`Error fetching task ${taskId}:`, error.message);
    return null;
  }

  return formatTask(data);
}

/**
 * Update a task in Supabase
 */
async function updateTask(taskId, updates) {
  const supabase = getSupabase();
  if (!supabase) return null;

  // Convert camelCase to snake_case
  const dbUpdates = {};
  if (updates.accessCode !== undefined) dbUpdates.access_code = updates.accessCode;
  if (updates.accessCodeDisabled !== undefined) dbUpdates.access_code_disabled = updates.accessCodeDisabled;
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.discordUserId !== undefined) dbUpdates.discord_user_id = updates.discordUserId;
  if (updates.assignedDiscordUsername !== undefined) dbUpdates.assigned_discord_username = updates.assignedDiscordUsername;
  if (updates.assignedAt !== undefined) dbUpdates.assigned_at = updates.assignedAt;
  if (updates.expiresAt !== undefined) dbUpdates.expires_at = updates.expiresAt;
  if (updates.completedCount !== undefined) dbUpdates.completed_count = updates.completedCount;

  const { data, error } = await supabase
    .from('tasks')
    .update(dbUpdates)
    .eq('task_id', taskId)
    .select()
    .single();

  if (error) {
    console.error(`Error updating task ${taskId}:`, error.message);
    return null;
  }

  return formatTask(data);
}

/**
 * Get all tasks (for list commands)
 */
async function getAllTasks() {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching tasks:', error.message);
    return [];
  }

  return data.map(formatTask);
}

/**
 * Get tasks created today
 */
async function getTodayTasks() {
  const supabase = getSupabase();
  if (!supabase) return [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .gte('created_at', today.toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching today tasks:', error.message);
    return [];
  }

  return data.map(formatTask);
}

/**
 * Get submission for a task
 */
async function getTaskSubmission(taskId) {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('task_id', taskId)
    .order('submitted_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error(`Error fetching submission for ${taskId}:`, error.message);
    return null;
  }

  return data.length > 0 ? formatSubmission(data[0]) : null;
}

/**
 * Log an action to the action_logs table
 */
async function addActionLog(taskId, action, performedBy, details = {}) {
  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase
    .from('action_logs')
    .insert({
      task_id: taskId,
      action,
      performed_by: performedBy,
      details,
    });

  if (error) {
    console.error('Error adding action log:', error.message);
  }
}

/**
 * Get all expired assigned tasks (for expiry checker)
 */
async function getExpiredTasks() {
  const supabase = getSupabase();
  if (!supabase) return [];

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('status', 'assigned')
    .lte('expires_at', now);

  if (error) {
    console.error('Error fetching expired tasks:', error.message);
    return [];
  }

  return data.map(formatTask);
}

// ==========================================
// PAYMENT METHODS
// ==========================================

/**
 * Get payment method for a Discord user
 */
async function getUserPaymentMethod(discordUserId) {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('payment_methods')
    .select('*')
    .eq('discord_user_id', discordUserId)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') { // Not found
      console.error(`Error fetching payment method for ${discordUserId}:`, error.message);
    }
    return null;
  }

  return data ? {
    id: data.id,
    discordUserId: data.discord_user_id,
    methodType: data.method_type,
    methodDetails: data.method_details,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  } : null;
}

/**
 * Set or update payment method for a Discord user
 */
async function setUserPaymentMethod(discordUserId, methodType, methodDetails) {
  const supabase = getSupabase();
  if (!supabase) return null;

  // Upsert: insert if not exists, update if exists
  const { data, error } = await supabase
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

  if (error) {
    console.error(`Error setting payment method for ${discordUserId}:`, error.message);
    return null;
  }

  return {
    id: data.id,
    discordUserId: data.discord_user_id,
    methodType: data.method_type,
    methodDetails: data.method_details,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Get payment method by Discord username (for admin viewing)
 */
async function getPaymentMethodByUsername(discordUsername) {
  const supabase = getSupabase();
  if (!supabase) return null;

  // First find the user ID from the tasks table
  const { data: taskData, error: taskError } = await supabase
    .from('tasks')
    .select('discord_user_id')
    .eq('assigned_discord_username', discordUsername)
    .not('discord_user_id', 'is', null)
    .limit(1);

  if (taskError || !taskData || taskData.length === 0) {
    return null;
  }

  return getUserPaymentMethod(taskData[0].discord_user_id);
}

module.exports = {
  getSupabase,
  getTask,
  updateTask,
  getAllTasks,
  getTodayTasks,
  getTaskSubmission,
  addActionLog,
  getExpiredTasks,
  formatTask,
  formatSubmission,
  getUserPaymentMethod,
  setUserPaymentMethod,
  getPaymentMethodByUsername,
};
