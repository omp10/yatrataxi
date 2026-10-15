import React, { useMemo } from 'react';
import { Minus, Plus, Clock } from 'lucide-react';
import { buildDateOptions, isWeekendDate, unitPriceFor } from './ticketPricing';

/**
 * Date, time slot and ticket quantity picker. Prices shown here are a preview;
 * the server re-prices every order.
 */
const VenueTicketPicker = ({ venue, visitDate, onVisitDateChange, slotId, onSlotChange, quantities, onQuantitiesChange, loadingSlots = false }) => {
  const dateOptions = useMemo(() => buildDateOptions(venue), [venue]);
  const slots = venue?.slots || [];
  const tickets = venue?.ticketTypes || [];
  const selectedSlot = slots.find((slot) => slot.id === slotId);
  const totalTickets = Object.values(quantities).reduce((sum, qty) => sum + qty, 0);

  const setQuantity = (ticketId, next) => {
    const otherTickets = totalTickets - (quantities[ticketId] || 0);
    const cap = Math.min(50, selectedSlot ? selectedSlot.remaining : 50) - otherTickets;
    onQuantitiesChange({ ...quantities, [ticketId]: Math.max(0, Math.min(next, cap)) });
  };

  return (
    <div className="space-y-5">
      <section>
        <p className="mb-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">1. Visit date</p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {dateOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onVisitDateChange(option.value)}
              className={`shrink-0 rounded-2xl border px-3 py-2 text-center ${visitDate === option.value ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-700'}`}
            >
              <span className="block text-[10px] font-bold uppercase opacity-70">{option.day}</span>
              <span className="block text-sm font-black">{option.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <p className="mb-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">2. Time slot</p>
        {loadingSlots ? (
          <p className="text-xs font-semibold text-slate-400">Checking availability...</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {slots.map((slot) => {
              const selected = slot.id === slotId;
              return (
                <button
                  key={slot.id}
                  type="button"
                  disabled={!slot.available}
                  onClick={() => onSlotChange(slot.id)}
                  className={`rounded-2xl border p-3 text-left disabled:opacity-40 ${selected ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 bg-white'}`}
                >
                  <span className="flex items-center gap-1 text-sm font-black text-slate-900"><Clock size={13} />{slot.label}</span>
                  <span className="block text-[11px] font-semibold text-slate-500">{slot.startTime} - {slot.endTime}</span>
                  <span className={`mt-1 block text-[11px] font-bold ${slot.available ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {slot.available ? `${slot.remaining} left` : slot.reason === 'sold_out' ? 'Sold out' : slot.reason === 'ended' ? 'Ended' : 'Closed'}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <p className="mb-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">3. Tickets{isWeekendDate(visitDate) ? ' (weekend price)' : ''}</p>
        <div className="space-y-2">
          {tickets.map((ticket) => {
            const qty = quantities[ticket.id] || 0;
            return (
              <div key={ticket.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3">
                <div className="min-w-0">
                  <p className="text-sm font-black text-slate-900">{ticket.name}</p>
                  {ticket.description && <p className="text-[11px] font-semibold text-slate-500">{ticket.description}</p>}
                  <p className="text-sm font-bold text-slate-700">₹{unitPriceFor(ticket, visitDate).toLocaleString('en-IN')}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button type="button" aria-label={`Fewer ${ticket.name}`} onClick={() => setQuantity(ticket.id, qty - 1)} disabled={qty === 0} className="h-8 w-8 rounded-full border border-slate-200 flex items-center justify-center disabled:opacity-30"><Minus size={14} /></button>
                  <span className="w-5 text-center text-sm font-black">{qty}</span>
                  <button type="button" aria-label={`More ${ticket.name}`} onClick={() => setQuantity(ticket.id, qty + 1)} disabled={!selectedSlot} className="h-8 w-8 rounded-full bg-slate-900 text-white flex items-center justify-center disabled:opacity-30"><Plus size={14} /></button>
                </div>
              </div>
            );
          })}
          {!selectedSlot && <p className="text-[11px] font-semibold text-slate-400">Pick a time slot to add tickets.</p>}
        </div>
      </section>
    </div>
  );
};

export default VenueTicketPicker;
