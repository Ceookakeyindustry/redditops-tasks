'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  ExternalLink,
  Search,
  Clock,
  MessageSquare,
  DollarSign,
  Image,
  Eye,
  Send,
  ChevronRight,
  ChevronDown,
  Download,
  X,
  History,
  Activity,
  Filter,
  Calendar,
  Palette,
} from 'lucide-react';
import type { Submission, Task, SubmissionStatus, Label } from '@/lib/types';
import { formatDate, PRESET_REJECTION_REASONS, SCREENSHOT_TYPE_LABELS, SUBMISSION_STATUS_LABELS, SUBMISSION_STATUS_FLOW, getNextStatus } from '@/lib/types';
import ConfettiEffect from '@/components/ConfettiEffect';
import LabelManager from '@/components/LabelManager';

const ACTIVE_STATUSES = ['submitted', 'in_review', '24hr_pending', '24hr_done', '48hr_pending', '48hr_done', 'processing'];
const HISTORY_STATUSES = ['paid', 'rejected'];

export default function AdminSubmissionsPage() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // View mode: active (pending/in-progress) or history (completed)
  // Initialize from URL query param ?view=history
  const [viewMode, setViewMode] = useState<'active' | 'history'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('view') === 'history' ? 'history' : 'active';
    }
    return 'active';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [statusDropdown, setStatusDropdown] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<string>('all');

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // Confetti trigger
  const [confettiTrigger, setConfettiTrigger] = useState(0);

  // Screenshot preview
  const [previewScreenshot, setPreviewScreenshot] = useState<string | null>(null);

  // Custom Reference ID editing
  const [editingRefId, setEditingRefId] = useState<string | null>(null);
  const [newRefId, setNewRefId] = useState('');
  const [refIdSaving, setRefIdSaving] = useState(false);
  const [refIdError, setRefIdError] = useState('');

  // Label filter
  const [labelFilter, setLabelFilter] = useState<string>('all');

  // Rejection modal
  const [rejectingSubmission, setRejectingSubmission] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [processingAction, setProcessingAction] = useState<string | null>(null);

  // ===== FETCH DATA =====
  const fetchData = useCallback(async () => {
    try {
      const { isAdminAuthenticated, getSubmissions, getTasks } = await import('@/lib/store');
      if (!isAdminAuthenticated()) {
        router.push('/admin/login');
        return;
      }
      setAuthenticated(true);
      const [subs, allTasks] = await Promise.all([getSubmissions(), getTasks()]);
      setSubmissions(subs);
      setTasks(allTasks);
      setLoading(false);
    } catch {}
  }, [router]);

  // ===== SUPABASE REALTIME SUBSCRIPTION =====
  useEffect(() => {
    fetchData();

    let channel: any = null;
    let interval: ReturnType<typeof setInterval>;

    // Try to set up Supabase Realtime subscription
    (async () => {
      try {
        const { getClient } = await import('@/lib/supabase');
        const client = getClient();
        if (client) {
          channel = client
            .channel('submissions-changes')
            .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'submissions' },
              () => { fetchData(); }
            )
            .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'tasks' },
              () => { fetchData(); }
            )
            .subscribe();
        }
      } catch {}
    })();

    // Fallback polling every 30s
    interval = setInterval(fetchData, 30000);

    return () => {
      if (channel) {
        try { channel.unsubscribe(); } catch {}
      }
      clearInterval(interval);
    };
  }, [fetchData]);

  const getTaskTitle = (taskId: string) => {
    const task = tasks.find(t => t.taskId === taskId);
    return task?.title || 'Unknown Task';
  };

  // ===== STATUS ACTIONS =====
  const handleStatusChange = async (submission: Submission, newStatus: SubmissionStatus) => {
    setProcessingAction(`${submission.refId}-status`);
    try {
      const { updateSubmission } = await import('@/lib/store');
      await updateSubmission(submission.refId, { status: newStatus });
      setSubmissions(prev =>
        prev.map(s =>
          s.refId === submission.refId ? { ...s, status: newStatus } : s
        )
      );
      if (newStatus === 'paid') {
        setConfettiTrigger(t => t + 1);
      }
    } finally {
      setProcessingAction(null);
      setStatusDropdown(null);
    }
  };

  const handleAdvanceStatus = async (submission: Submission) => {
    const next = getNextStatus(submission.status);
    if (!next) return;
    await handleStatusChange(submission, next);
  };

  const openRejectModal = (submission: Submission) => {
    setRejectingSubmission(submission.refId);
    setRejectionReason('');
    setCustomReason('');
    setAdminNote('');
    setStatusDropdown(null);
  };

  const handleReject = async () => {
    if (!rejectingSubmission) return;
    setProcessingAction(rejectingSubmission);

    const reason = rejectionReason === 'Other (custom)' ? customReason : rejectionReason;

    try {
      const { updateSubmission, rejectTaskSubmission } = await import('@/lib/store');

      await updateSubmission(rejectingSubmission, {
        status: 'rejected',
        rejectionReason: reason || undefined,
        adminNote: adminNote.trim() || undefined,
      });

      const submission = submissions.find(s => s.refId === rejectingSubmission);
      if (submission) {
        await rejectTaskSubmission(submission.taskId);
      }

      setSubmissions(prev =>
        prev.map(s =>
          s.refId === rejectingSubmission ? { ...s, status: 'rejected' as const, rejectionReason: reason, adminNote: adminNote.trim() || undefined } : s
        )
      );
      setRejectingSubmission(null);
    } finally {
      setProcessingAction(null);
    }
  };

  // ===== BULK ACTIONS =====
  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectableSubmissions.map(s => s.refId)));
    }
  };

  const handleSelectOne = (refId: string) => {
    const next = new Set(selectedIds);
    if (next.has(refId)) {
      next.delete(refId);
    } else {
      next.add(refId);
    }
    setSelectedIds(next);
  };

  const handleBulkApprove = async () => {
    const toApprove = filteredSubmissions.filter(s => selectedIds.has(s.refId) && s.status === 'submitted');
    if (toApprove.length === 0) return;
    setBulkProcessing(true);

    const { updateSubmission } = await import('@/lib/store');
    for (const sub of toApprove) {
      await updateSubmission(sub.refId, { status: 'in_review' });
    }

    setSubmissions(prev =>
      prev.map(s =>
        selectedIds.has(s.refId) && s.status === 'submitted'
          ? { ...s, status: 'in_review' as const }
          : s
      )
    );
    setSelectedIds(new Set());
    setConfettiTrigger(t => t + 1);
    setBulkProcessing(false);
  };

  const handleBulkReject = async () => {
    const toReject = filteredSubmissions.filter(s => selectedIds.has(s.refId) && s.status === 'submitted');
    if (toReject.length === 0) return;
    setBulkProcessing(true);

    const { updateSubmission } = await import('@/lib/store');
    for (const sub of toReject) {
      await updateSubmission(sub.refId, {
        status: 'rejected',
        rejectionReason: 'Bulk rejected',
      });
    }

    setSubmissions(prev =>
      prev.map(s =>
        selectedIds.has(s.refId) && s.status === 'submitted'
          ? { ...s, status: 'rejected' as const, rejectionReason: 'Bulk rejected' }
          : s
      )
    );
    setSelectedIds(new Set());
    setBulkProcessing(false);
  };

  // ===== FILTER LOGIC =====
  const filteredSubmissions = submissions
    .filter(s => {
      // View mode filter
      if (viewMode === 'active') return ACTIVE_STATUSES.includes(s.status);
      if (viewMode === 'history') return HISTORY_STATUSES.includes(s.status);
      return true;
    })
    .filter(s => {
      // Status filter
      if (statusFilter === 'all') return true;
      if (statusFilter === 'screenshots') return ['24hr_pending', '24hr_done', '48hr_pending', '48hr_done'].includes(s.status);
      if (statusFilter === 'in_progress') return ACTIVE_STATUSES.includes(s.status);
      return s.status === statusFilter;
    })
    .filter(s => {
      // Date filter
      if (dateFilter === 'all') return true;
      const today = new Date();
      const subDate = new Date(s.submittedAt);
      if (dateFilter === 'today') return subDate.toDateString() === today.toDateString();
      if (dateFilter === 'week') {
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        return subDate >= weekAgo;
      }
      if (dateFilter === 'month') {
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        return subDate >= monthAgo;
      }
      return true;
    })
    .filter(s => {
      // Label filter
      if (labelFilter !== 'all') {
        const subLabels = (s.labels || []).map(l => l.name);
        if (!subLabels.includes(labelFilter)) return false;
      }
      // Search
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        s.refId.toLowerCase().includes(q) ||
        s.discordUsername.toLowerCase().includes(q) ||
        s.taskId.toLowerCase().includes(q) ||
        (s.proofLink && s.proofLink.toLowerCase().includes(q)) ||
        (s.note && s.note.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

  const selectableSubmissions = filteredSubmissions.filter(s => s.status === 'submitted');
  const allSelected = selectableSubmissions.length > 0 && selectableSubmissions.every(s => selectedIds.has(s.refId));

  const activeCount = submissions.filter(s => ACTIVE_STATUSES.includes(s.status)).length;
  const historyCount = submissions.filter(s => HISTORY_STATUSES.includes(s.status)).length;

  // Collect all unique label names from visible submissions
  const allLabelNames = Array.from(new Set(
    submissions.flatMap(s => (s.labels || []).map(l => l.name))
  )).sort();

  // Get the color for a label name
  const getLabelColor = (name: string): string => {
    for (const s of submissions) {
      const found = (s.labels || []).find(l => l.name === name);
      if (found) return found.color;
    }
    return '#6B7280';
  };

  const statusFilters = viewMode === 'active'
    ? [
        { key: 'all', label: 'All Active', color: '#8B5CF6' },
        { key: 'submitted', label: 'Submitted', color: '#F59E0B' },
        { key: 'in_review', label: 'In Review', color: '#3B82F6' },
        { key: 'screenshots', label: 'Screenshots', color: '#A855F7' },
        { key: 'processing', label: 'Processing', color: '#8B5CF6' },
      ]
    : [
        { key: 'all', label: 'All History', color: '#8B5CF6' },
        { key: 'paid', label: 'Paid ✓', color: '#10B981' },
        { key: 'rejected', label: 'Rejected', color: '#EF4444' },
      ];

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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <Link
              href="/admin/dashboard"
              className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors mb-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Submissions</h1>
            <p className="text-gray-500 mt-1">Review active submissions and browse history.</p>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="flex gap-1 mb-6 glass rounded-2xl p-1.5">
          <button
            onClick={() => { setViewMode('active'); setStatusFilter('all'); setLabelFilter('all'); setSelectedIds(new Set()); }}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
              viewMode === 'active'
                ? 'bg-white text-[#8B5CF6] shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Activity className="w-4 h-4" />
            Active Submissions
            {activeCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-[#F59E0B]/10 text-[#F59E0B]">
                {activeCount}
              </span>
            )}
          </button>
          <button
            onClick={() => { setViewMode('history'); setStatusFilter('all'); setLabelFilter('all'); setSelectedIds(new Set()); }}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
              viewMode === 'history'
                ? 'bg-white text-[#8B5CF6] shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <History className="w-4 h-4" />
            Submission History
            {historyCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500">
                {historyCount}
              </span>
            )}
          </button>
        </div>

        {/* Filters */}
        <div className="glass rounded-2xl p-4 mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder={viewMode === 'active'
                  ? "Search by Reference ID, Discord, Task ID..."
                  : "Search history by Reference ID, Discord, Task ID, Reddit link..."}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="input-field !pl-12"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {/* Status filters */}
              {statusFilters.map(({ key, label, color }) => (
                <button
                  key={key}
                  onClick={() => setStatusFilter(key)}
                  className={`px-4 py-3 rounded-xl text-sm font-medium capitalize transition-all duration-200 ${
                    statusFilter === key
                      ? 'text-white'
                      : 'bg-gray-100 text-gray-500 hover:text-gray-900'
                  }`}
                  style={statusFilter === key ? { backgroundColor: color } : undefined}
                >
                  {label}
                </button>
              ))}
              {/* Label filter */}
              {allLabelNames.length > 0 && (
                <div className="relative">
                  <select
                    value={labelFilter}
                    onChange={e => setLabelFilter(e.target.value)}
                    className="px-4 py-3 rounded-xl bg-gray-100 text-gray-500 border border-gray-200 text-sm font-medium appearance-none cursor-pointer hover:text-gray-900 transition-all"
                  >
                    <option value="all">All Labels</option>
                    {allLabelNames.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                  <Palette className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              )}
              {/* Date filter */}
              <div className="relative">
                <select
                  value={dateFilter}
                  onChange={e => setDateFilter(e.target.value)}
                  className="px-4 py-3 rounded-xl bg-gray-100 text-gray-500 border border-gray-200 text-sm font-medium appearance-none cursor-pointer hover:text-gray-900 transition-all"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                </select>
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Bulk Actions Bar (Active view only) */}
        {viewMode === 'active' && selectableSubmissions.length > 0 && (
          <div className={`glass rounded-2xl p-4 mb-6 animate-slide-down transition-all ${selectedIds.size > 0 ? '' : 'opacity-60'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={handleSelectAll}
                    className="w-5 h-5 rounded-lg border-gray-300 text-[#8B5CF6] focus:ring-[#8B5CF6] cursor-pointer transition-all"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    {allSelected ? 'Deselect All' : 'Select All Pending'}
                  </span>
                </label>
                {selectedIds.size > 0 && (
                  <span className="text-sm text-gray-500">
                    (<span className="text-[#8B5CF6] font-bold">{selectedIds.size}</span> selected)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="btn-secondary px-4 py-2 text-sm"
                >
                  Clear
                </button>
                <button
                  onClick={handleBulkApprove}
                  disabled={bulkProcessing}
                  className="btn-success px-4 py-2 text-sm"
                >
                  {bulkProcessing ? (
                    <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  Approve All
                </button>
                <button
                  onClick={handleBulkReject}
                  disabled={bulkProcessing}
                  className="btn-danger px-4 py-2 text-sm"
                >
                  {bulkProcessing ? (
                    <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                  Reject All
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Submissions List */}
        {filteredSubmissions.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-6">
              {viewMode === 'history' ? (
                <History className="w-10 h-10 text-gray-400" />
              ) : (
                <MessageSquare className="w-10 h-10 text-gray-400" />
              )}
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {viewMode === 'history' ? 'No submission history' : 'No active submissions'}
            </h3>
            <p className="text-gray-500">
              {viewMode === 'history'
                ? 'Completed submissions (paid/rejected) will appear here for permanent record.'
                : submissions.length === 0
                  ? 'No submissions have been made yet.'
                  : 'No submissions match your filters.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSubmissions.map((submission, idx) => (
              <div
                key={submission.refId}
                className={`card p-6 animate-fade-in transition-all duration-200 ${
                  selectedIds.has(submission.refId) ? 'ring-2 ring-[#8B5CF6] ring-offset-2 ring-offset-white' : ''
                }`}
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                  {/* Checkbox + Info */}
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    {/* Checkbox for bulk actions (active view only) */}
                    {viewMode === 'active' && submission.status === 'submitted' && (
                      <label className="mt-1 cursor-pointer flex-shrink-0">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(submission.refId)}
                          onChange={() => handleSelectOne(submission.refId)}
                          className="w-5 h-5 rounded-lg border-gray-300 text-[#8B5CF6] focus:ring-[#8B5CF6] cursor-pointer transition-all"
                        />
                      </label>
                    )}
                    {viewMode === 'active' && submission.status !== 'submitted' && <div className="w-5 flex-shrink-0" />}

                    <div className="min-w-0 flex-1">
                      {/* Ref ID + Status */}
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        {editingRefId === submission.refId ? (
                          <div className="flex gap-2 items-center">
                            <input
                              type="text"
                              value={newRefId}
                              onChange={e => { setNewRefId(e.target.value); setRefIdError(''); }}
                              className="input-field font-mono text-sm py-1 w-40"
                              autoFocus
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  (async () => {
                                    if (!newRefId.trim()) { setRefIdError('Ref ID cannot be empty'); return; }
                                    setRefIdSaving(true);
                                    setRefIdError('');
                                    try {
                                      const { updateSubmission } = await import('@/lib/store');
                                      const oldRefId = submission.refId;
                                      await updateSubmission(oldRefId, { refId: newRefId.trim() });
                                      setSubmissions(prev => prev.map(s => s.refId === oldRefId ? { ...s, refId: newRefId.trim() } : s));
                                      setEditingRefId(null);
                                    } catch {
                                      setRefIdError('Failed to save. ID may already exist.');
                                    }
                                    setRefIdSaving(false);
                                  })();
                                }
                                if (e.key === 'Escape') { setEditingRefId(null); setRefIdError(''); }
                              }}
                            />
                            <button onClick={() => { setEditingRefId(null); setRefIdError(''); }} className="text-xs text-gray-400 hover:text-gray-900">Cancel</button>
                          </div>
                        ) : (
                          <span className="font-mono text-sm text-[#8B5CF6] font-medium group relative">
                            {submission.refId}
                            {viewMode === 'active' && (
                              <button
                                onClick={() => { setEditingRefId(submission.refId); setNewRefId(submission.refId); setRefIdError(''); }}
                                className="ml-2 opacity-0 group-hover:opacity-100 text-[10px] text-gray-400 hover:text-[#8B5CF6] transition-all"
                                title="Edit Reference ID"
                              >
                                ✏️
                              </button>
                            )}
                            {refIdError && editingRefId === submission.refId && (
                              <span className="absolute -bottom-5 left-0 text-[10px] text-red-400 whitespace-nowrap">{refIdError}</span>
                            )}
                          </span>
                        )}

                        {/* Status Badge / Dropdown (only for active view) */}
                        {viewMode === 'active' ? (
                          <div className="relative">
                            <button
                              onClick={() => setStatusDropdown(statusDropdown === submission.refId ? null : submission.refId)}
                              className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize inline-flex items-center gap-1 ${
                                submission.status === 'submitted' ? 'badge-pending' :
                                submission.status === 'in_review' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                submission.status === '24hr_pending' || submission.status === '48hr_pending' ? 'bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20' :
                                submission.status === '24hr_done' || submission.status === '48hr_done' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                submission.status === 'processing' ? 'bg-[#8B5CF6]/10 text-[#8B5CF6] border border-[#8B5CF6]/20' :
                                submission.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                'badge-rejected'
                              }`}
                            >
                              {SUBMISSION_STATUS_LABELS[submission.status] || submission.status}
                              <ChevronDown className="w-3 h-3" />
                            </button>

                            {statusDropdown === submission.refId && (
                              <>
                                <div className="fixed inset-0 z-40" onClick={() => setStatusDropdown(null)} />
                                <div className="absolute left-0 top-full mt-1 z-50 w-48 rounded-xl bg-white border border-gray-200 shadow-lg py-1 animate-fade-in">
                                  {SUBMISSION_STATUS_FLOW.map(status => (
                                    <button
                                      key={status}
                                      onClick={() => handleStatusChange(submission, status)}
                                      disabled={processingAction === `${submission.refId}-status`}
                                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                                        submission.status === status
                                          ? 'text-[#8B5CF6] font-medium bg-[#8B5CF6]/5'
                                          : 'text-gray-700 hover:bg-gray-50'
                                      }`}
                                    >
                                      <span className="flex items-center gap-2">
                                        {SUBMISSION_STATUS_LABELS[status]}
                                        {submission.status === status && (
                                          <span className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6]" />
                                        )}
                                      </span>
                                    </button>
                                  ))}
                                  <div className="border-t border-gray-100 my-1" />
                                  <button
                                    onClick={() => openRejectModal(submission)}
                                    className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                                  >
                                    Reject
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        ) : (
                          /* History view: static badge */
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                            submission.status === 'paid'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}>
                            {SUBMISSION_STATUS_LABELS[submission.status] || submission.status}
                          </span>
                        )}
                      </div>

                      {/* Labels */}
                      {(submission.labels || []).length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-1.5">
                          {(submission.labels || []).map(label => (
                            <span
                              key={label.name}
                              className="inline-flex items-center rounded-full text-[10px] px-1.5 py-0.5 text-white font-medium"
                              style={{ backgroundColor: label.color }}
                            >
                              {label.name}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Task Title */}
                      <h3 className="text-gray-900 font-medium mb-1 truncate">
                        {getTaskTitle(submission.taskId)}
                      </h3>

                      {/* Meta Info */}
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                        <span>Discord: <span className="text-gray-900">{submission.discordUsername}</span></span>
                        <span>Task: <span className="font-mono text-gray-900">{submission.taskId}</span></span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {formatDate(submission.submittedAt)}
                        </span>
                        {submission.paidAt && (
                          <span className="flex items-center gap-1 text-emerald-400">
                            <DollarSign className="w-3.5 h-3.5" />
                            Paid: {formatDate(submission.paidAt)}
                          </span>
                        )}
                      </div>

                      {/* Note */}
                      {submission.note && (
                        <p className="text-sm text-gray-400 mt-2 italic">
                          Note: {submission.note}
                        </p>
                      )}

                      {/* Proof Link */}
                      {submission.proofLink && (
                        <a
                          href={submission.proofLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm text-[#8B5CF6] hover:text-[#A78BFA] mt-2 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          View Proof
                        </a>
                      )}

                      {/* Rejection Details (history view) */}
                      {viewMode === 'history' && submission.status === 'rejected' && submission.rejectionReason && (
                        <div className="mt-2 flex items-start gap-2">
                          <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm text-red-400">
                              Reason: {submission.rejectionReason}
                            </p>
                            {submission.adminNote && (
                              <p className="text-sm text-gray-400 mt-0.5">
                                Note: {submission.adminNote}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Screenshot thumbnails */}
                      {submission.screenshots && submission.screenshots.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs text-gray-400 mb-2 flex items-center gap-1.5">
                            <Image className="w-3 h-3" />
                            Screenshots ({submission.screenshots.length})
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {submission.screenshots.map((ss, idx) => (
                              <div key={idx} className="group relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 hover:border-[#8B5CF6]/40 transition-all flex-shrink-0">
                                <button
                                  onClick={() => setPreviewScreenshot(ss.url)}
                                  className="w-full h-full"
                                  title={SCREENSHOT_TYPE_LABELS[ss.type]}
                                >
                                  <img src={ss.url} alt={SCREENSHOT_TYPE_LABELS[ss.type]} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200" />
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                    <Eye className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </div>
                                </button>
                                <a
                                  href={ss.url}
                                  download={ss.fileName || `screenshot-${ss.type}.png`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                                  title="Download"
                                >
                                  <Download className="w-3 h-3 text-white" />
                                </a>
                                <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[9px] leading-tight px-1 py-0.5 truncate text-center pointer-events-none">
                                  {SCREENSHOT_TYPE_LABELS[ss.type]?.replace('Screenshot', '').replace('Reddit ', '').trim() || ss.type}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Payment & Actions */}
                  <div className="flex items-center gap-4 lg:flex-shrink-0 lg:flex-col lg:items-end">
                    <div className="text-right">
                      <p className="text-sm text-gray-400">Payment</p>
                      <p className="text-lg font-bold text-emerald-400">${submission.payment.toFixed(2)}</p>
                    </div>

                    {/* Active view: action buttons */}
                    {viewMode === 'active' && submission.status !== 'paid' && submission.status !== 'rejected' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAdvanceStatus(submission)}
                          disabled={processingAction === submission.refId}
                          className="btn-success px-4 py-3 text-sm"
                        >
                          {processingAction === submission.refId ? (
                            <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                          ) : (
                            <>
                              <ChevronRight className="w-4 h-4" />
                              {submission.status === 'processing' ? 'Mark Paid' : 'Next Stage'}
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => openRejectModal(submission)}
                          disabled={processingAction === submission.refId}
                          className="btn-danger px-4 py-3 text-sm"
                        >
                          <XCircle className="w-4 h-4" />
                          Reject
                        </button>
                      </div>
                    )}

                    {/* Active view: paid badge */}
                    {viewMode === 'active' && submission.status === 'paid' && (
                      <div className="flex gap-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium">
                          <DollarSign className="w-3.5 h-3.5" />
                          Paid ✓
                        </span>
                        <button
                          onClick={async () => {
                            const { updateSubmission } = await import('@/lib/store');
                            await updateSubmission(submission.refId, { status: 'processing' });
                            setSubmissions(prev =>
                              prev.map(s =>
                                s.refId === submission.refId ? { ...s, status: 'processing' as const } : s
                              )
                            );
                          }}
                          className="btn-secondary px-3 py-2 text-xs"
                        >
                          Revert
                        </button>
                      </div>
                    )}

                    {/* History view: action buttons for reverting */}
                    {viewMode === 'history' && submission.status === 'rejected' && (
                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            const { updateSubmission } = await import('@/lib/store');
                            await updateSubmission(submission.refId, {
                              status: 'submitted',
                              rejectionReason: undefined,
                              adminNote: undefined,
                            });
                            setSubmissions(prev =>
                              prev.map(s =>
                                s.refId === submission.refId ? { ...s, status: 'submitted' as const, rejectionReason: undefined, adminNote: undefined } : s
                              )
                            );
                          }}
                          className="btn-secondary px-3 py-2 text-xs"
                        >
                          Revert to Submitted
                        </button>
                        <Link
                          href={`/admin/tasks/${submission.taskId}/edit`}
                          className="btn-secondary px-3 py-2 text-xs"
                        >
                          View Task
                        </Link>
                      </div>
                    )}

                    {viewMode === 'history' && submission.status === 'paid' && (
                      <Link
                        href={`/admin/tasks/${submission.taskId}/edit`}
                        className="btn-secondary px-3 py-2 text-xs"
                      >
                        View Task
                      </Link>
                    )}
                  </div>
                </div>

                {/* Active view: Labels + Client Review Toggle */}
                {viewMode === 'active' && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center gap-4 flex-wrap">
                      {/* Label Manager */}
                      <div className="flex items-center gap-2">
                        <Palette className="w-3.5 h-3.5 text-gray-400" />
                        <LabelManager
                          labels={submission.labels || []}
                          onChange={async (newLabels) => {
                            const { updateSubmission } = await import('@/lib/store');
                            await updateSubmission(submission.refId, { labels: newLabels });
                            setSubmissions(prev =>
                              prev.map(s =>
                                s.refId === submission.refId ? { ...s, labels: newLabels } : s
                              )
                            );
                          }}
                          size="sm"
                        />
                      </div>

                      {/* Client Review Toggle */}
                      {(submission.status === 'submitted' || submission.status === 'in_review') && (
                        <label className="flex items-center gap-2 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={submission.showToClient || false}
                            onChange={async () => {
                              const { updateSubmission } = await import('@/lib/store');
                              const newVal = !submission.showToClient;
                              await updateSubmission(submission.refId, { showToClient: newVal });
                              setSubmissions(prev =>
                                prev.map(s =>
                                  s.refId === submission.refId ? { ...s, showToClient: newVal } : s
                                )
                              );
                            }}
                            className="rounded border-gray-300 text-[#8B5CF6] focus:ring-[#8B5CF6]"
                          />
                          <span className="text-xs text-gray-400 group-hover:text-gray-900 transition-colors">
                            Show to Client
                          </span>
                        </label>
                      )}
                    </div>
                  </div>
                )}

                {/* History view: rejection details */}
                {viewMode === 'history' && submission.status === 'rejected' && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-start gap-2">
                      <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-red-400">Rejected</p>
                        {submission.rejectionReason && (
                          <p className="text-sm text-gray-900 mt-1">Reason: {submission.rejectionReason}</p>
                        )}
                        {submission.adminNote && (
                          <p className="text-sm text-gray-400 mt-0.5">Admin Note: {submission.adminNote}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">{formatDate(submission.submittedAt)}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* History view: paid details */}
                {viewMode === 'history' && submission.status === 'paid' && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-emerald-400">Approved & Paid</p>
                        <p className="text-xs text-gray-400">
                          Submitted: {formatDate(submission.submittedAt)}
                          {submission.paidAt && ` • Paid: ${formatDate(submission.paidAt)}`}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Screenshot Preview Modal */}
      {previewScreenshot && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setPreviewScreenshot(null)}
        >
          <div className="max-w-4xl max-h-[90vh] rounded-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-2 bg-white/10 backdrop-blur-sm">
              <button
                onClick={() => setPreviewScreenshot(null)}
                className="text-white/70 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <a
                href={previewScreenshot}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors text-sm"
              >
                <Download className="w-4 h-4" />
                Download
              </a>
            </div>
            <img src={previewScreenshot} alt="Screenshot preview" className="w-full h-full object-contain" />
          </div>
        </div>
      )}

      {/* Confetti on approval */}
      <ConfettiEffect trigger={confettiTrigger} duration={3000} />

      {/* Rejection Modal */}
      {rejectingSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
          <div className="card p-6 sm:p-8 w-full max-w-lg animate-fade-in" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Reject Submission</h2>
            <p className="text-gray-500 text-sm mb-6">
              {rejectingSubmission}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-3">
                  Rejection Reason *
                </label>
                <div className="space-y-2">
                  {PRESET_REJECTION_REASONS.map(reason => (
                    <label
                      key={reason}
                      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                        rejectionReason === reason
                          ? 'bg-red-500/10 border border-red-500/20'
                          : 'bg-gray-100 border border-gray-200 hover:border-[#8B5CF6]/30'
                      }`}
                    >
                      <input
                        type="radio"
                        name="rejectionReason"
                        value={reason}
                        checked={rejectionReason === reason}
                        onChange={e => setRejectionReason(e.target.value)}
                        className="text-[#8B5CF6] focus:ring-[#8B5CF6] border-gray-200"
                      />
                      <span className="text-sm text-white">{reason}</span>
                    </label>
                  ))}
                </div>
              </div>

              {rejectionReason === 'Other (custom)' && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-2">
                    Custom Reason
                  </label>
                  <input
                    type="text"
                    placeholder="Describe the reason..."
                    value={customReason}
                    onChange={e => setCustomReason(e.target.value)}
                    className="input-field"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">
                  Admin Note (optional)
                </label>
                <textarea
                  placeholder="Add a detailed explanation for the user..."
                  value={adminNote}
                  onChange={e => setAdminNote(e.target.value)}
                  className="textarea-field"
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setRejectingSubmission(null)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={
                    processingAction === rejectingSubmission ||
                    !rejectionReason ||
                    (rejectionReason === 'Other (custom)' && !customReason.trim())
                  }
                  className="btn-danger flex-1"
                >
                  {processingAction === rejectingSubmission ? (
                    <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  ) : (
                    <>
                      <XCircle className="w-4 h-4" />
                      Confirm Reject
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
