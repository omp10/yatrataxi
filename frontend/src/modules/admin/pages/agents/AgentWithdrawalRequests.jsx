import React, { useEffect, useState } from 'react';
import { CheckCircle2, ChevronRight, Search, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminService } from '../../services/adminService';

const cardClass = 'rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm';
const inputClass = 'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-slate-900';
const formatMoney = (value) => `Rs ${Number(value || 0).toFixed(2)}`;

const AgentWithdrawalRequests = () => {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const load = async (nextSearch = search, nextStatus = status) => {
    const response = await adminService.getAgentWithdrawalRequests({
      ...(nextSearch ? { search: nextSearch } : {}),
      ...(nextStatus ? { status: nextStatus } : {}),
    });
    setItems(response?.data?.data?.results || response?.data?.results || []);
  };

  useEffect(() => {
    load('', '');
  }, []);

  const handleAction = async (id, action) => {
    if (action === 'approve') await adminService.approveAgentWithdrawalRequest(id);
    else await adminService.rejectAgentWithdrawalRequest(id);
    toast.success(`Request ${action}d`);
    await load();
  };

  return (
    <div className="space-y-6">
      <section className={cardClass}>
        <div className="mb-4 flex items-center gap-1.5 text-xs text-slate-400">
          <span>Agent Management</span>
          <ChevronRight size={12} />
          <span className="text-slate-700">Withdrawal Requests</span>
        </div>
        <h1 className="text-3xl font-black tracking-tight text-slate-950">Agent withdrawal requests</h1>
        <p className="mt-2 text-sm font-semibold text-slate-500">Review payout requests, inspect bank or UPI details, and approve or reject them from one queue.</p>
      </section>

      <section className={cardClass}>
        <div className="flex flex-col gap-4 lg:flex-row">
          <div className="relative flex-1">
            <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className={`${inputClass} pl-11`} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search agent, phone, status" />
          </div>
          <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-slate-900" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <button type="button" onClick={() => load(search, status)} className="rounded-2xl bg-slate-900 px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-white">Filter</button>
        </div>
      </section>

      <section className={cardClass}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead>
              <tr className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                <th className="pb-3">Agent</th>
                <th className="pb-3">Amount</th>
                <th className="pb-3">Method</th>
                <th className="pb-3">Payout Details</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="py-4">
                    <p className="text-sm font-black text-slate-900">{item.agent?.name || 'Agent'}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{item.agent?.phone || '--'}</p>
                  </td>
                  <td className="py-4 text-sm font-black text-slate-900">{formatMoney(item.amount || 0)}</td>
                  <td className="py-4 text-sm font-semibold text-slate-600">{item.payment_method || 'bank_transfer'}</td>
                  <td className="py-4 text-xs font-semibold text-slate-600">
                    <p>{item.payoutSnapshot?.bankName || item.payoutSnapshot?.upiId || 'No payout details'}</p>
                    <p className="mt-1">{item.payoutSnapshot?.accountNumber || item.payoutSnapshot?.ifscCode || ''}</p>
                  </td>
                  <td className="py-4 text-xs font-black uppercase tracking-[0.16em] text-slate-600">{item.status}</td>
                  <td className="py-4 text-right">
                    {item.status === 'pending' ? (
                      <div className="flex justify-end gap-3">
                        <button type="button" onClick={() => handleAction(item.id, 'approve')} className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-white"><CheckCircle2 size={14} />Approve</button>
                        <button type="button" onClick={() => handleAction(item.id, 'reject')} className="inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-white"><XCircle size={14} />Reject</button>
                      </div>
                    ) : (
                      <span className="text-xs font-semibold text-slate-500">Reviewed</span>
                    )}
                  </td>
                </tr>
              ))}
              {items.length === 0 ? <tr><td colSpan={6} className="py-10 text-center text-sm font-semibold text-slate-500">No agent withdrawal requests found.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default AgentWithdrawalRequests;
