import React, { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { entertainmentAdminService as api } from '../../services/entertainmentAdminService';
import { Modal, PageHeader, StatusPill } from './entertainmentUi';
import { cardClass, formatDate, inputClass, labelClass, money, primaryButton, secondaryButton, unwrap } from './entertainmentFormat';

const STATUS_STYLES = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200',
};

const ReviewModal = ({ request, action, onClose, onDone }) => {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const approve = action === 'approve';
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      if (approve) await api.approveWithdrawal(request.id, note);
      else await api.rejectWithdrawal(request.id, note);
      toast.success(approve ? 'Payout approved and deducted from the wallet' : 'Payout rejected');
      onDone();
    } catch (error) {
      toast.error(error?.message || 'Could not update the request');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title={`${approve ? 'Approve' : 'Reject'} payout of ${money(request.amount)}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        {approve && (
          <p className="text-sm font-semibold text-slate-600">
            Transfer {money(request.amount)} to {request.partnerName} first, then approve. Approving deducts it from their wallet (balance {money(request.walletBalance)}).
          </p>
        )}
        <div>
          <label className={labelClass}>{approve ? 'Transfer reference / note' : 'Reason (shown to the partner)'}</label>
          <input required={!approve} value={note} onChange={(e) => setNote(e.target.value)} className={inputClass} />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={secondaryButton}>Back</button>
          <button type="submit" disabled={busy} className={`${primaryButton} ${approve ? 'bg-emerald-600' : 'bg-rose-600'}`}>{busy ? 'Saving...' : approve ? 'Approve' : 'Reject'}</button>
        </div>
      </form>
    </Modal>
  );
};

const EntertainmentPayouts = () => {
  const [status, setStatus] = useState('pending');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRequests(unwrap(await api.getWithdrawals(status ? { status } : {}), []));
    } catch (error) {
      toast.error(error?.message || 'Could not load payout requests');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-6">
      <PageHeader title="Partner Payouts" subtitle="Venue partners request payouts from their wallet. Pay them, then approve here." />
      <div className={cardClass}>
        <div className="mb-4 flex gap-2">
          {['pending', 'approved', 'rejected', ''].map((value) => (
            <button key={value || 'all'} type="button" onClick={() => setStatus(value)} className={`rounded-full px-4 py-1.5 text-xs font-black capitalize ${status === value ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>{value || 'all'}</button>
          ))}
        </div>
        {loading ? (
          <div className="flex justify-center py-12 text-slate-400"><Loader2 className="animate-spin" /></div>
        ) : requests.length === 0 ? (
          <p className="py-12 text-center text-sm font-semibold text-slate-400">No payout requests.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                <tr><th className="py-2 pr-4">Requested</th><th className="py-2 pr-4">Partner</th><th className="py-2 pr-4">Pay to</th><th className="py-2 pr-4 text-right">Amount</th><th className="py-2 pr-4">Status</th><th className="py-2" /></tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100 align-top">
                    <td className="py-3 pr-4 text-xs font-semibold text-slate-500">{formatDate(r.createdAt)}</td>
                    <td className="py-3 pr-4"><p className="font-bold">{r.partnerName}</p><p className="text-xs font-semibold text-slate-500">{r.partnerPhone} · wallet {money(r.walletBalance)}</p></td>
                    <td className="py-3 pr-4 text-xs font-semibold text-slate-600">
                      {r.payout?.upiId && <p>UPI: {r.payout.upiId}</p>}
                      {r.payout?.accountNumber && <p>{r.payout.accountHolder} · {r.payout.bankName} · {r.payout.accountNumber} · {r.payout.ifscCode}</p>}
                      {r.note && <p className="text-slate-400">"{r.note}"</p>}
                    </td>
                    <td className="py-3 pr-4 text-right font-black">{money(r.amount)}</td>
                    <td className="py-3 pr-4"><StatusPill className={STATUS_STYLES[r.status]}>{r.status}</StatusPill>{r.adminNote && <p className="mt-1 text-[11px] text-slate-500">{r.adminNote}</p>}</td>
                    <td className="py-3 text-right whitespace-nowrap">
                      {r.status === 'pending' && (
                        <>
                          <button type="button" onClick={() => setReviewing({ request: r, action: 'approve' })} className="mr-3 text-xs font-black text-emerald-600">Approve</button>
                          <button type="button" onClick={() => setReviewing({ request: r, action: 'reject' })} className="text-xs font-black text-rose-600">Reject</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {reviewing && <ReviewModal {...reviewing} onClose={() => setReviewing(null)} onDone={() => { setReviewing(null); load(); }} />}
    </div>
  );
};

export default EntertainmentPayouts;
