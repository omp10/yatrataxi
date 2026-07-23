import React, { useEffect, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { agentService } from '../services/agentService';

const cardClass = 'rounded-[30px] border border-white/70 bg-white/88 p-5 shadow-[0_18px_36px_rgba(20,58,90,0.08)] backdrop-blur-xl';
const formatMoney = (value) => `Rs ${Number(value || 0).toFixed(2)}`;

const statusStyles = {
  pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-rose-50 text-rose-700',
};

const AgentWallet = () => {
  const [wallet, setWallet] = useState(null);
  const [withdrawals, setWithdrawals] = useState([]);
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    const [walletResponse, withdrawalResponse] = await Promise.all([
      agentService.getWallet(),
      agentService.getWithdrawals(),
    ]);
    setWallet(walletResponse?.data?.data || walletResponse?.data || null);
    setWithdrawals(withdrawalResponse?.data?.data?.results || []);
  };

  useEffect(() => {
    load();
  }, []);

  const hasPending = withdrawals.some((item) => item.status === 'pending');

  const submitWithdrawal = async () => {
    setSubmitting(true);
    try {
      await agentService.requestWithdrawal({ amount: Number(amount) });
      toast.success('Withdrawal request submitted');
      setAmount('');
      await load();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to request withdrawal');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className={`${cardClass} bg-[linear-gradient(155deg,_rgba(20,58,90,1)_0%,_rgba(13,106,168,0.95)_100%)] text-white`}>
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/60">Available Balance</p>
        <h2 className="mt-2 text-4xl font-black tracking-tight">{formatMoney(wallet?.balance)}</h2>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-[22px] bg-white/10 px-4 py-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/60">Lifetime Earned</p>
            <p className="mt-2 text-xl font-black">{formatMoney(wallet?.lifetimeEarned)}</p>
          </div>
          <div className="rounded-[22px] bg-white/10 px-4 py-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/60">Paid Out</p>
            <p className="mt-2 text-xl font-black">{formatMoney(wallet?.lifetimePaidOut)}</p>
          </div>
        </div>
      </section>

      <section className={cardClass}>
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#5b7a93]">Withdraw earnings</p>
        <div className="mt-4 flex items-center gap-3">
          <input
            type="number"
            min="1"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="Amount"
            disabled={hasPending}
            className="w-full rounded-[22px] border border-[#dfebf5] bg-white px-4 py-3 text-sm font-bold text-[#143a5a] outline-none disabled:opacity-50"
          />
          <button
            type="button"
            onClick={submitWithdrawal}
            disabled={submitting || hasPending || !(Number(amount) > 0)}
            className="shrink-0 rounded-[22px] bg-[#0d6aa8] px-5 py-3 text-sm font-black text-white disabled:opacity-40"
          >
            Request
          </button>
        </div>
        <p className="mt-2 text-xs font-semibold text-slate-500">
          {hasPending
            ? 'A withdrawal request is already pending admin review.'
            : 'Payouts go to the bank account or UPI ID saved in your profile.'}
        </p>

        <div className="mt-4 space-y-3">
          {withdrawals.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-[22px] border border-[#dfebf5] bg-white px-4 py-3">
              <div>
                <p className="text-sm font-black text-[#143a5a]">{formatMoney(item.amount)}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  {item.paymentMethod || 'bank_transfer'}
                  {item.adminNote ? ` · ${item.adminNote}` : ''}
                </p>
              </div>
              <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${statusStyles[item.status] || statusStyles.pending}`}>
                {item.status}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className={cardClass}>
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#5b7a93]">Recent transactions</p>
        <div className="mt-4 space-y-3">
          {(wallet?.recentTransactions || []).map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-[22px] border border-[#dfebf5] bg-white px-4 py-3">
              <div className="flex items-center gap-3">
                <div className={`rounded-[18px] p-2 ${item.kind === 'credit' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                  {item.kind === 'credit' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                </div>
                <div>
                  <p className="text-sm font-black text-[#143a5a]">{item.title || 'Wallet activity'}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{item.source || 'agent_commission'} · {item.bookingType || 'manual'}</p>
                </div>
              </div>
              <span className={`text-sm font-black ${item.kind === 'credit' ? 'text-emerald-700' : 'text-rose-700'}`}>
                {item.kind === 'credit' ? '+' : '-'}{formatMoney(item.amount)}
              </span>
            </div>
          ))}
          {!wallet?.recentTransactions?.length ? <p className="text-sm font-semibold text-slate-500">No wallet activity yet.</p> : null}
        </div>
      </section>
    </div>
  );
};

export default AgentWallet;
