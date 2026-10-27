import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { LogOut, Trash2 } from 'lucide-react';
import { agentService, logoutAgent } from '../services/agentService';

const cardClass = 'rounded-[30px] border border-white/70 bg-white/88 p-5 shadow-[0_18px_36px_rgba(20,58,90,0.08)] backdrop-blur-xl';
const inputClass = 'w-full rounded-[22px] border border-[#d8e5f1] bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-[#143a5a]';

const AgentProfile = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    notes: '',
    payout: {
      bankName: '',
      accountHolder: '',
      accountNumber: '',
      ifscCode: '',
      upiId: '',
    },
  });

  const [deletionStatus, setDeletionStatus] = useState({ status: 'none', requestedAt: null, adminNote: '' });
  const [showDelete, setShowDelete] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const load = async () => {
      const response = await agentService.getProfile();
      const payload = response?.data?.data || response?.data || {};
      setDeletionStatus(payload.deletionRequest || { status: 'none' });
      setForm({
        name: payload.name || '',
        email: payload.email || '',
        notes: payload.notes || '',
        payout: {
          bankName: payload.payout?.bankName || '',
          accountHolder: payload.payout?.accountHolder || '',
          accountNumber: payload.payout?.accountNumber || '',
          ifscCode: payload.payout?.ifscCode || '',
          upiId: payload.payout?.upiId || '',
        },
      });
    };

    load();
  }, []);

  const saveProfile = async () => {
    await agentService.updateProfile(form);
    toast.success('Agent profile updated');
  };

  const submitDeletion = async () => {
    if (!deleteReason.trim()) {
      toast.error('Please tell us why you want to delete your account');
      return;
    }
    setIsDeleting(true);
    try {
      const response = await agentService.requestAccountDeletion(deleteReason.trim());
      const payload = response?.data?.data || response?.data || {};
      setDeletionStatus({ status: 'pending', requestedAt: payload.requestedAt || new Date().toISOString() });
      setShowDelete(false);
      toast.success('Deletion request submitted');
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || 'Could not submit deletion request');
    } finally {
      setIsDeleting(false);
    }
  };

  const deletionPending = deletionStatus?.status === 'pending';

  return (
    <div className="space-y-4">
      <section className={cardClass}>
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#5b7a93]">Profile basics</p>
        <div className="mt-4 grid gap-3">
          <input className={inputClass} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Agent name" />
          <input className={inputClass} value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder="Email" />
          <textarea className={`${inputClass} min-h-24 resize-none`} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Notes" />
        </div>
      </section>

      <section className={cardClass}>
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#5b7a93]">Payout details</p>
        <div className="mt-4 grid gap-3">
          <input className={inputClass} value={form.payout.bankName} onChange={(event) => setForm((current) => ({ ...current, payout: { ...current.payout, bankName: event.target.value } }))} placeholder="Bank name" />
          <input className={inputClass} value={form.payout.accountHolder} onChange={(event) => setForm((current) => ({ ...current, payout: { ...current.payout, accountHolder: event.target.value } }))} placeholder="Account holder" />
          <input className={inputClass} value={form.payout.accountNumber} onChange={(event) => setForm((current) => ({ ...current, payout: { ...current.payout, accountNumber: event.target.value } }))} placeholder="Account number" />
          <input className={inputClass} value={form.payout.ifscCode} onChange={(event) => setForm((current) => ({ ...current, payout: { ...current.payout, ifscCode: event.target.value } }))} placeholder="IFSC code" />
          <input className={inputClass} value={form.payout.upiId} onChange={(event) => setForm((current) => ({ ...current, payout: { ...current.payout, upiId: event.target.value } }))} placeholder="UPI ID" />
        </div>
      </section>

      <button
        type="button"
        onClick={saveProfile}
        className="w-full rounded-[24px] bg-[#143a5a] px-5 py-4 text-sm font-black uppercase tracking-[0.2em] text-white shadow-[0_18px_36px_rgba(20,58,90,0.2)]"
      >
        Save Agent Profile
      </button>

      <button
        type="button"
        onClick={() => logoutAgent(navigate)}
        className="w-full rounded-[24px] border border-rose-200 bg-rose-50/80 px-5 py-3.5 text-xs font-black uppercase tracking-[0.2em] text-rose-600 shadow-sm hover:bg-rose-100 transition flex items-center justify-center gap-2"
      >
        <LogOut size={16} />
        Log Out from Agent Desk
      </button>

      <section className="rounded-[30px] border border-rose-100 bg-white/88 p-5 shadow-sm">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-rose-500">Delete account</p>
        {deletionPending ? (
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
            Your deletion request was submitted
            {deletionStatus.requestedAt ? ` on ${new Date(deletionStatus.requestedAt).toLocaleDateString('en-IN')}` : ''}.
            Our team will settle any remaining wallet balance and delete your account and personal data within 30 days.
          </p>
        ) : (
          <>
            <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
              Permanently delete your agent account and personal data (KYC documents, bank details, contact info).
              Withdraw your wallet balance first. Booking and commission records are kept only as required by law.
            </p>
            {deletionStatus?.status === 'rejected' && deletionStatus.adminNote ? (
              <p className="mt-2 text-xs font-bold text-rose-500">Previous request declined: {deletionStatus.adminNote}</p>
            ) : null}
            {showDelete ? (
              <div className="mt-4 space-y-3">
                <textarea
                  className={`${inputClass} min-h-24 resize-none`}
                  value={deleteReason}
                  onChange={(event) => setDeleteReason(event.target.value)}
                  placeholder="Reason for deleting your account"
                  maxLength={300}
                />
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowDelete(false)}
                    className="flex-1 rounded-[20px] border border-slate-200 px-4 py-3 text-xs font-black uppercase tracking-[0.15em] text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={submitDeletion}
                    className="flex-1 rounded-[20px] bg-rose-600 px-4 py-3 text-xs font-black uppercase tracking-[0.15em] text-white disabled:opacity-60"
                  >
                    {isDeleting ? 'Submitting...' : 'Confirm delete'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowDelete(true)}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-[20px] border border-rose-200 px-4 py-3 text-xs font-black uppercase tracking-[0.2em] text-rose-600 hover:bg-rose-50"
              >
                <Trash2 size={16} />
                Delete my account
              </button>
            )}
          </>
        )}
      </section>
    </div>
  );
};

export default AgentProfile;
