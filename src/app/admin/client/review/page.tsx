'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LogOut,
  ClipboardList,
  CheckCircle,
  XCircle,
  ExternalLink,
  Search,
  Clock,
  Eye,
  Image,
  AlertTriangle,
  ArrowLeft,
  Download,
  X,
} from 'lucide-react';
import type { Submission, Task, ScreenshotProof, SubmissionStatus } from '@/lib/types';
import { formatDate, SCREENSHOT_TYPE_LABELS, PRESET_REJECTION_REASONS, SUBMISSION_STATUS_LABELS, SUBMISSION_STATUS_FLOW, getNextStatus } from '@/lib/types';

export default function ClientReviewDashboard() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Selected submission for detail view
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);

  // Rejection modal
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [processingAction, setProcessingAction] = useState<string | null>(null);

  // Screenshot preview
  const [previewScreenshot, setPreviewScreenshot] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let interval: ReturnType<typeof setInterval>;
    let channel: any = null;

    const fetchData = async () => {
      try {
        const { isAdminAuthenticated, getAdminRole, getSubmissions, getTasks } = await import('@/lib/store');
        if (!isAdminAuthenticated()) {
          router.push('/admin/login');
          return;
        }
        const adminRole = getAdminRole();
        setRole(adminRole);
        if (adminRole !== 'client') {
          router.push('/admin/dashboard');
          return;
        }
        setAuthenticated(true);
        const [subs, allTasks] = await Promise.all([getSubmissions(), getTasks()]);
        if (!mounted) return;
        // Only show submissions the admin has explicitly sent to the client
        setSubmissions(subs.filter((s: Submission) => s.showToClient === true));
        setTasks(allTasks);
        setLoading(false);
      } catch {}
    };

    fetchData();

    // Supabase Realtime subscription
    (async () => {
      try {
        const { getClient } = await import('@/lib/supabase');
        const client = getClient();
        if (client) {
          channel = client
            .channel('client-review-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'submissions' }, () => { fetchData(); })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => { fetchData(); })
            .subscribe();
        }
      } catch {}
    })();

    // Fallback polling every 30s
    interval = setInterval(fetchData, 30000);

    return () => {
      mounted = false;
      if (channel) { try { channel.unsubscribe(); } catch {} }
      clearInterval(interval);
    };
  }, [router]);

  const getTaskTitle = (taskId: string) => {
    const task = tasks.find(t => t.taskId === taskId);
    return task?.title || 'Unknown Task';
  };

  const getTaskType = (taskId: string) => {
    const task = tasks.find(t => t.taskId === taskId);
    return task?.type || null;
  };

  const handleLogout = async () => {
    const { adminLogout } = await import('@/lib/store');
    adminLogout();
    router.push('/admin/login');
  };

  const handleApprove = async (submission: Submission) => {
    setProcessingAction(submission.refId);
    try {
      const { updateSubmission } = await import('@/lib/store');
      await updateSubmission(submission.refId, {
        status: 'paid',
        rejectionReason: undefined,
        adminNote: adminNote.trim() || undefined,
        paidAt: new Date().toISOString(),
      });

      setSubmissions(prev =>
        prev.map(s =>
          s.refId === submission.refId ? { ...s, status: 'paid' as const, paidAt: new Date().toISOString() } : s
        )
      );
      if (selectedSubmission?.refId === submission.refId) {
        setSelectedSubmission({ ...submission, status: 'paid', paidAt: new Date().toISOString() });
      }
      setAdminNote('');
    } finally {
      setProcessingAction(null);
    }
  };

  const openRejectModal = () => {
    setRejectModalOpen(true);
    setRejectionReason('');
    setCustomReason('');
    setAdminNote('');
  };

  const handleReject = async () => {
    if (!selectedSubmission) return;
    setProcessingAction(selectedSubmission.refId);

    const reason = rejectionReason === 'Other (custom)' ? customReason : rejectionReason;

    try {
      const { updateSubmission } = await import('@/lib/store');
      await updateSubmission(selectedSubmission.refId, {
        status: 'rejected',
        rejectionReason: reason || undefined,
        adminNote: adminNote.trim() || undefined,
      });

      setSubmissions(prev =>
        prev.map(s =>
          s.refId === selectedSubmission.refId
            ? { ...s, status: 'rejected' as const, rejectionReason: reason, adminNote: adminNote.trim() || undefined }
            : s
        )
      );
      setSelectedSubmission(prev => prev ? { ...prev, status: 'rejected', rejectionReason: reason, adminNote: adminNote.trim() || undefined } : prev);
      setRejectModalOpen(false);
      setAdminNote('');
    } finally {
      setProcessingAction(null);
    }
  };

  // Client sees all submissions that are active (not just flagged ones)
  // Stats use the full list so paid/rejected counts are accurate
  const clientSubmissions = submissions;
  const todaySubmissions = clientSubmissions.filter(s => {
    const today = new Date();
    const subDate = new Date(s.submittedAt);
    return subDate.toDateString() === today.toDateString();
  });

  const getScreenshotsByType = (submission: Submission): ScreenshotProof[] => {
    return submission.screenshots || [];
  };

  const filteredSubmissions = submissions
    .filter(s => {
      if (statusFilter === 'all') return true;
      return s.status === statusFilter;
    })
    .filter(s => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        s.refId.toLowerCase().includes(q) ||
        s.discordUsername.toLowerCase().includes(q) ||
        s.taskId.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
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
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Client Review Dashboard</h1>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Client Admin
              </span>
            </div>
            <p className="text-gray-500">Review and approve/reject submitted work.</p>
          </div>
          <button onClick={handleLogout} className="btn-secondary">
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>

        {/* Today's Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-1">{todaySubmissions.length}</p>
            <p className="text-xs text-gray-400">Today&apos;s Submissions</p>
          </div>
          <div className="card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-[#F59E0B]" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-1">
              {clientSubmissions.filter(s => s.status === 'submitted' || s.status === 'in_review').length}
            </p>
            <p className="text-xs text-gray-400">Pending Review</p>
          </div>
          <div className="card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-[#8B5CF6]" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-1">
              {clientSubmissions.filter(s => s.status === 'paid').length}
            </p>
            <p className="text-xs text-gray-400">Total Approved</p>
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
            <div className="flex gap-2 flex-wrap">
              {[
                { key: 'all', label: 'All', color: '#10B981' },
                { key: 'submitted', label: 'Submitted', color: '#F59E0B' },
                { key: 'in_review', label: 'In Review', color: '#3B82F6' },
                { key: 'paid', label: 'Paid ✓', color: '#10B981' },
                { key: 'rejected', label: 'Rejected', color: '#EF4444' },
              ].map(({ key, label, color }) => (
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
                  {key === 'all' ? 'All' : key === 'in_review' ? 'In Review' : label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Submissions List */}
        {selectedSubmission ? (
          /* Detail View */
          <div className="space-y-6">
            <button
              onClick={() => setSelectedSubmission(null)}
              className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to all submissions
            </button>

            <div className="card p-6 sm:p-8">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">
                    {getTaskTitle(selectedSubmission.taskId)}
                  </h2>
                  <p className="font-mono text-sm text-[#8B5CF6]">{selectedSubmission.refId}</p>
                </div>
                <span
                  className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize ${
                    selectedSubmission.status === 'submitted' ? 'badge-pending' :
                    selectedSubmission.status === 'in_review' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                    selectedSubmission.status === 'paid' ? 'badge-approved' :
                    'badge-rejected'
                  }`}
                >
                  {SUBMISSION_STATUS_LABELS[selectedSubmission.status] || selectedSubmission.status}
                </span>
              </div>

              {/* Submission Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Task ID</p>
                  <p className="font-mono text-gray-900 text-sm">{selectedSubmission.taskId}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Task Type</p>
                  <p className="text-gray-900 text-sm capitalize">{getTaskType(selectedSubmission.taskId) || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Worker Discord</p>
                  <p className="text-gray-900 text-sm">{selectedSubmission.discordUsername}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Submitted</p>
                  <p className="text-gray-900 text-sm">{formatDate(selectedSubmission.submittedAt)}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs text-gray-400 mb-1">Reddit Permalink</p>
                  <a
                    href={selectedSubmission.proofLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-[#8B5CF6] hover:text-[#A78BFA] transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    {selectedSubmission.proofLink}
                  </a>
                </div>
                {selectedSubmission.note && (
                  <div className="sm:col-span-2">
                    <p className="text-xs text-gray-400 mb-1">Worker Note</p>
                    <p className="text-gray-500 text-sm italic">{selectedSubmission.note}</p>
                  </div>
                )}
              </div>

              {/* Screenshots */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Image className="w-5 h-5 text-[#8B5CF6]" />
                  Uploaded Screenshots
                </h3>
                {getScreenshotsByType(selectedSubmission).length === 0 ? (
                  <p className="text-gray-400 text-sm">No screenshots uploaded yet.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {getScreenshotsByType(selectedSubmission).map((ss, idx) => (
                      <div key={idx} className="card p-3">
                        <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100 mb-2 group cursor-pointer"
                          onClick={() => setPreviewScreenshot(ss.url)}
                        >
                          <img src={ss.url} alt={SCREENSHOT_TYPE_LABELS[ss.type]} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                            <Eye className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                        <p className="text-xs font-medium text-gray-900">{SCREENSHOT_TYPE_LABELS[ss.type]}</p>
                        <p className="text-xs text-gray-400">{new Date(ss.uploadedAt).toLocaleDateString()}</p>
                        <div className="flex items-center justify-between mt-1">
                          <a
                            href={ss.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-[#8B5CF6] hover:text-[#A78BFA] inline-block"
                          >
                            Open full size ↗
                          </a>
                          <a
                            href={ss.url}
                            download={ss.fileName || `screenshot-${ss.type}.png`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-400 hover:text-[#8B5CF6] transition-colors"
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons (only for non-terminal statuses) */}
              {selectedSubmission.status !== 'paid' && selectedSubmission.status !== 'rejected' && (
                <div className="flex gap-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleApprove(selectedSubmission)}
                    disabled={processingAction === selectedSubmission.refId}
                    className="btn-success flex-1"
                  >
                    {processingAction === selectedSubmission.refId ? (
                      <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Approve
                      </>
                    )}
                  </button>
                  <button
                    onClick={openRejectModal}
                    disabled={processingAction === selectedSubmission.refId}
                    className="btn-danger flex-1"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </button>
                </div>
              )}

              {/* Rejection Details */}
              {selectedSubmission.status === 'rejected' && selectedSubmission.rejectionReason && (
                <div className="mt-6 p-5 rounded-xl bg-red-500/5 border border-red-500/20">
                  <h3 className="text-sm font-semibold text-red-400 mb-2 flex items-center gap-2">
                    <XCircle className="w-4 h-4" />
                    Rejection Reason
                  </h3>
                  <p className="text-gray-900 text-sm">{selectedSubmission.rejectionReason}</p>
                  {selectedSubmission.adminNote && (
                    <p className="text-gray-500 text-sm mt-2">Note: {selectedSubmission.adminNote}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* List View */
          <>
            {filteredSubmissions.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-6">
                  <ClipboardList className="w-10 h-10 text-gray-400" />
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
                  <button
                    key={submission.refId}
                    onClick={() => setSelectedSubmission(submission)}
                    className="w-full text-left card p-5 animate-fade-in hover:border-emerald-500/30 transition-all duration-200"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-mono text-sm text-[#8B5CF6] font-medium">
                            {submission.refId}
                          </span>
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                          submission.status === 'submitted' ? 'badge-pending' :
                          submission.status === 'in_review' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                          submission.status === 'paid' ? 'badge-approved' :
                          'badge-rejected'
                        }`}
                      >
                        {SUBMISSION_STATUS_LABELS[submission.status] || submission.status}
                      </span>
                        </div>
                        <h3 className="text-gray-900 font-medium mb-1 truncate">
                          {getTaskTitle(submission.taskId)}
                        </h3>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                          <span>Discord: <span className="text-gray-900">{submission.discordUsername}</span></span>
                          <span>Task: <span className="font-mono text-gray-900">{submission.taskId}</span></span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {formatDate(submission.submittedAt)}
                          </span>
                        </div>
                        {/* Screenshot count */}
                        {(submission.screenshots?.length || 0) > 0 && (
                          <div className="flex items-center gap-1.5 mt-2">
                            <Image className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-xs text-gray-400">
                              {submission.screenshots!.length} screenshot{submission.screenshots!.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 sm:flex-shrink-0">
                        <Eye className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-[#8B5CF6] font-medium">Review</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
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

      {/* Rejection Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
          <div className="card p-6 sm:p-8 w-full max-w-lg animate-fade-in" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Reject Submission</h2>
            <p className="text-gray-500 text-sm mb-6">
              {selectedSubmission?.refId}
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
                          : 'bg-gray-100 border border-gray-200 hover:border-emerald-500/30'
                      }`}
                    >
                      <input
                        type="radio"
                        name="clientRejectionReason"
                        value={reason}
                        checked={rejectionReason === reason}
                        onChange={e => setRejectionReason(e.target.value)}
                        className="text-emerald-500 focus:ring-emerald-500 border-gray-200"
                      />
                      <span className="text-sm text-gray-900">{reason}</span>
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
                  Note (optional)
                </label>
                <textarea
                  placeholder="Add a note for the worker..."
                  value={adminNote}
                  onChange={e => setAdminNote(e.target.value)}
                  className="textarea-field"
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setRejectModalOpen(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={
                    processingAction === selectedSubmission?.refId ||
                    !rejectionReason ||
                    (rejectionReason === 'Other (custom)' && !customReason.trim())
                  }
                  className="btn-danger flex-1"
                >
                  {processingAction === selectedSubmission?.refId ? (
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
