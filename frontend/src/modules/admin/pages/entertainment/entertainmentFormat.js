export const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
export const formatDate = (value) => (value ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '-');

export const cardClass = 'rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm';
export const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-slate-900';
export const labelClass = 'mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400';
export const primaryButton = 'rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white disabled:opacity-40';
export const secondaryButton = 'rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black uppercase tracking-wider text-slate-700 disabled:opacity-40';

export const VENUE_STATUS = {
  active: { label: 'Live', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  pending: { label: 'Pending approval', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  rejected: { label: 'Rejected', className: 'bg-rose-50 text-rose-700 border-rose-200' },
  inactive: { label: 'Inactive', className: 'bg-slate-100 text-slate-600 border-slate-200' },
};

export const unwrap = (response, fallback) => (response?.data !== undefined ? response.data : fallback);
