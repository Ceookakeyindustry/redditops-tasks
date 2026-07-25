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
      setStats(getDashboardStats());
      const tasks = getTasks();
      setAllTasks(tasks);
      // Show 5 most recent tasks
      setRecentTasks(tasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5));
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
    const { deleteTask } = await import('@/lib/store');
    deleteTask(taskId);
    setRecentTasks(prev => prev.filter(t => t.taskId !== taskId));
    const { getDashboardStats } = await import('@/lib/store');
    setStats(getDashboardStats());
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
    {
      label: 'Unpaid',
      value: formatPayment(stats?.unpaidPayout || 0),
      icon: DollarSign,
      color: 'text-[#F59E0B]',
      bg: 'bg-[#F59E0B]/10',
      border: 'border-[#F59E0B]/20',
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
                        task.isActive ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'
                      }`}>
                        {task.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-gray-900 text-sm font-medium truncate">{task.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(task.createdAt)}</p>
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
      </div>
    </div>
  );
}
