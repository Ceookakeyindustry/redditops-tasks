'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  Eye,
  EyeOff,
} from 'lucide-react';
import type { Task } from '@/lib/types';
import { generateAccessCode } from '@/lib/types';

export default function EditTaskPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.id as string;

  const [authenticated, setAuthenticated] = useState(false);
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form fields
  const [title, setTitle] = useState('');
  const [payment, setPayment] = useState('');
  const [requirements, setRequirements] = useState('');
  const [instructions, setInstructions] = useState('');
  const [maxCompletions, setMaxCompletions] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Access Code
  const [accessCode, setAccessCode] = useState('');
  const [accessCodeDisabled, setAccessCodeDisabled] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  // Comment-specific
  const [redditPostUrl, setRedditPostUrl] = useState('');
  const [commentText, setCommentText] = useState('');

  // Post-specific
  const [targetSubreddits, setTargetSubreddits] = useState('');
  const [suggestedTitle, setSuggestedTitle] = useState('');
  const [suggestedBody, setSuggestedBody] = useState('');

  useEffect(() => {
    const { isAdminAuthenticated, getTask } = require('@/lib/store');
    if (!isAdminAuthenticated()) {
      router.push('/admin/login');
      return;
    }
    setAuthenticated(true);

    const found = getTask(taskId);
    if (!found) {
      router.push('/admin/dashboard');
      return;
    }

    setTask(found);
    setTitle(found.title);
    setPayment(String(found.payment));
    setRequirements(found.requirements || '');
    setInstructions(found.instructions || '');
    setMaxCompletions(found.maxCompletions ? String(found.maxCompletions) : '');
    setIsActive(found.isActive);
    setAccessCode(found.accessCode);
    setAccessCodeDisabled(found.accessCodeDisabled);
    setRedditPostUrl(found.redditPostUrl || '');
    setCommentText(found.commentText || '');
    setTargetSubreddits(found.targetSubreddits || '');
    setSuggestedTitle(found.suggestedTitle || '');
    setSuggestedBody(found.suggestedBody || '');
    setLoading(false);
  }, [taskId, router]);

  const refreshAccessCode = () => {
    setAccessCode(generateAccessCode());
    setAccessCodeDisabled(false);
  };

  const copyAccessCode = () => {
    navigator.clipboard.writeText(accessCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      if (!title.trim()) {
        throw new Error('Task title is required.');
      }
      if (!payment || parseFloat(payment) <= 0) {
        throw new Error('Please enter a valid payment amount.');
      }

      const { updateTask } = require('@/lib/store');

      const updateData: any = {
        title: title.trim(),
        payment: parseFloat(payment),
        requirements: requirements.trim(),
        instructions: instructions.trim(),
        maxCompletions: maxCompletions ? parseInt(maxCompletions) : null,
        isActive,
        accessCode: accessCode.trim(),
        accessCodeDisabled,
      };

      if (task?.type === 'comment') {
        updateData.redditPostUrl = redditPostUrl.trim() || undefined;
        updateData.commentText = commentText.trim() || undefined;
      } else {
        updateData.targetSubreddits = targetSubreddits.trim() || undefined;
        updateData.suggestedTitle = suggestedTitle.trim() || undefined;
        updateData.suggestedBody = suggestedBody.trim() || undefined;
      }

      updateTask(taskId, updateData);
      setSuccess('Task updated successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to update task.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    const confirmed = window.confirm('Are you sure you want to delete this task? This action cannot be undone.');
    if (!confirmed) return;

    const { deleteTask } = require('@/lib/store');
    deleteTask(taskId);
    router.push('/admin/dashboard');
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-2 border-[#8B5CF6] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!authenticated || !task) return null;

  return (
    <div className="flex-1">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href="/admin/submissions"
          className="inline-flex items-center gap-2 text-[#9CA3AF] hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Submissions
        </Link>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Edit Task</h1>
            <p className="text-[#9CA3AF] mt-1 font-mono text-sm">{taskId}</p>
          </div>
          <div className="flex items-center gap-3">
            {isActive ? (
              <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Active
              </span>
            ) : (
              <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                Inactive
              </span>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Fields */}
          <div className="card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white mb-4">Basic Information</h2>

            <div>
              <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                Task Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="input-field"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                  Payment ($) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={payment}
                  onChange={e => setPayment(e.target.value)}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                  Max Completions
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="Unlimited"
                  value={maxCompletions}
                  onChange={e => setMaxCompletions(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                Requirements
              </label>
              <textarea
                value={requirements}
                onChange={e => setRequirements(e.target.value)}
                className="textarea-field"
                rows={4}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                Instructions
              </label>
              <textarea
                value={instructions}
                onChange={e => setInstructions(e.target.value)}
                className="textarea-field"
                rows={4}
              />
            </div>

            {/* Active Toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-[#2A2A2A] border border-[#2A2A2A]">
              <div>
                <p className="text-white font-medium">Task Active</p>
                <p className="text-[#9CA3AF] text-sm">Toggle whether this task is visible to users</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={e => setIsActive(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[#2A2A2A] rounded-full peer peer-checked:bg-[#8B5CF6] transition-colors peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
              </label>
            </div>
          </div>

          {/* Access Code */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Access Code</h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={refreshAccessCode}
                  className="btn-secondary px-3 py-2 text-sm"
                >
                  <RefreshCw className="w-3 h-3" />
                  Regenerate
                </button>
                <button
                  type="button"
                  onClick={copyAccessCode}
                  className="btn-secondary px-3 py-2 text-sm"
                >
                  {codeCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {codeCopied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            <input
              type="text"
              value={accessCode}
              onChange={e => setAccessCode(e.target.value)}
              className="input-field font-mono"
            />

            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={accessCodeDisabled}
                    onChange={e => setAccessCodeDisabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[#2A2A2A] rounded-full peer peer-checked:bg-red-500 transition-colors peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
                </label>
                <span className="text-sm text-[#9CA3AF]">Disable access code</span>
              </div>
            </div>
            <p className="text-xs text-[#6B7280] mt-2">
              Disabling the code will lock the task until a new code is set.
            </p>
          </div>

          {/* Comment-specific Fields */}
          {task.type === 'comment' && (
            <div className="card p-6 space-y-4">
              <h2 className="text-lg font-semibold text-white">Comment Task Details</h2>

              <div>
                <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                  Reddit Post URL
                </label>
                <input
                  type="url"
                  value={redditPostUrl}
                  onChange={e => setRedditPostUrl(e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                  Comment Text
                </label>
                <textarea
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  className="textarea-field"
                  rows={6}
                />
              </div>
            </div>
          )}

          {/* Post-specific Fields */}
          {task.type === 'post' && (
            <div className="card p-6 space-y-4">
              <h2 className="text-lg font-semibold text-white">Post Task Details</h2>

              <div>
                <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                  Target Subreddit(s)
                </label>
                <input
                  type="text"
                  value={targetSubreddits}
                  onChange={e => setTargetSubreddits(e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                  Suggested Post Title
                </label>
                <input
                  type="text"
                  value={suggestedTitle}
                  onChange={e => setSuggestedTitle(e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                  Suggested Body Text
                </label>
                <textarea
                  value={suggestedBody}
                  onChange={e => setSuggestedBody(e.target.value)}
                  className="textarea-field"
                  rows={6}
                />
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
              <Check className="w-4 h-4" />
              {success}
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={handleDelete}
              className="btn-danger"
            >
              Delete Task
            </button>
            <Link href="/admin/dashboard" className="btn-secondary flex-1">
              Cancel
            </Link>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? (
                <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
