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
} from 'lucide-react';
import type { Submission, Task } from '@/lib/types';
import { formatDate, PRESET_REJECTION_REASONS } from '@/lib/types';

export default function AdminSubmissionsPage() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

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
        await fetch('/api/sheets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'updateSubmission', data: { refId: submission.refId, status: 'approved' } }),
        });
      } catch {}

      setSubmissions(prev =>
        prev.map(s =>
          s.refId === submission.refId ? { ...s, status: 'approved' as const } : s
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
        await fetch('/api/sheets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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

  const filteredSubmissions = submissions
    .filter(s => statusFilter === 'all' || s.status === statusFilter)
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
              className="inline-flex items-center gap-2 text-[#9CA3AF] hover:text-white transition-colors mb-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Submissions Review</h1>
            <p className="text-[#9CA3AF] mt-1">Review and manage user submissions.</p>
          </div>
        </div>

        {/* Filters */}
        <div className="glass rounded-2xl p-4 mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B7280]" />
              <input
                type="text"
                placeholder="Search by Reference ID, Discord, Task ID..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="input-field pl-12"
              />
            </div>
            <div className="flex gap-2">
              {(['all', 'pending', 'approved', 'rejected'] as const).map(status => (
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
                        : 'bg-[#EF4444] text-white'
                      : 'bg-[#2A2A2A] text-[#9CA3AF] hover:text-white'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Submissions Table */}
        {filteredSubmissions.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-2xl bg-[#2A2A2A] flex items-center justify-center mx-auto mb-6">
              <MessageSquare className="w-10 h-10 text-[#6B7280]" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No submissions found</h3>
            <p className="text-[#9CA3AF]">
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
                className="card p-6 animate-fade-in"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  {/* Info */}
                  <div className="flex-1 min-w-0">
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

                    <h3 className="text-white font-medium mb-1 truncate">
                      {getTaskTitle(submission.taskId)}
                    </h3>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-[#9CA3AF]">
                      <span>Discord: <span className="text-white">{submission.discordUsername}</span></span>
                      <span>Task: <span className="font-mono text-white">{submission.taskId}</span></span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDate(submission.submittedAt)}
                      </span>
                    </div>

                    {submission.note && (
                      <p className="text-sm text-[#6B7280] mt-2 italic">
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

                  {/* Payment & Actions */}
                  <div className="flex items-center gap-4 lg:flex-shrink-0">
                    <div className="text-right">
                      <p className="text-sm text-[#6B7280]">Payment</p>
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

                    {submission.status !== 'pending' && (
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
                  <div className="mt-4 pt-4 border-t border-[#2A2A2A]">
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

      {/* Rejection Modal */}
      {rejectingSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="card p-6 sm:p-8 w-full max-w-lg animate-fade-in" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-white mb-2">Reject Submission</h2>
            <p className="text-[#9CA3AF] text-sm mb-6">
              {rejectingSubmission}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#9CA3AF] mb-3">
                  Rejection Reason *
                </label>
                <div className="space-y-2">
                  {PRESET_REJECTION_REASONS.map(reason => (
                    <label
                      key={reason}
                      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                        rejectionReason === reason
                          ? 'bg-red-500/10 border border-red-500/20'
                          : 'bg-[#2A2A2A] border border-[#2A2A2A] hover:border-[#8B5CF6]/30'
                      }`}
                    >
                      <input
                        type="radio"
                        name="rejectionReason"
                        value={reason}
                        checked={rejectionReason === reason}
                        onChange={e => setRejectionReason(e.target.value)}
                        className="text-[#8B5CF6] focus:ring-[#8B5CF6] border-[#2A2A2A]"
                      />
                      <span className="text-sm text-white">{reason}</span>
                    </label>
                  ))}
                </div>
              </div>

              {rejectionReason === 'Other (custom)' && (
                <div>
                  <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
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
                <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
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
