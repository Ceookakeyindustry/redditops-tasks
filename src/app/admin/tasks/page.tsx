'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  PlusCircle,
  Edit3,
  Copy,
  Check,
  Search,
  MessageCircle,
  FileText,
  Clock,
  DollarSign,
  ExternalLink,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import type { Task } from '@/lib/types';
import { formatPayment, formatDate } from '@/lib/types';

export default function AdminTasksPage() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let interval: NodeJS.Timeout;

    const fetchData = async () => {
      try {
        const { isAdminAuthenticated, getTasks } = await import('@/lib/store');
        if (!isAdminAuthenticated()) {
          router.push('/admin/login');
          return;
        }
        setAuthenticated(true);
        const allTasks = await getTasks();
        if (!mounted) return;
        setTasks(allTasks);
        setLoading(false);
      } catch {}
    };

    fetchData();
    interval = setInterval(fetchData, 30000); // Auto-refresh every 30s
    return () => { mounted = false; clearInterval(interval); };
  }, [router]);

  const copyBoth = async (task: Task) => {
    const text = `Task ID: ${task.taskId}\nAccess Code: ${task.accessCode}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(task.taskId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedId(task.taskId);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  const handleDelete = async (taskId: string) => {
    setDeleteConfirmId(taskId);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    setDeletingId(deleteConfirmId);
    setDeleteConfirmId(null);
    const { deleteTask } = await import('@/lib/store');
    await deleteTask(deleteConfirmId);
    setTasks(prev => prev.filter(t => t.taskId !== deleteConfirmId));
    setDeletingId(null);
  };

  const toggleActive = async (taskId: string) => {
    const { updateTask } = await import('@/lib/store');
    const task = tasks.find(t => t.taskId === taskId);
    if (!task) return;
    await updateTask(taskId, { isActive: !task.isActive });
    setTasks(prev =>
      prev.map(t => (t.taskId === taskId ? { ...t, isActive: !t.isActive } : t))
    );
  };

  const handleDuplicate = async (task: Task) => {
    setDuplicatingId(task.taskId);
    try {
      const { createTask } = await import('@/lib/store');
      await createTask({
        title: `${task.title} (Copy)`,
        type: task.type,
        payment: task.payment,
        requirements: task.requirements,
        instructions: task.instructions,
        maxCompletions: task.maxCompletions,
        accessCodeDisabled: true,
        isPublic: task.isPublic,
        requiredScreenshots: task.requiredScreenshots,
        redditPostUrl: task.redditPostUrl,
        commentText: task.commentText,
        targetSubreddits: task.targetSubreddits,
        suggestedTitle: task.suggestedTitle,
        suggestedBody: task.suggestedBody,
      });
      // Refresh the task list
      const { getTasks } = await import('@/lib/store');
      const allTasks = await getTasks();
      setTasks(allTasks);
    } catch {}
    setDuplicatingId(null);
  };

  const filteredTasks = tasks
    .filter(t => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        t.title.toLowerCase().includes(q) ||
        t.taskId.toLowerCase().includes(q) ||
        t.accessCode.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-2 border-[#8B5CF6] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!authenticated) return null;

  return (
    <div className="flex-1">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <Link
              href="/admin/dashboard"
              className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors mb-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Manage Tasks</h1>
            <p className="text-gray-500 mt-1">View, edit, and manage all your tasks.</p>
          </div>
          <Link href="/admin/tasks/new" className="btn-primary">
            <PlusCircle className="w-4 h-4" />
            New Task
          </Link>
        </div>

        {/* Search */}
        <div className="glass rounded-2xl p-4 mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by task name, ID, or access code..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="input-field !pl-12"
            />
          </div>
        </div>

        {/* Tasks List */}
        {filteredTasks.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-6">
              <FileText className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No tasks found</h3>
            <p className="text-gray-500 mb-6">
              {tasks.length === 0
                ? 'Create your first task to get started.'
                : 'No tasks match your search.'}
            </p>
            {tasks.length === 0 && (
              <Link href="/admin/tasks/new" className="btn-primary inline-flex">
                <PlusCircle className="w-4 h-4" />
                Create Task
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTasks.map((task, idx) => (
              <div
                key={task.id}
                className="card p-5 animate-fade-in"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-mono text-sm text-[#8B5CF6] font-medium">
                        {task.taskId}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          task.type === 'comment'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}
                      >
                        {task.type === 'comment' ? (
                          <MessageCircle className="w-3 h-3" />
                        ) : (
                          <FileText className="w-3 h-3" />
                        )}
                        {task.type}
                      </span>                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              task.status === 'available' ? 'badge-available' :
                              task.status === 'assigned' ? 'badge-assigned' :
                              task.status === 'submitted' ? 'badge-submitted' :
                              task.status === 'approved' ? 'badge-approved' :
                              task.status === 'expired' ? 'badge-expired' :
                              task.isActive ? 'badge-approved' : 'badge-rejected'
                            }`}
                          >
                            {task.status ? task.status.charAt(0).toUpperCase() + task.status.slice(1) : (task.isActive ? 'Active' : 'Inactive')}
                          </span>
                    </div>

                    <h3 className="text-gray-900 font-medium truncate">{task.title}</h3>

                    <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        {formatPayment(task.payment)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(task.createdAt)}
                      </span>
                      {task.assignedDiscordUsername && (
                        <span className="flex items-center gap-1">
                          <span className="text-[#5865F2]">Discord:</span>
                          <span className="text-gray-900">{task.assignedDiscordUsername}</span>
                        </span>
                      )}
                      <span>
                        Code: <span className="font-mono text-gray-900">{task.accessCode}</span>
                      </span>
                      {task.accessCodeDisabled && (
                        <span className="text-red-400">(Disabled)</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 lg:flex-shrink-0">
                    {/* Copy Both */}
                    <button
                      onClick={() => copyBoth(task)}
                      className={`px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${
                        copiedId === task.taskId
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-gray-100 text-gray-500 border border-gray-200 hover:border-[#8B5CF6]/30 hover:text-gray-900'
                      }`}
                      title="Copy Task ID and Access Code"
                    >
                      {copiedId === task.taskId ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      {copiedId === task.taskId ? 'Copied!' : 'Copy Both'}
                    </button>

                    {/* Duplicate */}
                    <button
                      onClick={() => handleDuplicate(task)}
                      disabled={duplicatingId === task.taskId}
                      className="px-3 py-2 rounded-xl bg-gray-100 text-gray-500 border border-gray-200 hover:border-[#8B5CF6]/30 hover:text-gray-900 text-xs font-medium transition-all duration-200 inline-flex items-center gap-1.5"
                    >
                      {duplicatingId === task.taskId ? (
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-[#8B5CF6]/30 border-t-[#8B5CF6] animate-spin" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      Duplicate
                    </button>

                    {/* Active Toggle */}
                    <button
                      onClick={() => toggleActive(task.taskId)}
                      className={`px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 ${
                        task.isActive
                          ? 'bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20 hover:bg-[#F59E0B]/20'
                          : 'bg-gray-100 text-gray-500 border border-gray-200 hover:border-[#10B981]/30 hover:text-[#10B981]'
                      }`}
                    >
                      {task.isActive ? 'Deactivate' : 'Activate'}
                    </button>

                    {/* Edit */}
                    <Link
                      href={`/admin/tasks/${task.taskId}/edit`}
                      className="px-3 py-2 rounded-xl bg-gray-100 text-gray-500 border border-gray-200 hover:border-[#8B5CF6]/30 hover:text-gray-900 text-xs font-medium transition-all duration-200 inline-flex items-center gap-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Edit
                    </Link>

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(task.taskId)}
                      disabled={deletingId === task.taskId}
                      className="px-3 py-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 text-xs font-medium transition-all duration-200 inline-flex items-center gap-1.5"
                    >
                      {deletingId === task.taskId ? (
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-red-400/30 border-t-red-400 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                      Delete
                    </button>
                  </div>
                </div>

                {/* Link preview */}
                <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
                  <ExternalLink className="w-3 h-3" />
                  <span>Public link: </span>
                  <span className="font-mono text-[#8B5CF6]">
                    /task/{task.taskId}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
          <div className="card p-6 sm:p-8 w-full max-w-md animate-scale-in text-center" onClick={e => e.stopPropagation()}>
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Delete Task?</h2>
            <p className="text-gray-500 text-sm mb-2">
              You are about to permanently delete this task.
            </p>
            <p className="font-mono text-[#8B5CF6] text-sm mb-6">
              {deleteConfirmId}
            </p>
            <p className="text-red-400 text-xs mb-6 bg-red-500/5 p-3 rounded-xl border border-red-500/10">
              Users will lose access. Submissions for this task will remain.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="btn-danger flex-1"
              >
                <Trash2 className="w-4 h-4" />
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
