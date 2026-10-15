import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { entertainmentAdminService as api } from '../../services/entertainmentAdminService';
import { Modal, PageHeader, StatusPill } from './entertainmentUi';
import { VENUE_STATUS, cardClass, inputClass, labelClass, primaryButton, secondaryButton, unwrap } from './entertainmentFormat';

// Approve / reject / deactivate a venue and set its commission override.
export const VenueReviewModal = ({ venue, onClose, onSaved }) => {
  const [status, setStatus] = useState(venue.status);
  const [commission, setCommission] = useState(venue.commissionPercent ?? '');
  const [adminNote, setAdminNote] = useState(venue.adminNote || '');
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (status === 'rejected' && !adminNote.trim()) {
      toast.error('Tell the partner what to change before rejecting');
      return;
    }
    setSaving(true);
    try {
      await api.updateVenue(venue.id, { status, commissionPercent: commission === '' ? null : Number(commission), adminNote });
      toast.success('Venue updated');
      onSaved();
    } catch (error) {
      toast.error(error?.message || 'Could not update the venue');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`Review: ${venue.name}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className={labelClass}>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
            <option value="active">Live (approved, open for booking)</option>
            <option value="pending">Pending approval</option>
            <option value="rejected">Rejected (partner must change and resubmit)</option>
            <option value="inactive">Inactive (hidden, no new bookings)</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Commission override (%)</label>
          <input type="number" min="0" max="100" step="0.01" value={commission} onChange={(e) => setCommission(e.target.value)} placeholder={`Partner default: ${venue.partnerCommission ?? venue.effectiveCommissionPercent}%`} className={inputClass} />
          <p className="mt-1 text-[11px] font-semibold text-slate-500">Leave empty to use the partner's default rate. Applies to new bookings only.</p>
        </div>
        <div>
          <label className={labelClass}>Note to partner</label>
          <textarea rows={3} value={adminNote} onChange={(e) => setAdminNote(e.target.value)} className={inputClass} />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={secondaryButton}>Cancel</button>
          <button type="submit" disabled={saving} className={primaryButton}>{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </form>
    </Modal>
  );
};

const EntertainmentVenues = () => {
  const navigate = useNavigate();
  const [venues, setVenues] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({ status: '', categoryId: '', search: '' });
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(null);

  useEffect(() => {
    api.getCategories().then((r) => setCategories(unwrap(r, []))).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
      setVenues(unwrap(await api.getVenues(params), []));
    } catch (error) {
      toast.error(error?.message || 'Could not load venues');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const timer = setTimeout(load, filters.search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, filters.search]);

  const setFilter = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="p-6">
      <PageHeader title="Venues" subtitle="Approve partner venues, set commission overrides and edit details. Add new venues from a partner's page." />
      <div className={cardClass}>
        <div className="mb-4 flex flex-wrap gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
            <Search size={16} className="text-slate-400" />
            <input value={filters.search} onChange={(e) => setFilter('search', e.target.value)} placeholder="Search venue name" className="flex-1 text-sm font-semibold outline-none" />
          </div>
          <select value={filters.status} onChange={(e) => setFilter('status', e.target.value)} className={`${inputClass} w-auto`}>
            <option value="">All statuses</option>
            {Object.entries(VENUE_STATUS).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}
          </select>
          <select value={filters.categoryId} onChange={(e) => setFilter('categoryId', e.target.value)} className={`${inputClass} w-auto`}>
            <option value="">All categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-12 text-slate-400"><Loader2 className="animate-spin" /></div>
        ) : venues.length === 0 ? (
          <p className="py-12 text-center text-sm font-semibold text-slate-400">No venues match these filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                <tr><th className="py-2 pr-4">Venue</th><th className="py-2 pr-4">Partner</th><th className="py-2 pr-4">Tickets</th><th className="py-2 pr-4">Commission</th><th className="py-2 pr-4">Status</th><th className="py-2" /></tr>
              </thead>
              <tbody>
                {venues.map((v) => {
                  const status = VENUE_STATUS[v.status] || VENUE_STATUS.pending;
                  const activeTickets = (v.ticketTypes || []).filter((t) => t.active);
                  return (
                    <tr key={v.id} className="border-t border-slate-100 align-top">
                      <td className="py-3 pr-4">
                        <p className="font-black text-slate-900">{v.name}</p>
                        <p className="text-xs font-semibold text-slate-500">{v.categoryName}{v.city ? ` · ${v.city}` : ''}</p>
                      </td>
                      <td className="py-3 pr-4 font-semibold">{v.partnerName}</td>
                      <td className="py-3 pr-4 text-xs font-semibold text-slate-600">
                        {activeTickets.map((t) => `${t.name} ₹${t.price}${t.weekendPrice ? `/₹${t.weekendPrice}` : ''}`).join(', ') || '-'}
                      </td>
                      <td className="py-3 pr-4 font-bold">{v.effectiveCommissionPercent}%{v.commissionPercent !== null && v.commissionPercent !== undefined ? ' *' : ''}</td>
                      <td className="py-3 pr-4"><StatusPill className={status.className}>{status.label}</StatusPill></td>
                      <td className="py-3 text-right whitespace-nowrap">
                        <button type="button" onClick={() => setReviewing(v)} className="mr-3 text-xs font-black text-indigo-600">{v.status === 'pending' ? 'Review' : 'Status'}</button>
                        <button type="button" onClick={() => navigate(`/admin/entertainment/venues/${v.id}`)} className="text-xs font-black text-slate-600">Edit</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="mt-3 text-[11px] font-semibold text-slate-400">* venue-specific commission override</p>
          </div>
        )}
      </div>

      {reviewing && <VenueReviewModal venue={reviewing} onClose={() => setReviewing(null)} onSaved={() => { setReviewing(null); load(); }} />}
    </div>
  );
};

export default EntertainmentVenues;
