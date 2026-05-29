import React from 'react';
import { AlertTriangle, CheckCircle2, Clock, HelpCircle, ShieldCheck } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

const AgentPendingStatus = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const agent = location.state?.agent || {};
  const isRejected = String(agent?.kycStatus || '').toLowerCase() === 'rejected';
  const reviewNote = String(agent?.onboarding?.reviewNote || '').trim();

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_#d7f4ff_0%,_#f8fbff_46%,_#f3f4f8_100%)] px-5 py-8">
      <div className="mx-auto max-w-lg">
        <div className="rounded-[34px] border border-white/70 bg-white/90 p-8 text-center shadow-[0_22px_50px_rgba(20,58,90,0.12)] backdrop-blur-xl">
          <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-[30px] bg-[#143a5a] text-white shadow-lg shadow-[#143a5a]/20">
            <Clock size={42} />
          </div>
          <p className="mt-6 text-[10px] font-black uppercase tracking-[0.28em] text-[#5b7a93]">{isRejected ? 'Verification Update' : 'Verification Pending'}</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-[#143a5a]">{isRejected ? 'Application Needs Update' : 'Application Submitted'}</h1>
          <p className="mt-4 text-sm font-semibold leading-6 text-slate-500">
            {isRejected
              ? `${agent?.name ? `${agent.name}, your` : 'Your'} agent profile was reviewed and needs changes before approval.`
              : `${agent?.name ? `${agent.name}, your` : 'Your'} agent profile is now under review. We&apos;ll verify your documents and activate the portal once approval is complete.`}
          </p>

          {isRejected && reviewNote ? (
            <div className="mt-6 rounded-[24px] border border-amber-200 bg-amber-50 p-4 text-left">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-white p-3 text-amber-600 shadow-sm">
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-700">Rejection Reason</p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-amber-800">{reviewNote}</p>
                </div>
              </div>
            </div>
          ) : null}

          <div className="mt-8 space-y-3 text-left">
            <div className="rounded-[24px] border border-[#d9e7f3] bg-[#eff7ff] p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-white p-3 text-[#143a5a] shadow-sm">
                  <CheckCircle2 size={18} />
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#143a5a]">KYC Received</p>
                  <p className="mt-1 text-sm font-semibold text-slate-500">Your documents have been submitted successfully.</p>
                </div>
              </div>
            </div>
            <div className="rounded-[24px] border border-[#d9e7f3] bg-[#eff7ff] p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-white p-3 text-[#143a5a] shadow-sm">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#143a5a]">Admin Review</p>
                  <p className="mt-1 text-sm font-semibold text-slate-500">Approval usually happens after the verification team checks your profile.</p>
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/taxi/driver/support')}
            className="mt-8 inline-flex items-center gap-2 rounded-[22px] border border-[#d9e7f3] bg-white px-5 py-4 text-xs font-black uppercase tracking-[0.18em] text-[#143a5a] shadow-sm"
          >
            Contact Support
            <HelpCircle size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgentPendingStatus;
