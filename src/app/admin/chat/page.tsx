'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Send, MessageCircle, User, Clock, Loader2 } from 'lucide-react';
import type { ChatMessage } from '@/lib/types';
import { formatDate } from '@/lib/types';

export default function AdminChatPage() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [adminName, setAdminName] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { isAdminAuthenticated, getAdminRole } = await import('@/lib/store');
      if (!isAdminAuthenticated()) {
        router.push('/admin/login');
        return;
      }
      setAuthenticated(true);
      setAdminName(getAdminRole() === 'client' ? 'Client Admin' : 'Operations Admin');
    })();
  }, [router]);

  const loadMessages = useCallback(async () => {
    try {
      const { getChatMessages } = await import('@/lib/store');
      const msgs = await getChatMessages();
      setMessages(msgs);
    } catch { /* ignore */ }
  }, []);

  // Load messages initially and poll every 5 seconds
  useEffect(() => {
    if (!authenticated) return;
    loadMessages();
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [authenticated, loadMessages]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const { sendChatMessage } = await import('@/lib/store');
      await sendChatMessage({
        senderName: adminName,
        senderRole: 'admin',
        message: newMessage.trim(),
      });
      setNewMessage('');
      await loadMessages();
    } catch { /* ignore */ }
    finally { setSending(false); }
  };

  if (!authenticated) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-2 border-[#8B5CF6] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/admin/dashboard" className="text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="w-10 h-10 rounded-xl bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-[#8B5CF6]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Live Chat</h1>
            <p className="text-sm text-gray-400">Chat with workers</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 card p-6 mb-4 overflow-y-auto max-h-[60vh] min-h-[300px]">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MessageCircle className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-gray-400 text-sm">No messages yet</p>
              <p className="text-gray-400 text-xs">Workers can send messages from their submission portal</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.senderRole === 'admin' ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    msg.senderRole === 'admin'
                      ? 'bg-[#8B5CF6]/10 text-[#8B5CF6]'
                      : 'bg-emerald-500/10 text-emerald-400'
                  }`}>
                    {msg.senderRole === 'admin' ? 'A' : 'W'}
                  </div>
                  <div className={`max-w-[70%] ${msg.senderRole === 'admin' ? 'items-end' : 'items-start'} flex flex-col`}>
                    <div className={`px-4 py-2.5 rounded-2xl text-sm ${
                      msg.senderRole === 'admin'
                        ? 'bg-[#8B5CF6] text-white rounded-tr-md'
                        : 'bg-gray-100 text-gray-900 rounded-tl-md'
                    }`}>
                      <p>{msg.message}</p>
                    </div>
                    <div className={`flex items-center gap-2 mt-1 ${msg.senderRole === 'admin' ? 'justify-end' : ''}`}>
                      <span className="text-xs text-gray-400">{msg.senderName}</span>
                      <span className="text-xs text-gray-400">{new Date(msg.createdAt).toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="flex gap-3">
          <input
            type="text"
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="input-field flex-1"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="btn-primary px-6"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
