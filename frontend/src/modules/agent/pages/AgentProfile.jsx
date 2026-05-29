import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { agentService } from '../services/agentService';

const cardClass = 'rounded-[30px] border border-white/70 bg-white/88 p-5 shadow-[0_18px_36px_rgba(20,58,90,0.08)] backdrop-blur-xl';
const inputClass = 'w-full rounded-[22px] border border-[#d8e5f1] bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-[#143a5a]';

const AgentProfile = () => {
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

  useEffect(() => {
    const load = async () => {
      const response = await agentService.getProfile();
      const payload = response?.data?.data || response?.data || {};
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
    </div>
  );
};

export default AgentProfile;
