import React, { useEffect, useState } from 'react';
import {
  Copy,
  Share2,
  Users,
  Building2,
  CheckCircle2,
  Clock,
  Coins,
  QrCode,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { agentService } from '../services/agentService';

const cardClass =
  'rounded-[30px] border border-white/70 bg-white/88 p-5 shadow-[0_18px_36px_rgba(20,58,90,0.08)] backdrop-blur-xl';

const AgentReferral = () => {
  const [activeTab, setActiveTab] = useState('customers'); // 'customers' | 'agents'
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const response = await agentService.getReferralSummary();
        setPayload(response?.data?.data || response?.data || null);
      } catch (err) {
        console.error('Failed to load referral summary:', err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const referralCode = payload?.referralCode || '';

  // Production-safe origin resolution
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';

  // Customer link & QR
  const customerLink =
    payload?.customerReferralLink && !payload.customerReferralLink.includes('localhost:5173')
      ? payload.customerReferralLink
      : `${currentOrigin}/taxi/user/signup?ref=${encodeURIComponent(referralCode)}`;

  const customerQrUrl =
    payload?.customerQrDataUrl ||
    (customerLink ? `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(customerLink)}` : '');

  // Agent link & QR
  const agentLink =
    payload?.agentReferralLink && !payload.agentReferralLink.includes('localhost:5173')
      ? payload.agentReferralLink
      : `${currentOrigin}/taxi/agent/login?ref=${encodeURIComponent(referralCode)}`;

  const agentQrUrl =
    payload?.agentQrDataUrl ||
    (agentLink ? `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(agentLink)}` : '');

  const copyValue = async (value, label) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied to clipboard!`);
    } catch {
      toast.error(`Unable to copy ${label}`);
    }
  };

  const shareReferral = async (url, title, text) => {
    if (!url) return;
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
      } catch (e) {
        if (e.name !== 'AbortError') {
          await copyValue(url, title);
        }
      }
    } else {
      await copyValue(url, title);
    }
  };

  const isCustomerTab = activeTab === 'customers';
  const activeLink = isCustomerTab ? customerLink : agentLink;
  const activeQr = isCustomerTab ? customerQrUrl : agentQrUrl;

  return (
    <div className="space-y-4 font-sans pb-10">
      {/* TAB SELECTOR */}
      <div className="flex rounded-2xl bg-white/70 p-1.5 backdrop-blur-md border border-[#dce8f3] shadow-sm">
        <button
          type="button"
          onClick={() => setActiveTab('customers')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all ${
            isCustomerTab
              ? 'bg-[#143a5a] text-white shadow-[0_4px_12px_rgba(20,58,90,0.25)]'
              : 'text-[#5b7a93] hover:text-[#143a5a]'
          }`}
        >
          <Users size={16} />
          Refer Customers
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('agents')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all ${
            !isCustomerTab
              ? 'bg-[#0d6aa8] text-white shadow-[0_4px_12px_rgba(13,106,168,0.25)]'
              : 'text-[#5b7a93] hover:text-[#0d6aa8]'
          }`}
        >
          <Building2 size={16} />
          Refer Agents
        </button>
      </div>

      {/* HERO BANNER */}
      {isCustomerTab ? (
        <section
          className={`${cardClass} bg-[linear-gradient(155deg,_rgba(20,58,90,1)_0%,_rgba(13,106,168,0.95)_100%)] text-white`}
        >
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/60">
            Customer Referral Link
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight">
            Earn commission on every customer ride & booking.
          </h2>
          <p className="mt-3 text-sm font-semibold leading-6 text-white/75">
            When users scan your QR or sign up via your link, their accounts link to you. Every taxi,
            mini-bus, and tour booking they make deposits commission into your wallet.
          </p>
        </section>
      ) : (
        <section
          className={`${cardClass} bg-[linear-gradient(155deg,_rgba(13,106,168,1)_0%,_rgba(20,58,90,0.95)_100%)] text-white`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/60">
              Agent Affiliate Network
            </p>
            {payload?.settings?.agent_referral_bonus ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-[11px] font-black tracking-wide text-white">
                <Coins size={12} /> ₹{payload.settings.agent_referral_bonus} Bonus
              </span>
            ) : null}
          </div>

          <h2 className="mt-2 text-2xl font-black tracking-tight">
            Recruit sub-agents & grow your team.
          </h2>
          <p className="mt-3 text-sm font-semibold leading-6 text-white/75">
            Invite travel agents to join using your referral link. Earn upfront bonuses when they are
            approved
            {payload?.settings?.override_commission_enabled && payload.settings.override_commission_rate > 0
              ? ` plus ${payload.settings.override_commission_rate}% override commission on their future bookings!`
              : '!'}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3 pt-3 border-t border-white/20">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/60">Recruited Agents</p>
              <p className="mt-0.5 text-xl font-black">{payload?.referredAgents?.length || 0}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/60">Network Earnings</p>
              <p className="mt-0.5 text-xl font-black text-amber-300">
                ₹{Number(payload?.metrics?.agentReferralEarnings || 0).toLocaleString('en-IN')}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* QR CODE & CODE DISPLAY */}
      <section className={`${cardClass} text-center`}>
        {activeQr ? (
          <img
            src={activeQr}
            alt="Referral QR Code"
            className="mx-auto h-64 w-64 rounded-[28px] border border-[#d9e6f2] bg-white p-3 shadow-md"
          />
        ) : (
          <div className="mx-auto h-64 w-64 rounded-[28px] border border-[#d9e6f2] bg-slate-50 flex items-center justify-center text-slate-400">
            <QrCode size={48} />
          </div>
        )}

        <p className="mt-4 text-[10px] font-black uppercase tracking-[0.22em] text-[#5b7a93]">
          Your Referral Code
        </p>
        <p className="mt-1 text-3xl font-black tracking-[0.16em] text-[#143a5a]">
          {referralCode || '----'}
        </p>
      </section>

      {/* DEEP LINK & ACTION BUTTONS */}
      <section className={cardClass}>
        <div className="space-y-3">
          <div className="rounded-[24px] bg-[#eef7ff] p-4 border border-[#dce8f3]">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#5b7a93]">
              {isCustomerTab ? 'Customer Deep Link' : 'Agent Recruitment Deep Link'}
            </p>
            <p className="mt-2 break-all text-xs font-semibold text-[#143a5a]">
              {activeLink || 'Generating link...'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => referralCode && copyValue(referralCode, 'Referral code')}
              className="inline-flex items-center justify-center gap-2 rounded-[22px] border border-[#d8e5f1] bg-white px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-[#143a5a] active:scale-95 transition-all shadow-sm"
            >
              <Copy size={14} />
              Copy Code
            </button>

            <button
              type="button"
              onClick={() =>
                shareReferral(
                  activeLink,
                  isCustomerTab ? 'Book rides with Yatra Desk' : 'Become a Yatra Desk Agent',
                  isCustomerTab
                    ? `Book cabs, buses, and rentals using my referral code: ${referralCode}`
                    : `Join Yatra Desk as a travel partner using my agent invite code: ${referralCode}`
                )
              }
              className="inline-flex items-center justify-center gap-2 rounded-[22px] bg-[#143a5a] px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-white active:scale-95 transition-all shadow-md"
            >
              <Share2 size={14} />
              Share Link
            </button>
          </div>
        </div>
      </section>

      {/* REFERRED ENTITIES LIST */}
      {isCustomerTab ? (
        <section className={cardClass}>
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#5b7a93]">
              Referred Customers ({payload?.referredUsers?.length || 0})
            </p>
          </div>

          <div className="mt-4 space-y-3">
            {(payload?.referredUsers || []).map((user) => (
              <div
                key={user.id}
                className="rounded-[22px] border border-[#dfebf5] bg-white px-4 py-3 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-black text-[#143a5a]">{user.name || 'Customer'}</p>
                  <p className="mt-0.5 text-xs font-semibold text-slate-500">
                    {user.phone || '--'} · {user.email || 'No email'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                    <CheckCircle2 size={10} /> Active
                  </span>
                </div>
              </div>
            ))}
            {!payload?.referredUsers?.length ? (
              <p className="text-sm font-semibold text-slate-500 text-center py-6">
                No customers referred yet. Share your QR code to get started!
              </p>
            ) : null}
          </div>
        </section>
      ) : (
        <section className={cardClass}>
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#5b7a93]">
              Recruited Sub-Agents ({payload?.referredAgents?.length || 0})
            </p>
          </div>

          <div className="mt-4 space-y-3">
            {(payload?.referredAgents || []).map((agent) => (
              <div
                key={agent.id}
                className="rounded-[22px] border border-[#dfebf5] bg-white p-4 space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-black text-[#143a5a]">{agent.name || 'Agent Partner'}</p>
                    <p className="text-xs font-semibold text-slate-500">{agent.phone} · {agent.email || 'No email'}</p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      agent.kycStatus === 'verified'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : agent.kycStatus === 'rejected'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {agent.kycStatus === 'verified' && <CheckCircle2 size={11} />}
                    {agent.kycStatus === 'pending' && <Clock size={11} />}
                    {agent.kycStatus || 'pending'}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] font-semibold text-slate-600">
                  <span>Customers: <strong className="text-slate-900">{agent.totalCustomers || 0}</strong></span>
                  <span>Bookings: <strong className="text-slate-900">{agent.totalBookings || 0}</strong></span>
                  <span className={agent.referralRewardPaid ? 'text-emerald-600 font-bold' : 'text-amber-600'}>
                    {agent.referralRewardPaid ? '✓ Bonus Credited' : 'Bonus Pending KYC'}
                  </span>
                </div>
              </div>
            ))}
            {!payload?.referredAgents?.length ? (
              <p className="text-sm font-semibold text-slate-500 text-center py-6">
                No sub-agents recruited yet. Share your agent invite link to build your affiliate network!
              </p>
            ) : null}
          </div>
        </section>
      )}
    </div>
  );
};

export default AgentReferral;
