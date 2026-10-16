import React from 'react';

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

// Tickets + GST = total. Hides the GST line when the admin has not set a rate.
const PriceSummary = ({ subtotal, gstPercent = 0, gstAmount = 0, total, className = '' }) => (
  <div className={`space-y-1 text-sm ${className}`}>
    <div className="flex justify-between font-semibold text-slate-600"><span>Ticket price</span><span>{money(subtotal)}</span></div>
    {Number(gstAmount) > 0 && (
      <div className="flex justify-between font-semibold text-slate-600"><span>GST ({Number(gstPercent)}%)</span><span>{money(gstAmount)}</span></div>
    )}
    <div className="flex justify-between border-t border-slate-100 pt-1.5 text-base font-black text-slate-900"><span>Total</span><span>{money(total)}</span></div>
  </div>
);

export default PriceSummary;
