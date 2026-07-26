'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  PlusCircle,
  FileText,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  ClipboardList,
  LogOut,
  TrendingUp,
  Activity,
  Trash2,
  ExternalLink,
  MessageCircle,
} from 'lucide-react';
import type { DashboardStats, Task } from '@/lib/types';
import { formatPayment, formatDate } from '@/lib/types';
import AnimatedCounter from '@/components/AnimatedCounter';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { isAdminAuthenticated, getDashboardStats, getTasks } = await import('@/lib/store');
      if (!isAdminAuthenticated()) {
        router.push('/admin/login');
        return;
      }
      setAuthenticated(true);
      const statsData = await getDashboardStats();
      setStats(statsData);
      const tasksData = await getTasks();
      setAllTasks(tasksData);
      // Show 5 most recent tasks
      setRecentTasks(tasksData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5));
      setLoading(false);
    })();
  }, [router]);

  const handleLogout = async () => {
    const { adminLogout } = await import('@/lib/store');
    adminLogout();
    router.push('/admin/login');
  };

  const handleDelete = async (taskId: string) => {
    if (!window.confirm('Permanently delete this task? This cannot be undone.')) return;
    setDeletingId(taskId);
    const { deleteTask, getDashboardStats } = await import('@/lib/store');
    await deleteTask(taskId);
    setRecentTasks(prev => prev.filter(t => t.taskId !== taskId));
    const newStats = await getDashboardStats();
    setStats(newStats);
    setDeletingId(null);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-2 border-[#8B5CF6] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!authenticated) return null;

  const totalTaskValue = allTasks.reduce((sum, t) => sum + t.payment, 0);
  const statusCount = {
    available: allTasks.filter(t => t.status === 'available').length,
    assigned: allTasks.filter(t => t.status === 'assigned').length,
    submitted: allTasks.filter(t => t.status === 'submitted').length,
    approved: allTasks.filter(t => t.status === 'approved').length,
    expired: allTasks.filter(t => t.status === 'expired').length,
  };

  const cards = [
    {
      label: 'Total Tasks',
      value: stats?.totalTasks || 0,
      icon: FileText,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
    },
    {
      label: 'Active Tasks',
      value: stats?.activeTasks || 0,
      icon: Activity,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
    },
    {
      label: 'Total Task Value',
      value: formatPayment(totalTaskValue),
      icon: DollarSign,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
      isCurrency: true,
    },
    {
      label: 'Total Submissions',
      value: stats?.totalSubmissions || 0,
      icon: ClipboardList,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
    },
    {
      label: 'Pending',
      value: stats?.pendingSubmissions || 0,
      icon: Clock,
      color: 'text-[#F59E0B]',
      bg: 'bg-[#F59E0B]/10',
      border: 'border-[#F59E0B]/20',
    },
    {
      label: 'Approved',
      value: stats?.approvedSubmissions || 0,
      icon: CheckCircle,
      color: 'text-[#10B981]',
      bg: 'bg-[#10B981]/10',
      border: 'border-[#10B981]/20',
    },
    {
      label: 'Rejected',
      value: stats?.rejectedSubmissions || 0,
      icon: XCircle,
      color: 'text-[#EF4444]',
      bg: 'bg-[#EF4444]/10',
      border: 'border-[#EF4444]/20',
    },
    {
      label: 'Total Payout',
      value: formatPayment(stats?.totalPayout || 0),
      icon: DollarSign,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      isPayout: true,
    },
    {
      label: 'Paid',
      value: formatPayment(stats?.paidPayout || 0),
      icon: CheckCircle,
      color: 'text-[#8B5CF6]',
      bg: 'bg-[#8B5CF6]/10',
      border: 'border-[#8B5CF6]/20',
      isPayout: true,
    },

  ];

  return (
    <div className="flex-1">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
              <LayoutDashboard className="w-8 h-8 text-[#8B5CF6]" />
              Dashboard
            </h1>
            <p className="text-gray-500 mt-1">Manage your tasks and submissions.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/admin/tasks/new" className="btn-primary">
              <PlusCircle className="w-4 h-4" />
              New Task
            </Link>
            <button onClick={handleLogout} className="btn-secondary">
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {cards.map((card, idx) => (
            <div
              key={card.label}
              className="card p-5 animate-scale-in"
              style={{ animationDelay: `${idx * 80}ms` }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl ${card.bg} border ${card.border} flex items-center justify-center`}>
                  <card.icon className={`w-5 h-5 ${card.color}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900 mb-1">
                {card.isPayout ? (
                  card.value
                ) : card.isCurrency ? (
                  card.value
                ) : (
                  <AnimatedCounter value={Number(card.value)} duration={1200 + idx * 100} />
                )}
              </p>
              <p className="text-xs text-gray-400">{card.label}</p>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href="/admin/tasks"
            className="card p-6 hover:border-[#8B5CF6]/30 transition-all duration-200 group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 flex items-center justify-center group-hover:bg-[#8B5CF6]/20 transition-colors">
                <FileText className="w-6 h-6 text-[#8B5CF6]" />
              </div>
              <div>
                <h3 className="text-gray-900 font-semibold">Manage Tasks</h3>
                <p className="text-gray-500 text-sm">View, edit, copy IDs, delete</p>
              </div>
            </div>
          </Link>

          <Link
            href="/admin/submissions"
            className="card p-6 hover:border-[#8B5CF6]/30 transition-all duration-200 group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/20 flex items-center justify-center group-hover:bg-[#F59E0B]/20 transition-colors">
                <Clock className="w-6 h-6 text-[#F59E0B]" />
              </div>
              <div>
                <h3 className="text-gray-900 font-semibold">Review Submissions</h3>
                <p className="text-gray-500 text-sm">
                  {stats?.pendingSubmissions || 0} pending review
                </p>
              </div>
            </div>
          </Link>

          <Link
            href="/"
            className="card p-6 hover:border-[#8B5CF6]/30 transition-all duration-200 group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                <TrendingUp className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-gray-900 font-semibold">View Public Tasks</h3>
                <p className="text-gray-500 text-sm">See tasks as users see them</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Recent Tasks Section */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#8B5CF6]" />
                Recent Tasks
              </h2>
              <p className="text-gray-500 text-sm mt-1">Quick overview of your latest tasks</p>
            </div>
            <Link href="/admin/tasks" className="btn-secondary text-sm px-4 py-2">
              View All
            </Link>
          </div>

          {recentTasks.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-500">No tasks created yet.</p>
              <Link href="/admin/tasks/new" className="text-[#8B5CF6] hover:text-[#A78BFA] text-sm font-medium mt-2 inline-block">
                Create your first task →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentTasks.map((task, idx) => (
                <div
                  key={task.id}
                  className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 border border-gray-200 hover:border-[#8B5CF6]/20 transition-all animate-fade-in group"
                  style={{ animationDelay: `${idx * 80}ms` }}
                >
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    task.type === 'comment'
                      ? 'bg-blue-500/10 text-blue-400'
                      : 'bg-emerald-500/10 text-emerald-400'
                  }`}>
                    {task.type === 'comment' ? (
                      <MessageCircle className="w-5 h-5" />
                    ) : (
                      <FileText className="w-5 h-5" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono text-xs text-[#8B5CF6] font-medium">{task.taskId}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                        task.status === 'available' ? 'badge-available text-emerald-400' :
                        task.status === 'assigned' ? 'badge-assigned text-blue-400' :
                        task.status === 'submitted' ? 'badge-submitted text-[#F59E0B]' :
                        task.status === 'approved' ? 'badge-approved text-emerald-400' :
                        task.status === 'expired' ? 'badge-expired text-red-400' :
                        task.isActive ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'
                      }`}>
                        {task.status ? task.status.charAt(0).toUpperCase() + task.status.slice(1) : (task.isActive ? 'Active' : 'Inactive')}
                      </span>
                    </div>
                    <p className="text-gray-900 text-sm font-medium truncate">{task.title}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <p className="text-xs text-gray-400">{formatDate(task.createdAt)}</p>
                      {task.assignedDiscordUsername && (
                        <span className="flex items-center gap-1 text-xs">
                          <span className="text-[#5865F2]">●</span>
                          <span className="text-gray-600 font-medium">{task.assignedDiscordUsername}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-emerald-400">{formatPayment(task.payment)}</p>
                    {task.maxCompletions && (
                      <p className="text-xs text-gray-400">{task.completedCount || 0}/{task.maxCompletions}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/tasks/${task.taskId}/edit`}
                      className="px-3 py-2 rounded-lg bg-white text-gray-500 border border-gray-200 hover:border-[#8B5CF6]/30 hover:text-gray-900 text-xs font-medium transition-all"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(task.taskId)}
                      disabled={deletingId === task.taskId}
                      className="px-3 py-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 text-xs font-medium transition-all inline-flex items-center gap-1.5"
                    >
                      {deletingId === task.taskId ? (
                        <div className="w-3 h-3 rounded-full border-2 border-red-400/30 border-t-red-400 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Discord Bot Status Section */}
        <div className="card p-6 animate-fade-in">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-[#5865F2]/10 border border-[#5865F2]/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-[#5865F2]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.27 5.33C17.94 4.71 16.5 4.26 15 4a.09.09 0 0 0-.07.03c-.18.33-.39.76-.53 1.09a16.09 16.09 0 0 0-4.8 0c-.14-.34-.35-.76-.54-1.09c-.01-.02-.04-.03-.07-.03c-1.5.26-2.93.71-4.27 1.33c-.01 0-.02.01-.03.02c-2.72 4.07-3.47 8.03-3.1 11.95c0 .02.01.04.03.05c1.8 1.32 3.53 2.12 5.24 2.65c.03.01.06 0 .07-.02c.4-.55.76-1.13 1.07-1.74c.02-.04 0-.08-.04-.09c-.57-.22-1.11-.48-1.64-.78c-.04-.02-.04-.08-.01-.11c.11-.08.22-.17.33-.25c.02-.02.05-.02.07-.01c3.44 1.57 7.15 1.57 10.55 0c.02-.01.05-.01.07.01c.11.08.22.17.33.25c.04.03.04.09-.01.11c-.52.31-1.07.56-1.64.78c-.04.01-.05.06-.04.09c.32.61.68 1.19 1.07 1.74c.03.01.06.02.09.01c1.72-.53 3.45-1.33 5.25-2.65c.02-.01.03-.03.03-.05c.44-4.53-.73-8.46-3.1-11.95c-.01-.01-.02-.02-.04-.02zM8.52 14.91c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12c0 1.17-.84 2.12-1.89 2.12zm6.97 0c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12c0 1.17-.83 2.12-1.89 2.12z"/>
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">🤖 Discord Bot</h2>
              <p className="text-gray-500 text-sm">Task assignment and submission management via Discord</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              🟢 {statusCount.available} Available
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
              🔵 {statusCount.assigned} Assigned
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20">
              🟡 {statusCount.submitted} Submitted
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              ✅ {statusCount.approved} Approved
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
              🔴 {statusCount.expired} Expired
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[#5865F2]/5 border border-[#5865F2]/10">
            <p className="text-sm text-gray-600">
              Use <code className="font-mono text-[#8B5CF6] bg-gray-100 px-1.5 py-0.5 rounded text-xs">/assign &lt;Task ID&gt; @user</code> in Discord to assign a task.
              The bot will DM the user with a unique access code.
            </p>
            <p className="text-xs text-gray-400 mt-2">
              See <code className="font-mono bg-gray-100 px-1 py-0.5 rounded">discord-bot/README.md</code> for full setup instructions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
