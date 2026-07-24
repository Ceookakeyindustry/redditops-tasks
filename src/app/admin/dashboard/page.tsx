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
} from 'lucide-react';
import type { DashboardStats } from '@/lib/types';
import { formatPayment } from '@/lib/types';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    (async () => {
      const { isAdminAuthenticated, getDashboardStats } = await import('@/lib/store');
      if (!isAdminAuthenticated()) {
        router.push('/admin/login');
        return;
      }
      setAuthenticated(true);
      setStats(getDashboardStats());
      setLoading(false);
    })();
  }, [router]);

  const handleLogout = async () => {
    const { adminLogout } = await import('@/lib/store');
    adminLogout();
    router.push('/admin/login');
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-2 border-[#8B5CF6] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!authenticated) return null;

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
  ];

  return (
    <div className="flex-1">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
              <LayoutDashboard className="w-8 h-8 text-[#8B5CF6]" />
              Dashboard
            </h1>
            <p className="text-[#9CA3AF] mt-1">Manage your tasks and submissions.</p>
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
          {cards.map((card, idx) => (
            <div
              key={card.label}
              className="card p-5 animate-fade-in"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl ${card.bg} border ${card.border} flex items-center justify-center`}>
                  <card.icon className={`w-5 h-5 ${card.color}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-white mb-1">
                {card.isPayout ? card.value : card.value}
              </p>
              <p className="text-xs text-[#6B7280]">{card.label}</p>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Link
            href="/admin/tasks"
            className="card p-6 hover:border-[#8B5CF6]/30 transition-all duration-200 group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 flex items-center justify-center group-hover:bg-[#8B5CF6]/20 transition-colors">
                <FileText className="w-6 h-6 text-[#8B5CF6]" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Manage Tasks</h3>
                <p className="text-[#9CA3AF] text-sm">View, edit, copy IDs, delete</p>
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
                <h3 className="text-white font-semibold">Review Submissions</h3>
                <p className="text-[#9CA3AF] text-sm">
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
                <h3 className="text-white font-semibold">View Public Tasks</h3>
                <p className="text-[#9CA3AF] text-sm">See tasks as users see them</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
