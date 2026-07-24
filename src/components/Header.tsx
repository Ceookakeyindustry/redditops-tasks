'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Globe, Shield, Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isAdmin = pathname.startsWith('/admin');

  return (
    <header className="sticky top-0 z-50 border-b border-[#2A2A2A] glass">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED] flex items-center justify-center shadow-lg shadow-purple-500/20 group-hover:shadow-purple-500/30 transition-all duration-300">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold text-white">RedditOps</span>
              <span className="text-lg font-bold text-[#8B5CF6] ml-1">Tasks</span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/"
              className={`text-sm font-medium transition-colors duration-200 ${
                pathname === '/' ? 'text-[#8B5CF6]' : 'text-[#9CA3AF] hover:text-white'
              }`}
            >
              Browse Tasks
            </Link>
            <Link
              href="/status"
              className={`text-sm font-medium transition-colors duration-200 ${
                pathname === '/status' ? 'text-[#8B5CF6]' : 'text-[#9CA3AF] hover:text-white'
              }`}
            >
              Check Status
            </Link>
            {isAdmin ? (
              <Link
                href="/admin/dashboard"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 text-[#8B5CF6] text-sm font-medium hover:bg-[#8B5CF6]/20 transition-all duration-200"
              >
                <Shield className="w-4 h-4" />
                Admin Panel
              </Link>
            ) : (
              <Link
                href="/admin/login"
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#2A2A2A] text-[#9CA3AF] text-sm font-medium hover:border-[#8B5CF6]/30 hover:text-white transition-all duration-200"
              >
                <Shield className="w-4 h-4" />
                Admin Login
              </Link>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-[#9CA3AF] hover:text-white hover:bg-[#2A2A2A] transition-all"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#2A2A2A] glass animate-fade-in">
          <div className="px-4 py-4 space-y-3">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                pathname === '/' ? 'bg-[#8B5CF6]/10 text-[#8B5CF6]' : 'text-[#9CA3AF] hover:bg-[#2A2A2A] hover:text-white'
              }`}
            >
              Browse Tasks
            </Link>
            <Link
              href="/status"
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                pathname === '/status' ? 'bg-[#8B5CF6]/10 text-[#8B5CF6]' : 'text-[#9CA3AF] hover:bg-[#2A2A2A] hover:text-white'
              }`}
            >
              Check Status
            </Link>
            <Link
              href="/admin/login"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-4 py-3 rounded-xl text-sm font-medium text-[#9CA3AF] hover:bg-[#2A2A2A] hover:text-white transition-all"
            >
              Admin Login
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
