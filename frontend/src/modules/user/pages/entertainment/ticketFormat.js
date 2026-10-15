export const STATUS_STYLES = {
  confirmed: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-rose-50 text-rose-700',
  expired: 'bg-slate-100 text-slate-500',
  failed: 'bg-slate-100 text-slate-500',
  pending: 'bg-amber-50 text-amber-700',
};

export const formatVisitDate = (dateText) => (
  dateText ? new Date(`${dateText}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }) : ''
);
