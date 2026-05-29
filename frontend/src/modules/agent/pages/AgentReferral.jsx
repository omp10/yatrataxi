import React, { useEffect, useState } from 'react';
import { Copy, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { agentService } from '../services/agentService';

const cardClass = 'rounded-[30px] border border-white/70 bg-white/88 p-5 shadow-[0_18px_36px_rgba(20,58,90,0.08)] backdrop-blur-xl';

const AgentReferral = () => {
  const [payload, setPayload] = useState(null);

  useEffect(() => {
    const load = async () => {
      const response = await agentService.getReferralSummary();
      setPayload(response?.data?.data || response?.data || null);
    };

    load();
  }, []);

  const qrValue = payload?.qrValue || '';
  const qrUrl = qrValue
    ? `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(qrValue)}`
    : '';

  const copyValue = async (value, label) => {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  };

  return (
    <div className="space-y-4">
      <section className={`${cardClass} bg-[linear-gradient(155deg,_rgba(20,58,90,1)_0%,_rgba(13,106,168,0.95)_100%)] text-white`}>
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/60">Referral Identity</p>
        <h2 className="mt-2 text-2xl font-black tracking-tight">Your QR pulls users into the app with your code pre-applied.</h2>
        <p className="mt-3 text-sm font-semibold leading-6 text-white/72">
          Once they sign up with your code, their eligible bookings can keep contributing to your wallet automatically.
        </p>
      </section>

      <section className={`${cardClass} text-center`}>
        {qrUrl ? (
          <img src={qrUrl} alt="Agent referral QR" className="mx-auto h-64 w-64 rounded-[28px] border border-[#d9e6f2] bg-white p-3" />
        ) : null}
        <p className="mt-4 text-[10px] font-black uppercase tracking-[0.22em] text-[#5b7a93]">Referral code</p>
        <p className="mt-2 text-3xl font-black tracking-[0.16em] text-[#143a5a]">{payload?.referralCode || '----'}</p>
      </section>

      <section className={cardClass}>
        <div className="space-y-3">
          <div className="rounded-[24px] bg-[#eef7ff] p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#5b7a93]">Deep link</p>
            <p className="mt-2 break-all text-sm font-semibold text-[#143a5a]">{payload?.referralLink || 'Link will appear here'}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => payload?.referralCode && copyValue(payload.referralCode, 'Referral code')}
              className="inline-flex items-center justify-center gap-2 rounded-[22px] border border-[#d8e5f1] bg-white px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-[#143a5a]"
            >
              <Copy size={14} />
              Copy Code
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!payload?.referralLink) return;
                if (navigator.share) {
                  await navigator.share({ title: 'Join with my referral', url: payload.referralLink });
                } else {
                  await copyValue(payload.referralLink, 'Referral link');
                }
              }}
              className="inline-flex items-center justify-center gap-2 rounded-[22px] bg-[#143a5a] px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-white"
            >
              <Share2 size={14} />
              Share Link
            </button>
          </div>
        </div>
      </section>

      <section className={cardClass}>
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#5b7a93]">Recent referred users</p>
        <div className="mt-4 space-y-3">
          {(payload?.referredUsers || []).map((user) => (
            <div key={user.id} className="rounded-[22px] border border-[#dfebf5] bg-white px-4 py-3">
              <p className="text-sm font-black text-[#143a5a]">{user.name || 'User'} · {user.phone || '--'}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">{user.email || 'No email yet'}</p>
            </div>
          ))}
          {!payload?.referredUsers?.length ? <p className="text-sm font-semibold text-slate-500">No referred users yet.</p> : null}
        </div>
      </section>
    </div>
  );
};

export default AgentReferral;
