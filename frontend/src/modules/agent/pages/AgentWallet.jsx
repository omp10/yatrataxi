import React, { useEffect, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { agentService } from '../services/agentService';

const cardClass = 'rounded-[30px] border border-white/70 bg-white/88 p-5 shadow-[0_18px_36px_rgba(20,58,90,0.08)] backdrop-blur-xl';
const formatMoney = (value) => `Rs ${Number(value || 0).toFixed(2)}`;

const AgentWallet = () => {
  const [wallet, setWallet] = useState(null);

  useEffect(() => {
    const load = async () => {
      const response = await agentService.getWallet();
      setWallet(response?.data?.data || response?.data || null);
    };

    load();
  }, []);

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
