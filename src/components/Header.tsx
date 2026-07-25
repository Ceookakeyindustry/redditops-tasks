'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { Shield, Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isAdmin = pathname.startsWith('/admin');

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 glass">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <Image
              src="/logo.svg"
              alt="RedditOps Tasks"
              width={140}
              height={32}
              className="h-8 w-auto"
              priority
            />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/"
              className={`text-sm font-medium transition-colors duration-200 ${
                pathname === '/' ? 'text-[#8B5CF6]' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Browse Tasks
            </Link>
            <Link
              href="/status"
              className={`text-sm font-medium transition-colors duration-200 ${
                pathname === '/status' ? 'text-[#8B5CF6]' : 'text-gray-500 hover:text-gray-900'
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
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-500 text-sm font-medium hover:border-[#8B5CF6]/30 hover:text-gray-900 transition-all duration-200"
              >
                <Shield className="w-4 h-4" />
                Admin Login
              </Link>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 glass animate-fade-in">
          <div className="px-4 py-4 space-y-3">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                pathname === '/' ? 'bg-[#8B5CF6]/10 text-[#8B5CF6]' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              Browse Tasks
            </Link>
            <Link
              href="/status"
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                pathname === '/status' ? 'bg-[#8B5CF6]/10 text-[#8B5CF6]' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              Check Status
            </Link>
            <Link
              href="/admin/login"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-4 py-3 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-all"
            >
              Admin Login
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
