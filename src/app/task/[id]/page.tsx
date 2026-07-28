'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import type { Task } from '@/lib/types';
import { formatPayment } from '@/lib/types';
import { Lock, Unlock, Check, AlertTriangle, Send, MessageCircle, FileText, DollarSign, ExternalLink, Image, Video, Clock, User, Shield, Upload, X } from 'lucide-react';
import CopyButton from '@/components/CopyButton';
import Link from 'next/link';

export default function TaskPage() {
  const params = useParams();
  const taskId = params.id as string;

  const [task, setTask] = useState<Task | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // Submission form
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [discordUsername, setDiscordUsername] = useState('');
  const [proofLink, setProofLink] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<{ refId: string; requiresMoreScreenshots: boolean } | null>(null);
  const [submitError, setSubmitError] = useState('');
  
  // Screenshot upload
  const [initialScreenshot, setInitialScreenshot] = useState<File | null>(null);
  const [initialScreenshotPreview, setInitialScreenshotPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Time remaining
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    setLoadError(false);
    (async () => {
      try {
        const { getTasks, checkAndExpireTasks } = await import('@/lib/store');
        await checkAndExpireTasks();
        const allTasks = await getTasks();
        if (cancelled) return;
        const found = allTasks.find((t: Task) => t.taskId === taskId);
        setTask(found || null);
        if (found?.isPublic) {
          setUnlocked(true);
        }
      } catch (err) {
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [taskId]);

  // Update time remaining countdown
  useEffect(() => {
    if (!task || !task.expiresAt || task.status !== 'assigned') return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const expires = new Date(task.expiresAt!).getTime();
      const diff = expires - now;

      if (diff <= 0) {
        setTimeRemaining('Expired');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setTimeRemaining(`${hours}h ${minutes}m`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [task, unlocked]);

  const handleUnlock = async () => {
    if (!task) return;
    setVerifying(true);
    setError('');

    // Check access code
    const isCodeValid = accessCode === task.accessCode && !task.accessCodeDisabled;
    const isExpired = task.status === 'expired';

    // Log the access attempt
    try {
      await fetch('/api/log-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, success: isCodeValid && !isExpired }),
      });
    } catch {
      const { logAccess } = await import('@/lib/store');
      await logAccess(taskId, 'unknown', isCodeValid && !isExpired);
    }

    if (!isCodeValid) {
      setError('Invalid Access Code.');
      setVerifying(false);
      return;
    }

    if (isExpired) {
      setError('This task has expired. Please contact an admin for a new access code.');
      setVerifying(false);
      return;
    }

    setUnlocked(true);
    setVerifying(false);
  };

  const uploadFile = async (file: File): Promise<string> => {
    const { uploadScreenshot } = await import('@/lib/store');
    return uploadScreenshot(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task) return;
    setSubmitError('');

    if (!discordUsername.trim()) {
      setSubmitError('Discord username is required.');
      return;
    }
    if (!proofLink.trim()) {
      setSubmitError('Proof link is required.');
      return;
    }

    setSubmitting(true);

    try {
      // Upload initial screenshot if provided
      let screenshots: any[] = [];
      if (initialScreenshot) {
        setUploading(true);
        const url = await uploadFile(initialScreenshot);
        screenshots.push({
          type: 'initial',
          url,
          uploadedAt: new Date().toISOString(),
          fileName: initialScreenshot.name,
        });
        setUploading(false);
      }

      const { createSubmission, markTaskSubmitted } = await import('@/lib/store');
      const submission = await createSubmission({
        taskId: task.taskId,
        discordUsername: discordUsername.trim(),
        proofLink: proofLink.trim(),
        note: note.trim() || undefined,
        payment: task.payment,
        rejectionReason: undefined,
        adminNote: undefined,
        screenshots,
      });

      // Mark the task as submitted
      await markTaskSubmitted(task.taskId);

      // Update local task state
      setTask(prev => prev ? {
        ...prev,
        status: prev.status === 'assigned' ? 'submitted' as const : prev.status,
        completedCount: (prev.completedCount || 0) + 1,
      } : prev);

      setSubmitted({ refId: submission.refId, requiresMoreScreenshots: (task.requiredScreenshots?.length || 1) > 1 });
      setShowSubmitForm(false);
    } catch (err) {
      setSubmitError('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  const getTimeRemainingDisplay = () => {
    if (!task || !task.expiresAt) return null;
    const now = new Date().getTime();
    const expires = new Date(task.expiresAt).getTime();
    const diff = expires - now;

    if (diff <= 0) return <span className="text-red-400">Expired</span>;

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    // Color code based on time remaining
    const colorClass = hours < 2 ? 'text-red-400' : hours < 6 ? 'text-[#F59E0B]' : 'text-emerald-400';

    return <span className={colorClass}>{hours}h {minutes}m remaining</span>;
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-[#8B5CF6] border-t-transparent animate-spin" />
          <p className="text-gray-500 text-sm">Loading task...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-10 h-10 text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Something went wrong</h2>
          <p className="text-gray-500 mb-2">
            Failed to load this task. Please check your connection and try again.
          </p>
          <button onClick={() => { setLoading(true); setLoadError(false); setTask(null); window.location.reload(); }} className="btn-primary inline-flex">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-10 h-10 text-gray-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Task Not Found</h2>
          <p className="text-gray-500 mb-6">
            The task you&apos;re looking for doesn&apos;t exist or has been removed.
          </p>
          <Link href="/" className="btn-primary inline-flex">
            Browse Tasks
          </Link>
        </div>
      </div>
    );
  }

  // Lock Screen
  if (!unlocked) {
    return (
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="card p-8 sm:p-10 animate-fade-in text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 flex items-center justify-center mx-auto mb-6">
              <Lock className="w-8 h-8 text-[#8B5CF6]" />
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">Enter Access Code</h2>
            <p className="text-gray-500 mb-8">
              Enter the access code to view this task.
            </p>

            <div className="space-y-4 text-left">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">
                  Task ID
                </label>
                <input
                  type="text"
                  value={taskId}
                  readOnly
                  className="input-field bg-gray-100 text-gray-400 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">
                  Access Code
                </label>                  <input
                    type="text"
                    placeholder="Enter access code..."
                    value={accessCode}
                    onChange={e => {
                      setAccessCode(e.target.value);
                      setError('');
                    }}
                    onKeyDown={e => e.key === 'Enter' && handleUnlock()}
                    className="input-field tracking-widest font-mono uppercase"
                    autoFocus
                  />
              </div>

              {error && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <button
                onClick={handleUnlock}
                disabled={!accessCode.trim() || verifying}
                className="btn-primary w-full mt-2"
              >
                {verifying ? (
                  <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                ) : (
                  <>
                    <Unlock className="w-4 h-4" />
                    Unlock Task
                  </>
                )}
              </button>

              <p className="text-xs text-gray-400 text-center mt-4">
                Don&apos;t have an access code? Contact the task admin.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Unlocked Task Content
  return (
    <div className="flex-1">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Status Banner */}
        {task.status === 'assigned' && task.expiresAt && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/20 animate-fade-in flex items-center gap-3">
            <Clock className="w-5 h-5 text-[#F59E0B] flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[#F59E0B] font-medium">
                This task is assigned to you exclusively
              </p>
              <p className="text-xs text-[#F59E0B]/70">
                Time remaining: {getTimeRemainingDisplay()}
              </p>
            </div>
            <div className="flex-shrink-0">
              <Shield className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
        )}

        {/* Type Badge & Task ID */}
        <div className="flex items-center gap-3 mb-6 animate-fade-in">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
            task.type === 'comment'
              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          }`}>
            {task.type === 'comment' ? (
              <MessageCircle className="w-3 h-3" />
            ) : (
              <FileText className="w-3 h-3" />
            )}
            {task.type === 'comment' ? 'Comment Task' : 'Post Task'}
          </span>
          <span className="text-sm text-[#6B7280] font-mono">{task.taskId}</span>
          {task.assignedDiscordUsername && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#5865F2]/10 border border-[#5865F2]/20 text-xs text-[#5865F2] font-medium">
              <User className="w-3 h-3" />
              {task.assignedDiscordUsername}
            </span>
          )}
        </div>

        {/* Title & Payment */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 animate-slide-up">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">{task.title}</h1>
          <div className="flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex-shrink-0">
            <DollarSign className="w-6 h-6 text-emerald-400" />
            <span className="text-2xl font-bold text-emerald-400">{formatPayment(task.payment)}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Requirements */}
            {task.requirements && (
              <div className="card p-6 animate-fade-in">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-[#F59E0B]" />
                  Requirements
                </h2>
                <div className="prose prose-invert max-w-none">
                  <p className="text-gray-500 leading-relaxed whitespace-pre-wrap">{task.requirements}</p>
                </div>
              </div>
            )}

            {/* Instructions */}
            {task.instructions && (
              <div className="card p-6 animate-fade-in">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Instructions</h2>
                <p className="text-gray-500 leading-relaxed whitespace-pre-wrap">{task.instructions}</p>
              </div>
            )}

            {/* Comment Task Details */}
            {task.type === 'comment' && (
              <>
                {task.redditPostUrl && (
                  <div className="card p-6 animate-fade-in">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Reddit Post Link</h2>
                    <a
                      href={task.redditPostUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-[#8B5CF6] hover:text-[#A78BFA] transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      {task.redditPostUrl}
                    </a>
                  </div>
                )}

                {task.commentText && (
                  <div className="card p-6 animate-fade-in">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold text-gray-900">Comment to Post</h2>
                      <CopyButton text={task.commentText} label="Copy Comment" />
                    </div>
                    <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                      <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{task.commentText}</p>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Post Task Details */}
            {task.type === 'post' && (
              <>
                {task.targetSubreddits && (
                  <div className="card p-6 animate-fade-in">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Target Subreddit(s)</h2>
                    <p className="text-gray-500">{task.targetSubreddits}</p>
                  </div>
                )}

                {task.suggestedTitle && (
                  <div className="card p-6 animate-fade-in">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold text-gray-900">Suggested Title</h2>
                      <CopyButton text={task.suggestedTitle} label="Copy Title" />
                    </div>
                    <p className="text-gray-700">{task.suggestedTitle}</p>
                  </div>
                )}

                {task.suggestedBody && (
                  <div className="card p-6 animate-fade-in">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold text-gray-900">Suggested Body</h2>
                      <CopyButton text={task.suggestedBody} label="Copy Body" />
                    </div>
                    <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                      <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{task.suggestedBody}</p>
                    </div>
                  </div>
                )}

                {/* Images */}
                {task.images && task.images.length > 0 && (
                  <div className="card p-6 animate-fade-in">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Image className="w-5 h-5" />
                      Images
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {task.images.map((img, idx) => (
                        <div key={idx} className="relative aspect-video rounded-xl overflow-hidden bg-gray-100">
                          <img
                            src={img}
                            alt={`Uploaded image ${idx + 1} for this task`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Video */}
                {task.video && (
                  <div className="card p-6 animate-fade-in">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Video className="w-5 h-5" />
                      Video
                    </h2>
                    <div className="aspect-video rounded-xl overflow-hidden bg-gray-100">
                      <video controls className="w-full h-full">
                        <source src={task.video} />
                        Your browser does not support the video tag.
                      </video>
                    </div>
                  </div>
                )}
              </>
            )}


          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Claim Counter */}
            <div className="card p-5 animate-fade-in">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Task Slots</h3>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 flex items-center justify-center">
                    <User className="w-4 h-4 text-[#8B5CF6]" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-900">
                      {task.completedCount || 0}{task.maxCompletions ? `/${task.maxCompletions}` : ''}
                    </p>
                    <p className="text-xs text-gray-400">
                      {task.maxCompletions
                        ? `${task.maxCompletions - (task.completedCount || 0)} slot${task.maxCompletions - (task.completedCount || 0) !== 1 ? 's' : ''} remaining`
                        : 'Unlimited slots'}
                    </p>
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                  task.maxCompletions && (task.completedCount || 0) >= task.maxCompletions
                    ? 'bg-red-500/10 text-red-400'
                    : 'bg-emerald-500/10 text-emerald-400'
                }`}>
                  {task.maxCompletions && (task.completedCount || 0) >= task.maxCompletions
                    ? 'Full'
                    : 'Open'}
                </div>
              </div>
            </div>

            {/* Submit Section */}
            <div className="card p-6 sticky top-24 animate-fade-in">
              {submitted ? (
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Submitted Successfully!</h3>
                  <p className="text-gray-500 text-sm mb-4">
                    Save your reference ID to check your submission status and upload additional screenshots.
                  </p>
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 mb-4">
                    <CopyButton text={submitted.refId} label={`Copy: ${submitted.refId}`} />
                  </div>
                  {submitted.requiresMoreScreenshots && (
                    <div className="mb-4 p-3 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/20">
                      <p className="text-xs text-[#F59E0B] font-medium">
                        📸 This task requires additional screenshots. Use your Reference ID to upload them later.
                      </p>
                    </div>
                  )}
                  <Link href={`/status/${submitted.refId}`} className="text-[#8B5CF6] hover:text-[#A78BFA] text-sm font-medium transition-colors">
                    Open Submission Portal →
                  </Link>
                </div>
              ) : showSubmitForm ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Submit Your Work
                  </h3>
                  <p className="text-xs text-gray-400 mb-2">
                    You only need to submit the initial proof now. Additional screenshots can be uploaded later using your Reference ID.
                  </p>

                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-2">
                      Discord Username *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. user#1234"
                      value={discordUsername}
                      onChange={e => setDiscordUsername(e.target.value)}
                      className="input-field"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-2">
                      Reddit Post/Comment Permalink *
                    </label>
                    <input
                      type="url"
                      placeholder="https://reddit.com/r/.../comments/..."
                      value={proofLink}
                      onChange={e => setProofLink(e.target.value)}
                      className="input-field"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-2">
                      Initial Proof Screenshot {task.requiredScreenshots?.includes('initial') ? '*' : '(optional)'}
                    </label>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed border-gray-300 text-gray-500 hover:border-[#8B5CF6]/30 hover:text-[#8B5CF6] cursor-pointer transition-all flex-1">
                        <Upload className="w-4 h-4" />
                        <span className="text-sm">
                          {initialScreenshot ? initialScreenshot.name : 'Upload screenshot...'}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setInitialScreenshot(file);
                              setInitialScreenshotPreview(URL.createObjectURL(file));
                            }
                          }}
                          className="hidden"
                        />
                      </label>
                      {initialScreenshot && (
                        <button
                          type="button"
                          onClick={() => {
                            setInitialScreenshot(null);
                            setInitialScreenshotPreview(null);
                          }}
                          className="text-red-400 hover:text-red-300 text-sm"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    {initialScreenshotPreview && (
                      <div className="mt-2 relative w-32 h-24 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                        <img src={initialScreenshotPreview} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-2">
                      Optional Notes
                    </label>
                    <textarea
                      placeholder="Any additional information..."
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      className="textarea-field"
                      rows={2}
                    />
                  </div>

                  {submitError && (
                    <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      {submitError}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowSubmitForm(false)}
                      className="btn-secondary flex-1"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || uploading}
                      className="btn-primary flex-1"
                    >
                      {submitting || uploading ? (
                        <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Submit
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : task.maxCompletions && (task.completedCount || 0) >= task.maxCompletions ? (
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle className="w-8 h-8 text-red-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Task Full</h3>
                  <p className="text-gray-500 text-sm">
                    All {task.maxCompletions} slot{task.maxCompletions !== 1 ? 's' : ''} for this task {'have'} been filled.
                  </p>
                </div>
              ) : (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Ready to complete this task?
                  </h3>
                  <p className="text-gray-500 text-sm mb-6">
                    Submit your proof of completion to earn {formatPayment(task.payment)}.
                  </p>
                  <button
                    onClick={() => setShowSubmitForm(true)}
                    className="btn-primary w-full"
                  >
                    <Send className="w-4 h-4" />
                    Submit Task
                  </button>
                  <p className="text-xs text-gray-400 text-center mt-4">
                    You&apos;ll receive a unique reference ID after submission.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
