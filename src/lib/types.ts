export type TaskType = 'comment' | 'post';

export type TaskStatus = 'available' | 'assigned' | 'submitted' | 'approved' | 'expired';

export type SubmissionStatus = 'pending' | 'approved' | 'rejected';

export type AdminRole = 'operations' | 'client';

export type ScreenshotType = 'initial' | '24h_insights' | '48h_visibility' | '48h_insights';

export const SCREENSHOT_TYPE_LABELS: Record<ScreenshotType, string> = {
  initial: 'Initial Screenshot',
  '24h_insights': '24-hour Reddit Insights',
  '48h_visibility': '48-hour Visibility',
  '48h_insights': '48-hour Reddit Insights',
};

export const ALL_SCREENSHOT_TYPES: ScreenshotType[] = ['initial', '24h_insights', '48h_visibility', '48h_insights'];

export interface ScreenshotProof {
  type: ScreenshotType;
  url: string;
  uploadedAt: string;
  fileName?: string;
}

export interface EditLog {
  field: string;
  oldValue?: string;
  newValue: string;
  editedAt: string;
}

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
  isPublic: boolean;
  accessLogs: AccessLog[];
  // Discord Assignment fields
  status: TaskStatus;
  discordUserId?: string;
  assignedDiscordUsername?: string;
  assignedAt?: string;
  expiresAt?: string;
  // Screenshot requirements
  requiredScreenshots: ScreenshotType[];
}

export interface AccessLog {
  timestamp: string;
  ipAddress: string;
  success: boolean;
}

export interface Submission {
  id?: string;
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
  isPaid: boolean;
  paidAt?: string;
  screenshots: ScreenshotProof[];
  editHistory: EditLog[];
  showToClient: boolean;
}

export interface ChatMessage {
  id: string;
  refId?: string;
  senderName: string;
  senderRole: 'admin' | 'worker';
  message: string;
  submissionRefId?: string;
  createdAt: string;
}

export interface ActionLog {
  id: string;
  taskId: string;
  action: string;
  performedBy: string;
  details: Record<string, unknown>;
  createdAt: string;
}

export interface AdminSession {
  isAuthenticated: boolean;
  username: string;
  role: AdminRole;
}

export interface AdminUser {
  id: string;
  username: string;
  role: AdminRole;
  displayName?: string;
  createdAt: string;
}

export interface DashboardStats {
  totalTasks: number;
  activeTasks: number;
  totalSubmissions: number;
  pendingSubmissions: number;
  approvedSubmissions: number;
  rejectedSubmissions: number;
  totalPayout: number;
  paidPayout: number;
  unpaidPayout: number;
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
