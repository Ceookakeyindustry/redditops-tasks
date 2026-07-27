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
  Globe,
  Lock,
  Camera,
  Upload,
  X,
} from 'lucide-react';
import type { Task, ScreenshotType } from '@/lib/types';
import { generateAccessCode, ALL_SCREENSHOT_TYPES, SCREENSHOT_TYPE_LABELS } from '@/lib/types';

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

  // Access mode & screenshot requirements
  const [isPublic, setIsPublic] = useState(false);
  const [requiredScreenshots, setRequiredScreenshots] = useState<ScreenshotType[]>(['initial']);

  // Comment-specific
  const [redditPostUrl, setRedditPostUrl] = useState('');
  const [commentText, setCommentText] = useState('');

  // Post-specific
  const [targetSubreddits, setTargetSubreddits] = useState('');
  const [suggestedTitle, setSuggestedTitle] = useState('');
  const [suggestedBody, setSuggestedBody] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [video, setVideo] = useState('');

  useEffect(() => {
    (async () => {
      const { isAdminAuthenticated, getTask } = await import('@/lib/store');
      if (!isAdminAuthenticated()) {
        router.push('/admin/login');
        return;
      }
      setAuthenticated(true);

      const found = await getTask(taskId);
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
      setIsPublic(found.isPublic ?? false);
      setRequiredScreenshots(found.requiredScreenshots || ['initial']);
      setRedditPostUrl(found.redditPostUrl || '');
      setCommentText(found.commentText || '');
      setTargetSubreddits(found.targetSubreddits || '');
      setSuggestedTitle(found.suggestedTitle || '');
      setSuggestedBody(found.suggestedBody || '');
      setImages(found.images || []);
      setVideo(found.video || '');
      setLoading(false);
    })();
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

      const { updateTask } = await import('@/lib/store');

      const updateData: any = {
        title: title.trim(),
        payment: parseFloat(payment),
        requirements: requirements.trim(),
        instructions: instructions.trim(),
        maxCompletions: maxCompletions ? parseInt(maxCompletions) : null,
        isActive,
        accessCode: accessCode.trim(),
        accessCodeDisabled,
        isPublic,
        requiredScreenshots,
        redditPostUrl: task?.type === 'comment' ? (redditPostUrl.trim() || undefined) : undefined,
        commentText: task?.type === 'comment' ? (commentText.trim() || undefined) : undefined,
        targetSubreddits: task?.type === 'post' ? (targetSubreddits.trim() || undefined) : undefined,
        suggestedTitle: task?.type === 'post' ? (suggestedTitle.trim() || undefined) : undefined,
        suggestedBody: task?.type === 'post' ? (suggestedBody.trim() || undefined) : undefined,
        images: task?.type === 'post' ? (images.length > 0 ? images : undefined) : undefined,
        video: task?.type === 'post' ? (video || undefined) : undefined,
      };

      await updateTask(taskId, updateData);
      setSuccess('Task updated successfully!');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update task.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    const confirmed = window.confirm('Are you sure you want to delete this task? This action cannot be undone.');
    if (!confirmed) return;

    (async () => {
      const { deleteTask } = await import('@/lib/store');
      await deleteTask(taskId);
      router.push('/admin/dashboard');
    })();
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
          href="/admin/dashboard"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Edit Task</h1>
            <p className="text-gray-500 mt-1 font-mono text-sm">{taskId}</p>
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
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
              isPublic
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20'
            }`}>
              {isPublic ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
              {isPublic ? 'Public' : 'Protected'}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Fields */}
          <div className="card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">
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
                <label className="block text-sm font-medium text-gray-500 mb-2">
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
                <label className="block text-sm font-medium text-gray-500 mb-2">
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
              <label className="block text-sm font-medium text-gray-500 mb-2">
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
              <label className="block text-sm font-medium text-gray-500 mb-2">
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
            <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-200">
              <div>
                <p className="text-gray-900 font-medium">Task Active</p>
                <p className="text-gray-500 text-sm">Toggle whether this task is visible to users</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={e => setIsActive(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-[#8B5CF6] transition-colors peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
              </label>
            </div>
          </div>

          {/* Access Mode */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Task Access</h2>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setIsPublic(false)}
                className={`p-5 rounded-xl border-2 text-left transition-all duration-200 ${
                  !isPublic
                    ? 'border-[#8B5CF6] bg-[#8B5CF6]/5'
                    : 'border-gray-200 bg-transparent hover:border-[#8B5CF6]/30'
                }`}
              >
                <div className="w-10 h-10 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/20 flex items-center justify-center mb-3">
                  <Lock className="w-5 h-5 text-[#F59E0B]" />
                </div>
                <h3 className="text-gray-900 font-semibold mb-1">Protected</h3>
                <p className="text-gray-500 text-xs">Access code required to view task</p>
              </button>
              <button
                type="button"
                onClick={() => setIsPublic(true)}
                className={`p-5 rounded-xl border-2 text-left transition-all duration-200 ${
                  isPublic
                    ? 'border-emerald-500 bg-emerald-500/5'
                    : 'border-gray-200 bg-transparent hover:border-emerald-500/30'
                }`}
              >
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-3">
                  <Globe className="w-5 h-5 text-emerald-400" />
                </div>
                <h3 className="text-gray-900 font-semibold mb-1">Public</h3>
                <p className="text-gray-500 text-xs">Anyone with the link can view</p>
              </button>
            </div>
          </div>

          {/* Screenshot Requirements */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Camera className="w-5 h-5 text-[#8B5CF6]" />
              Required Proof Screenshots
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Select which screenshots workers must upload. Initial is always required for first submission.
            </p>
            <div className="space-y-3">
              {ALL_SCREENSHOT_TYPES.map(type => (
                <label
                  key={type}
                  className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all ${
                    requiredScreenshots.includes(type)
                      ? 'bg-[#8B5CF6]/5 border border-[#8B5CF6]/20'
                      : 'bg-gray-100 border border-gray-200 hover:border-[#8B5CF6]/30'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={requiredScreenshots.includes(type)}
                    onChange={e => {
                      if (e.target.checked) {
                        setRequiredScreenshots(prev => [...prev, type]);
                      } else {
                        setRequiredScreenshots(prev => prev.filter(t => t !== type));
                      }
                    }}
                    className="rounded border-gray-300 text-[#8B5CF6] focus:ring-[#8B5CF6]"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900">
                      {SCREENSHOT_TYPE_LABELS[type]}
                    </span>
                    <p className="text-xs text-gray-400">
                      {type === 'initial' ? 'Required for initial submission' : 'Can be uploaded later via the submission portal'}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Access Code */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Access Code</h2>
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
                <span className="text-sm text-gray-500">Disable access code</span>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Disabling the code will lock the task until a new code is set.
            </p>
          </div>

          {/* Comment-specific Fields */}
          {task.type === 'comment' && (
            <div className="card p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Comment Task Details</h2>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">
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
                <label className="block text-sm font-medium text-gray-500 mb-2">
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
              <h2 className="text-lg font-semibold text-gray-900">Post Task Details</h2>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">
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
                <label className="block text-sm font-medium text-gray-500 mb-2">
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
                <label className="block text-sm font-medium text-gray-500 mb-2">
                  Suggested Body Text
                </label>
                <textarea
                  value={suggestedBody}
                  onChange={e => setSuggestedBody(e.target.value)}
                  className="textarea-field"
                  rows={6}
                />
              </div>

              {/* Images */}
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">
                  Images
                </label>
                <div className="flex flex-wrap gap-3 mb-3">
                  {images.map((img, idx) => (
                    <div key={idx} className="relative w-24 h-24 rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                      <img src={img} alt={`Image preview ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setImages(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70 transition-colors"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
                <label className="flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed border-gray-200 text-gray-400 hover:border-[#8B5CF6]/30 hover:text-[#8B5CF6] cursor-pointer transition-all">
                  <Upload className="w-4 h-4" />
                  <span className="text-sm">Upload Images</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={e => {
                      const files = e.target.files;
                      if (!files) return;
                      Array.from(files).forEach(file => {
                        const url = URL.createObjectURL(file);
                        setImages(prev => [...prev, url]);
                      });
                    }}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Video */}
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">
                  Video (optional)
                </label>
                {video && (
                  <div className="mb-3 relative w-full max-w-xs aspect-video rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                    <video controls className="w-full h-full">
                      <source src={video} />
                    </video>
                    <button
                      type="button"
                      onClick={() => setVideo('')}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70 transition-colors"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                )}
                <label className="flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed border-gray-200 text-gray-400 hover:border-[#8B5CF6]/30 hover:text-[#8B5CF6] cursor-pointer transition-all">
                  <Upload className="w-4 h-4" />
                  <span className="text-sm">Upload Video</span>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const url = URL.createObjectURL(file);
                      setVideo(url);
                    }}
                    className="hidden"
                  />
                </label>
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
