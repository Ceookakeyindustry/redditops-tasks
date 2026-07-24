'use client';

import { useState, useEffect, useMemo } from 'react';
import TaskCard from '@/components/TaskCard';
import type { Task } from '@/lib/types';
import { Search, ArrowUpDown, MessageCircle, FileText, Sparkles } from 'lucide-react';

export default function HomePage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'comment' | 'post'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'highest'>('newest');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { getTasks } = await import('@/lib/store');
      setTasks(getTasks().filter((t: Task) => t.isActive));
      setLoading(false);
    })();
  }, []);

  const filteredTasks = useMemo(() => {
    let result = [...tasks];

    // Apply type filter
    if (filterType === 'comment') {
      result = result.filter(t => t.type === 'comment');
    } else if (filterType === 'post') {
      result = result.filter(t => t.type === 'post');
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        t =>
          t.title.toLowerCase().includes(query) ||
          t.taskId.toLowerCase().includes(query) ||
          (t.requirements && t.requirements.toLowerCase().includes(query))
      );
    }

    // Apply sort
    result.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else {
        return b.payment - a.payment;
      }
    });

    return result;
  }, [tasks, searchQuery, filterType, sortBy]);

  return (
    <div className="flex-1">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-[#2A2A2A]">
        <div className="absolute inset-0 bg-gradient-to-b from-[#8B5CF6]/5 to-transparent pointer-events-none" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#8B5CF6]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 text-[#8B5CF6] text-sm font-medium mb-6 animate-fade-in">
              <Sparkles className="w-4 h-4" />
              Complete Reddit Tasks & Earn
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 animate-slide-up">
              Browse{' '}
              <span className="gradient-text">Available Tasks</span>
            </h1>
            <p className="text-lg text-[#9CA3AF] mb-8 animate-fade-in">
              Find Reddit marketing tasks, complete them, and get paid. No account needed — just submit your proof.
            </p>
          </div>
        </div>
      </section>

      {/* Filters Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="glass rounded-2xl p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B7280]" />
              <input
                type="text"
                placeholder="Search tasks by title or ID..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="input-field pl-12"
              />
            </div>

            {/* Type Filter */}
            <div className="flex gap-2">
              <button
                onClick={() => setFilterType('all')}
                className={`px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  filterType === 'all'
                    ? 'bg-[#8B5CF6] text-white'
                    : 'bg-[#2A2A2A] text-[#9CA3AF] hover:text-white'
                }`}
              >
                All Tasks
              </button>
              <button
                onClick={() => setFilterType('comment')}
                className={`px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 inline-flex items-center gap-2 ${
                  filterType === 'comment'
                    ? 'bg-blue-500 text-white'
                    : 'bg-[#2A2A2A] text-[#9CA3AF] hover:text-white'
                }`}
              >
                <MessageCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Comment</span>
              </button>
              <button
                onClick={() => setFilterType('post')}
                className={`px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 inline-flex items-center gap-2 ${
                  filterType === 'post'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-[#2A2A2A] text-[#9CA3AF] hover:text-white'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Post</span>
              </button>
            </div>

            {/* Sort */}
            <button
              onClick={() => setSortBy(sortBy === 'newest' ? 'highest' : 'newest')}
              className="px-4 py-3 rounded-xl bg-[#2A2A2A] text-[#9CA3AF] hover:text-white text-sm font-medium transition-all duration-200 inline-flex items-center gap-2"
            >
              <ArrowUpDown className="w-4 h-4" />
              {sortBy === 'newest' ? 'Newest' : 'Highest Paying'}
            </button>
          </div>
        </div>
      </section>

      {/* Tasks Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="card p-6">
                <div className="shimmer h-5 w-24 rounded-full mb-4" />
                <div className="shimmer h-6 w-full rounded-lg mb-3" />
                <div className="shimmer h-5 w-20 rounded-lg mb-4" />
                <div className="shimmer h-4 w-full rounded mb-2" />
                <div className="shimmer h-4 w-3/4 rounded mb-4" />
                <div className="shimmer h-px w-full rounded mb-4" />
                <div className="shimmer h-4 w-32 rounded" />
              </div>
            ))}
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-2xl bg-[#2A2A2A] flex items-center justify-center mx-auto mb-6">
              <Search className="w-10 h-10 text-[#6B7280]" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No tasks found</h3>
            <p className="text-[#9CA3AF]">
              {tasks.length === 0
                ? 'No tasks are available yet. Check back later!'
                : 'Try adjusting your search or filters.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTasks.map((task, index) => (
              <div key={task.id} style={{ animationDelay: `${index * 100}ms` }}>
                <TaskCard task={task} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
