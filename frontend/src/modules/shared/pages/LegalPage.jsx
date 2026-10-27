import React from 'react';
import { ArrowLeft, FileText, LifeBuoy, Mail, Phone, ReceiptText, ScrollText, ShieldCheck } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { SUPPORT_INFO } from '../content/supportInfo';
import {
  APP_AUDIENCES,
  LEGAL_LAST_UPDATED,
  getAudienceFromPath,
  getLegalDocument,
} from '../content/legalContent';

const DOC_ICONS = {
  terms: ScrollText,
  privacy: ShieldCheck,
  refund: ReceiptText,
  cancellation: ReceiptText,
};

const getDocumentType = (pathname = '') => {
  const value = pathname.toLowerCase();
  if (value.includes('privacy')) return 'privacy';
  if (value.includes('refund')) return 'refund';
  if (value.includes('cancellation')) return 'cancellation';
  return 'terms';
};

const LegalPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const audience = getAudienceFromPath(location.pathname);
  const app = APP_AUDIENCES[audience];
  const type = getDocumentType(location.pathname);
  const content = getLegalDocument(audience, type);
  const Icon = DOC_ICONS[type] || FileText;

  const relatedLinks = [
    { label: 'Terms', to: `${app.prefix}/terms` },
    { label: 'Privacy Policy', to: `${app.prefix}/privacy` },
    ...(audience === 'user' ? [{ label: 'Refund Policy', to: '/refund' }] : []),
    { label: 'Support', to: `${app.prefix}/support` },
  ];

  return (
    <div className="min-h-screen bg-stone-50 text-slate-900">
      <div className="fixed top-0 left-0 right-0 z-50 border-b border-stone-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
          <button
            onClick={() => navigate(-1)}
            className="rounded-full p-2 transition-all hover:bg-stone-100"
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>
          <span className="text-xs sm:text-sm font-bold uppercase tracking-[0.25em] text-stone-500">
            {content.label}
          </span>
        </div>
      </div>

      <section className="bg-[#171717] px-4 sm:px-6 pb-14 pt-24 sm:pt-28 text-white">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-[24px] bg-[#f4b400] text-black shadow-lg shadow-black/20">
            <Icon size={28} />
          </div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#f4b400]">{app.appName}</p>
          <h1 className="mt-3 max-w-4xl text-3xl font-black tracking-tight sm:text-4xl md:text-6xl">
            {content.title}
          </h1>
          <p className="mt-3 text-sm font-semibold text-stone-400">Last updated: {LEGAL_LAST_UPDATED}</p>
          <p className="mt-6 max-w-3xl text-base sm:text-lg leading-relaxed text-stone-300">
            {content.intro}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <a
              href={`tel:${SUPPORT_INFO.phoneHref}`}
              className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10"
            >
              <Phone size={18} className="text-[#f4b400]" />
              <span>{SUPPORT_INFO.phone}</span>
            </a>
            <a
              href={`mailto:${SUPPORT_INFO.email}`}
              className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10"
            >
              <Mail size={18} className="text-[#f4b400]" />
              <span className="break-all">{SUPPORT_INFO.email}</span>
            </a>
          </div>
        </div>
      </section>

      <section className="px-4 sm:px-6 py-12 sm:py-16">
        <div className="mx-auto max-w-6xl space-y-6">
          {content.sections.map((section, index) => (
            <div key={section.title} className="rounded-[24px] border border-stone-200 bg-white p-6 sm:p-8 shadow-sm">
              <h2 className="text-lg font-black tracking-tight text-slate-900 md:text-2xl">
                {index + 1}. {section.title}
              </h2>

              {section.body ? (
                <p className="mt-4 text-base leading-8 text-slate-600">{section.body}</p>
              ) : null}

              {section.bullets ? (
                <ul className="mt-4 space-y-3 text-base leading-7 text-slate-600">
                  {section.bullets.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-[#f4b400]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}

          <div className="flex flex-wrap items-center gap-3 rounded-[24px] border border-stone-200 bg-white p-6">
            <LifeBuoy size={18} className="text-[#f4b400]" />
            {relatedLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="rounded-full border border-stone-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-stone-100"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <p className="text-center text-xs font-semibold text-stone-400">
            © {new Date().getFullYear()} {SUPPORT_INFO.companyName}. Operated by {SUPPORT_INFO.ownerName}, {SUPPORT_INFO.officeAddress}.
          </p>
        </div>
      </section>
    </div>
  );
};

export default LegalPage;
