'use client';

import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import type { Submission, Task } from '@/lib/types';
import { formatDate, PRESET_REJECTION_REASONS } from '@/lib/types';
import ConfettiEffect from '@/components/ConfettiEffect';

export default function AdminSubmissionsPage() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'paid' | 'unpaid'>('all');

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // Confetti trigger counter to ensure re-trigger on every approve
  const [confettiTrigger, setConfettiTrigger] = useState(0);

  // Rejection modal
  const [rejectingSubmission, setRejectingSubmission] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [processingAction, setProcessingAction] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { isAdminAuthenticated, getSubmissions, getTasks } = await import('@/lib/store');
      if (!isAdminAuthenticated()) {
        router.push('/admin/login');
        return;
      }
      setAuthenticated(true);
      setSubmissions(getSubmissions());
      setTasks(getTasks());
      setLoading(false);
    })();
  }, [router]);

  const getTaskTitle = (taskId: string) => {
    const task = tasks.find(t => t.taskId === taskId);
    return task?.title || 'Unknown Task';
  };

  const handleApprove = async (submission: Submission) => {
    setProcessingAction(submission.refId);
    try {
      const { updateSubmission } = await import('@/lib/store');
      updateSubmission(submission.refId, {
        status: 'approved',
        rejectionReason: undefined,
        adminNote: undefined,
      });

      // Try Sheets sync
      try {
        const { getAdminTokenForApi } = await import('@/lib/store');
        await fetch('/api/sheets', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAdminTokenForApi()}`,
          },
          body: JSON.stringify({ action: 'updateSubmission', data: { refId: submission.refId, status: 'approved' } }),
        });
      } catch {}

      setSubmissions(prev =>
        prev.map(s =>
          s.refId === submission.refId ? { ...s, status: 'approved' as const } : s
        )
      );

      // Trigger confetti! Counter ensures it re-fires every time
      setConfettiTrigger(t => t + 1);
    } finally {
      setProcessingAction(null);
    }
  };

  const handleMarkPaid = async (refId: string) => {
    setProcessingAction(refId);
    try {
      const { updateSubmission } = await import('@/lib/store');
      updateSubmission(refId, {
        isPaid: true,
        paidAt: new Date().toISOString(),
      });

      setSubmissions(prev =>
        prev.map(s =>
          s.refId === refId ? { ...s, isPaid: true, paidAt: new Date().toISOString() } : s
        )
      );
    } finally {
      setProcessingAction(null);
    }
  };

  const openRejectModal = (submission: Submission) => {
    setRejectingSubmission(submission.refId);
    setRejectionReason('');
    setCustomReason('');
    setAdminNote('');
  };

  const handleReject = async () => {
    if (!rejectingSubmission) return;
    setProcessingAction(rejectingSubmission);

    const reason = rejectionReason === 'Other (custom)' ? customReason : rejectionReason;

    try {
      const { updateSubmission } = await import('@/lib/store');
      updateSubmission(rejectingSubmission, {
        status: 'rejected',
        rejectionReason: reason || undefined,
        adminNote: adminNote.trim() || undefined,
      });

      // Try Sheets sync
      try {
        const { getAdminTokenForApi } = await import('@/lib/store');
        await fetch('/api/sheets', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAdminTokenForApi()}`,
          },
          body: JSON.stringify({ action: 'updateSubmission', data: { refId: rejectingSubmission, status: 'rejected', adminNote: adminNote.trim() } }),
        });
      } catch {}

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
    const toApprove = filteredSubmissions.filter(s => selectedIds.has(s.refId) && s.status === 'pending');
    if (toApprove.length === 0) return;
    setBulkProcessing(true);

    const { updateSubmission } = await import('@/lib/store');
    for (const sub of toApprove) {
      updateSubmission(sub.refId, {
        status: 'approved',
        rejectionReason: undefined,
        adminNote: undefined,
      });
    }

    setSubmissions(prev =>
      prev.map(s =>
        selectedIds.has(s.refId) && s.status === 'pending'
          ? { ...s, status: 'approved' as const }
          : s
      )
    );
    setSelectedIds(new Set());
    setConfettiTrigger(t => t + 1);
    setBulkProcessing(false);
  };

  const handleBulkReject = async () => {
    const toReject = filteredSubmissions.filter(s => selectedIds.has(s.refId) && s.status === 'pending');
    if (toReject.length === 0) return;
    setBulkProcessing(true);

    const { updateSubmission } = await import('@/lib/store');
    for (const sub of toReject) {
      updateSubmission(sub.refId, {
        status: 'rejected',
        rejectionReason: 'Bulk rejected',
      });
    }

    setSubmissions(prev =>
      prev.map(s =>
        selectedIds.has(s.refId) && s.status === 'pending'
          ? { ...s, status: 'rejected' as const, rejectionReason: 'Bulk rejected' }
          : s
      )
    );
    setSelectedIds(new Set());
    setBulkProcessing(false);
  };

  const filteredSubmissions = submissions
    .filter(s => {
      if (statusFilter === 'all') return true;
      if (statusFilter === 'paid') return s.status === 'approved' && s.isPaid;
      if (statusFilter === 'unpaid') return s.status === 'approved' && !s.isPaid;
      return s.status === statusFilter;
    })
    .filter(s => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        s.refId.toLowerCase().includes(q) ||
        s.discordUsername.toLowerCase().includes(q) ||
        s.taskId.toLowerCase().includes(q) ||
        (s.proofLink && s.proofLink.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

  // Only allow selecting pending submissions for bulk actions
  const selectableSubmissions = filteredSubmissions.filter(s => s.status === 'pending');
  const allSelected = selectableSubmissions.length > 0 && selectableSubmissions.every(s => selectedIds.has(s.refId));

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
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Submissions Review</h1>
            <p className="text-gray-500 mt-1">Review and manage user submissions.</p>
          </div>
        </div>

        {/* Filters */}
        <div className="glass rounded-2xl p-4 mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by Reference ID, Discord, Task ID..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="input-field !pl-12"
              />
            </div>
            <div className="flex gap-2">
              {(['all', 'pending', 'approved', 'paid', 'unpaid', 'rejected'] as const).map(status => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-3 rounded-xl text-sm font-medium capitalize transition-all duration-200 ${
                    statusFilter === status
                      ? status === 'all'
                        ? 'bg-[#8B5CF6] text-white'
                        : status === 'pending'
                        ? 'bg-[#F59E0B] text-white'
                        : status === 'approved'
                        ? 'bg-[#10B981] text-white'
                        : status === 'paid'
                        ? 'bg-[#8B5CF6] text-white'
                        : status === 'unpaid'
                        ? 'bg-[#F59E0B] text-white'
                        : 'bg-[#EF4444] text-white'
                      : 'bg-gray-100 text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {status === 'paid' ? 'Paid ✓' : status === 'unpaid' ? 'Unpaid' : status}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectableSubmissions.length > 0 && (
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

        {/* Submissions Table */}
        {filteredSubmissions.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-6">
              <MessageSquare className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No submissions found</h3>
            <p className="text-gray-500">
              {submissions.length === 0
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
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  {/* Checkbox + Info */}
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    {/* Checkbox */}
                    {submission.status === 'pending' && (
                      <label className="mt-1 cursor-pointer flex-shrink-0">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(submission.refId)}
                          onChange={() => handleSelectOne(submission.refId)}
                          className="w-5 h-5 rounded-lg border-gray-300 text-[#8B5CF6] focus:ring-[#8B5CF6] cursor-pointer transition-all"
                        />
                      </label>
                    )}
                    {/* Select all spacer for non-pending */}
                    {submission.status !== 'pending' && <div className="w-5 flex-shrink-0" />}

                    <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-mono text-sm text-[#8B5CF6] font-medium">
                        {submission.refId}
                      </span>
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                          submission.status === 'pending'
                            ? 'badge-pending'
                            : submission.status === 'approved'
                            ? 'badge-approved'
                            : 'badge-rejected'
                        }`}
                      >
                        {submission.status}
                      </span>
                    </div>

                    <h3 className="text-gray-900 font-medium mb-1 truncate">
                      {getTaskTitle(submission.taskId)}
                    </h3>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                      <span>Discord: <span className="text-gray-900">{submission.discordUsername}</span></span>
                      <span>Task: <span className="font-mono text-gray-900">{submission.taskId}</span></span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDate(submission.submittedAt)}
                      </span>
                    </div>

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
                    </div>
                  </div>

                  {/* Payment & Actions */}
                  <div className="flex items-center gap-4 lg:flex-shrink-0">
                    <div className="text-right">
                      <p className="text-sm text-gray-400">Payment</p>
                      <p className="text-lg font-bold text-emerald-400">${submission.payment.toFixed(2)}</p>
                    </div>

                    {submission.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(submission)}
                          disabled={processingAction === submission.refId}
                          className="btn-success px-4 py-3 text-sm"
                        >
                          {processingAction === submission.refId ? (
                            <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4" />
                              Approve
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

                    {/* Payment status for approved submissions */}
                    {submission.status === 'approved' && (
                      <div className="flex items-center gap-2">
                        {submission.isPaid ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#8B5CF6]/10 text-[#8B5CF6] border border-[#8B5CF6]/20 text-xs font-medium">
                            <DollarSign className="w-3.5 h-3.5" />
                            Paid
                          </span>
                        ) : (
                          <button
                            onClick={() => handleMarkPaid(submission.refId)}
                            disabled={processingAction === submission.refId}
                            className="px-3 py-2 rounded-xl bg-[#8B5CF6]/10 text-[#8B5CF6] border border-[#8B5CF6]/20 hover:bg-[#8B5CF6]/20 text-xs font-medium transition-all inline-flex items-center gap-1.5"
                          >
                            {processingAction === submission.refId ? (
                              <div className="w-3.5 h-3.5 rounded-full border-2 border-[#8B5CF6]/30 border-t-[#8B5CF6] animate-spin" />
                            ) : (
                              <DollarSign className="w-3.5 h-3.5" />
                            )}
                            Mark as Paid
                          </button>
                        )}
                      </div>
                    )}

                    {submission.status === 'rejected' && (
                      <Link
                        href={`/admin/tasks/${submission.taskId}/edit`}
                        className="btn-secondary px-4 py-3 text-sm"
                      >
                        View Task
                      </Link>
                    )}
                  </div>
                </div>

                {/* Show rejection details if rejected */}
                {submission.status === 'rejected' && submission.rejectionReason && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-start gap-2">
                      <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-white">
                          Reason: <span className="text-red-400">{submission.rejectionReason}</span>
                        </p>
                        {submission.adminNote && (
                          <p className="text-sm text-[#9CA3AF] mt-1">
                            Note: {submission.adminNote}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Light-themed confetti on approval */}
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
