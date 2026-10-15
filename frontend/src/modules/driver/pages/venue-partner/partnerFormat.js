export const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export const VENUE_STATUS_STYLES = {
  active: { label: 'Live', className: 'bg-emerald-50 text-emerald-700' },
  pending: { label: 'Awaiting approval', className: 'bg-amber-50 text-amber-700' },
  rejected: { label: 'Changes needed', className: 'bg-rose-50 text-rose-700' },
  inactive: { label: 'Inactive', className: 'bg-slate-100 text-slate-500' },
};
