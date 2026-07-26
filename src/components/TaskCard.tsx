'use client';

import Link from 'next/link';
import { MessageCircle, FileText, DollarSign, Users, Clock, User, Shield } from 'lucide-react';
import type { Task } from '@/lib/types';
import { formatPayment } from '@/lib/types';

interface TaskCardProps {
  task: Task;
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'available':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <Shield className="w-3 h-3" />
          Available
        </span>
      );
    case 'assigned':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
          <User className="w-3 h-3" />
          Assigned
        </span>
      );
    case 'submitted':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20">
          <Clock className="w-3 h-3" />
          Submitted
        </span>
      );
    case 'approved':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20">
          <Shield className="w-3 h-3" />
          Approved
        </span>
      );
    case 'expired':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
          <Clock className="w-3 h-3" />
          Expired
        </span>
      );
    default:
      return null;
  }
}

export default function TaskCard({ task }: TaskCardProps) {
  return (
    <Link href={`/task/${task.taskId}`}>
      <div className="card p-6 cursor-pointer group animate-fade-in h-full flex flex-col">
        {/* Type Badge & Status */}
        <div className="flex items-center justify-between mb-4">
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
          <div className="flex items-center gap-2">
            {getStatusBadge(task.status)}
            <span className="text-xs text-gray-400 font-mono">{task.taskId}</span>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-gray-900 mb-3 group-hover:text-[#8B5CF6] transition-colors duration-200 line-clamp-2">
          {task.title}
        </h3>

        {/* Payment & Assignment Info */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-semibold text-emerald-400">
              {formatPayment(task.payment)}
            </span>
          </div>
          {task.assignedDiscordUsername && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#5865F2]/10 border border-[#5865F2]/20">
              <User className="w-3.5 h-3.5 text-[#5865F2]" />
              <span className="text-xs font-medium text-[#5865F2]">{task.assignedDiscordUsername}</span>
            </div>
          )}
        </div>

        {/* Requirements Preview */}
        {task.requirements && (
          <p className="text-sm text-gray-400 line-clamp-2 mb-4 flex-grow">
            {task.requirements}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center gap-4 pt-4 border-t border-gray-200 mt-auto">
          {task.maxCompletions && (
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <Users className="w-3.5 h-3.5" />
              <span>{task.completedCount || 0}/{task.maxCompletions}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-xs text-[#6B7280] ml-auto">
            <Clock className="w-3.5 h-3.5" />
            <span>{new Date(task.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Hover Glow */}
        <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#8B5CF6]/0 via-[#8B5CF6]/5 to-[#8B5CF6]/0" />
        </div>
      </div>
    </Link>
  );
}
