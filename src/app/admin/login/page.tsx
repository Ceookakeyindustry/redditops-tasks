'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Eye, EyeOff, AlertTriangle } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'operations' | 'client'>('operations');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { adminLogin } = await import('@/lib/store');
      const result = await adminLogin(username, password, selectedRole);
      if (result.success) {
        // Route based on role
        if (result.role === 'client') {
          router.push('/admin/client/review');
        } else {
          router.push('/admin/dashboard');
        }
      } else {
        setError(`Invalid ${selectedRole} admin credentials.`);
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="card p-8 sm:p-10 animate-fade-in">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED] flex items-center justify-center mx-auto mb-6 shadow-lg shadow-purple-500/20">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Admin Login</h1>
            <p className="text-gray-500">Sign in to manage tasks and submissions.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-3">
                I am a...
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedRole('operations')}
                  className={`p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                    selectedRole === 'operations'
                      ? 'border-[#8B5CF6] bg-[#8B5CF6]/5'
                      : 'border-gray-200 bg-transparent hover:border-[#8B5CF6]/30'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-[#8B5CF6]/10 flex items-center justify-center mb-2">
                    <Shield className="w-4 h-4 text-[#8B5CF6]" />
                  </div>
                  <h3 className="text-gray-900 font-semibold text-sm">Operations Admin</h3>
                  <p className="text-gray-400 text-xs mt-1">Full task management</p>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRole('client')}
                  className={`p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                    selectedRole === 'client'
                      ? 'border-emerald-500 bg-emerald-500/5'
                      : 'border-gray-200 bg-transparent hover:border-emerald-500/30'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-2">
                    <Eye className="w-4 h-4 text-emerald-400" />
                  </div>
                  <h3 className="text-gray-900 font-semibold text-sm">Client Admin</h3>
                  <p className="text-gray-400 text-xs mt-1">Review submissions only</p>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">
                Username
              </label>
              <input
                type="text"
                placeholder={`Enter ${selectedRole} admin username...`}
                value={username}
                onChange={e => {
                  setUsername(e.target.value);
                  setError('');
                }}
                className="input-field"
                autoFocus
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter admin password..."
                  value={password}
                  onChange={e => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  className="input-field pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-500 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !username || !password}
              className={`btn-primary w-full ${selectedRole === 'client' ? '!bg-emerald-500 hover:!bg-emerald-600' : ''}`}
            >
              {loading ? (
                <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                `Sign In as ${selectedRole === 'operations' ? 'Operations' : 'Client'} Admin`
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
