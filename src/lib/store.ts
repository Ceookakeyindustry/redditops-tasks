'use client';

import type { Task, Submission, DashboardStats, AccessLog } from './types';
import { generateTaskId, generateRefId } from './types';

// In-memory store with localStorage persistence for demo/dev purposes.
// Will be replaced with Supabase when configured.

const STORAGE_KEYS = {
  tasks: 'rot_tasks',
  submissions: 'rot_submissions',
  taskCounter: 'rot_task_counter',
  adminAuth: 'rot_admin_auth',
};

function getFromStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setToStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable
  }
}

// --- Tasks ---
export function getTasks(): Task[] {
  return getFromStorage<Task[]>(STORAGE_KEYS.tasks, []);
}

export function getTask(taskId: string): Task | undefined {
  return getTasks().find(t => t.taskId === taskId);
}

export function getTaskByAccess(taskId: string, accessCode: string): Task | undefined {
  return getTasks().find(
    t => t.taskId === taskId && t.accessCode === accessCode && !t.accessCodeDisabled
  );
}

export function createTask(data: Omit<Task, 'id' | 'taskId' | 'createdAt' | 'completedCount' | 'accessLogs'>): Task {
  const tasks = getTasks();
  const counter = getFromStorage<number>(STORAGE_KEYS.taskCounter, tasks.length + 1);
  const newTask: Task = {
    ...data,
    id: crypto.randomUUID(),
    taskId: generateTaskId(counter),
    createdAt: new Date().toISOString(),
    completedCount: 0,
    accessLogs: [],
    accessCodeDisabled: data.accessCodeDisabled ?? false,
  };
  tasks.push(newTask);
  setToStorage(STORAGE_KEYS.tasks, tasks);
  setToStorage(STORAGE_KEYS.taskCounter, counter + 1);
  return newTask;
}

export function updateTask(taskId: string, data: Partial<Task>): Task | undefined {
  const tasks = getTasks();
  const index = tasks.findIndex(t => t.taskId === taskId);
  if (index === -1) return undefined;
  tasks[index] = { ...tasks[index], ...data };
  setToStorage(STORAGE_KEYS.tasks, tasks);
  return tasks[index];
}

export function deleteTask(taskId: string): boolean {
  const tasks = getTasks();
  const filtered = tasks.filter(t => t.taskId !== taskId);
  if (filtered.length === tasks.length) return false;
  setToStorage(STORAGE_KEYS.tasks, filtered);
  return true;
}

export function logAccess(taskId: string, ipAddress: string, success: boolean): void {
  const tasks = getTasks();
  const index = tasks.findIndex(t => t.taskId === taskId);
  if (index === -1) return;
  const log: AccessLog = {
    timestamp: new Date().toISOString(),
    ipAddress,
    success,
  };
  tasks[index].accessLogs = [...(tasks[index].accessLogs || []), log];
  setToStorage(STORAGE_KEYS.tasks, tasks);
}

// --- Submissions ---
export function getSubmissions(): Submission[] {
  return getFromStorage<Submission[]>(STORAGE_KEYS.submissions, []);
}

export function getSubmission(refId: string): Submission | undefined {
  return getSubmissions().find(s => s.refId === refId);
}

export function getTaskSubmissions(taskId: string): Submission[] {
  return getSubmissions().filter(s => s.taskId === taskId);
}

export function createSubmission(data: Omit<Submission, 'refId' | 'submittedAt' | 'status' | 'isPaid'>): Submission {
  const submissions = getSubmissions();
  const submission: Submission = {
    ...data,
    refId: generateRefId(),
    status: 'pending',
    isPaid: false,
    submittedAt: new Date().toISOString(),
  };
  submissions.push(submission);
  setToStorage(STORAGE_KEYS.submissions, submissions);
  // Update task completion count
  const tasks = getTasks();
  const taskIndex = tasks.findIndex(t => t.taskId === data.taskId);
  if (taskIndex !== -1) {
    tasks[taskIndex].completedCount = (tasks[taskIndex].completedCount || 0) + 1;
    setToStorage(STORAGE_KEYS.tasks, tasks);
  }
  return submission;
}

export function updateSubmission(refId: string, data: Partial<Submission>): Submission | undefined {
  const submissions = getSubmissions();
  const index = submissions.findIndex(s => s.refId === refId);
  if (index === -1) return undefined;
  submissions[index] = { ...submissions[index], ...data };
  setToStorage(STORAGE_KEYS.submissions, submissions);
  return submissions[index];
}

// --- Dashboard Stats ---
export function getDashboardStats(): DashboardStats {
  const tasks = getTasks();
  const submissions = getSubmissions();
  const approved = submissions.filter(s => s.status === 'approved');
  return {
    totalTasks: tasks.length,
    activeTasks: tasks.filter(t => t.isActive).length,
    totalSubmissions: submissions.length,
    pendingSubmissions: submissions.filter(s => s.status === 'pending').length,
    approvedSubmissions: approved.length,
    rejectedSubmissions: submissions.filter(s => s.status === 'rejected').length,
    totalPayout: approved.reduce((sum, s) => sum + s.payment, 0),
    paidPayout: approved.filter(s => s.isPaid).reduce((sum, s) => sum + s.payment, 0),
    unpaidPayout: approved.filter(s => !s.isPaid).reduce((sum, s) => sum + s.payment, 0),
  };
}

// --- Admin Auth ---
export function adminLogin(username: string, password: string): boolean {
  const adminUser = process.env.NEXT_PUBLIC_ADMIN_USERNAME || 'admin';
  const adminPass = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'RedditOps2024!';
  if (username === adminUser && password === adminPass) {
    setToStorage(STORAGE_KEYS.adminAuth, { username, isAuthenticated: true, loginTime: Date.now() });
    return true;
  }
  return false;
}

export function adminLogout(): void {
  setToStorage(STORAGE_KEYS.adminAuth, null);
}

export function isAdminAuthenticated(): boolean {
  const auth = getFromStorage<{ username: string; isAuthenticated: boolean; loginTime: number } | null>(
    STORAGE_KEYS.adminAuth, null
  );
  if (!auth || !auth.isAuthenticated) return false;
  // Session expires after 24 hours
  if (Date.now() - auth.loginTime > 24 * 60 * 60 * 1000) {
    setToStorage(STORAGE_KEYS.adminAuth, null);
    return false;
  }
  return true;
}
