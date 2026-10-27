import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Clock3, HelpCircle, Mail, MapPin, Phone, ShieldCheck, Trash2 } from 'lucide-react';
import { SUPPORT_INFO } from '../content/supportInfo';
import { APP_AUDIENCES, SUPPORT_FAQS, getAudienceFromPath } from '../content/legalContent';

const SUPPORT_SCOPE = {
  user: 'Reach our team for help with bookings, rides, parcels, payments, refunds, safety, or your account.',
  driver: 'Reach our partner team for help with registration, document verification, trips, wallet, payouts, or your account.',
  agent: 'Reach our agent desk for help with onboarding, customer bookings, commission, withdrawals, or your account.',
};

const SupportPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const audience = getAudienceFromPath(location.pathname);
  const app = APP_AUDIENCES[audience];
  const faqs = SUPPORT_FAQS[audience];
  const deletionFaq = faqs[faqs.length - 1];

  const quickCards = [
    {
      title: 'Support phone',
      value: SUPPORT_INFO.phone,
      href: `tel:${SUPPORT_INFO.phoneHref}`,
      helper: SUPPORT_INFO.availability,
      Icon: Phone,
    },
    {
      title: 'Support email',
      value: SUPPORT_INFO.email,
      href: `mailto:${SUPPORT_INFO.email}?subject=${encodeURIComponent(`${app.appName} support`)}`,
      helper: SUPPORT_INFO.responseTime,
      Icon: Mail,
    },
  ];

  const detailCards = [
    {
      title: 'Operated by',
      value: SUPPORT_INFO.ownerName,
      helper: `${SUPPORT_INFO.companyName} · Grievance Officer`,
      Icon: Building2,
    },
    {
      title: 'Availability',
      value: SUPPORT_INFO.availability,
      helper: SUPPORT_INFO.supportLabel,
      Icon: Clock3,
    },
    SUPPORT_INFO.officeAddress
      ? {
          title: 'Office address',
          value: SUPPORT_INFO.officeAddress,
          helper: 'Use this for business communication and document follow-ups',
          Icon: MapPin,
        }
      : null,
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-stone-50 text-slate-900 font-sans">
      {/* Top Navbar */}
      <div className="fixed left-0 right-0 top-0 z-50 border-b border-stone-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 sm:h-16 max-w-6xl items-center gap-3 sm:gap-4 px-4 sm:px-6">
          <button
            onClick={() => navigate(-1)}
            className="rounded-full p-2 transition-all hover:bg-stone-100 active:scale-95 cursor-pointer"
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>
          <span className="text-xs sm:text-sm font-bold uppercase tracking-[0.25em] text-stone-500">
            Help &amp; Support
          </span>
        </div>
      </div>

      {/* Hero Section */}
      <section className="bg-[#171717] px-4 sm:px-6 pb-10 sm:pb-16 pt-20 sm:pt-28 text-white">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl sm:rounded-[24px] bg-[#f4b400] text-black shadow-lg shadow-black/20">
            <ShieldCheck size={28} />
          </div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#f4b400]">{app.appName}</p>
          <h1 className="mt-3 max-w-4xl text-2xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">
            Talk to <span className="text-[#f4b400]">Support</span>
          </h1>
          <p className="mt-3 sm:mt-5 max-w-3xl text-sm sm:text-base md:text-lg leading-relaxed text-stone-300">
            {SUPPORT_SCOPE[audience]}
          </p>

          <div className="mt-6 sm:mt-8 grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
            {quickCards.map((item) => (
              <a
                key={item.title}
                href={item.href}
                className="flex items-center gap-3.5 sm:gap-4 rounded-2xl sm:rounded-[24px] border border-white/10 bg-white/5 p-4 sm:p-5 transition hover:bg-white/10 active:scale-[0.99]"
              >
                <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-white/10 text-[#f4b400]">
                  <item.Icon size={22} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] text-stone-400">
                    {item.title}
                  </p>
                  <p className="mt-0.5 text-base sm:text-xl md:text-2xl font-black text-white break-all">
                    {item.value}
                  </p>
                  <p className="mt-0.5 text-xs sm:text-sm font-semibold text-stone-300 leading-snug">
                    {item.helper}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Details Section */}
      <section className="px-4 sm:px-6 pt-10 sm:pt-16">
        <div className="mx-auto grid max-w-6xl grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {detailCards.map((card) => (
            <div
              key={card.title}
              className="rounded-2xl sm:rounded-[24px] border border-stone-200 bg-white p-5 sm:p-6 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-xl sm:rounded-2xl bg-stone-100 text-slate-900 mb-4">
                  <card.Icon size={20} />
                </div>
                <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] text-stone-400">
                  {card.title}
                </p>
                <p className="mt-1 text-base sm:text-lg md:text-xl font-black leading-snug text-slate-900 break-words">
                  {card.value}
                </p>
              </div>
              <p className="mt-3 text-xs sm:text-sm font-medium leading-relaxed text-slate-500">
                {card.helper}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="px-4 sm:px-6 pt-10 sm:pt-14">
        <div className="mx-auto max-w-6xl">
          <h2 className="flex items-center gap-2 text-xl sm:text-2xl font-black tracking-tight">
            <HelpCircle size={22} className="text-[#f4b400]" /> Frequently asked questions
          </h2>
          <div className="mt-5 space-y-3">
            {faqs.map((faq) => (
              <details key={faq.q} className="group rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                <summary className="cursor-pointer list-none text-base font-bold text-slate-900">
                  {faq.q}
                </summary>
                <p className="mt-3 text-sm sm:text-base leading-7 text-slate-600">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Account deletion */}
      <section className="px-4 sm:px-6 py-10 sm:py-14">
        <div className="mx-auto max-w-6xl rounded-2xl sm:rounded-[24px] border border-rose-100 bg-rose-50 p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-lg font-black text-rose-700">
            <Trash2 size={20} /> Account and data deletion
          </h2>
          <p className="mt-2 text-sm sm:text-base leading-7 text-rose-900/80">{deletionFaq.a}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link to={`${app.prefix}/terms`} className="rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm">Terms</Link>
            <Link to={`${app.prefix}/privacy`} className="rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm">Privacy Policy</Link>
            {audience === 'user' ? (
              <Link to="/refund" className="rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm">Refund Policy</Link>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
};

export default SupportPage;
