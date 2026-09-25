import React from 'react';
import { User, Phone, Mail, UserCheck } from 'lucide-react';

const inputClass = 'w-full rounded-[20px] border border-[#d8e5f1] bg-white px-4 py-3 pl-11 text-sm font-semibold text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-[#143a5a] focus:ring-2 focus:ring-[#143a5a]/10';

export const AgentCustomerForm = ({ customer, onChange }) => {
  const handleWalkIn = () => {
    const randomDigits = String(Math.floor(10000000 + Math.random() * 90000000));
    onChange({
      name: 'Walk-In Customer',
      phone: `98${randomDigits}`,
      email: '',
    });
  };

  return (
    <div className="rounded-[26px] border border-white/70 bg-white/90 p-4 shadow-[0_12px_28px_rgba(20,58,90,0.06)] backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#5b7a93]">Customer Details</p>
          <p className="text-xs font-semibold text-slate-500">Book on behalf of customer for commission</p>
        </div>
        <button
          type="button"
          onClick={handleWalkIn}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#eef7ff] px-3 py-1 text-[11px] font-black text-[#0f6aa8] transition-all active:scale-95"
        >
          <UserCheck size={12} strokeWidth={2.5} />
          Quick Walk-In
        </button>
      </div>

      <div className="mt-3.5 space-y-3">
        <div className="relative">
          <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="tel"
            maxLength={10}
            className={inputClass}
            placeholder="10-digit customer mobile number *"
            value={customer.phone || ''}
            onChange={(e) => onChange({ ...customer, phone: e.target.value.replace(/\D/g, '') })}
          />
        </div>

        <div className="relative">
          <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            className={inputClass}
            placeholder="Customer full name *"
            value={customer.name || ''}
            onChange={(e) => onChange({ ...customer, name: e.target.value })}
          />
        </div>

        <div className="relative">
          <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="email"
            className={inputClass}
            placeholder="Customer email (optional)"
            value={customer.email || ''}
            onChange={(e) => onChange({ ...customer, email: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
};

export default AgentCustomerForm;
