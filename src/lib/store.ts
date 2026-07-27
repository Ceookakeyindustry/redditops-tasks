// Store that communicates with Supabase via the /api/data route
// All functions are async and work both client and server side

import type { Task, Submission, DashboardStats, ActionLog, AdminRole, ScreenshotProof, ChatMessage } from './types';
import { generateTaskId, generateRefId, generateAccessCode } from './types';

const API_BASE = '/api/data';

async function apiGet(params: Record<string, string>): Promise<any> {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}?${qs}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

async function apiPost(body: Record<string, any>): Promise<any> {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ==================== TASKS ====================

export async function getTasks(): Promise<Task[]> {
  const { tasks } = await apiGet({ type: 'tasks' });
  return tasks || [];
}

export async function getTask(taskId: string): Promise<Task | undefined> {
  const { task } = await apiGet({ type: 'task', taskId });
  return task || undefined;
}

export async function getTaskByAccess(taskId: string, accessCode: string): Promise<Task | undefined> {
  const { task } = await apiGet({ type: 'task', taskId, accessCode });
  return task || undefined;
}

export async function getAvailableTasks(): Promise<Task[]> {
  const { tasks } = await apiGet({ type: 'tasks', active: 'true', status: 'available' });
  return tasks || [];
}

export async function createTask(data: Record<string, any>): Promise<Task> {
  const { tasks } = await apiGet({ type: 'tasks' });
  // If no custom taskId provided, generate one
  if (!data.taskId) {
    const counter = (tasks?.length || 0) + 1;
    data.taskId = generateTaskId(counter);
  }
  const newTask = {
    ...data,
    createdAt: new Date().toISOString(),
    completedCount: 0,
    accessLogs: [],
    accessCodeDisabled: data.accessCodeDisabled ?? false,
    isPublic: data.isPublic ?? false,
    requiredScreenshots: data.requiredScreenshots ?? ['initial'],
    status: 'available',
  };
  const { task } = await apiPost({ action: 'createTask', data: newTask });
  return task;
}

export async function updateTask(taskId: string, data: Partial<Task>): Promise<Task | undefined> {
  const { task } = await apiPost({ action: 'updateTask', taskId, data });
  return task;
}

export async function deleteTask(taskId: string): Promise<boolean> {
  await apiPost({ action: 'deleteTask', taskId });
  return true;
}

export async function logAccess(taskId: string, ipAddress: string, success: boolean): Promise<void> {
  await apiPost({ action: 'logAccess', taskId, ipAddress, success });
}

// ==================== DISCORD ASSIGNMENT ====================

export async function assignTask(taskId: string, discordUserId: string, discordUsername: string): Promise<Task | undefined> {
  const task = await getTask(taskId);
  if (!task || task.status !== 'available') return undefined;

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 12 * 60 * 60 * 1000);

  const updated = await updateTask(taskId, {
    accessCode: generateAccessCode(),
    accessCodeDisabled: false,
    status: 'assigned',
    discordUserId,
    assignedDiscordUsername: discordUsername,
    assignedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  });

  if (updated) {
    await addActionLog({
      taskId,
      action: 'assigned',
      performedBy: discordUsername,
      details: { discordUserId, discordUsername, expiresAt: expiresAt.toISOString() },
    });
  }

  return updated;
}

export async function unassignTask(taskId: string, adminUsername?: string): Promise<Task | undefined> {
  const task = await getTask(taskId);
  if (!task || task.status !== 'assigned') return undefined;

  const updated = await updateTask(taskId, {
    accessCode: generateAccessCode(),
    accessCodeDisabled: false,
    status: 'available',
    discordUserId: undefined,
    assignedDiscordUsername: undefined,
    assignedAt: undefined,
    expiresAt: undefined,
  });

  if (updated) {
    await addActionLog({
      taskId,
      action: 'unassigned',
      performedBy: adminUsername || 'system',
      details: { previousDiscordUserId: task.discordUserId },
    });
  }

  return updated;
}

export async function expireTask(taskId: string): Promise<Task | undefined> {
  const task = await getTask(taskId);
  if (!task || task.status !== 'assigned') return undefined;

  const previousUser = task.assignedDiscordUsername;

  const updated = await updateTask(taskId, {
    accessCode: generateAccessCode(),
    accessCodeDisabled: false,
    status: 'available',
    discordUserId: undefined,
    assignedDiscordUsername: undefined,
    assignedAt: undefined,
    expiresAt: undefined,
  });

  if (updated) {
    await addActionLog({
      taskId,
      action: 'expired',
      performedBy: 'system',
      details: { previouslyAssignedTo: previousUser },
    });
  }

  return updated;
}

export async function regenAccessCode(taskId: string, adminUsername?: string): Promise<Task | undefined> {
  const task = await getTask(taskId);
  if (!task) return undefined;

  const oldCode = task.accessCode;
  const updated = await updateTask(taskId, {
    accessCode: generateAccessCode(),
    accessCodeDisabled: false,
  });

  if (updated) {
    await addActionLog({
      taskId,
      action: 'access_code_regenerated',
      performedBy: adminUsername || 'system',
      details: { oldCode },
    });
  }

  return updated;
}

export async function markTaskSubmitted(taskId: string): Promise<Task | undefined> {
  const task = await getTask(taskId);
  if (!task || task.status !== 'assigned') return undefined;

  const updated = await updateTask(taskId, {
    status: 'submitted',
    completedCount: (task.completedCount || 0) + 1,
  });

  if (updated) {
    await addActionLog({
      taskId,
      action: 'submitted',
      performedBy: task.assignedDiscordUsername || 'unknown',
      details: {},
    });
  }

  return updated;
}

export async function approveTaskSubmission(taskId: string, adminUsername?: string): Promise<Task | undefined> {
  const updated = await updateTask(taskId, { status: 'approved' });
  if (updated) {
    await addActionLog({
      taskId,
      action: 'approved',
      performedBy: adminUsername || 'system',
      details: { assignedDiscordUsername: updated.assignedDiscordUsername },
    });
  }
  return updated;
}

export async function rejectTaskSubmission(taskId: string, adminUsername?: string): Promise<Task | undefined> {
  // Save the previous assignee BEFORE updating (updateTask clears it)
  const currentTask = await getTask(taskId);
  const previousUser = currentTask?.assignedDiscordUsername;

  const updated = await updateTask(taskId, {
    accessCode: generateAccessCode(),
    accessCodeDisabled: false,
    status: 'available',
    discordUserId: undefined,
    assignedDiscordUsername: undefined,
    assignedAt: undefined,
    expiresAt: undefined,
  });

  if (updated) {
    await addActionLog({
      taskId,
      action: 'rejected',
      performedBy: adminUsername || 'system',
      details: { previouslyAssignedTo: previousUser },
    });
  }

  return updated;
}

// ==================== ACTION LOGS ====================

export async function getActionLogs(): Promise<ActionLog[]> {
  const { actionLogs } = await apiGet({ type: 'actionLogs' });
  return actionLogs || [];
}

export async function getTaskActionLogs(taskId: string): Promise<ActionLog[]> {
  const { actionLogs } = await apiGet({ type: 'actionLogs', taskId });
  return actionLogs || [];
}

export async function addActionLog(data: Omit<ActionLog, 'id' | 'createdAt'>): Promise<ActionLog> {
  const { actionLog } = await apiPost({
    action: 'addActionLog',
    taskId: data.taskId,
    logAction: data.action,
    performedBy: data.performedBy,
    details: data.details,
  });
  return actionLog;
}

// ==================== EXPIRY CHECK ====================

export async function checkAndExpireTasks(): Promise<Task[]> {
  const { expired } = await apiPost({ action: 'checkExpire' });
  if (expired > 0) {
    const { tasks } = await apiGet({ type: 'tasks' });
    return tasks?.filter((t: Task) => t.status === 'available') || [];
  }
  return [];
}

// ==================== SUBMISSIONS ====================

export async function getSubmissions(): Promise<Submission[]> {
  const { submissions } = await apiGet({ type: 'submissions' });
  return submissions || [];
}

export async function getSubmission(refId: string): Promise<Submission | undefined> {
  const { submission } = await apiGet({ type: 'submission', refId });
  return submission || undefined;
}

export async function getTaskSubmissions(taskId: string): Promise<Submission[]> {
  const { submissions } = await apiGet({ type: 'submissions', taskId });
  return submissions || [];
}

export async function createSubmission(data: {
  taskId: string;
  discordUsername: string;
  proofLink: string;
  note?: string;
  payment: number;
  rejectionReason?: string;
  adminNote?: string;
  screenshots?: ScreenshotProof[];
}): Promise<Submission> {
  const submissionData = {
    ...data,
    refId: generateRefId(),
    status: 'pending',
    isPaid: false,
    screenshots: data.screenshots || [],
    editHistory: [],
    submittedAt: new Date().toISOString(),
  };
  const { submission } = await apiPost({ action: 'createSubmission', data: submissionData });
  return submission;
}

export async function updateSubmission(refId: string, data: Partial<Submission>): Promise<Submission | undefined> {
  const { submission } = await apiPost({ action: 'updateSubmission', refId, data });
  return submission;
}

// ==================== SUBMISSION EDITING ====================

export async function editSubmissionProofLink(refId: string, newProofLink: string): Promise<Submission | undefined> {
  const submission = await getSubmission(refId);
  if (!submission || submission.status !== 'pending') return undefined;
  
  const editEntry = {
    field: 'proofLink',
    oldValue: submission.proofLink,
    newValue: newProofLink,
    editedAt: new Date().toISOString(),
  };
  
  const editHistory = [...(submission.editHistory || []), editEntry];
  
  const updated = await updateSubmission(refId, {
    proofLink: newProofLink,
    editHistory,
  });
  return updated;
}

export async function editSubmissionNote(refId: string, newNote: string): Promise<Submission | undefined> {
  const submission = await getSubmission(refId);
  if (!submission || submission.status !== 'pending') return undefined;
  
  const editEntry = {
    field: 'note',
    oldValue: submission.note,
    newValue: newNote,
    editedAt: new Date().toISOString(),
  };
  
  const editHistory = [...(submission.editHistory || []), editEntry];
  
  const updated = await updateSubmission(refId, {
    note: newNote,
    editHistory,
  });
  return updated;
}

// ==================== SCREENSHOT MANAGEMENT ====================

export async function uploadScreenshot(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  
  const res = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });
  
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  
  const data = await res.json();
  return data.url;
}

export async function addScreenshotToSubmission(refId: string, screenshot: ScreenshotProof): Promise<Submission | undefined> {
  const submission = await getSubmission(refId);
  if (!submission || submission.status === 'approved') return undefined;
  
  const screenshots = [...(submission.screenshots || [])];
  
  // Replace existing screenshot of same type, or add new
  const existingIdx = screenshots.findIndex(s => s.type === screenshot.type);
  if (existingIdx >= 0) {
    screenshots[existingIdx] = screenshot;
  } else {
    screenshots.push(screenshot);
  }
  
  const updated = await updateSubmission(refId, { screenshots });
  return updated;
}

export async function getScreenshotUrl(bucketPath: string): Promise<string> {
  return bucketPath; // The URL is returned directly from the upload
}

// ==================== CHAT ====================

export async function getChatMessages(refId?: string): Promise<ChatMessage[]> {
  try {
    const params = refId ? `?refId=${encodeURIComponent(refId)}` : '';
    const res = await fetch(`/api/chat${params}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.messages || [];
  } catch {
    return [];
  }
}

export async function sendChatMessage(data: {
  refId?: string;
  senderName: string;
  senderRole: 'admin' | 'worker';
  message: string;
  submissionRefId?: string;
}): Promise<ChatMessage> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'sendChat', ...data }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed' }));
    throw new Error(err.error || 'Chat send failed');
  }
  const result = await res.json();
  return result.message;
}

// ==================== DASHBOARD STATS ====================

export async function getDashboardStats(): Promise<DashboardStats> {
  const { stats } = await apiGet({ type: 'dashboard' });
  return stats || {
    totalTasks: 0,
    activeTasks: 0,
    totalSubmissions: 0,
    pendingSubmissions: 0,
    approvedSubmissions: 0,
    rejectedSubmissions: 0,
    totalPayout: 0,
    paidPayout: 0,
    unpaidPayout: 0,
  };
}

// ==================== PAYMENT METHODS ====================

export async function getUserPaymentMethod(discordUserId: string): Promise<any> {
  const { payment } = await apiGet({ type: 'payment', userId: discordUserId });
  return payment;
}

export async function setUserPaymentMethod(discordUserId: string, methodType: string, methodDetails: string): Promise<any> {
  const { payment } = await apiPost({ action: 'setPayment', discordUserId, methodType, methodDetails });
  return payment;
}

// ==================== ADMIN AUTH ====================

let adminTokenCache: string | null = null;

function getAdminToken(): string {
  return adminTokenCache || '';
}

export function getAdminTokenForApi(): string {
  return getAdminToken();
}

export async function adminLogin(username: string, password: string, role: AdminRole): Promise<{ success: boolean; role?: AdminRole }> {
  try {
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, role }),
    });
    const data = await res.json();
    if (data.success && data.token) {
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('rot_admin_auth', JSON.stringify({ isAuthenticated: true, role: data.role, loginTime: Date.now() }));
          localStorage.setItem('rot_admin_token', JSON.stringify({ token: data.token }));
        } catch {}
      }
      adminTokenCache = data.token;
      return { success: true, role: data.role };
    }
    return { success: false };
  } catch {
    return { success: false };
  }
}

export function adminLogout(): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('rot_admin_auth');
      localStorage.removeItem('rot_admin_token');
    } catch {}
  }
  adminTokenCache = null;
}

export function isAdminAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const auth = JSON.parse(localStorage.getItem('rot_admin_auth') || 'null');
    if (!auth || !auth.isAuthenticated) return false;
    if (Date.now() - auth.loginTime > 24 * 60 * 60 * 1000) {
      localStorage.removeItem('rot_admin_auth');
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function getAdminRole(): AdminRole | null {
  if (typeof window === 'undefined') return null;
  try {
    const auth = JSON.parse(localStorage.getItem('rot_admin_auth') || 'null');
    return auth?.role || null;
  } catch {
    return null;
  }
}

export function isOperationsAdmin(): boolean {
  return getAdminRole() === 'operations';
}

export function isClientAdmin(): boolean {
  return getAdminRole() === 'client';
}
