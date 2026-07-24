export type TaskType = 'comment' | 'post';

export type SubmissionStatus = 'pending' | 'approved' | 'rejected';

export interface Task {
  id: string;
  taskId: string;
  accessCode: string;
  title: string;
  type: TaskType;
  payment: number;
  requirements: string;
  instructions: string;
  maxCompletions: number | null;
  completedCount: number;
  isActive: boolean;
  createdAt: string;
  // Comment-specific fields
  redditPostUrl?: string;
  commentText?: string;
  // Post-specific fields
  targetSubreddits?: string;
  suggestedTitle?: string;
  suggestedBody?: string;
  images?: string[];
  video?: string;
  // Access control
  accessCodeDisabled: boolean;
  accessLogs: AccessLog[];
}

export interface AccessLog {
  timestamp: string;
  ipAddress: string;
  success: boolean;
}

export interface Submission {
  refId: string;
  taskId: string;
  discordUsername: string;
  proofLink: string;
  note?: string;
  payment: number;
  status: SubmissionStatus;
  rejectionReason?: string;
  adminNote?: string;
  submittedAt: string;
}

export interface AdminSession {
  isAuthenticated: boolean;
  username: string;
}

export interface DashboardStats {
  totalTasks: number;
  activeTasks: number;
  totalSubmissions: number;
  pendingSubmissions: number;
  approvedSubmissions: number;
  rejectedSubmissions: number;
  totalPayout: number;
}

export const PRESET_REJECTION_REASONS = [
  'Wrong subreddit',
  'Incorrect post/comment',
  'Wrong Reddit account used',
  'Missing proof',
  'Invalid proof link',
  'Post/comment removed',
  'Did not follow instructions',
  'Low-quality submission',
  'Duplicate submission',
  'Task completed incorrectly',
  'Submission after deadline',
] as const;

export const generateTaskId = (index: number): string => {
  const num = String(index).padStart(4, '0');
  return `ROT-${num}`;
};

export const generateRefId = (): string => {
  const num = Math.floor(Math.random() * 900000) + 100000;
  return `ROT-${num}`;
};

export const generateAccessCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export const formatPayment = (amount: number): string => {
  return `$${amount.toFixed(2)}`;
};

export const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};
