'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/authContext';
import { useDarkMode } from '@/context/DarkModeContext';
import API from '@/lib/axios';
import { toast } from 'sonner';
import { Mail, Send, ShieldAlert, ArrowLeft, Image as ImageIcon } from 'lucide-react';

export default function AdminBroadcastPage() {
  const router = useRouter();
  const { userDetails, loading, isAuthenticated } = useAuth() as any;
  const { darkMode } = useDarkMode() as any;
  const dark = darkMode;

  const [subject, setSubject] = useState('');
  const [targetEmails, setTargetEmails] = useState('');
  const [excludeEmails, setExcludeEmails] = useState('');
  const [htmlBody, setHtmlBody] = useState('<p>Hello DojoClass Members!</p>\n\n<p>Your message here...</p>');
  const [sending, setSending] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Security check: Only render if admin
  if (loading) return null;

  if (!isAuthenticated || userDetails?.role !== 'admin') {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-4 ${dark ? 'bg-[#0a0a0a] text-white' : 'bg-[#f5f5f5] text-zinc-900'}`}>
        <ShieldAlert size={64} className="text-red-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-zinc-500 mb-6">You do not have permission to view this page.</p>
        <button 
          onClick={() => router.push('/')}
          className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
        >
          Return Home
        </button>
      </div>
    );
  }

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !htmlBody.trim()) {
      toast.error('Subject and message body are required.');
      return;
    }

    if (!confirm(`Are you sure you want to send this email to ${targetEmails.trim() ? 'the specified users' : 'ALL members'}?`)) {
      return;
    }

    setSending(true);
    try {
      const response = await API.post('/admin/broadcast', { 
        subject, 
        htmlBody, 
        targetEmails: targetEmails.trim(),
        excludeEmails: excludeEmails.trim()
      });
      if (response.data.success) {
        toast.success(`Broadcast sent successfully to ${response.data.totalUsers} users!`);
        setSubject('');
        setTargetEmails('');
      } else {
        toast.error(response.data.error || 'Failed to send broadcast.');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'An error occurred while sending the broadcast.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={`min-h-screen pt-[70px] pb-12 px-4 transition-colors duration-300 ${dark ? 'bg-[#0a0a0a] text-white' : 'bg-[#f5f5f5] text-zinc-900'}`}>
      <div className="max-w-3xl mx-auto w-full">
        {/* Header */}
        <div className={`mb-6 p-4 rounded-2xl border flex items-center justify-between shadow-sm ${dark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-zinc-200'}`}>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.back()}
              className={`p-2 rounded-xl transition-colors ${dark ? 'hover:bg-zinc-800 text-zinc-400 hover:text-white' : 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900'}`}
            >
              <ArrowLeft size={20} />
            </button>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${dark ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
              <Mail size={20} />
            </div>
            <div>
              <h1 className="font-bold text-[18px]">Broadcast Email</h1>
              <p className={`text-[13px] ${dark ? 'text-zinc-500' : 'text-zinc-500'}`}>Send an email to all DojoClass members</p>
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full border text-[11px] font-bold uppercase tracking-wider ${dark ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-red-50 text-red-600 border-red-200'}`}>
            Admin Only
          </div>
        </div>

        {/* Composer Form */}
        <form onSubmit={handleSendBroadcast} className={`rounded-2xl border shadow-sm overflow-hidden ${dark ? 'bg-zinc-950/40 border-zinc-800' : 'bg-white border-zinc-200'}`}>
          <div className="p-6 space-y-6">
            
            {/* Recipients */}
            <div className="space-y-2">
              <label className={`text-[13px] font-semibold uppercase tracking-wider ${dark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                Recipients (Optional)
              </label>
              <input
                type="text"
                value={targetEmails}
                onChange={(e) => setTargetEmails(e.target.value)}
                placeholder="Leave blank for ALL members, or enter emails separated by commas..."
                className={`w-full px-4 py-3 rounded-xl border text-[14px] focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all ${dark ? 'bg-zinc-900 border-zinc-700 text-white placeholder-zinc-600' : 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder-zinc-400'}`}
              />
            </div>

            {/* Exclude Recipients */}
            <div className="space-y-2">
              <label className={`text-[13px] font-semibold uppercase tracking-wider ${dark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                Exclude Recipients (Optional)
              </label>
              <input
                type="text"
                value={excludeEmails}
                onChange={(e) => setExcludeEmails(e.target.value)}
                placeholder="Enter emails to EXCLUDE, separated by commas..."
                className={`w-full px-4 py-3 rounded-xl border text-[14px] focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all ${dark ? 'bg-zinc-900 border-zinc-700 text-white placeholder-zinc-600' : 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder-zinc-400'}`}
              />
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <label className={`text-[13px] font-semibold uppercase tracking-wider ${dark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                Subject Line
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Important update from DojoClass..."
                className={`w-full px-4 py-3 rounded-xl border text-[15px] focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all ${dark ? 'bg-zinc-900 border-zinc-700 text-white placeholder-zinc-600' : 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder-zinc-400'}`}
                required
              />
            </div>

            {/* Body */}
            <div className="space-y-2 relative">
              <div className="flex items-center justify-between mb-2">
                <label className={`text-[13px] font-semibold uppercase tracking-wider ${dark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  HTML Message Body
                </label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${dark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-700'}`}
                >
                  <ImageIcon size={14} />
                  {uploadingImage ? 'Uploading...' : 'Insert Image'}
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setUploadingImage(true);
                    try {
                      const { data } = await API.post('/community/media/sign', {
                        fileName: file.name,
                        mimeType: file.type,
                      });
                      
                      const uploadRes = await fetch(data.uploadUrl, {
                        method: 'PUT',
                        body: file,
                        headers: { 'Content-Type': file.type },
                      });

                      if (!uploadRes.ok) throw new Error('Upload failed to cloud storage');

                      const imgTag = `\n<img src="${data.publicUrl}" alt="Email Image" style="max-width: 100%; border-radius: 8px;" />\n`;
                      setHtmlBody(prev => prev + imgTag);
                      toast.success('Image inserted!');
                    } catch (err) {
                      console.error('Image upload failed:', err);
                      toast.error('Failed to upload image');
                    } finally {
                      setUploadingImage(false);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }
                  }}
                />
              </div>
              <textarea
                value={htmlBody}
                onChange={(e) => setHtmlBody(e.target.value)}
                rows={12}
                placeholder="<p>Write your message here using HTML tags...</p>"
                className={`w-full px-4 py-3 rounded-xl border text-[14px] font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all ${dark ? 'bg-zinc-900 border-zinc-700 text-zinc-300 placeholder-zinc-600' : 'bg-zinc-50 border-zinc-300 text-zinc-800 placeholder-zinc-400'}`}
                required
              />
              <p className={`text-[12px] mt-1 flex flex-col gap-1 ${dark ? 'text-zinc-500' : 'text-zinc-500'}`}>
                <span>Note: Standard HTML tags (b, i, p, br, a, h1-h6) are supported by email clients. Keep it simple.</span>
                <span>💡 <strong>Tip:</strong> You can type <code>[name]</code> or <code>{"{{name}}"}</code> anywhere in the Subject or Body to personalize it! (e.g. "Hey [name]!")</span>
              </p>
            </div>
            
          </div>

          {/* Footer Actions */}
          <div className={`p-4 border-t flex items-center justify-end gap-3 ${dark ? 'border-zinc-800 bg-zinc-900/30' : 'border-zinc-200 bg-zinc-50'}`}>
            <button
              type="button"
              onClick={() => router.back()}
              className={`px-5 py-2.5 rounded-xl font-medium text-[14px] transition-colors ${dark ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200'}`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sending}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-[14px] text-white shadow-lg transition-all ${sending ? 'bg-indigo-500/70 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:scale-105 active:scale-95 shadow-indigo-500/30'}`}
            >
              {sending ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sending...
                </span>
              ) : (
                <>
                  <Send size={16} />
                  {targetEmails.trim() || excludeEmails.trim() ? 'Send to Specific Users' : 'Send to All Members'}
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
