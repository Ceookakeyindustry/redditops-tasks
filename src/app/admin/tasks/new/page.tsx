'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  MessageCircle,
  FileText,
  AlertTriangle,
  Upload,
  X,
  RefreshCw,
  Copy,
  Check,
  Globe,
  Lock,
  Camera,
} from 'lucide-react';
import { generateAccessCode, ALL_SCREENSHOT_TYPES, SCREENSHOT_TYPE_LABELS } from '@/lib/types';
import type { ScreenshotType } from '@/lib/types';

export default function NewTaskPage() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [taskType, setTaskType] = useState<'comment' | 'post'>('comment');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Form fields
  const [title, setTitle] = useState('');
  const [payment, setPayment] = useState('');
  const [requirements, setRequirements] = useState('');
  const [instructions, setInstructions] = useState('');
  const [maxCompletions, setMaxCompletions] = useState('');

  // Access Code
  const [accessCode, setAccessCode] = useState(generateAccessCode());
  const [useCustomCode, setUseCustomCode] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  // Task ID options
  const [useCustomTaskId, setUseCustomTaskId] = useState(false);
  const [customTaskId, setCustomTaskId] = useState('');

  // Access mode
  const [isPublic, setIsPublic] = useState(false);

  // Screenshot requirements
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
      const { isAdminAuthenticated } = await import('@/lib/store');
      if (!isAdminAuthenticated()) {
        router.push('/admin/login');
        return;
      }
      setAuthenticated(true);
    })();
  }, [router]);

  const refreshAccessCode = () => {
    setAccessCode(generateAccessCode());
    setUseCustomCode(false);
  };

  const copyAccessCode = () => {
    navigator.clipboard.writeText(accessCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    // In a real app, upload to a storage service and get URLs
    // For now, create object URLs
    Array.from(files).forEach(file => {
      const url = URL.createObjectURL(file);
      setImages(prev => [...prev, url]);
    });
  };

  const removeImage = (idx: number) => {
    setImages(prev => prev.filter((_, i) => i !== idx));
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setVideo(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      if (!title.trim()) {
        throw new Error('Task title is required.');
      }
      if (!payment || parseFloat(payment) <= 0) {
        throw new Error('Please enter a valid payment amount.');
      }

      const { createTask } = await import('@/lib/store');

      const taskData: any = {
        title: title.trim(),
        type: taskType,
        payment: parseFloat(payment),
        requirements: requirements.trim(),
        instructions: instructions.trim(),
        maxCompletions: maxCompletions ? parseInt(maxCompletions) : null,
        isActive: true,
        accessCode: accessCode.trim(),
        accessCodeDisabled: false,
        isPublic,
        requiredScreenshots,
        redditPostUrl: taskType === 'comment' ? (redditPostUrl.trim() || undefined) : undefined,
        commentText: taskType === 'comment' ? (commentText.trim() || undefined) : undefined,
        targetSubreddits: taskType === 'post' ? (targetSubreddits.trim() || undefined) : undefined,
        suggestedTitle: taskType === 'post' ? (suggestedTitle.trim() || undefined) : undefined,
        suggestedBody: taskType === 'post' ? (suggestedBody.trim() || undefined) : undefined,
        images: taskType === 'post' ? (images.length > 0 ? images : undefined) : undefined,
        video: taskType === 'post' ? (video || undefined) : undefined,
      };

      // Add custom task ID if provided
      if (useCustomTaskId && customTaskId.trim()) {
        taskData.taskId = customTaskId.trim();
      }

      const newTask = await createTask(taskData);

      router.push('/admin/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create task.');
    } finally {
      setSaving(false);
    }
  };

  if (!authenticated) return null;

  return (
    <div className="flex-1">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Link
          href="/admin/dashboard"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8">Create New Task</h1>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Task Type Selection */}
          <div className="card p-6">
            <label className="block text-sm font-medium text-gray-500 mb-4">
              Task Type
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setTaskType('comment')}
                className={`p-5 rounded-xl border-2 text-left transition-all duration-200 ${
                  taskType === 'comment'
                    ? 'border-[#8B5CF6] bg-[#8B5CF6]/5'
                    : 'border-[#2A2A2A] bg-transparent hover:border-[#8B5CF6]/30'
                }`}
              >
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-3">
                  <MessageCircle className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="text-gray-900 font-semibold mb-1">Comment Task</h3>
                <p className="text-gray-500 text-xs">Users post a comment on a Reddit post</p>
              </button>
              <button
                type="button"
                onClick={() => setTaskType('post')}
                className={`p-5 rounded-xl border-2 text-left transition-all duration-200 ${
                  taskType === 'post'
                    ? 'border-[#8B5CF6] bg-[#8B5CF6]/5'
                    : 'border-[#2A2A2A] bg-transparent hover:border-[#8B5CF6]/30'
                }`}
              >
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-3">
                  <FileText className="w-5 h-5 text-emerald-400" />
                </div>
                <h3 className="text-gray-900 font-semibold mb-1">Post Task</h3>
                <p className="text-gray-500 text-xs">Users create a new Reddit post</p>
              </button>
            </div>
          </div>

          {/* Basic Fields */}
          <div className="card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">
                Task Title *
              </label>
              <input
                type="text"
                placeholder="e.g. Comment on r/Example post about topic"
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
                  placeholder="2.50"
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
                placeholder="e.g. Account must be older than 30 days. Minimum 100 karma. Do not delete the post for 48 hours."
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
                placeholder="Detailed instructions for completing this task..."
                value={instructions}
                onChange={e => setInstructions(e.target.value)}
                className="textarea-field"
                rows={4}
              />
            </div>
          </div>

          {/* Access Code */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Access Code</h2>
              <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useCustomCode}
                  onChange={e => {
                    setUseCustomCode(e.target.checked);
                    if (!e.target.checked) {
                      setAccessCode(generateAccessCode());
                    }
                  }}
                  className="rounded border-[#2A2A2A] bg-[#181818] text-[#8B5CF6] focus:ring-[#8B5CF6]"
                />
                Custom code
              </label>
            </div>

            <div className="flex gap-3">
              <input
                type="text"
                value={accessCode}
                onChange={e => {
                  setAccessCode(e.target.value);
                  setUseCustomCode(true);
                }}
                className="input-field font-mono flex-1"
                placeholder="Enter or generate access code"
              />
              <button
                type="button"
                onClick={refreshAccessCode}
                className="btn-secondary px-4"
                title="Generate new code"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={copyAccessCode}
                className="btn-secondary px-4"
                title="Copy code"
              >
                {codeCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Users must enter this case-sensitive code to view the task (if protected).
            </p>
          </div>

          {/* Task ID Options */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Task ID</h2>
              <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useCustomTaskId}
                  onChange={e => setUseCustomTaskId(e.target.checked)}
                  className="rounded border-[#2A2A2A] bg-[#181818] text-[#8B5CF6] focus:ring-[#8B5CF6]"
                />
                Custom ID
              </label>
            </div>
            {useCustomTaskId ? (
              <div>
                <input
                  type="text"
                  placeholder="e.g. CLIENT-001, JULY-POST-15, PROMO-2026-07"
                  value={customTaskId}
                  onChange={e => setCustomTaskId(e.target.value)}
                  className="input-field font-mono"
                />
                <p className="text-xs text-gray-400 mt-2">
                  Must be unique. Leave empty for auto-generated ID (ROT-xxxxx).
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                Auto-generated: <span className="font-mono text-[#8B5CF6]">ROT-xxxxx</span>
              </p>
            )}
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
              Select which screenshots workers must upload. The first submission only requires the initial screenshot.
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
            <p className="text-xs text-gray-400 mt-3">
              <span className="text-emerald-400">Initial screenshot</span> is always required and is part of the first submission.
            </p>
          </div>

          {/* Comment-specific Fields */}
          {taskType === 'comment' && (
            <div className="card p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Comment Task Details</h2>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">
                  Reddit Post URL
                </label>
                <input
                  type="url"
                  placeholder="https://reddit.com/r/example/comments/..."
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
                  placeholder="The exact comment users must copy and paste..."
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  className="textarea-field"
                  rows={6}
                />
              </div>
            </div>
          )}

          {/* Post-specific Fields */}
          {taskType === 'post' && (
            <div className="card p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Post Task Details</h2>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">
                  Target Subreddit(s)
                </label>
                <input
                  type="text"
                  placeholder="r/Example, r/AnotherSub"
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
                  placeholder="Optional suggested title"
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
                  placeholder="Optional suggested body text..."
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
                    <div key={idx} className="relative w-24 h-24 rounded-xl overflow-hidden bg-[#2A2A2A]">
                      <img src={img} alt={`Image preview ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70 transition-colors"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
                <label className="flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed border-[#2A2A2A] text-[#9CA3AF] hover:border-[#8B5CF6]/30 hover:text-[#8B5CF6] cursor-pointer transition-all">
                  <Upload className="w-4 h-4" />
                  <span className="text-sm">Upload Images</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
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
                  <div className="mb-3 relative w-full max-w-xs aspect-video rounded-xl overflow-hidden bg-[#2A2A2A]">
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
                <label className="flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed border-[#2A2A2A] text-[#9CA3AF] hover:border-[#8B5CF6]/30 hover:text-[#8B5CF6] cursor-pointer transition-all">
                  <Upload className="w-4 h-4" />
                  <span className="text-sm">Upload Video</span>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleVideoUpload}
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

          <div className="flex gap-4 pt-4">
            <Link href="/admin/dashboard" className="btn-secondary flex-1">
              Cancel
            </Link>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? (
                <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Create Task
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
