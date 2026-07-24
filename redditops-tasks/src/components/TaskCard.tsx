'use client';

import Link from 'next/link';
import { MessageCircle, FileText, DollarSign, Users, Clock } from 'lucide-react';
import type { Task } from '@/lib/types';
import { formatPayment } from '@/lib/types';

interface TaskCardProps {
  task: Task;
}

export default function TaskCard({ task }: TaskCardProps) {
  return (
    <Link href={`/task/${task.taskId}`}>
      <div className="card p-6 cursor-pointer group animate-fade-in h-full flex flex-col">
        {/* Type Badge */}
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
          <span className="text-xs text-[#6B7280] font-mono">{task.taskId}</span>
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-white mb-3 group-hover:text-[#8B5CF6] transition-colors duration-200 line-clamp-2">
          {task.title}
        </h3>

        {/* Payment */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-semibold text-emerald-400">
              Earn {formatPayment(task.payment)}
            </span>
          </div>
        </div>

        {/* Requirements Preview */}
        {task.requirements && (
          <p className="text-sm text-[#6B7280] line-clamp-2 mb-4 flex-grow">
            {task.requirements}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center gap-4 pt-4 border-t border-[#2A2A2A] mt-auto">
          {task.maxCompletions && (
            <div className="flex items-center gap-1.5 text-xs text-[#6B7280]">
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
