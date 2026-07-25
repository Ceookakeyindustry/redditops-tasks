'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ArrowRight, ClipboardList } from 'lucide-react';

export default function StatusPage() {
  const router = useRouter();
  const [refId, setRefId] = useState('');
  const [error, setError] = useState('');

  const handleCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!refId.trim()) {
      setError('Please enter your Reference ID.');
      return;
    }
    router.push(`/status/${refId.trim().toUpperCase()}`);
  };

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="card p-8 sm:p-10 animate-fade-in">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 flex items-center justify-center mx-auto mb-6">
              <ClipboardList className="w-8 h-8 text-[#8B5CF6]" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
              Check Submission Status
            </h1>
            <p className="text-gray-500">
              Enter your Reference ID to check the status of your task submission.
            </p>
          </div>

          <form onSubmit={handleCheck} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">
                Reference ID
              </label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="e.g. ROT-823741"
                  value={refId}
                  onChange={e => {
                    setRefId(e.target.value);
                    setError('');
                  }}
                  className="input-field !pl-12 text-lg font-mono"
                  autoFocus
                />
              </div>
              {error && (
                <p className="mt-2 text-sm text-red-400">{error}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={!refId.trim()}
              className="btn-primary w-full"
            >
              Check Status
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <p className="text-xs text-gray-400 text-center mt-6">
            Don&apos;t have a Reference ID? Complete a task to receive one.
          </p>
        </div>
      </div>
    </div>
  );
}
