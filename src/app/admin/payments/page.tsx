'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Lock,
  Copy,
  Check,
  Search,
  ExternalLink,
} from 'lucide-react';

interface ReviewOrder {
  id: string;
  paymentReference: string;
  amount: number;
  currency: string;
  status: string;
  contributorName: string;
  isAnonymous: boolean;
  message?: string;
  claimedTransactionRef?: string;
  verificationSubmittedAt?: string;
  createdAt: string;
  isDemo: boolean;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
}

export default function AdminPaymentsPage() {
  const [apiKey, setApiKey] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [orders, setOrders] = useState<ReviewOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modal states for approval / rejection
  const [selectedOrder, setSelectedOrder] = useState<ReviewOrder | null>(null);
  const [modalMode, setModalMode] = useState<'approve' | 'reject' | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedRef, setCopiedRef] = useState<string | null>(null);
  const [filterSearch, setFilterSearch] = useState('');

  const fetchOrders = async (key: string) => {
    setIsLoading(true);
    setAuthError(null);
    setActionError(null);
    try {
      const res = await fetch('/api/admin/payments', {
        headers: {
          Authorization: `Bearer ${key.trim()}`,
        },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setAuthError(data.error || 'Authentication failed. Please check your admin key.');
        setIsAuthenticated(false);
      } else {
        setOrders(data.orders || []);
        setIsAuthenticated(true);
      }
    } catch (err: any) {
      setAuthError(err.message || 'Failed to connect to admin API.');
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      setAuthError('Please enter the server administrator API key.');
      return;
    }
    fetchOrders(apiKey);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRef(id);
    setTimeout(() => setCopiedRef(null), 2000);
  };

  const handleApprove = async () => {
    if (!selectedOrder) return;
    setIsProcessing(true);
    setActionError(null);
    try {
      const res = await fetch('/api/admin/payments/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
          orderId: selectedOrder.paymentReference,
          expectedAmount: selectedOrder.amount,
          note: reviewNote.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setActionError(data.error || 'Failed to approve payment.');
      } else {
        setActionSuccess(`Order ${selectedOrder.paymentReference} approved! Light is now activated on the globe.`);
        setModalMode(null);
        setSelectedOrder(null);
        setReviewNote('');
        fetchOrders(apiKey);
      }
    } catch (err: any) {
      setActionError(err.message || 'Error executing approval.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedOrder) return;
    setIsProcessing(true);
    setActionError(null);
    try {
      const res = await fetch('/api/admin/payments/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
          orderId: selectedOrder.paymentReference,
          reason: reviewNote.trim() || 'No matching bank credit record found',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setActionError(data.error || 'Failed to reject payment.');
      } else {
        setActionSuccess(`Order ${selectedOrder.paymentReference} marked as rejected.`);
        setModalMode(null);
        setSelectedOrder(null);
        setReviewNote('');
        fetchOrders(apiKey);
      }
    } catch (err: any) {
      setActionError(err.message || 'Error executing rejection.');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    const s = filterSearch.toLowerCase();
    return (
      o.paymentReference.toLowerCase().includes(s) ||
      (o.claimedTransactionRef && o.claimedTransactionRef.toLowerCase().includes(s)) ||
      o.contributorName.toLowerCase().includes(s)
    );
  });

  return (
    <div className="min-h-screen bg-[#030407] text-[#F5F7FA] font-sans p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/10 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FFC857]/15 border border-[#FFC857]/30 flex items-center justify-center text-[#FFC857]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-light tracking-tight">WorldBeacon — Payment Verification Portal</h1>
              <p className="text-xs text-[#8993A7] font-mono">
                Manual review console for UPI QR contributions • Server-enforced authorization
              </p>
            </div>
          </div>

          {isAuthenticated && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => fetchOrders(apiKey)}
                disabled={isLoading}
                className="px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Refresh Queue</span>
              </button>
              <button
                onClick={() => {
                  setIsAuthenticated(false);
                  setApiKey('');
                  setOrders([]);
                }}
                className="px-3.5 py-1.5 rounded-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-xs text-red-400 font-mono transition-colors cursor-pointer"
              >
                Lock Portal
              </button>
            </div>
          )}
        </div>

        {/* Authentication View */}
        {!isAuthenticated ? (
          <div className="max-w-md mx-auto my-16 p-6 sm:p-8 rounded-3xl bg-white/[0.03] border border-white/10 shadow-2xl space-y-5">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-[#7DD3FC]/10 border border-[#7DD3FC]/30 mx-auto flex items-center justify-center text-[#7DD3FC]">
                <Lock className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-light">Administrator Authentication Required</h2>
              <p className="text-xs text-[#8993A7]">
                Enter the server administrator key (configured via <code className="text-[#FFC857]">ADMIN_API_KEY</code> in server environment).
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#8993A7] font-mono mb-1.5">
                  Admin API Secret Key
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Paste admin key..."
                  className="w-full py-2.5 px-3.5 rounded-xl bg-black/50 text-[#F5F7FA] border border-white/15 text-sm font-mono focus:outline-none focus:border-[#FFC857]"
                />
              </div>

              {authError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full btn-gold py-2.5 rounded-xl text-xs font-semibold uppercase tracking-widest cursor-pointer shadow-lg transition-opacity disabled:opacity-50"
              >
                {isLoading ? 'Verifying Credentials...' : 'Unlock Portal'}
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Mandatory Safety Guidelines */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-xs text-amber-300">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" />
              <div className="space-y-1">
                <span className="font-semibold uppercase tracking-wider font-mono block">
                  MANDATORY MANUAL VERIFICATION PROTOCOL:
                </span>
                <ul className="list-disc pl-4 space-y-0.5 text-white/90">
                  <li>
                    Always compare the <strong>Order Reference</strong>, <strong>Amount</strong>, and <strong>Claimed UTR</strong> against your official bank / UPI statement.
                  </li>
                  <li>
                    <strong>Never approve</strong> a payment solely because a visitor entered a UTR or submitted an &quot;I&apos;ve paid&quot; claim.
                  </li>
                  <li>
                    Approve only after <em>independently confirming the credit</em> in your bank account statement.
                  </li>
                  <li>
                    Reject duplicate UTRs, unpaid claims, or mismatched amounts.
                  </li>
                </ul>
              </div>
            </div>

            {/* Success / Error Alerts */}
            {actionSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>{actionSuccess}</span>
                </span>
                <button onClick={() => setActionSuccess(null)} className="text-white/60 hover:text-white cursor-pointer">
                  &times;
                </button>
              </div>
            )}
            {actionError && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{actionError}</span>
                </span>
                <button onClick={() => setActionError(null)} className="text-white/60 hover:text-white cursor-pointer">
                  &times;
                </button>
              </div>
            )}

            {/* Filter Search Bar */}
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-[#8993A7] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter by Order ID, UTR, or Name..."
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                  className="w-full py-2 pl-9 pr-3 rounded-xl bg-white/[0.04] text-xs font-mono text-[#F5F7FA] border border-white/10 focus:outline-none focus:border-[#FFC857]"
                />
              </div>
              <span className="text-xs font-mono text-[#8993A7]">
                Queue: {filteredOrders.length} pending review
              </span>
            </div>

            {/* Orders Table */}
            {filteredOrders.length === 0 ? (
              <div className="p-12 text-center rounded-3xl bg-white/[0.02] border border-white/10 space-y-2">
                <CheckCircle className="w-8 h-8 text-emerald-400/60 mx-auto" />
                <p className="text-sm font-light text-[#F5F7FA]">No payments pending review</p>
                <p className="text-xs text-[#8993A7] font-mono">
                  All submitted contributions have been verified or rejected.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.04] text-[#8993A7] font-mono uppercase tracking-wider">
                      <th className="py-3 px-4">Order Ref</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Claimed UTR / Txn</th>
                      <th className="py-3 px-4">Contributor</th>
                      <th className="py-3 px-4">Submitted At</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono">
                    {filteredOrders.map((o) => (
                      <tr key={o.id} className="hover:bg-white/[0.03] transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-[#F5F7FA]">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate max-w-[140px]">{o.paymentReference}</span>
                            <button
                              onClick={() => handleCopy(o.paymentReference, o.paymentReference)}
                              className="text-[#8993A7] hover:text-[#FFC857] cursor-pointer"
                              title="Copy order ref"
                            >
                              {copiedRef === o.paymentReference ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                            {o.isDemo && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold">
                                DEMO
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-[#FFC857] font-bold text-sm">
                          ₹{o.amount.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${
                              o.status === 'verification_submitted'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-white/10 text-white/70'
                            }`}
                          >
                            {o.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {o.claimedTransactionRef ? (
                            <div className="flex items-center gap-1.5 text-[#7DD3FC] font-semibold">
                              <span>{o.claimedTransactionRef}</span>
                              <button
                                onClick={() => handleCopy(o.claimedTransactionRef!, `utr-${o.id}`)}
                                className="text-[#8993A7] hover:text-[#FFC857] cursor-pointer"
                                title="Copy UTR"
                              >
                                {copiedRef === `utr-${o.id}` ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="text-white/40 italic">Not claimed</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-white/90 font-sans">
                          <div>{o.contributorName}</div>
                          {o.message && (
                            <div className="text-[11px] text-[#8993A7] italic truncate max-w-[160px]">
                              &ldquo;{o.message}&rdquo;
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-[11px] text-[#8993A7]">
                          {o.verificationSubmittedAt
                            ? new Date(o.verificationSubmittedAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : new Date(o.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setSelectedOrder(o);
                                setModalMode('approve');
                                setReviewNote('');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-sans font-medium text-xs flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <CheckCircle className="w-3 h-3" />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => {
                                setSelectedOrder(o);
                                setModalMode('reject');
                                setReviewNote('');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 font-sans font-medium text-xs flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <XCircle className="w-3 h-3" />
                              <span>Reject</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Modal Dialog for Approve / Reject */}
        {modalMode && selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
            <div className="relative w-full max-w-md p-6 rounded-3xl bg-[#080D18] border border-white/15 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <span className="text-sm font-semibold tracking-wide flex items-center gap-2">
                  {modalMode === 'approve' ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      <span>Confirm Payment Approval</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-red-400" />
                      <span>Reject Payment Order</span>
                    </>
                  )}
                </span>
                <button
                  onClick={() => setModalMode(null)}
                  className="text-white/60 hover:text-white text-base cursor-pointer"
                >
                  &times;
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.04] space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-[#8993A7]">Order Reference:</span>
                  <span className="text-white font-bold">{selectedOrder.paymentReference}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8993A7]">Amount:</span>
                  <span className="text-[#FFC857] font-bold">₹{selectedOrder.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8993A7]">Claimed UTR:</span>
                  <span className="text-[#7DD3FC]">{selectedOrder.claimedTransactionRef || 'None'}</span>
                </div>
              </div>

              {modalMode === 'approve' ? (
                <div className="space-y-3">
                  <p className="text-xs text-emerald-300">
                    Did you independently confirm receipt of <strong>₹{selectedOrder.amount}</strong> in your official bank account statement? Approving will permanently activate this beacon on the globe.
                  </p>
                  <div>
                    <label className="block text-[11px] font-mono text-[#8993A7] uppercase mb-1">
                      Bank Audit Note (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Verified in ICICI Bank UPI statement"
                      value={reviewNote}
                      onChange={(e) => setReviewNote(e.target.value)}
                      className="w-full py-2 px-3 rounded-xl bg-black/40 border border-white/10 text-xs font-mono focus:outline-none focus:border-[#FFC857]"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => setModalMode(null)}
                      className="px-4 py-2 rounded-xl text-xs text-[#8993A7] hover:text-white cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleApprove}
                      disabled={isProcessing}
                      className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs cursor-pointer shadow-lg disabled:opacity-50"
                    >
                      {isProcessing ? 'Approving...' : 'Confirm Approval & Activate Light'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-red-300">
                    Are you sure you want to reject this payment? This will mark the order as rejected and keep the beacon unlit.
                  </p>
                  <div>
                    <label className="block text-[11px] font-mono text-[#8993A7] uppercase mb-1">
                      Rejection Reason (Audit Trail)
                    </label>
                    <select
                      value={reviewNote}
                      onChange={(e) => setReviewNote(e.target.value)}
                      className="w-full py-2 px-3 rounded-xl bg-[#030407] border border-white/15 text-xs text-white focus:outline-none focus:border-red-400 cursor-pointer"
                    >
                      <option value="No matching credit in bank statement">No matching credit in bank statement</option>
                      <option value="Incorrect amount credited">Incorrect amount credited</option>
                      <option value="Duplicate transaction reference">Duplicate transaction reference</option>
                      <option value="Invalid or fraudulent claim">Invalid or fraudulent claim</option>
                    </select>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => setModalMode(null)}
                      className="px-4 py-2 rounded-xl text-xs text-[#8993A7] hover:text-white cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleReject}
                      disabled={isProcessing}
                      className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs cursor-pointer shadow-lg disabled:opacity-50"
                    >
                      {isProcessing ? 'Rejecting...' : 'Confirm Rejection'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
