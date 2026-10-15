import React, { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { venuePartnerService } from '../../services/venuePartnerService';
import { money } from './partnerFormat';

const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-indigo-500';
const WITHDRAWAL_STYLES = { pending: 'text-amber-600', approved: 'text-emerald-600', rejected: 'text-rose-600' };

const PartnerWallet = ({ partner, onPartnerChange }) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [amount, setAmount] = useState('');
  const [payout, setPayout] = useState({ accountHolder: '', bankName: '', accountNumber: '', ifscCode: '', upiId: '' });
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState({ text: '', error: false });

  const load = useCallback(() => venuePartnerService.getWallet()
    .then((r) => setData(r?.data || null))
    .catch((e) => setError(e?.message || 'Could not load the wallet')), []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (partner?.payout) setPayout((prev) => ({ ...prev, ...partner.payout }));
  }, [partner]);

  const pendingTotal = (data?.withdrawals || []).filter((w) => w.status === 'pending').reduce((sum, w) => sum + w.amount, 0);
  const available = Math.max(0, Number(data?.wallet?.balance || 0) - pendingTotal);

  const savePayout = async (event) => {
    event.preventDefault();
    setBusy('payout');
    setMessage({ text: '', error: false });
    try {
      const response = await venuePartnerService.updatePayout(payout);
      onPartnerChange?.(response?.data || partner);
      setMessage({ text: 'Payout details saved', error: false });
    } catch (e) {
      setMessage({ text: e?.message || 'Could not save payout details', error: true });
    } finally {
      setBusy('');
    }
  };

  const withdraw = async (event) => {
    event.preventDefault();
    setBusy('withdraw');
    setMessage({ text: '', error: false });
    try {
      await venuePartnerService.requestWithdrawal(Number(amount));
      setAmount('');
      setMessage({ text: 'Payout requested. The admin will transfer it after review.', error: false });
      await load();
    } catch (e) {
      setMessage({ text: e?.message || 'Could not request a payout', error: true });
    } finally {
      setBusy('');
    }
  };

  if (error) return <p className="py-16 text-center text-sm font-semibold text-rose-600">{error}</p>;
  if (!data) return <div className="py-20 flex justify-center text-slate-400"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-slate-900 p-5 text-white">
        <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Wallet balance</p>
        <p className="text-3xl font-black">{money(data.wallet.balance)}</p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] font-semibold opacity-80">
          <p>Earned<br /><span className="text-sm font-black">{money(data.wallet.lifetimeEarned)}</span></p>
          <p>Paid out<br /><span className="text-sm font-black">{money(data.wallet.lifetimePaidOut)}</span></p>
          <p>Pending payout<br /><span className="text-sm font-black">{money(pendingTotal)}</span></p>
        </div>
      </div>

      {message.text && <p className={`text-sm font-semibold ${message.error ? 'text-rose-600' : 'text-emerald-600'}`}>{message.text}</p>}

      <form onSubmit={withdraw} className="rounded-3xl bg-white border border-slate-100 p-4 shadow-sm space-y-2">
        <p className="text-sm font-black text-slate-900">Request payout</p>
        <p className="text-[11px] font-semibold text-slate-500">Available: {money(available)}</p>
        <div className="flex gap-2">
          <input type="number" min="1" step="0.01" max={available} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" className={inputClass} />
          <button type="submit" disabled={busy === 'withdraw' || !(Number(amount) >= 1)} className="rounded-xl bg-indigo-600 px-4 text-sm font-black text-white disabled:opacity-40">Request</button>
        </div>
      </form>

      <form onSubmit={savePayout} className="rounded-3xl bg-white border border-slate-100 p-4 shadow-sm space-y-2">
        <p className="text-sm font-black text-slate-900">Payout details</p>
        <input value={payout.upiId || ''} onChange={(e) => setPayout({ ...payout, upiId: e.target.value })} placeholder="UPI ID" className={inputClass} />
        <p className="text-center text-[10px] font-black uppercase text-slate-400">or bank account</p>
        <input value={payout.accountHolder || ''} onChange={(e) => setPayout({ ...payout, accountHolder: e.target.value })} placeholder="Account holder name" className={inputClass} />
        <input value={payout.bankName || ''} onChange={(e) => setPayout({ ...payout, bankName: e.target.value })} placeholder="Bank name" className={inputClass} />
        <div className="grid grid-cols-2 gap-2">
          <input value={payout.accountNumber || ''} onChange={(e) => setPayout({ ...payout, accountNumber: e.target.value })} placeholder="Account number" className={inputClass} />
          <input value={payout.ifscCode || ''} onChange={(e) => setPayout({ ...payout, ifscCode: e.target.value.toUpperCase() })} placeholder="IFSC" className={inputClass} />
        </div>
        <button type="submit" disabled={busy === 'payout'} className="w-full rounded-xl bg-slate-900 py-2.5 text-sm font-black text-white disabled:opacity-40">Save payout details</button>
      </form>

      {(data.withdrawals || []).length > 0 && (
        <div className="rounded-3xl bg-white border border-slate-100 p-4 shadow-sm">
          <p className="mb-2 text-sm font-black text-slate-900">Payout requests</p>
          {data.withdrawals.map((w) => (
            <div key={w.id} className="flex items-center justify-between border-t border-slate-100 py-2 text-xs first:border-t-0">
              <div>
                <p className="font-bold text-slate-700">{new Date(w.createdAt).toLocaleDateString('en-IN')}</p>
                {w.adminNote && <p className="font-semibold text-slate-500">{w.adminNote}</p>}
              </div>
              <div className="text-right">
                <p className="font-black text-slate-900">{money(w.amount)}</p>
                <p className={`font-black uppercase ${WITHDRAWAL_STYLES[w.status] || ''}`}>{w.status}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-3xl bg-white border border-slate-100 p-4 shadow-sm">
        <p className="mb-2 text-sm font-black text-slate-900">Transactions</p>
        {(data.transactions || []).length === 0 ? (
          <p className="py-3 text-center text-xs font-semibold text-slate-400">No transactions yet.</p>
        ) : data.transactions.map((t) => (
          <div key={t.id} className="flex items-center justify-between border-t border-slate-100 py-2 text-xs first:border-t-0">
            <div className="min-w-0">
              <p className="truncate font-bold text-slate-700">{t.title}</p>
              <p className="font-semibold text-slate-400">{new Date(t.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className={`font-black ${t.kind === 'credit' ? 'text-emerald-600' : 'text-rose-600'}`}>{t.kind === 'credit' ? '+' : '-'}{money(t.amount)}</p>
              <p className="font-semibold text-slate-400">Bal {money(t.balanceAfter)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PartnerWallet;
