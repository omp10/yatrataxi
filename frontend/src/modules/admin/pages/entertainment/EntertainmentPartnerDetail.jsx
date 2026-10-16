import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { entertainmentAdminService as api } from '../../services/entertainmentAdminService';
import { PartnerFormModal } from './EntertainmentPartners';
import { PageHeader, StatCard, StatusPill } from './entertainmentUi';
import { VENUE_STATUS, cardClass, formatDate, money, primaryButton, secondaryButton, unwrap } from './entertainmentFormat';

const EntertainmentPartnerDetail = () => {
  const navigate = useNavigate();
  const { partnerId } = useParams();
  const [partner, setPartner] = useState(null);
  const [editing, setEditing] = useState(false);

  const load = useCallback(() => api.getPartner(partnerId)
    .then((r) => setPartner(unwrap(r, null)))
    .catch((e) => toast.error(e?.message || 'Could not load the partner')), [partnerId]);

  useEffect(() => { load(); }, [load]);

  if (!partner) return <div className="flex justify-center p-16 text-slate-400"><Loader2 className="animate-spin" /></div>;

  const payout = partner.payout || {};

  return (
    <div className="p-6">
      <button type="button" onClick={() => navigate('/admin/entertainment/partners')} className="mb-3 flex items-center gap-1 text-xs font-black text-slate-500"><ArrowLeft size={14} />All partners</button>
      <PageHeader
        title={partner.businessName || partner.name}
        subtitle={`${partner.name} · ${partner.phone}${partner.email ? ` · ${partner.email}` : ''}${partner.city ? ` · ${partner.city}` : ''}`}
        actions={(
          <>
            <button type="button" onClick={() => setEditing(true)} className={secondaryButton}>Edit partner</button>
            <button type="button" onClick={() => navigate(`/admin/entertainment/venues/new?partnerId=${partner.id}`)} className={`${primaryButton} flex items-center gap-1.5`}><Plus size={14} />Add venue</button>
          </>
        )}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Wallet balance" value={money(partner.wallet?.balance)} sub={`Paid out ${money(partner.wallet?.lifetimePaidOut)}`} tone="text-emerald-600" />
        <StatCard label="Ticket sales" value={money(partner.stats?.sales)} sub={`${partner.stats?.tickets || 0} tickets · ${partner.stats?.bookings || 0} bookings`} />
        <StatCard label="Platform commission" value={money(partner.stats?.commission)} sub={`Default rate ${partner.commissionPercent}% · GST ${money(partner.stats?.gst)}`} />
        <StatCard label="Partner earnings" value={money(partner.stats?.earnings)} sub={`Status: ${partner.status}`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className={cardClass}>
          <p className="mb-3 text-sm font-black text-slate-900">Venues</p>
          {(partner.venues || []).length === 0 ? (
            <p className="py-6 text-center text-sm font-semibold text-slate-400">No venues yet.</p>
          ) : partner.venues.map((v) => {
            const status = VENUE_STATUS[v.status] || VENUE_STATUS.pending;
            return (
              <button key={v.id} type="button" onClick={() => navigate(`/admin/entertainment/venues/${v.id}`)} className="flex w-full items-center justify-between border-t border-slate-100 py-3 text-left first:border-t-0">
                <div>
                  <p className="font-black text-slate-900">{v.name}</p>
                  <p className="text-xs font-semibold text-slate-500">{v.city} · commission {v.commissionPercent ?? partner.commissionPercent}%{v.commissionPercent !== null && v.commissionPercent !== undefined ? ' (override)' : ''}</p>
                </div>
                <StatusPill className={status.className}>{status.label}</StatusPill>
              </button>
            );
          })}
        </div>

        <div className={cardClass}>
          <p className="mb-3 text-sm font-black text-slate-900">Payout details</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <p className="text-slate-500">UPI</p><p className="font-bold">{payout.upiId || '-'}</p>
            <p className="text-slate-500">Account holder</p><p className="font-bold">{payout.accountHolder || '-'}</p>
            <p className="text-slate-500">Bank</p><p className="font-bold">{payout.bankName || '-'}</p>
            <p className="text-slate-500">Account no.</p><p className="font-bold">{payout.accountNumber || '-'}</p>
            <p className="text-slate-500">IFSC</p><p className="font-bold">{payout.ifscCode || '-'}</p>
          </div>
        </div>

        <div className={`${cardClass} xl:col-span-2`}>
          <p className="mb-3 text-sm font-black text-slate-900">Wallet transactions</p>
          {(partner.transactions || []).length === 0 ? (
            <p className="py-6 text-center text-sm font-semibold text-slate-400">No transactions yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <tr><th className="py-2 pr-4">Date</th><th className="py-2 pr-4">Details</th><th className="py-2 pr-4 text-right">Amount</th><th className="py-2 text-right">Balance</th></tr>
                </thead>
                <tbody>
                  {partner.transactions.map((t) => (
                    <tr key={t.id} className="border-t border-slate-100">
                      <td className="py-2 pr-4 text-xs font-semibold text-slate-500">{formatDate(t.createdAt)}</td>
                      <td className="py-2 pr-4 font-semibold">{t.title}</td>
                      <td className={`py-2 pr-4 text-right font-black ${t.kind === 'credit' ? 'text-emerald-600' : 'text-rose-600'}`}>{t.kind === 'credit' ? '+' : '-'}{money(t.amount)}</td>
                      <td className="py-2 text-right font-bold">{money(t.balanceAfter)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {editing && <PartnerFormModal partner={partner} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); load(); }} />}
    </div>
  );
};

export default EntertainmentPartnerDetail;
