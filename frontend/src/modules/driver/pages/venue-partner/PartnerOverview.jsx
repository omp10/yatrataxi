import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, ScanLine } from 'lucide-react';
import { venuePartnerService } from '../../services/venuePartnerService';
import { money } from './partnerFormat';

const StatCard = ({ label, value, sub, tone = 'text-slate-900' }) => (
  <div className="rounded-2xl bg-white border border-slate-100 p-4 shadow-sm">
    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
    <p className={`mt-1 text-xl font-black ${tone}`}>{value}</p>
    {sub && <p className="text-[11px] font-semibold text-slate-500">{sub}</p>}
  </div>
);

const PartnerOverview = ({ onOpenTab }) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [metric, setMetric] = useState('earnings');

  useEffect(() => {
    venuePartnerService.getDashboard()
      .then((r) => setData(r?.data || null))
      .catch((e) => setError(e?.message || 'Could not load the dashboard'));
  }, []);

  const maxValue = useMemo(() => Math.max(1, ...(data?.daily || []).map((d) => d[metric] || 0)), [data, metric]);

  if (error) return <p className="py-16 text-center text-sm font-semibold text-rose-600">{error}</p>;
  if (!data) return <div className="py-20 flex justify-center text-slate-400"><Loader2 className="animate-spin" /></div>;

  const { today, totals, partner, venues = {} } = data;
  const last30 = (data.daily || []).reduce((sum, d) => sum + (d[metric] || 0), 0);

  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 p-5 text-white shadow-lg">
        <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Today · {today.date}</p>
        <div className="mt-2 grid grid-cols-3 gap-3">
          <div><p className="text-2xl font-black">{today.bookings}</p><p className="text-[11px] font-semibold opacity-80">Bookings</p></div>
          <div><p className="text-2xl font-black">{today.tickets}</p><p className="text-[11px] font-semibold opacity-80">Tickets</p></div>
          <div><p className="text-2xl font-black">{today.checkedInTickets}</p><p className="text-[11px] font-semibold opacity-80">Checked in</p></div>
        </div>
        <button type="button" onClick={() => onOpenTab('scan')} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-white/15 py-2.5 text-sm font-black">
          <ScanLine size={16} /> Scan visitor ticket
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Wallet balance" value={money(partner?.wallet?.balance)} sub="Available for payout" tone="text-emerald-600" />
        <StatCard label="Your earnings" value={money(totals.earnings)} sub={`After ${partner?.commissionPercent ?? 0}% platform commission`} />
        <StatCard label="Ticket sales" value={money(totals.sales)} sub={`${totals.ticketsSold} tickets · ${totals.bookings} bookings`} />
        <StatCard label="Refunded" value={money(totals.refunded)} sub={`${totals.cancelledBookings} cancelled`} tone="text-rose-600" />
      </div>

      <div className="rounded-3xl bg-white border border-slate-100 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Last 30 days</p>
            <p className="text-lg font-black text-slate-900">{metric === 'tickets' ? `${last30} tickets` : money(last30)}</p>
          </div>
          <div className="flex rounded-full bg-slate-100 p-0.5 text-[10px] font-black">
            {['earnings', 'sales', 'tickets'].map((key) => (
              <button key={key} type="button" onClick={() => setMetric(key)} className={`rounded-full px-2.5 py-1 capitalize ${metric === key ? 'bg-white text-slate-900 shadow' : 'text-slate-500'}`}>{key}</button>
            ))}
          </div>
        </div>
        <div className="mt-4 flex h-32 items-end gap-[3px]">
          {(data.daily || []).map((day) => (
            <div key={day.date} className="group relative flex-1">
              <div className="w-full rounded-t bg-indigo-500/80" style={{ height: `${Math.max(2, ((day[metric] || 0) / maxValue) * 128)}px` }} />
              <span className="pointer-events-none absolute bottom-full left-1/2 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-1.5 py-0.5 text-[10px] font-bold text-white group-hover:block">
                {day.date.slice(5)}: {metric === 'tickets' ? day.tickets : money(day[metric])}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl bg-white border border-slate-100 p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-black text-slate-900">Upcoming visits</p>
          <button type="button" onClick={() => onOpenTab('bookings')} className="text-xs font-black text-indigo-600">View all</button>
        </div>
        {(data.upcoming || []).length === 0 ? (
          <p className="py-4 text-center text-xs font-semibold text-slate-400">No upcoming bookings.</p>
        ) : data.upcoming.map((b) => (
          <div key={b.id} className="flex items-center justify-between border-t border-slate-100 py-2.5 first:border-t-0">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-900">{b.customer?.name || 'Visitor'} · {b.totalTickets} ticket(s)</p>
              <p className="text-[11px] font-semibold text-slate-500">{b.venue?.name} · {b.visitDate} · {b.slot?.label}</p>
            </div>
            <p className="shrink-0 text-sm font-black text-emerald-600">{money(b.partnerEarning)}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-white border border-slate-100 p-4 text-xs font-semibold text-slate-600 shadow-sm">
        Venues: {venues.active || 0} live · {venues.pending || 0} awaiting approval · {venues.rejected || 0} need changes · {venues.inactive || 0} inactive
      </div>
    </div>
  );
};

export default PartnerOverview;
