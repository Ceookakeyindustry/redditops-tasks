'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import type { Task } from '@/lib/types';
import { formatPayment } from '@/lib/types';
import { Lock, Unlock, Copy, Check, AlertTriangle, Send, MessageCircle, FileText, DollarSign, ExternalLink, Image, Video } from 'lucide-react';
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

  // Submission form
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [discordUsername, setDiscordUsername] = useState('');
  const [proofLink, setProofLink] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<{ refId: string } | null>(null);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    const { getTasks } = require('@/lib/store');
    const found = getTasks().find((t: Task) => t.taskId === taskId);
    setTask(found || null);
    setLoading(false);
  }, [taskId]);

  const handleUnlock = async () => {
    if (!task) return;
    const isSuccess = accessCode === task.accessCode && !task.accessCodeDisabled;

    // Log via API for proper IP tracking
    try {
      await fetch('/api/log-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, success: isSuccess }),
      });
    } catch {
      // Fallback to local log
      const { logAccess } = require('@/lib/store');
      logAccess(taskId, 'unknown', isSuccess);
    }

    if (isSuccess) {
      setUnlocked(true);
      setError('');
    } else {
      setError('Invalid Task ID or Access Code.');
    }
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
      const { createSubmission } = require('@/lib/store');
      const submission = createSubmission({
        taskId: task.taskId,
        discordUsername: discordUsername.trim(),
        proofLink: proofLink.trim(),
        note: note.trim() || undefined,
        payment: task.payment,
        rejectionReason: undefined,
        adminNote: undefined,
      });

      // Sync with Google Sheets
      try {
        await fetch('/api/sheets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'addSubmission', data: submission }),
        });
      } catch {}

      setSubmitted({ refId: submission.refId });
      setShowSubmitForm(false);
    } catch (err) {
      setSubmitError('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-[#8B5CF6] border-t-transparent animate-spin" />
          <p className="text-[#9CA3AF] text-sm">Loading task...</p>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-20 h-20 rounded-2xl bg-[#2A2A2A] flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-10 h-10 text-[#6B7280]" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Task Not Found</h2>
          <p className="text-[#9CA3AF] mb-6">
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

            <h2 className="text-2xl font-bold text-white mb-2">Task Locked</h2>
            <p className="text-[#9CA3AF] mb-8">
              Enter the Task ID and Access Code to view this task.
            </p>

            <div className="space-y-4 text-left">
              <div>
                <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                  Task ID
                </label>
                <input
                  type="text"
                  value={taskId}
                  readOnly
                  className="input-field bg-[#2A2A2A] text-[#9CA3AF] cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                  Access Code
                </label>
                <input
                  type="text"
                  placeholder="Enter access code..."
                  value={accessCode}
                  onChange={e => {
                    setAccessCode(e.target.value);
                    setError('');
                  }}
                  onKeyDown={e => e.key === 'Enter' && handleUnlock()}
                  className="input-field"
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
                disabled={!accessCode.trim()}
                className="btn-primary w-full mt-2"
              >
                <Unlock className="w-4 h-4" />
                Unlock Task
              </button>
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
        </div>

        {/* Title & Payment */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 animate-slide-up">
          <h1 className="text-3xl sm:text-4xl font-bold text-white">{task.title}</h1>
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
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-[#F59E0B]" />
                  Requirements
                </h2>
                <div className="prose prose-invert max-w-none">
                  <p className="text-[#9CA3AF] leading-relaxed whitespace-pre-wrap">{task.requirements}</p>
                </div>
              </div>
            )}

            {/* Instructions */}
            {task.instructions && (
              <div className="card p-6 animate-fade-in">
                <h2 className="text-lg font-semibold text-white mb-4">Instructions</h2>
                <p className="text-[#9CA3AF] leading-relaxed whitespace-pre-wrap">{task.instructions}</p>
              </div>
            )}

            {/* Comment Task Details */}
            {task.type === 'comment' && (
              <>
                {task.redditPostUrl && (
                  <div className="card p-6 animate-fade-in">
                    <h2 className="text-lg font-semibold text-white mb-4">Reddit Post</h2>
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
                      <h2 className="text-lg font-semibold text-white">Comment to Post</h2>
                      <CopyButton text={task.commentText} label="Copy Comment" />
                    </div>
                    <div className="p-4 rounded-xl bg-[#2A2A2A] border border-[#2A2A2A]">
                      <p className="text-[#D1D5DB] leading-relaxed whitespace-pre-wrap">{task.commentText}</p>
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
                    <h2 className="text-lg font-semibold text-white mb-4">Target Subreddit(s)</h2>
                    <p className="text-[#9CA3AF]">{task.targetSubreddits}</p>
                  </div>
                )}

                {task.suggestedTitle && (
                  <div className="card p-6 animate-fade-in">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold text-white">Suggested Title</h2>
                      <CopyButton text={task.suggestedTitle} label="Copy Title" />
                    </div>
                    <p className="text-[#D1D5DB]">{task.suggestedTitle}</p>
                  </div>
                )}

                {task.suggestedBody && (
                  <div className="card p-6 animate-fade-in">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold text-white">Suggested Body</h2>
                      <CopyButton text={task.suggestedBody} label="Copy Body" />
                    </div>
                    <div className="p-4 rounded-xl bg-[#2A2A2A] border border-[#2A2A2A]">
                      <p className="text-[#D1D5DB] leading-relaxed whitespace-pre-wrap">{task.suggestedBody}</p>
                    </div>
                  </div>
                )}

                {/* Images */}
                {task.images && task.images.length > 0 && (
                  <div className="card p-6 animate-fade-in">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <Image className="w-5 h-5" />
                      Images
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {task.images.map((img, idx) => (
                        <div key={idx} className="relative aspect-video rounded-xl overflow-hidden bg-[#2A2A2A]">
                          <img
                            src={img}
                            alt={`Task image ${idx + 1}`}
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
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <Video className="w-5 h-5" />
                      Video
                    </h2>
                    <div className="aspect-video rounded-xl overflow-hidden bg-[#2A2A2A]">
                      <video controls className="w-full h-full">
                        <source src={task.video} />
                        Your browser does not support the video tag.
                      </video>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Completions Counter */}
            {task.maxCompletions && (
              <div className="card p-6 animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-[#9CA3AF]">Completions</span>
                  <span className="text-white font-semibold">
                    {task.completedCount || 0} / {task.maxCompletions}
                  </span>
                </div>
                <div className="mt-3 w-full bg-[#2A2A2A] rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] transition-all duration-500"
                    style={{ width: `${Math.min(((task.completedCount || 0) / task.maxCompletions) * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Submit Section */}
            <div className="card p-6 sticky top-24 animate-fade-in">
              {submitted ? (
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Submitted Successfully!</h3>
                  <p className="text-[#9CA3AF] text-sm mb-4">
                    Save your reference ID to check your submission status.
                  </p>
                  <div className="p-3 rounded-xl bg-[#2A2A2A] border border-[#2A2A2A] mb-4">
                    <CopyButton text={submitted.refId} label={`Copy: ${submitted.refId}`} />
                  </div>
                  <Link href={`/status/${submitted.refId}`} className="text-[#8B5CF6] hover:text-[#A78BFA] text-sm font-medium transition-colors">
                    Check Submission Status →
                  </Link>
                </div>
              ) : showSubmitForm ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <h3 className="text-lg font-semibold text-white mb-4">
                    Submit Your Work
                  </h3>

                  <div>
                    <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
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
                    <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                      Reddit Proof Link *
                    </label>
                    <input
                      type="url"
                      placeholder="https://reddit.com/..."
                      value={proofLink}
                      onChange={e => setProofLink(e.target.value)}
                      className="input-field"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                      Optional Note
                    </label>
                    <textarea
                      placeholder="Any additional information..."
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      className="textarea-field"
                      rows={3}
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
                      disabled={submitting}
                      className="btn-primary flex-1"
                    >
                      {submitting ? (
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
              ) : (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Ready to complete this task?
                  </h3>
                  <p className="text-[#9CA3AF] text-sm mb-6">
                    Submit your proof of completion to earn {formatPayment(task.payment)}.
                  </p>
                  <button
                    onClick={() => setShowSubmitForm(true)}
                    className="btn-primary w-full"
                  >
                    <Send className="w-4 h-4" />
                    Submit Task
                  </button>
                  <p className="text-xs text-[#6B7280] text-center mt-4">
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
