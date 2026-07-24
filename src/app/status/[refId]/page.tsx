'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { Submission } from '@/lib/types';
import { Clock, CheckCircle, XCircle, AlertTriangle, ArrowLeft } from 'lucide-react';

export default function SubmissionStatusPage() {
  const params = useParams();
  const refId = params.refId as string;

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { getSubmission } = await import('@/lib/store');
      const found = getSubmission(refId);
      setSubmission(found || null);
      setLoading(false);
    })();
  }, [refId]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-[#8B5CF6] border-t-transparent animate-spin" />
          <p className="text-[#9CA3AF] text-sm">Checking submission...</p>
        </div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="text-center max-w-md mx-auto">
          <div className="w-20 h-20 rounded-2xl bg-[#2A2A2A] flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-10 h-10 text-[#6B7280]" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Submission Not Found</h2>
          <p className="text-[#9CA3AF] mb-6">
            No submission was found with the Reference ID <span className="font-mono text-white">{refId}</span>.
            Please double-check your ID.
          </p>
          <Link href="/status" className="btn-primary inline-flex">
            <ArrowLeft className="w-4 h-4" />
            Try Again
          </Link>
        </div>
      </div>
    );
  }

  const statusConfig = {
    pending: {
      icon: Clock,
      color: 'text-[#F59E0B]',
      bg: 'bg-[#F59E0B]/10',
      border: 'border-[#F59E0B]/20',
      label: 'Pending Review',
      description: 'Your submission is waiting to be reviewed by the admin.',
    },
    approved: {
      icon: CheckCircle,
      color: 'text-[#10B981]',
      bg: 'bg-[#10B981]/10',
      border: 'border-[#10B981]/20',
      label: 'Approved',
      description: 'Congratulations! Your submission has been approved.',
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

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <Link
          href="/status"
          className="inline-flex items-center gap-2 text-[#9CA3AF] hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Check another status
        </Link>

        <div className="card p-8 sm:p-10 animate-fade-in">
          {/* Status Icon */}
          <div className="text-center mb-8">
            <div className={`w-20 h-20 rounded-full ${config.bg} border ${config.border} flex items-center justify-center mx-auto mb-4`}>
              <config.icon className={`w-10 h-10 ${config.color}`} />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">{config.label}</h1>
            <p className="text-[#9CA3AF]">{config.description}</p>
          </div>

          {/* Submission Details */}
          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-[#2A2A2A]">
              <span className="text-[#9CA3AF] text-sm">Reference ID</span>
              <span className="text-white font-mono font-medium">{submission.refId}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-[#2A2A2A]">
              <span className="text-[#9CA3AF] text-sm">Task ID</span>
              <span className="text-white font-mono">{submission.taskId}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-[#2A2A2A]">
              <span className="text-[#9CA3AF] text-sm">Discord Username</span>
              <span className="text-white">{submission.discordUsername}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-[#2A2A2A]">
              <span className="text-[#9CA3AF] text-sm">Payment</span>
              <span className="text-emerald-400 font-semibold">${submission.payment.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-[#2A2A2A]">
              <span className="text-[#9CA3AF] text-sm">Submitted</span>
              <span className="text-white text-sm">
                {new Date(submission.submittedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            {submission.proofLink && (
              <div className="flex justify-between items-center py-3 border-b border-[#2A2A2A]">
                <span className="text-[#9CA3AF] text-sm">Proof Link</span>
                <a
                  href={submission.proofLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#8B5CF6] hover:text-[#A78BFA] text-sm font-medium truncate max-w-[200px]"
                >
                  {submission.proofLink}
                </a>
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
              {submission.rejectionReason && (
                <p className="text-white text-sm mb-2">{submission.rejectionReason}</p>
              )}
              {submission.adminNote && (
                <div className="mt-3 pt-3 border-t border-red-500/10">
                  <p className="text-xs text-red-400/70 mb-1">Admin Note:</p>
                  <p className="text-[#D1D5DB] text-sm">{submission.adminNote}</p>
                </div>
              )}
            </div>
          )}

          {/* Approved Message */}
          {submission.status === 'approved' && (
            <div className="mt-6 p-5 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
              <p className="text-emerald-400 text-center font-medium">
                Congratulations! Your submission has been approved.
              </p>
            </div>
          )}

          {/* Pending Message */}
          {submission.status === 'pending' && (
            <div className="mt-6 p-5 rounded-xl bg-[#F59E0B]/5 border border-[#F59E0B]/20">
              <p className="text-[#F59E0B] text-center text-sm">
                Your submission is in the queue and will be reviewed shortly.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
