import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, MapPin } from 'lucide-react';
import { agentService } from '../services/agentService';
import { AgentCustomerForm } from '../components/AgentCustomerForm';
import { estimateAgentCommission, formatCommissionRule, useAgentCommissionRule } from '../hooks/useAgentCommission';
import VenueTicketPicker from '../../shared/components/entertainment/VenueTicketPicker';
import { useVenueSelection } from '../../shared/components/entertainment/useVenueSelection';
import PriceSummary from '../../shared/components/entertainment/PriceSummary';
import { openRazorpayCheckout } from '../../../shared/utils/razorpayCheckout';

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const AgentEntertainmentBooking = () => {
  const navigate = useNavigate();
  const { venueId } = useParams();
  const state = useVenueSelection({ venueId, loadVenue: agentService.getEntertainmentVenue });
  const { venue, visitDate, slotId, quantities, selection } = state;
  const commissionRule = useAgentCommissionRule('entertainment');
  const [customer, setCustomer] = useState({ name: '', phone: '', email: '' });
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState('');

  const customerValid = /^\d{10}$/.test(customer.phone || '') && String(customer.name || '').trim().length > 0;
  const canPay = selection.totalTickets > 0 && customerValid && !paying;

  const handlePay = async () => {
    if (!canPay) return;
    setPaying(true);
    setPayError('');
    try {
      const created = await agentService.createEntertainmentOrder({ venueId, visitDate, slotId, items: selection.items, customer });
      const { booking, razorpayOrder, keyId } = created?.data || {};
      const payment = await openRazorpayCheckout({
        keyId,
        order: razorpayOrder,
        name: venue.name,
        description: `${booking.totalTickets} ticket(s) for ${visitDate}`,
        prefill: { name: customer.name, contact: customer.phone, email: customer.email || '' },
      });
      const verified = await agentService.verifyEntertainmentPayment(payment);
      navigate(`/taxi/agent/entertainment-tickets/${verified?.data?.id || booking.id}`, { replace: true });
    } catch (error) {
      setPayError(error?.message || 'Payment could not be completed');
      state.refresh();
    } finally {
      setPaying(false);
    }
  };

  if (state.loading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-400"><Loader2 className="animate-spin" /></div>;
  }

  if (!venue) {
    return (
      <div className="min-h-screen max-w-lg mx-auto flex flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm font-semibold text-slate-500">{state.error || 'This venue is not available.'}</p>
        <button type="button" onClick={() => navigate('/taxi/agent/book-entertainment')} className="rounded-full bg-slate-900 px-5 py-2 text-sm font-bold text-white">Back to venues</button>
      </div>
    );
  }

  const commissionLabel = formatCommissionRule(commissionRule);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#F8FAFC_0%,#EEF2F7_100%)] max-w-lg mx-auto pb-40">
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md px-5 pt-8 pb-4 border-b border-white/80 flex items-center gap-3">
        <button type="button" onClick={() => navigate('/taxi/agent/book-entertainment')} className="w-9 h-9 rounded-[12px] border border-slate-100 bg-white flex items-center justify-center" aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[0.26em] text-indigo-500">{venue.categoryName}</p>
          <h1 className="truncate text-[19px] font-black text-slate-900">{venue.name}</h1>
          {venue.city && <p className="flex items-center gap-1 text-[11px] font-semibold text-slate-500"><MapPin size={10} />{[venue.address, venue.city].filter(Boolean).join(', ')}</p>}
        </div>
      </header>

      <div className="px-5 pt-4 space-y-5">
        <AgentCustomerForm customer={customer} onChange={setCustomer} />
        <VenueTicketPicker
          venue={venue}
          visitDate={visitDate}
          onVisitDateChange={state.changeDate}
          slotId={slotId}
          onSlotChange={state.changeSlot}
          quantities={quantities}
          onQuantitiesChange={state.setQuantities}
          loadingSlots={state.loadingSlots}
        />
        {payError && <p className="text-sm font-semibold text-rose-600">{payError}</p>}
      </div>

      <div className="fixed bottom-0 left-1/2 z-30 w-full max-w-lg -translate-x-1/2 border-t border-slate-200 bg-white px-5 py-4">
        {selection.totalTickets > 0 && selection.gstAmount > 0 && (
          <PriceSummary className="mb-3" subtotal={selection.subtotal} gstPercent={selection.gstPercent} gstAmount={selection.gstAmount} total={selection.total} />
        )}
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-slate-500">{selection.totalTickets} ticket(s){selection.gstAmount > 0 ? ' incl. GST' : ''}</p>
            <p className="text-xl font-black text-slate-900">{money(selection.total)}</p>
            {commissionLabel && selection.subtotal > 0 && (
              <p className="text-[11px] font-black text-emerald-600">You earn ~{money(estimateAgentCommission(selection.subtotal, commissionRule))} (on ticket price)</p>
            )}
          </div>
          <button type="button" onClick={handlePay} disabled={!canPay} className="rounded-2xl bg-[#143a5a] px-6 py-3 text-sm font-black text-white disabled:opacity-40">
            {paying ? 'Processing...' : 'Collect payment'}
          </button>
        </div>
        {!customerValid && selection.totalTickets > 0 && <p className="mt-1 text-[11px] font-semibold text-amber-600">Enter the customer's name and 10-digit mobile number.</p>}
      </div>
    </div>
  );
};

export default AgentEntertainmentBooking;
