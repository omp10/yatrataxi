import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  Gift,
  Loader2,
  QrCode,
  Share2,
  Users,
  Download,
  TrendingUp,
  Clock,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useSettings } from '../../../../shared/context/SettingsContext';
import {
  getCurrentDriver,
  getDriverReferralSummary,
} from '../../services/registrationService';
import {
  getReferralSettingsContent,
  getReferralTranslationContent,
} from '../../../shared/services/referralTranslationService';
import {
  applyReferralSettingPlaceholders,
  buildReferralPreviewBlocks,
  DRIVER_REFERRAL_TRANSLATION_FIELDS,
  getStoredReferralLanguageCode,
} from '../../../shared/utils/referralTranslationFields';

const readStoredDriverInfo = () => {
  try {
    return JSON.parse(localStorage.getItem('driverInfo') || '{}');
  } catch {
    return {};
  }
};

const LEGACY_BRAND_REGEX = /\bzyder\b/gi;

const replaceLegacyReferralBrand = (value, appName) => {
  const safeAppName = String(appName || '').trim() || 'App';
  return String(value || '').replace(LEGACY_BRAND_REGEX, safeAppName);
};

const DriverReferral = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { settings } = useSettings();
  const routePrefix = location.pathname.startsWith('/taxi/owner') ? '/taxi/owner' : '/taxi/driver';

  const [activeTab, setActiveTab] = useState('invite'); // 'invite' | 'history'
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [summaryData, setSummaryData] = useState(null);

  const [driverProfile, setDriverProfile] = useState(() => {
    const stored = readStoredDriverInfo();
    return {
      referralCode: stored.referralCode || '',
    };
  });

  const [translation, setTranslation] = useState({
    language_code: 'en',
    driver_referral: {
      instant_referrer_user: '',
      banner_text: '',
    },
  });

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const languageCode = getStoredReferralLanguageCode('driver');
      const stored = readStoredDriverInfo();
      const fallbackDriverSection = {
        instant_referrer_user: '',
        banner_text: '',
      };

      try {
        const [driverResponse, translationResponse, settingsResponse, summaryResponse] =
          await Promise.allSettled([
            getCurrentDriver(),
            getReferralTranslationContent(languageCode),
            getReferralSettingsContent('driver'),
            getDriverReferralSummary(),
          ]);

        const driver = driverResponse.status === 'fulfilled' ? driverResponse.value?.data || {} : {};
        const translationData =
          translationResponse.status === 'fulfilled' ? translationResponse.value?.data || {} : {};
        const settingsData =
          settingsResponse.status === 'fulfilled' ? settingsResponse.value?.data || {} : {};
        const summary =
          summaryResponse.status === 'fulfilled'
            ? summaryResponse.value?.data?.data || summaryResponse.value?.data
            : null;

        if (summary) {
          setSummaryData(summary);
        }

        const hydratedDriverReferral = applyReferralSettingPlaceholders(
          translationData.driver_referral || fallbackDriverSection,
          settingsData,
        );

        const refCode = summary?.referralCode || driver.referralCode || stored.referralCode || '';
        setDriverProfile({
          referralCode: refCode,
        });

        setTranslation({
          language_code: translationData.language_code || languageCode,
          driver_referral: hydratedDriverReferral,
        });

        localStorage.setItem(
          'driverInfo',
          JSON.stringify({
            ...stored,
            referralCode: refCode,
          }),
        );
      } catch (err) {
        console.error('Failed to load driver referral data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const appName = settings.general?.app_name || 'Yatra Desk';
  const referralCode = summaryData?.referralCode || driverProfile.referralCode || '';
  const rewardAmount = summaryData?.stats?.rewardPerDriver || 500;

  const normalizedDriverReferral = Object.fromEntries(
    Object.entries(translation.driver_referral || {}).map(([key, value]) => [
      key,
      replaceLegacyReferralBrand(value, appName),
    ]),
  );

  const bannerText =
    normalizedDriverReferral.banner_text || `Refer Drivers & Earn ₹${rewardAmount}`;
  const infoBlocks = buildReferralPreviewBlocks(
    normalizedDriverReferral,
    DRIVER_REFERRAL_TRANSLATION_FIELDS,
  );

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const referralShareLink =
    summaryData?.referralLink ||
    (referralCode ? `${currentOrigin}/taxi/driver/reg-phone?ref=${encodeURIComponent(referralCode)}` : '');

  const qrDataUrl =
    summaryData?.qrDataUrl ||
    (referralShareLink
      ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(referralShareLink)}`
      : '');

  const stats = summaryData?.stats || {
    totalReferred: 0,
    activeDrivers: 0,
    pendingDrivers: 0,
    totalEarned: 0,
    rewardPerDriver: rewardAmount,
  };

  const referredDrivers = summaryData?.referredDrivers || [];

  const handleCopy = async (textToCopy = referralCode, label = 'Referral code') => {
    if (!textToCopy) return;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      toast.success(`${label} copied!`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Unable to copy');
    }
  };

  const handleShare = async () => {
    if (!referralCode) return;
    const shareText = `Join ${appName} as a driver partner! Use my referral code ${referralCode} to sign up and claim ₹${rewardAmount} bonus.\n${referralShareLink}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: bannerText,
          text: shareText,
          url: referralShareLink,
        });
        return;
      } catch (e) {
        if (e.name === 'AbortError') return;
      }
    }

    handleWhatsAppShare();
  };

  const handleWhatsAppShare = () => {
    if (!referralCode) return;
    const shareText = `🚗 Join ${appName} as a Driver Partner!\n\nUse my Referral Code: *${referralCode}*\nSign up here: ${referralShareLink}\n\nStart earning with best commissions and instant payouts!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `driver-referral-${referralCode || 'qr'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('QR Code downloaded!');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans pb-16">
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 px-4 py-3.5 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(`${routePrefix}/profile`)}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-800 shadow-sm active:scale-95"
          >
            <ArrowLeft size={18} strokeWidth={2.4} />
          </button>
          <div>
            <h1 className="text-base font-black text-slate-900 tracking-tight">Driver Referral Desk</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Earn ₹{rewardAmount} per onboarded driver
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 pt-4 space-y-4">
        {/* HERO BANNER & STATS CARD */}
        <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#1830b8] via-[#102494] to-[#0a186b] p-5 text-white shadow-xl shadow-indigo-950/15">
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[10px] font-black uppercase tracking-wider backdrop-blur-sm">
                <Sparkles size={12} className="text-amber-300" />
                Refer & Earn Program
              </div>
              <h2 className="mt-2.5 text-2xl font-black tracking-tight leading-tight">
                {bannerText}
              </h2>
              <p className="mt-1 text-xs text-indigo-100 max-w-[260px]">
                Invite your fellow drivers to join and get ₹{rewardAmount} directly credited to your wallet.
              </p>
            </div>
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md border border-white/20">
              <Gift size={28} className="text-amber-300" />
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="mt-5 grid grid-cols-3 gap-2.5 rounded-2xl bg-black/20 p-3 backdrop-blur-md border border-white/10">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider text-indigo-200">
                <Users size={12} />
                Invited
              </div>
              <p className="mt-1 text-lg font-black text-white">{stats.totalReferred}</p>
            </div>
            <div className="text-center border-x border-white/10">
              <div className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider text-indigo-200">
                <CheckCircle2 size={12} />
                Active
              </div>
              <p className="mt-1 text-lg font-black text-white">{stats.activeDrivers}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                <TrendingUp size={12} />
                Earned
              </div>
              <p className="mt-1 text-lg font-black text-emerald-300">₹{stats.totalEarned}</p>
            </div>
          </div>
        </div>

        {/* TAB SWITCHER */}
        <div className="flex rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
          <button
            type="button"
            onClick={() => setActiveTab('invite')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-black uppercase tracking-wider transition ${
              activeTab === 'invite'
                ? 'bg-[#1830b8] text-white shadow-md shadow-indigo-900/20'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <QrCode size={15} />
            Invite & QR
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-black uppercase tracking-wider transition ${
              activeTab === 'history'
                ? 'bg-[#1830b8] text-white shadow-md shadow-indigo-900/20'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Users size={15} />
            Referred Drivers ({stats.totalReferred})
          </button>
        </div>

        {/* TAB CONTENT: INVITE & QR */}
        {activeTab === 'invite' && (
          <div className="space-y-4">
            {/* REFERRAL CODE & QUICK SHARE */}
            <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                Your Referral Code
              </p>
              <div className="mt-2.5 flex items-center justify-between gap-3 rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/50 px-4 py-3">
                <span className="font-mono text-xl font-black tracking-wider text-indigo-950">
                  {referralCode || (loading ? 'Loading...' : 'NOT AVAILABLE')}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(referralCode, 'Referral code')}
                  disabled={!referralCode}
                  className="flex items-center gap-1.5 rounded-xl bg-[#1830b8] px-3.5 py-2 text-xs font-black uppercase tracking-wider text-white shadow-sm active:scale-95 disabled:opacity-50"
                >
                  {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>

              {/* Share Action Buttons */}
              <div className="mt-3.5 grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={handleWhatsAppShare}
                  disabled={!referralCode}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-xs font-black uppercase tracking-wider text-white shadow-sm hover:bg-emerald-700 active:scale-95 disabled:opacity-50"
                >
                  <Share2 size={15} />
                  WhatsApp
                </button>
                <button
                  type="button"
                  onClick={handleShare}
                  disabled={!referralCode}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-xs font-black uppercase tracking-wider text-white shadow-sm hover:bg-slate-800 active:scale-95 disabled:opacity-50"
                >
                  <Share2 size={15} />
                  Share Link
                </button>
              </div>
            </div>

            {/* QR CODE CARD */}
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm text-center">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#1830b8]">
                <QrCode size={13} />
                Scan to Register
              </div>
              <h3 className="mt-2 text-base font-black text-slate-900">Driver Registration QR</h3>
              <p className="mt-1 text-xs text-slate-500">
                Show this QR to any driver. Scanning opens registration with your code pre-filled.
              </p>

              <div className="mt-4 flex justify-center">
                <div className="rounded-3xl border-2 border-slate-100 bg-white p-4 shadow-md">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt="Driver Referral QR Code"
                      className="h-52 w-52 rounded-xl object-contain"
                    />
                  ) : (
                    <div className="flex h-52 w-52 items-center justify-center rounded-xl bg-slate-100">
                      <Loader2 className="animate-spin text-[#1830b8]" size={32} />
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 flex justify-center gap-2.5">
                <button
                  type="button"
                  onClick={handleDownloadQr}
                  disabled={!qrDataUrl}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black uppercase tracking-wider text-slate-800 shadow-sm active:scale-95 disabled:opacity-50 hover:bg-slate-50"
                >
                  <Download size={14} />
                  Download QR
                </button>
                <button
                  type="button"
                  onClick={() => handleCopy(referralShareLink, 'Invite link')}
                  disabled={!referralShareLink}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black uppercase tracking-wider text-slate-800 shadow-sm active:scale-95 disabled:opacity-50 hover:bg-slate-50"
                >
                  <Copy size={14} />
                  Copy Link
                </button>
              </div>
            </div>

            {/* HOW IT WORKS */}
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
                How Driver Referral Works
              </h3>

              <div className="space-y-3.5">
                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-black text-[#1830b8]">
                    1
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900">Share your QR or Code</h4>
                    <p className="text-[11px] text-slate-500">
                      Send your referral code or QR to drivers interested in joining {appName}.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-black text-[#1830b8]">
                    2
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900">Driver Completes Signup</h4>
                    <p className="text-[11px] text-slate-500">
                      The invited driver completes vehicle details and document verification.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-black text-[#1830b8]">
                    3
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900">Earn ₹{rewardAmount} Instantly</h4>
                    <p className="text-[11px] text-slate-500">
                      Bonus is directly credited to your driver wallet and can be withdrawn anytime.
                    </p>
                  </div>
                </div>
              </div>

              {infoBlocks.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                  {infoBlocks.map((block) => (
                    <div
                      key={block.key}
                      className="text-xs leading-relaxed text-slate-600 prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: block.html }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB CONTENT: REFERRED DRIVERS (HISTORY) */}
        {activeTab === 'history' && (
          <div className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="animate-spin text-[#1830b8]" size={28} />
              </div>
            ) : referredDrivers.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-slate-300 bg-white p-8 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-[#1830b8]">
                  <Users size={28} />
                </div>
                <h3 className="mt-4 text-base font-black text-slate-900">No Drivers Referred Yet</h3>
                <p className="mt-1 text-xs text-slate-500 max-w-xs mx-auto">
                  Share your QR code or referral link to start inviting drivers and earn ₹{rewardAmount} per driver!
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('invite')}
                  className="mt-5 rounded-2xl bg-[#1830b8] px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-md active:scale-95"
                >
                  Start Inviting Now
                </button>
              </div>
            ) : (
              referredDrivers.map((driver) => {
                const isActive = driver.status === 'active';
                const formattedDate = driver.createdAt
                  ? new Date(driver.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })
                  : 'Recent';

                return (
                  <div
                    key={driver.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl font-black text-sm ${
                          isActive
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                            : 'bg-amber-50 text-amber-600 border border-amber-200'
                        }`}
                      >
                        {isActive ? <CheckCircle2 size={20} /> : <Clock size={20} />}
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-900">{driver.name}</h4>
                        <p className="text-[11px] font-semibold text-slate-500">
                          {driver.phone} · Joined {formattedDate}
                        </p>
                        <span
                          className={`mt-1 inline-block rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                            isActive
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {driver.statusLabel}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p
                        className={`text-sm font-black ${
                          isActive ? 'text-emerald-600' : 'text-slate-400'
                        }`}
                      >
                        {isActive ? `+₹${driver.rewardEarned}` : `₹${rewardAmount}`}
                      </p>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {driver.rewardStatus}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default DriverReferral;
