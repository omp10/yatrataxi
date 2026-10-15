import React from 'react';
import { X } from 'lucide-react';
import { cardClass } from './entertainmentFormat';

export const StatusPill = ({ className, children }) => (
  <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase ${className}`}>{children}</span>
);

export const StatCard = ({ label, value, sub, tone = 'text-slate-900' }) => (
  <div className={cardClass}>
    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
    <p className={`mt-1 text-2xl font-black ${tone}`}>{value}</p>
    {sub && <p className="mt-0.5 text-xs font-semibold text-slate-500">{sub}</p>}
  </div>
);

export const PageHeader = ({ title, subtitle, actions }) => (
  <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
    <div>
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-indigo-500">Entertainment</p>
      <h1 className="text-2xl font-black tracking-tight text-slate-900">{title}</h1>
      {subtitle && <p className="mt-1 text-sm font-semibold text-slate-500">{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
  </div>
);

export const Modal = ({ title, onClose, children, wide = false }) => (
  <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 pt-16">
    <div className={`w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} rounded-[24px] bg-white p-6 shadow-2xl`}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-black text-slate-900">{title}</h2>
        <button type="button" onClick={onClose} className="rounded-full p-1 text-slate-400 hover:bg-slate-100" aria-label="Close"><X size={18} /></button>
      </div>
      {children}
    </div>
  </div>
);
