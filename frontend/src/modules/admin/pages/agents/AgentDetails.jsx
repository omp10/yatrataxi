import React, { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, ChevronRight, ExternalLink, FileText, XCircle } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { adminService } from '../../services/adminService';

const cardClass = 'rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm';
const formatMoney = (value) => `Rs ${Number(value || 0).toFixed(2)}`;

const formatDateTime = (value) => {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleString();
};

const AgentDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [reviewNote, setReviewNote] = useState('');
  const [savingReview, setSavingReview] = useState(false);

  const load = async () => {
    const response = await adminService.getAgent(id);
    const payload = response?.data?.data || response?.data || null;
    setData(payload);
    setReviewNote(payload?.agent?.onboarding?.reviewNote || '');
  };

  useEffect(() => {
    load().catch(() => {
      setData(null);
      toast.error('Unable to load agent details');
    });
  }, [id]);

  const agent = data?.agent || {};
  const performance = data?.performance || {};
  const walletHistory = data?.walletHistory?.recentTransactions || [];
  const customers = data?.customers || [];
  const documents = data?.documents || [];

  const reviewAgent = async (kycStatus) => {
    if (kycStatus === 'rejected' && !reviewNote.trim()) {
      toast.error('Please add a rejection reason for the agent');
      return;
    }

    setSavingReview(true);
    try {
      await adminService.reviewAgent(id, {
        ...agent,
        kycStatus,
        status: kycStatus === 'verified' ? 'active' : 'inactive',
        active: kycStatus === 'verified',
        reviewNote: reviewNote.trim(),
      });
      toast.success(`Agent ${kycStatus === 'verified' ? 'approved' : 'rejected'}`);
      await load();
    } catch (error) {
      toast.error(error?.message || 'Unable to update agent review');
    } finally {
      setSavingReview(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className={cardClass}>
        <div className="mb-4 flex items-center gap-1.5 text-xs text-slate-400">
          <span>Agent Management</span>
          <ChevronRight size={12} />
          <span className="text-slate-700">{agent.name || 'Agent Details'}</span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-950">{agent.name || 'Agent Details'}</h1>
            <p className="mt-2 text-sm font-semibold text-slate-500">{agent.phone || ''} | {agent.email || 'No email'}</p>
          </div>
          <button type="button" onClick={() => navigate('/admin/agents')} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-slate-700">
            <ArrowLeft size={14} />
            Back
          </button>
        </div>
      </section>

      <section className={cardClass}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-slate-950">KYC Review</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              Submitted: {formatDateTime(agent.onboarding?.submittedAt)} | Reviewed: {formatDateTime(agent.onboarding?.reviewedAt)}
            </p>
            <p className="mt-2 text-xs font-black uppercase tracking-[0.16em] text-slate-400">Current status: {agent.kycStatus || 'pending'}</p>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => reviewAgent('verified')} disabled={savingReview} className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-white disabled:opacity-60">
              <CheckCircle2 size={14} />
              Approve
            </button>
            <button type="button" onClick={() => reviewAgent('rejected')} disabled={savingReview} className="inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-white disabled:opacity-60">
              <XCircle size={14} />
              Reject
            </button>
          </div>
        </div>
        <div className="mt-5">
          <label className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Review note / rejection reason</label>
          <textarea
            value={reviewNote}
            onChange={(event) => setReviewNote(event.target.value)}
            placeholder="Add the rejection reason or any internal review note for this agent"
            className="mt-2 min-h-28 w-full rounded-3xl border border-slate-200 px-4 py-4 text-sm font-semibold text-slate-900 outline-none focus:border-slate-900"
          />
          {agent.onboarding?.reviewNote ? (
            <p className="mt-3 text-sm font-semibold text-slate-500">Saved note: {agent.onboarding.reviewNote}</p>
          ) : null}
        </div>
      </section>

      <section className={cardClass}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-slate-950">Submitted Documents</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">Open the uploaded files and review any document numbers or expiry dates provided by the agent.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
            {documents.length} file{documents.length === 1 ? '' : 's'}
          </div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {documents.map((document) => (
            <article key={document.key} className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
              {document.imageUrl ? (
                <a href={document.imageUrl} target="_blank" rel="noreferrer" className="block">
                  <img src={document.imageUrl} alt={document.label} className="h-52 w-full object-cover" />
                </a>
              ) : (
                <div className="flex h-52 items-center justify-center bg-slate-100 text-slate-400">
                  <FileText size={28} />
                </div>
              )}
              <div className="space-y-2 p-4 text-sm font-semibold text-slate-600">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-slate-900">{document.label}</p>
                    <p className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-slate-400">{document.side || 'single'}</p>
                  </div>
                  {document.imageUrl ? (
                    <a href={document.imageUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-slate-700">
                      Open
                      <ExternalLink size={13} />
                    </a>
                  ) : null}
                </div>
                <p>Uploaded: {formatDateTime(document.uploadedAt)}</p>
                {document.documentNumber ? <p>ID Number: {document.documentNumber}</p> : null}
                {document.expiryDate ? <p>Expiry: {formatDateTime(document.expiryDate)}</p> : null}
              </div>
            </article>
          ))}
          {documents.length === 0 ? <p className="text-sm font-semibold text-slate-500">This agent has not submitted any onboarding documents yet.</p> : null}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className={cardClass}><p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Wallet Balance</p><p className="mt-3 text-3xl font-black text-slate-950">{formatMoney(agent.wallet?.balance || 0)}</p></div>
        <div className={cardClass}><p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Lifetime Earned</p><p className="mt-3 text-3xl font-black text-slate-950">{formatMoney(agent.wallet?.lifetimeEarned || 0)}</p></div>
        <div className={cardClass}><p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Revenue Generated</p><p className="mt-3 text-3xl font-black text-slate-950">{formatMoney(performance?.totals?.totalRevenue || 0)}</p></div>
        <div className={cardClass}><p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Commission Total</p><p className="mt-3 text-3xl font-black text-slate-950">{formatMoney(performance?.totals?.totalCommission || 0)}</p></div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className={cardClass}>
          <h2 className="text-lg font-black text-slate-950">Performance</h2>
          <div className="mt-5 space-y-4 text-sm font-semibold text-slate-600">
            <div>
              <p className="font-black text-slate-900">Direct Bookings</p>
              <p className="mt-1">Rides: {performance?.direct?.rideBookings || 0} | Buses: {performance?.direct?.busBookings || 0}</p>
              <p className="mt-1">Revenue: {formatMoney((performance?.direct?.rideRevenue || 0) + (performance?.direct?.busRevenue || 0))}</p>
            </div>
            <div>
              <p className="font-black text-slate-900">Referral Bookings</p>
              <p className="mt-1">Rides: {performance?.referral?.rideBookings || 0} | Buses: {performance?.referral?.busBookings || 0}</p>
              <p className="mt-1">Revenue: {formatMoney((performance?.referral?.rideRevenue || 0) + (performance?.referral?.busRevenue || 0))}</p>
            </div>
            <div>
              <p className="font-black text-slate-900">Customer Base</p>
              <p className="mt-1">Total referred customers: {customers.length}</p>
            </div>
          </div>
        </div>

        <div className={cardClass}>
          <h2 className="text-lg font-black text-slate-950">Recent Wallet Activity</h2>
          <div className="mt-5 space-y-3">
            {walletHistory.slice(0, 8).map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-black text-slate-900">{item.title || item.source || 'Wallet update'}</p>
                  <p className={item.kind === 'debit' ? 'text-rose-600' : 'text-emerald-600'}>{item.kind === 'debit' ? '-' : '+'}{formatMoney(item.amount)}</p>
                </div>
              </div>
            ))}
            {walletHistory.length === 0 ? <p className="text-sm font-semibold text-slate-500">No wallet history yet.</p> : null}
          </div>
        </div>
      </section>

      <section className={cardClass}>
        <h2 className="text-lg font-black text-slate-950">Customers Brought In</h2>
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-left">
            <thead>
              <tr className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                <th className="pb-3">Customer</th>
                <th className="pb-3">Phone</th>
                <th className="pb-3">Bookings</th>
                <th className="pb-3">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customers.map((item) => (
                <tr key={item.id}>
                  <td className="py-4 text-sm font-black text-slate-900">{item.name || 'Customer'}</td>
                  <td className="py-4 text-sm font-semibold text-slate-600">{item.phone || '--'}</td>
                  <td className="py-4 text-sm font-semibold text-slate-600">{(item.rideBookings || 0) + (item.busBookings || 0)}</td>
                  <td className="py-4 text-sm font-semibold text-slate-600">{formatMoney(item.totalRevenue || 0)}</td>
                </tr>
              ))}
              {customers.length === 0 ? <tr><td colSpan={4} className="py-8 text-center text-sm font-semibold text-slate-500">No customers tied to this agent yet.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default AgentDetails;
