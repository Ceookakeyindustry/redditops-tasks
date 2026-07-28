'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { Submission, ScreenshotType, ScreenshotProof } from '@/lib/types';
import { SCREENSHOT_TYPE_LABELS, ALL_SCREENSHOT_TYPES, isEditableStatus } from '@/lib/types';
import {
  Clock, CheckCircle, XCircle, AlertTriangle, ArrowLeft, DollarSign,
  Upload, Image, Edit3, ExternalLink, Save, X, Eye, Download,
} from 'lucide-react';

export default function SubmissionPortalPage() {
  const params = useParams();
  const refId = params.refId as string;

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);

  // Editing
  const [editingLink, setEditingLink] = useState(false);
  const [newProofLink, setNewProofLink] = useState('');
  const [editingNote, setEditingNote] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Screenshot upload
  const [uploadingType, setUploadingType] = useState<ScreenshotType | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Preview
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const loadSubmission = useCallback(async () => {
    const { getSubmission } = await import('@/lib/store');
    const found = await getSubmission(refId);
    setSubmission(found || null);
    setLoading(false);
  }, [refId]);

  useEffect(() => {
    loadSubmission();
    let channel: any = null;
    let interval: ReturnType<typeof setInterval>;

    // Supabase Realtime subscription
    (async () => {
      try {
        const { getClient } = await import('@/lib/supabase');
        const client = getClient();
        if (client) {
          channel = client
            .channel(`submission-${refId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'submissions', filter: `ref_id=eq.${refId}` }, () => { loadSubmission(); })
            .subscribe();
        }
      } catch {}
    })();

    // Fallback polling every 30s
    interval = setInterval(loadSubmission, 30000);

    return () => {
      if (channel) { try { channel.unsubscribe(); } catch {} }
      clearInterval(interval);
    };
  }, [loadSubmission, refId]);

  const getMissingScreenshotTypes = (): ScreenshotType[] => {
    if (!submission) return [];
    const uploadedTypes = (submission.screenshots || []).map(s => s.type);
    // Show all non-initial screenshot types that haven't been uploaded yet
    // The task's requiredScreenshots config determines which are actually required
    return ALL_SCREENSHOT_TYPES.filter(t => t !== 'initial' && !uploadedTypes.includes(t));
  };

  // This will be enhanced later to check the task's requiredScreenshots
  // Once the task data is also available in the submission portal

  const handleEditLink = async () => {
    if (!submission || !newProofLink.trim()) return;
    setSaving(true);
    setSaveError('');
    try {
      const { editSubmissionProofLink } = await import('@/lib/store');
      const result = await editSubmissionProofLink(refId, newProofLink.trim());
      if (result) {
        setSubmission(result);
        setEditingLink(false);
      } else {
        setSaveError('Failed to update. Submission may no longer be editable.');
      }
    } catch {
      setSaveError('Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleEditNote = async () => {
    if (!submission) return;
    setSaving(true);
    setSaveError('');
    try {
      const { editSubmissionNote } = await import('@/lib/store');
      const result = await editSubmissionNote(refId, newNote.trim());
      if (result) {
        setSubmission(result);
        setEditingNote(false);
      } else {
        setSaveError('Failed to update. Submission may no longer be editable.');
      }
    } catch {
      setSaveError('Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadScreenshot = async (type: ScreenshotType) => {
    const fileInput = document.getElementById(`screenshot-upload-${type}`) as HTMLInputElement;
    if (!fileInput?.files?.[0]) return;

    const file = fileInput.files[0];
    setUploading(true);
    setUploadError('');
    setUploadingType(type);

    try {
      const { uploadScreenshot, addScreenshotToSubmission } = await import('@/lib/store');
      const url = await uploadScreenshot(file);

      const screenshot: ScreenshotProof = {
        type,
        url,
        uploadedAt: new Date().toISOString(),
        fileName: file.name,
      };

      const result = await addScreenshotToSubmission(refId, screenshot);
      if (result) {
        setSubmission(result);
      }
    } catch {
      setUploadError('Failed to upload screenshot. Please try again.');
    } finally {
      setUploading(false);
      setUploadingType(null);
      fileInput.value = '';
    }
  };

  const getScreenshotsByType = (): ScreenshotProof[] => {
    return submission?.screenshots || [];
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-[#8B5CF6] border-t-transparent animate-spin" />
          <p className="text-gray-500 text-sm">Loading submission...</p>
        </div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="text-center max-w-md mx-auto">
          <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-10 h-10 text-gray-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Submission Not Found</h2>
          <p className="text-gray-500 mb-6">
            No submission was found with the Reference ID <span className="font-mono text-gray-900">{refId}</span>.
          </p>
          <Link href="/status" className="btn-primary inline-flex">
            <ArrowLeft className="w-4 h-4" />
            Try Again
          </Link>
        </div>
      </div>
    );
  }

  const statusConfig: Record<string, { icon: any; color: string; bg: string; border: string; label: string; description: string }> = {
    submitted: {
      icon: Clock,
      color: 'text-[#F59E0B]',
      bg: 'bg-[#F59E0B]/10',
      border: 'border-[#F59E0B]/20',
      label: 'Submitted',
      description: 'Your submission has been received and is waiting to be reviewed.',
    },
    in_review: {
      icon: Clock,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      label: 'In Review',
      description: 'An admin is currently reviewing your submission.',
    },
    '24hr_pending': {
      icon: Clock,
      color: 'text-[#F59E0B]',
      bg: 'bg-[#F59E0B]/10',
      border: 'border-[#F59E0B]/20',
      label: '24hr Screenshot Needed',
      description: 'Please upload your 24-hour Reddit Insights screenshot.',
    },
    '24hr_done': {
      icon: CheckCircle,
      color: 'text-[#10B981]',
      bg: 'bg-[#10B981]/10',
      border: 'border-[#10B981]/20',
      label: '24hr Screenshot Done',
      description: 'Your 24-hour screenshot has been received.',
    },
    '48hr_pending': {
      icon: Clock,
      color: 'text-[#F59E0B]',
      bg: 'bg-[#F59E0B]/10',
      border: 'border-[#F59E0B]/20',
      label: '48hr Screenshot Needed',
      description: 'Please upload your 48-hour proof screenshot.',
    },
    '48hr_done': {
      icon: CheckCircle,
      color: 'text-[#10B981]',
      bg: 'bg-[#10B981]/10',
      border: 'border-[#10B981]/20',
      label: '48hr Screenshot Done',
      description: 'Your 48-hour screenshot has been received.',
    },
    processing: {
      icon: Clock,
      color: 'text-[#8B5CF6]',
      bg: 'bg-[#8B5CF6]/10',
      border: 'border-[#8B5CF6]/20',
      label: 'Processing Payment',
      description: 'Your submission is being processed for payment.',
    },
    paid: {
      icon: CheckCircle,
      color: 'text-[#10B981]',
      bg: 'bg-[#10B981]/10',
      border: 'border-[#10B981]/20',
      label: 'Paid',
      description: 'Congratulations! Your submission has been approved and paid.',
    },
    rejected: {
      icon: XCircle,
      color: 'text-[#EF4444]',
      bg: 'bg-[#EF4444]/10',
      border: 'border-[#EF4444]/20',
      label: 'Rejected',
      description: 'Your submission has been reviewed and was not approved.',
    },
  };

  const config = statusConfig[submission.status];
  const isEditable = isEditableStatus(submission.status);
  const missingTypes = getMissingScreenshotTypes();
  const existingScreenshots = getScreenshotsByType();

  return (
    <div className="flex-1">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <Link
          href="/status"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Check another status
        </Link>

        <div className="space-y-8">
          {/* Status Card */}
          <div className="card p-8 sm:p-10 animate-fade-in">
            <div className="text-center mb-8">
              <div className={`w-20 h-20 rounded-full ${config.bg} border ${config.border} flex items-center justify-center mx-auto mb-4`}>
                <config.icon className={`w-10 h-10 ${config.color}`} />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{config.label}</h1>
              <p className="text-gray-500">{config.description}</p>
            </div>

            {/* Submission Details */}
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-gray-200">
                <span className="text-gray-500 text-sm">Reference ID</span>
                <span className="text-gray-900 font-mono font-medium">{submission.refId}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-200">
                <span className="text-gray-500 text-sm">Task ID</span>
                <span className="text-gray-900 font-mono">{submission.taskId}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-200">
                <span className="text-gray-500 text-sm">Discord Username</span>
                <span className="text-gray-900">{submission.discordUsername}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-200">
                <span className="text-gray-500 text-sm">Payment</span>
                <span className="text-emerald-400 font-semibold">${submission.payment.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-200">
                <span className="text-gray-500 text-sm">Submitted</span>
                <span className="text-gray-900 text-sm">
                  {new Date(submission.submittedAt).toLocaleDateString('en-US', {
                    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              </div>

              {/* Editable Proof Link */}
              <div className="py-3 border-b border-gray-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-500 text-sm">Reddit Permalink</span>
                  {isEditable && !editingLink && (
                    <button onClick={() => { setEditingLink(true); setNewProofLink(submission.proofLink); }} className="text-xs text-[#8B5CF6] hover:text-[#A78BFA] flex items-center gap-1">
                      <Edit3 className="w-3 h-3" /> Edit
                    </button>
                  )}
                </div>
                {editingLink ? (
                  <div className="flex gap-2">
                    <input type="url" value={newProofLink} onChange={e => setNewProofLink(e.target.value)} className="input-field text-sm flex-1" placeholder="https://reddit.com/..." />
                    <button onClick={handleEditLink} disabled={saving || !newProofLink.trim()} className="btn-primary px-3 py-2 text-sm">
                      {saving ? <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <Save className="w-4 h-4" />}
                    </button>
                    <button onClick={() => setEditingLink(false)} className="btn-secondary px-3 py-2 text-sm"><X className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <a href={submission.proofLink} target="_blank" rel="noopener noreferrer" className="text-[#8B5CF6] hover:text-[#A78BFA] text-sm font-medium truncate inline-flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" /> {submission.proofLink}
                  </a>
                )}
              </div>

              {/* Editable Note */}
              {isEditable && (
                <div className="py-3 border-b border-gray-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-gray-500 text-sm">Note</span>
                    {!editingNote && (
                      <button onClick={() => { setEditingNote(true); setNewNote(submission.note || ''); }} className="text-xs text-[#8B5CF6] hover:text-[#A78BFA] flex items-center gap-1">
                        <Edit3 className="w-3 h-3" /> {submission.note ? 'Edit' : 'Add Note'}
                      </button>
                    )}
                  </div>
                  {editingNote ? (
                    <div className="space-y-2">
                      <textarea value={newNote} onChange={e => setNewNote(e.target.value)} className="textarea-field text-sm" rows={2} placeholder="Add a note..." />
                      <div className="flex gap-2">
                        <button onClick={handleEditNote} disabled={saving} className="btn-primary px-3 py-2 text-sm">
                          {saving ? <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <Save className="w-4 h-4" />}
                          Save
                        </button>
                        <button onClick={() => setEditingNote(false)} className="btn-secondary px-3 py-2 text-sm">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-700 text-sm">{submission.note || <span className="text-gray-400 italic">No note added</span>}</p>
                  )}
                </div>
              )}
            </div>

            {/* Rejection Details */}
            {submission.status === 'rejected' && (
              <div className="mt-6 p-5 rounded-xl bg-red-500/5 border border-red-500/20">
                <h3 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
                  <XCircle className="w-4 h-4" />
                  Rejection Reason
                </h3>
                {submission.rejectionReason && <p className="text-gray-900 text-sm mb-2">{submission.rejectionReason}</p>}
                {submission.adminNote && (
                  <div className="mt-3 pt-3 border-t border-red-500/10">
                    <p className="text-xs text-red-400/70 mb-1">Admin Note:</p>
                    <p className="text-gray-700 text-sm">{submission.adminNote}</p>
                  </div>
                )}
              </div>
            )}

            {/* Paid Message */}
            {submission.status === 'paid' && (
              <div className="mt-6 space-y-3">
                <div className="p-5 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                  <p className="text-emerald-400 text-center font-medium">Congratulations! Your submission has been approved and paid.</p>
                </div>
                <div className="p-5 rounded-xl border bg-white/50">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-[#8B5CF6]" /> Payment
                  </h3>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 text-sm">Amount</span>
                    <span className="text-emerald-400 font-bold text-lg">${submission.payment.toFixed(2)}</span>
                  </div>
                  {submission.paidAt && (
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                      <span className="text-gray-500 text-sm">Paid On</span>
                      <span className="text-gray-900 text-sm">{new Date(submission.paidAt).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Processing Message */}
            {submission.status === 'processing' && (
              <div className="mt-6 p-5 rounded-xl bg-[#8B5CF6]/5 border border-[#8B5CF6]/20">
                <p className="text-[#8B5CF6] text-center text-sm">
                  Your submission is being processed for payment. You will be notified once paid.
                </p>
              </div>
            )}

            {/* In Review / Awaiting screenshots messages */}
            {(submission.status === 'submitted' || submission.status === 'in_review') && (
              <div className="mt-6 p-5 rounded-xl bg-[#F59E0B]/5 border border-[#F59E0B]/20">
                <p className="text-[#F59E0B] text-center text-sm">
                  {submission.status === 'submitted' ? 'Your submission has been received and is in the queue.' : 'An admin is reviewing your submission.'}
                </p>
              </div>
            )}
          </div>

          {/* Screenshot Management */}
          <div className="card p-6 sm:p-8 animate-fade-in">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Image className="w-5 h-5 text-[#8B5CF6]" />
              Proof Screenshots
            </h2>

            {/* Upload Error */}
            {uploadError && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-4">
                <AlertTriangle className="w-4 h-4" /> {uploadError}
              </div>
            )}

            {saveError && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-4">
                <AlertTriangle className="w-4 h-4" /> {saveError}
              </div>
            )}

            {/* Existing Screenshots */}
            {existingScreenshots.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-500 mb-3">Uploaded Screenshots</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {existingScreenshots.map((ss, idx) => (
                    <div key={idx} className="card p-3">
                      <div
                        className="relative aspect-video rounded-lg overflow-hidden bg-gray-100 mb-2 group cursor-pointer"
                        onClick={() => setPreviewUrl(ss.url)}
                      >
                        <img src={ss.url} alt={SCREENSHOT_TYPE_LABELS[ss.type]} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                          <Eye className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                      <p className="text-xs font-medium text-gray-900">{SCREENSHOT_TYPE_LABELS[ss.type]}</p>
                      <p className="text-xs text-gray-400">{new Date(ss.uploadedAt).toLocaleDateString()}</p>
                      <div className="flex items-center justify-between mt-1">
                        {ss.fileName && <p className="text-xs text-gray-400 truncate flex-1 min-w-0 mr-1">{ss.fileName}</p>}
                        <a
                          href={ss.url}
                          download={ss.fileName || `screenshot-${ss.type}.png`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#8B5CF6] hover:text-[#A78BFA] transition-colors flex-shrink-0"
                          title="Download screenshot"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Missing Screenshots */}
            {isEditable && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3">
                  {missingTypes.length > 0 ? 'Upload Additional Screenshots' : 'All Required Screenshots Uploaded'}
                </h3>
                {missingTypes.length > 0 ? (
                  <div className="space-y-3">
                    {missingTypes.map(type => (
                      <div key={type} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-200">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{SCREENSHOT_TYPE_LABELS[type]}</p>
                          <p className="text-xs text-gray-400">Upload screenshot showing {type.replace('_', ' ')}</p>
                        </div>
                        <label className={`px-4 py-2 rounded-xl text-sm font-medium cursor-pointer transition-all inline-flex items-center gap-2 ${
                          uploading && uploadingType === type
                            ? 'bg-[#8B5CF6]/20 text-[#8B5CF6] border border-[#8B5CF6]/20'
                            : 'bg-[#8B5CF6]/10 text-[#8B5CF6] border border-[#8B5CF6]/20 hover:bg-[#8B5CF6]/20'
                        }`}>
                          {uploading && uploadingType === type ? (
                            <div className="w-4 h-4 rounded-full border-2 border-[#8B5CF6]/30 border-t-[#8B5CF6] animate-spin" />
                          ) : (
                            <Upload className="w-4 h-4" />
                          )}
                          {uploading && uploadingType === type ? 'Uploading...' : 'Upload'}
                          <input
                            id={`screenshot-upload-${type}`}
                            type="file"
                            accept="image/*"
                            onChange={() => handleUploadScreenshot(type)}
                            className="hidden"
                            disabled={uploading}
                          />
                        </label>
                      </div>
                    ))}
                  </div>
                ) : existingScreenshots.length === 0 ? (
                  <p className="text-gray-400 text-sm italic">No screenshots uploaded yet.</p>
                ) : (
                  <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                    <p className="text-emerald-400 text-sm font-medium flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      All screenshots uploaded!
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Not editable when approved */}
            {!isEditable && existingScreenshots.length === 0 && (
              <p className="text-gray-400 text-sm">No screenshots were uploaded with this submission.</p>
            )}
          </div>

        </div>
      </div>

      {/* Screenshot Preview Modal */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setPreviewUrl(null)}
        >
          <div className="max-w-4xl max-h-[90vh] rounded-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Top bar with download */}
            <div className="flex items-center justify-between px-4 py-2 bg-white/10 backdrop-blur-sm">
              <button
                onClick={() => setPreviewUrl(null)}
                className="text-white/70 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <a
                href={previewUrl}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors text-sm"
              >
                <Download className="w-4 h-4" />
                Download
              </a>
            </div>
            <img src={previewUrl} alt="Screenshot preview" className="w-full h-full object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}
