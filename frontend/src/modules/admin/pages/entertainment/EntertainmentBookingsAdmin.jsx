import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { entertainmentAdminService as api } from '../../services/entertainmentAdminService';
import { Modal, PageHeader, StatCard, StatusPill } from './entertainmentUi';
import { cardClass, formatDate, inputClass, labelClass, money, primaryButton, secondaryButton, unwrap } from './entertainmentFormat';

const CancelModal = ({ booking, onClose, onDone }) => {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      await api.cancelBooking(booking.id, reason);
      toast.success('Booking cancelled and fully refunded');
      onDone();
    } catch (error) {
      toast.error(error?.message || 'Could not cancel the booking');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title={`Cancel ${booking.bookingCode}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <p className="text-sm font-semibold text-slate-600">
          The customer gets a full refund of {money(booking.amount)}{booking.gstAmount > 0 ? ` (including GST ${money(booking.gstAmount)})` : ''}. The partner's earning ({money(booking.partnerEarning)})
          {booking.agentCommission > 0 ? ` and the agent's commission (${money(booking.agentCommission)})` : ''} will be taken back.
        </p>
        <div><label className={labelClass}>Reason</label><textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} className={inputClass} /></div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={secondaryButton}>Keep booking</button>
          <button type="submit" disabled={busy} className={`${primaryButton} bg-rose-600`}>{busy ? 'Cancelling...' : 'Cancel & refund'}</button>
        </div>
      </form>
    </Modal>
  );
};

const EntertainmentBookingsAdmin = () => {
  const [partners, setPartners] = useState([]);
  const [filters, setFilters] = useState({ search: '', status: '', partnerId: '', source: '', from: '', to: '' });
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(null);

  useEffect(() => {
    api.getPartners().then((r) => setPartners(unwrap(r, []))).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries({ ...filters, page }).filter(([, v]) => v !== ''));
      setData(unwrap(await api.getBookings(params), null));
    } catch (error) {
      toast.error(error?.message || 'Could not load bookings');
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    const timer = setTimeout(load, filters.search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, filters.search]);

  const setFilter = (key, value) => { setPage(1); setFilters((prev) => ({ ...prev, [key]: value })); };
  const summary = data?.summary || {};
  const pages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <div className="p-6">
      <PageHeader title="Ticket Bookings" subtitle="All paid entertainment bookings. Totals cover confirmed bookings matching the filters." />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Collected (incl. GST)" value={money(summary.sales)} sub={`${summary.tickets || 0} tickets · ${summary.bookings || 0} bookings`} />
        <StatCard label="GST collected" value={money(summary.gst)} sub="Kept by the platform" tone="text-indigo-600" />
        <StatCard label="Platform commission" value={money(summary.commission)} tone="text-emerald-600" />
        <StatCard label="Partner earnings" value={money(summary.partnerEarnings)} />
        <StatCard label="Agent commission" value={money(summary.agentCommission)} sub="Paid by the platform" />
      </div>

      <div className={cardClass}>
        <div className="mb-4 grid gap-2 md:grid-cols-3 xl:grid-cols-6">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 xl:col-span-2">
            <Search size={16} className="text-slate-400" />
            <input value={filters.search} onChange={(e) => setFilter('search', e.target.value)} placeholder="Code, customer, phone, venue" className="flex-1 text-sm font-semibold outline-none" />
          </div>
          <select value={filters.status} onChange={(e) => setFilter('status', e.target.value)} className={inputClass}>
            <option value="">Confirmed & cancelled</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select value={filters.partnerId} onChange={(e) => setFilter('partnerId', e.target.value)} className={inputClass}>
            <option value="">All partners</option>
            {partners.map((p) => <option key={p.id} value={p.id}>{p.businessName || p.name}</option>)}
          </select>
          <select value={filters.source} onChange={(e) => setFilter('source', e.target.value)} className={inputClass}>
            <option value="">App & agents</option>
            <option value="user">Customer app</option>
            <option value="agent">Agents</option>
          </select>
          <div className="flex gap-1">
            <input type="date" value={filters.from} onChange={(e) => setFilter('from', e.target.value)} className={inputClass} aria-label="Visit from" />
            <input type="date" value={filters.to} onChange={(e) => setFilter('to', e.target.value)} className={inputClass} aria-label="Visit to" />
          </div>
        </div>

        {loading && !data ? (
          <div className="flex justify-center py-12 text-slate-400"><Loader2 className="animate-spin" /></div>
        ) : (data?.results || []).length === 0 ? (
          <p className="py-12 text-center text-sm font-semibold text-slate-400">No bookings match these filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                <tr>
                  <th className="py-2 pr-4">Booking</th><th className="py-2 pr-4">Customer</th><th className="py-2 pr-4">Venue & visit</th>
                  <th className="py-2 pr-4 text-right">Paid (incl. GST)</th><th className="py-2 pr-4 text-right">Commission</th><th className="py-2 pr-4 text-right">Partner</th>
                  <th className="py-2 pr-4">Status</th><th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {data.results.map((b) => {
                  const checkedIn = b.checkIn?.status === 'checked_in';
                  return (
                    <tr key={b.id} className="border-t border-slate-100 align-top">
                      <td className="py-3 pr-4"><p className="font-mono text-xs font-black">{b.bookingCode}</p><p className="text-[11px] font-semibold text-slate-500">{formatDate(b.createdAt)}{b.bookingSource === 'agent' ? ' · agent' : ''}</p></td>
                      <td className="py-3 pr-4"><p className="font-bold">{b.customer?.name || '-'}</p><p className="text-xs font-semibold text-slate-500">{b.customer?.phone}</p></td>
                      <td className="py-3 pr-4"><p className="font-bold">{b.venue?.name}</p><p className="text-xs font-semibold text-slate-500">{b.visitDate} · {b.slot?.label} · {b.totalTickets} ticket(s)</p></td>
                      <td className="py-3 pr-4 text-right font-black">{money(b.amount)}{b.gstAmount > 0 && <span className="block text-[10px] font-semibold text-slate-400">tickets {money(b.subtotal)} + GST {money(b.gstAmount)}</span>}</td>
                      <td className="py-3 pr-4 text-right font-bold text-emerald-600">{money(b.commissionAmount)}<span className="block text-[10px] text-slate-400">{b.commissionPercent}%</span></td>
                      <td className="py-3 pr-4 text-right font-bold">{money(b.partnerEarning)}</td>
                      <td className="py-3 pr-4">
                        <StatusPill className={b.status === 'cancelled' ? 'bg-rose-50 text-rose-700 border-rose-200' : checkedIn ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}>
                          {b.status === 'cancelled' ? 'cancelled' : checkedIn ? 'checked in' : 'confirmed'}
                        </StatusPill>
                        {b.cancellation && <p className="mt-1 text-[11px] font-semibold text-slate-500">Refund {money(b.cancellation.refundAmount)}{b.cancellation.refundStatus ? ` (${b.cancellation.refundStatus})` : ''}</p>}
                      </td>
                      <td className="py-3 text-right">
                        {b.status === 'confirmed' && !checkedIn && <button type="button" onClick={() => setCancelling(b)} className="text-xs font-black text-rose-600">Cancel</button>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {pages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-3">
            <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className={secondaryButton}>Previous</button>
            <span className="text-xs font-bold text-slate-500">Page {page} of {pages}</span>
            <button type="button" disabled={page >= pages} onClick={() => setPage(page + 1)} className={secondaryButton}>Next</button>
          </div>
        )}
      </div>

      {cancelling && <CancelModal booking={cancelling} onClose={() => setCancelling(null)} onDone={() => { setCancelling(null); load(); }} />}
    </div>
  );
};

export default EntertainmentBookingsAdmin;
