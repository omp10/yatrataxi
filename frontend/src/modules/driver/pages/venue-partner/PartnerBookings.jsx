import React, { useEffect, useState } from 'react';
import { Loader2, Search, Phone } from 'lucide-react';
import { venuePartnerService } from '../../services/venuePartnerService';
import { money } from './partnerFormat';

const selectClass = 'rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-bold text-slate-700 outline-none';

const PartnerBookings = () => {
  const [venues, setVenues] = useState([]);
  const [filters, setFilters] = useState({ search: '', visitDate: '', venueId: '', status: '', checkIn: '' });
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ results: [], total: 0, limit: 30 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    venuePartnerService.getVenues().then((r) => setVenues(r?.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      setLoading(true);
      const params = Object.fromEntries(Object.entries({ ...filters, page }).filter(([, v]) => v !== ''));
      venuePartnerService.getBookings(params)
        .then((r) => { if (active) { setData(r?.data || { results: [], total: 0, limit: 30 }); setError(''); } })
        .catch((e) => { if (active) setError(e?.message || 'Could not load bookings'); })
        .finally(() => { if (active) setLoading(false); });
    }, filters.search ? 300 : 0);
    return () => { active = false; clearTimeout(timer); };
  }, [filters, page]);

  const setFilter = (key, value) => { setPage(1); setFilters((prev) => ({ ...prev, [key]: value })); };
  const pages = Math.max(1, Math.ceil((data.total || 0) / (data.limit || 30)));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-2xl bg-white border border-slate-200 px-3 py-2.5">
        <Search size={16} className="text-slate-400" />
        <input value={filters.search} onChange={(e) => setFilter('search', e.target.value)} placeholder="Booking code, name or phone" className="flex-1 bg-transparent text-sm font-semibold outline-none" />
      </div>
      <div className="flex flex-wrap gap-2">
        <input type="date" value={filters.visitDate} onChange={(e) => setFilter('visitDate', e.target.value)} className={selectClass} aria-label="Visit date" />
        <select value={filters.venueId} onChange={(e) => setFilter('venueId', e.target.value)} className={selectClass} aria-label="Venue">
          <option value="">All venues</option>
          {venues.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
        <select value={filters.status} onChange={(e) => setFilter('status', e.target.value)} className={selectClass} aria-label="Status">
          <option value="">All statuses</option>
          <option value="confirmed">Confirmed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select value={filters.checkIn} onChange={(e) => setFilter('checkIn', e.target.value)} className={selectClass} aria-label="Check-in">
          <option value="">Any check-in</option>
          <option value="pending">Not checked in</option>
          <option value="checked_in">Checked in</option>
        </select>
      </div>

      <p className="text-[11px] font-bold text-slate-500">{data.total || 0} booking(s)</p>

      {loading ? (
        <div className="py-16 flex justify-center text-slate-400"><Loader2 className="animate-spin" /></div>
      ) : error ? (
        <p className="py-10 text-center text-sm font-semibold text-rose-600">{error}</p>
      ) : (data.results || []).length === 0 ? (
        <p className="py-10 text-center text-sm font-semibold text-slate-400">No bookings match these filters.</p>
      ) : data.results.map((b) => {
        const checkedIn = b.checkIn?.status === 'checked_in';
        return (
          <div key={b.id} className="rounded-2xl bg-white border border-slate-100 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-black text-slate-900">{b.customer?.name || 'Visitor'}</p>
                {b.customer?.phone && <a href={`tel:${b.customer.phone}`} className="flex items-center gap-1 text-xs font-semibold text-indigo-600"><Phone size={11} />{b.customer.phone}</a>}
                <p className="font-mono text-[11px] font-bold text-slate-400">{b.bookingCode}{b.bookingSource === 'agent' ? ' · via agent' : ''}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${b.status === 'cancelled' ? 'bg-rose-50 text-rose-700' : checkedIn ? 'bg-slate-100 text-slate-600' : 'bg-emerald-50 text-emerald-700'}`}>
                {b.status === 'cancelled' ? 'cancelled' : checkedIn ? 'checked in' : 'valid'}
              </span>
            </div>
            <p className="mt-2 text-xs font-semibold text-slate-600">{b.venue?.name} · {b.visitDate} · {b.slot?.label} ({b.slot?.startTime}-{b.slot?.endTime})</p>
            <p className="mt-1 text-xs font-semibold text-slate-600">{(b.items || []).map((i) => `${i.name} × ${i.quantity}`).join(', ')}</p>
            <div className="mt-2 flex justify-between border-t border-slate-100 pt-2 text-xs font-bold">
              <span className="text-slate-500">Tickets {money(b.subtotal ?? b.amount)} · Commission {money(b.commissionAmount)}</span>
              <span className="text-emerald-600">You earn {money(b.status === 'cancelled' ? b.partnerEarning - (b.partnerEarning * ((b.cancellation?.refundAmount || 0) / (b.amount || 1))) : b.partnerEarning)}</span>
            </div>
          </div>
        );
      })}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-3 py-2">
          <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-full border border-slate-200 px-4 py-1.5 text-xs font-bold disabled:opacity-40">Previous</button>
          <span className="text-xs font-bold text-slate-500">{page} / {pages}</span>
          <button type="button" disabled={page >= pages} onClick={() => setPage(page + 1)} className="rounded-full border border-slate-200 px-4 py-1.5 text-xs font-bold disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  );
};

export default PartnerBookings;
