'use client';

import React, { useState } from 'react';
import { Send, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

export default function ContactForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState('general');
  const [paymentReference, setPaymentReference] = useState('');
  const [message, setMessage] = useState('');
  const [hp, setHp] = useState(''); // Anti-bot honeypot
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<{
    type: 'idle' | 'success' | 'error';
    message?: string;
    referenceId?: string;
  }>({ type: 'idle' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setStatus({ type: 'idle' });

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          category,
          paymentReference: paymentReference.trim() || undefined,
          message: message.trim(),
          hp,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setStatus({
          type: 'error',
          message: data.error || 'Failed to send your inquiry. Please try again or email us directly.',
        });
        setIsSubmitting(false);
        return;
      }

      setStatus({
        type: 'success',
        message: data.message,
        referenceId: data.referenceId,
      });
      setName('');
      setEmail('');
      setMessage('');
      setPaymentReference('');
      setIsSubmitting(false);
    } catch {
      setStatus({
        type: 'error',
        message: 'Network error. Please check your connection and try again.',
      });
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Honeypot field for spam prevention (invisible to real users) */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="input-website-hp">Website</label>
        <input
          id="input-website-hp"
          type="text"
          name="website"
          value={hp}
          onChange={(e) => setHp(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="contact-name" className="block text-xs font-mono uppercase text-[#8993A7] mb-1.5">
            Your Name <span className="text-[#FFC857]">*</span>
          </label>
          <input
            id="contact-name"
            type="text"
            required
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ada Lovelace"
            className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] text-[#F5F7FA] border border-white/10 text-sm focus:outline-none focus:border-[#FFC857] focus:ring-1 focus:ring-[#FFC857] transition-all"
          />
        </div>

        <div>
          <label htmlFor="contact-email" className="block text-xs font-mono uppercase text-[#8993A7] mb-1.5">
            Email Address <span className="text-[#FFC857]">*</span>
          </label>
          <input
            id="contact-email"
            type="email"
            required
            maxLength={255}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ada@example.com"
            className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] text-[#F5F7FA] border border-white/10 text-sm focus:outline-none focus:border-[#FFC857] focus:ring-1 focus:ring-[#FFC857] transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="contact-category" className="block text-xs font-mono uppercase text-[#8993A7] mb-1.5">
            Inquiry Category
          </label>
          <select
            id="contact-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-[#080D18] text-[#F5F7FA] border border-white/10 text-sm focus:outline-none focus:border-[#FFC857] focus:ring-1 focus:ring-[#FFC857] transition-all cursor-pointer"
          >
            <option value="general">General Inquiry</option>
            <option value="payment_issue">Payment Issue / Missing Light</option>
            <option value="refund_request">Refund Request</option>
            <option value="dedication_management">Edit or Remove Dedication</option>
            <option value="technical_feedback">Technical Bug or Feedback</option>
          </select>
        </div>

        <div>
          <label htmlFor="contact-payment-ref" className="block text-xs font-mono uppercase text-[#8993A7] mb-1.5">
            Payment / Order ID <span className="text-[#8993A7] text-[10px] lowercase">(optional)</span>
          </label>
          <input
            id="contact-payment-ref"
            type="text"
            maxLength={100}
            value={paymentReference}
            onChange={(e) => setPaymentReference(e.target.value)}
            placeholder="e.g. pay_Q8a... or order_Q8a..."
            className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] text-[#F5F7FA] border border-white/10 text-sm font-mono focus:outline-none focus:border-[#FFC857] focus:ring-1 focus:ring-[#FFC857] transition-all"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor="contact-message" className="block text-xs font-mono uppercase text-[#8993A7]">
            Your Message <span className="text-[#FFC857]">*</span>
          </label>
          <span className="text-[10px] font-mono text-[#8993A7]">
            {message.length} / 3000
          </span>
        </div>
        <textarea
          id="contact-message"
          required
          rows={5}
          maxLength={3000}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Please describe how we can help you. (Reminder: never send passwords, OTPs, or card PINs)."
          className="w-full px-4 py-3 rounded-2xl bg-white/[0.04] text-[#F5F7FA] border border-white/10 text-sm focus:outline-none focus:border-[#FFC857] focus:ring-1 focus:ring-[#FFC857] transition-all resize-none"
        />
      </div>

      {/* Status notification alerts */}
      {status.type === 'error' && (
        <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-start gap-2.5 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
          <span>{status.message}</span>
        </div>
      )}

      {status.type === 'success' && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 space-y-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold">{status.message}</span>
          </div>
          {status.referenceId && (
            <p className="font-mono text-[11px] text-emerald-200">
              Inquiry Reference: <span className="bg-black/40 px-2 py-0.5 rounded font-bold">{status.referenceId}</span>
            </p>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full sm:w-auto px-8 py-3 rounded-full btn-gold text-xs font-semibold tracking-widest flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
      >
        {isSubmitting ? (
          <>
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>SENDING MESSAGE...</span>
          </>
        ) : (
          <>
            <Send className="w-3.5 h-3.5" />
            <span>SUBMIT INQUIRY</span>
          </>
        )}
      </button>
    </form>
  );
}
