import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, MapPin, Search } from 'lucide-react';
import { agentService } from '../services/agentService';
import { formatCommissionRule, useAgentCommissionRule } from '../hooks/useAgentCommission';

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const AgentEntertainmentVenues = () => {
  const navigate = useNavigate();
  const commissionRule = useAgentCommissionRule('entertainment');
  const [tab, setTab] = useState('venues');
  const [search, setSearch] = useState('');
  const [venues, setVenues] = useState([]);
  const [sales, setSales] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      setLoading(true);
      agentService.getEntertainmentVenues({ search: search.trim() || undefined })
        .then((r) => { if (active) { setVenues(Array.isArray(r?.data) ? r.data : (r?.data?.results || [])); setError(''); } })
        .catch((e) => { if (active) setError(e?.message || 'Could not load venues'); })
        .finally(() => { if (active) setLoading(false); });
    }, search ? 300 : 0);
    return () => { active = false; clearTimeout(timer); };
  }, [search]);

  useEffect(() => {
    if (tab !== 'sales' || sales) return;
    agentService.getEntertainmentBookings()
      .then((r) => setSales(r?.data || []))
      .catch(() => setSales([]));
  }, [tab, sales]);

  const commissionLabel = formatCommissionRule(commissionRule);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#F8FAFC_0%,#EEF2F7_100%)] max-w-lg mx-auto pb-16">
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md px-5 pt-8 pb-4 border-b border-white/80">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate('/taxi/agent/services')} className="w-9 h-9 rounded-[12px] border border-slate-100 bg-white flex items-center justify-center" aria-label="Back">
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1">
            <p className="text-[9px] font-black uppercase tracking-[0.26em] text-slate-400">Agent Desk</p>
            <h1 className="text-[19px] font-black text-slate-900">Entertainment Tickets</h1>
          </div>
          {commissionLabel && <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700">{commissionLabel}</span>}
        </div>
        <div className="mt-3 grid grid-cols-2 rounded-full bg-slate-100 p-1 text-xs font-black">
          {[['venues', 'Sell tickets'], ['sales', 'My sales']].map(([id, label]) => (
            <button key={id} type="button" onClick={() => setTab(id)} className={`rounded-full py-1.5 ${tab === id ? 'bg-white text-slate-900 shadow' : 'text-slate-500'}`}>{label}</button>
          ))}
        </div>
      </header>

      <div className="px-5 pt-4 space-y-3">
        {tab === 'venues' ? (
          <>
            <div className="flex items-center gap-2 rounded-2xl bg-white border border-slate-200 px-3 py-2.5">
              <Search size={16} className="text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search venues" className="flex-1 bg-transparent text-sm font-semibold outline-none" />
            </div>
            {loading ? (
              <div className="py-16 flex justify-center text-slate-400"><Loader2 className="animate-spin" /></div>
            ) : error ? (
              <p className="py-10 text-center text-sm font-semibold text-rose-600">{error}</p>
            ) : venues.length === 0 ? (
              <p className="py-10 text-center text-sm font-semibold text-slate-400">No venues available right now.</p>
            ) : venues.map((venue) => (
              <button key={venue.id} type="button" onClick={() => navigate(`/taxi/agent/book-entertainment/${venue.id}`)} className="flex w-full items-center gap-3 rounded-[22px] bg-white border border-slate-100 p-3 text-left shadow-sm">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-slate-100">
                  {venue.coverImage && <img src={venue.coverImage} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">{venue.categoryName}</p>
                  <p className="truncate text-sm font-black text-slate-900">{venue.name}</p>
                  {venue.city && <p className="flex items-center gap-1 text-[11px] font-semibold text-slate-500"><MapPin size={10} />{venue.city}</p>}
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400">from</p>
                  <p className="text-sm font-black text-slate-900">{money(venue.minPrice)}</p>
                </div>
              </button>
            ))}
          </>
        ) : sales === null ? (
          <div className="py-16 flex justify-center text-slate-400"><Loader2 className="animate-spin" /></div>
        ) : sales.length === 0 ? (
          <p className="py-10 text-center text-sm font-semibold text-slate-400">You have not sold any tickets yet.</p>
        ) : sales.map((b) => (
          <button key={b.id} type="button" onClick={() => navigate(`/taxi/agent/entertainment-tickets/${b.id}`)} className="w-full rounded-[22px] bg-white border border-slate-100 p-4 text-left shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-slate-900">{b.customer?.name || 'Customer'} · {b.customer?.phone}</p>
                <p className="text-[11px] font-semibold text-slate-500">{b.venue?.name} · {b.visitDate} · {b.totalTickets} ticket(s)</p>
                <p className="font-mono text-[10px] font-bold text-slate-400">{b.bookingCode}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-black text-slate-900">{money(b.amount)}</p>
                <p className={`text-[11px] font-black ${b.status === 'cancelled' ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {b.status === 'cancelled' ? 'Cancelled' : `+${money(b.agentCommission)}`}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default AgentEntertainmentVenues;
