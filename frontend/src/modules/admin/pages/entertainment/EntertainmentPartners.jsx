import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { entertainmentAdminService as api } from '../../services/entertainmentAdminService';
import { Modal, PageHeader, StatCard, StatusPill } from './entertainmentUi';
import { cardClass, inputClass, labelClass, money, primaryButton, secondaryButton, unwrap } from './entertainmentFormat';

const emptyPartner = { name: '', businessName: '', phone: '', email: '', city: '', commissionPercent: 10, status: 'active' };

export const PartnerFormModal = ({ partner, onClose, onSaved }) => {
  const [form, setForm] = useState(() => ({ ...emptyPartner, ...(partner || {}) }));
  const [saving, setSaving] = useState(false);
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name, businessName: form.businessName, phone: form.phone, email: form.email, city: form.city,
        commissionPercent: Number(form.commissionPercent), status: form.status,
      };
      const response = partner?.id ? await api.updatePartner(partner.id, payload) : await api.createPartner(payload);
      toast.success(partner?.id ? 'Partner updated' : 'Partner created. They can now log in with OTP in the driver app (Venue tab).');
      onSaved(unwrap(response));
    } catch (error) {
      toast.error(error?.message || 'Could not save the partner');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={partner?.id ? 'Edit partner' : 'New venue partner'} onClose={onClose}>
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        <div><label className={labelClass}>Contact name *</label><input required value={form.name} onChange={(e) => set('name', e.target.value)} className={inputClass} /></div>
        <div><label className={labelClass}>Business name</label><input value={form.businessName} onChange={(e) => set('businessName', e.target.value)} className={inputClass} /></div>
        <div><label className={labelClass}>Mobile (OTP login) *</label><input required inputMode="numeric" maxLength={10} value={form.phone} onChange={(e) => set('phone', e.target.value.replace(/\D/g, ''))} className={inputClass} /></div>
        <div><label className={labelClass}>Email</label><input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} className={inputClass} /></div>
        <div><label className={labelClass}>City</label><input value={form.city} onChange={(e) => set('city', e.target.value)} className={inputClass} /></div>
        <div>
          <label className={labelClass}>Platform commission (%) *</label>
          <input required type="number" min="0" max="100" step="0.01" value={form.commissionPercent} onChange={(e) => set('commissionPercent', e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Status</label>
          <select value={form.status} onChange={(e) => set('status', e.target.value)} className={inputClass}>
            <option value="active">Active</option>
            <option value="inactive">Inactive (blocks login and sales)</option>
          </select>
        </div>
        <p className="sm:col-span-2 text-xs font-semibold text-slate-500">
          The commission is kept by the platform from every ticket sale; the partner earns the rest. A venue can override it.
        </p>
        <div className="sm:col-span-2 flex justify-end gap-2">
          <button type="button" onClick={onClose} className={secondaryButton}>Cancel</button>
          <button type="submit" disabled={saving} className={primaryButton}>{saving ? 'Saving...' : 'Save partner'}</button>
        </div>
      </form>
    </Modal>
  );
};

const EntertainmentPartners = () => {
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [partners, setPartners] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async (query = '') => {
    setLoading(true);
    try {
      const [overviewResponse, partnerResponse] = await Promise.all([api.getOverview(), api.getPartners({ search: query || undefined })]);
      setOverview(unwrap(overviewResponse, null));
      setPartners(unwrap(partnerResponse, []));
    } catch (error) {
      toast.error(error?.message || 'Could not load partners');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => load(search.trim()), search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, search]);

  return (
    <div className="p-6">
      <PageHeader
        title="Venue Partners"
        subtitle="Partners sign in to the driver app with their mobile number and manage their venues, prices and gate check-in."
        actions={<button type="button" onClick={() => setEditing({})} className={`${primaryButton} flex items-center gap-1.5`}><Plus size={14} />New partner</button>}
      />

      {overview && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Ticket sales" value={money(overview.sales)} sub={`${overview.tickets} tickets · ${overview.bookings} bookings`} />
          <StatCard label="Platform commission" value={money(overview.commission)} tone="text-emerald-600" />
          <StatCard label="Partner earnings" value={money(overview.partnerEarnings)} />
          <StatCard
            label="Pending payouts"
            value={money(overview.pendingWithdrawals?.amount)}
            sub={`${overview.pendingWithdrawals?.count || 0} request(s) · ${overview.venues?.pending || 0} venue(s) awaiting approval`}
            tone="text-amber-600"
          />
        </div>
      )}

      <div className={cardClass}>
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
          <Search size={16} className="text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, business or phone" className="flex-1 text-sm font-semibold outline-none" />
        </div>
        {loading ? (
          <div className="flex justify-center py-12 text-slate-400"><Loader2 className="animate-spin" /></div>
        ) : partners.length === 0 ? (
          <p className="py-12 text-center text-sm font-semibold text-slate-400">No partners yet. Create one to start selling tickets.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                <tr><th className="py-2 pr-4">Partner</th><th className="py-2 pr-4">Phone</th><th className="py-2 pr-4">Commission</th><th className="py-2 pr-4">Venues</th><th className="py-2 pr-4">Wallet</th><th className="py-2 pr-4">Status</th><th className="py-2" /></tr>
              </thead>
              <tbody>
                {partners.map((p) => (
                  <tr key={p.id} className="border-t border-slate-100">
                    <td className="py-3 pr-4"><p className="font-black text-slate-900">{p.businessName || p.name}</p><p className="text-xs font-semibold text-slate-500">{p.name}{p.city ? ` · ${p.city}` : ''}</p></td>
                    <td className="py-3 pr-4 font-semibold">{p.phone}</td>
                    <td className="py-3 pr-4 font-bold">{p.commissionPercent}%</td>
                    <td className="py-3 pr-4 font-bold">{p.venueCount}</td>
                    <td className="py-3 pr-4 font-bold text-emerald-600">{money(p.wallet?.balance)}</td>
                    <td className="py-3 pr-4"><StatusPill className={p.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}>{p.status}</StatusPill></td>
                    <td className="py-3 text-right whitespace-nowrap">
                      <button type="button" onClick={() => setEditing(p)} className="mr-2 text-xs font-black text-slate-600">Edit</button>
                      <button type="button" onClick={() => navigate(`/admin/entertainment/partners/${p.id}`)} className="text-xs font-black text-indigo-600">Open</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <PartnerFormModal
          partner={editing.id ? editing : null}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(search.trim()); }}
        />
      )}
    </div>
  );
};

export default EntertainmentPartners;
