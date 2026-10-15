import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, Star, Loader2, Info } from 'lucide-react';
import { entertainmentService } from '../../services/entertainmentService';
import VenueTicketPicker from '../../../shared/components/entertainment/VenueTicketPicker';
import { useVenueSelection } from '../../../shared/components/entertainment/useVenueSelection';
import { openRazorpayCheckout } from '../../../../shared/utils/razorpayCheckout';

const readUserInfo = () => {
  try {
    return JSON.parse(localStorage.getItem('userInfo') || '{}');
  } catch {
    return {};
  }
};

const EntertainmentVenue = () => {
  const navigate = useNavigate();
  const { venueId } = useParams();
  const state = useVenueSelection({ venueId, loadVenue: entertainmentService.getVenue });
  const { venue, visitDate, slotId, quantities, selection } = state;
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState('');

  const handlePay = async () => {
    if (paying || !selection.totalTickets) return;
    setPaying(true);
    setPayError('');
    try {
      const created = await entertainmentService.createOrder({ venueId, visitDate, slotId, items: selection.items });
      const { booking, razorpayOrder, keyId } = created?.data || {};
      const userInfo = readUserInfo();
      const payment = await openRazorpayCheckout({
        keyId,
        order: razorpayOrder,
        name: venue.name,
        description: `${booking.totalTickets} ticket(s) for ${visitDate}`,
        prefill: { name: userInfo.name || '', contact: userInfo.phone || '', email: userInfo.email || '' },
      });
      const verified = await entertainmentService.verifyPayment(payment);
      navigate(`/taxi/user/entertainment/bookings/${verified?.data?.id || booking.id}`, { replace: true });
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
        <button type="button" onClick={() => navigate('/taxi/user/entertainment')} className="rounded-full bg-slate-900 px-5 py-2 text-sm font-bold text-white">Back to venues</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 max-w-lg mx-auto pb-36">
      <div className="relative h-56 bg-slate-200">
        {venue.coverImage && <img src={venue.coverImage} alt={venue.name} className="h-full w-full object-cover" />}
        <button type="button" onClick={() => navigate(-1)} className="absolute left-4 top-10 w-9 h-9 rounded-xl bg-white/90 flex items-center justify-center" aria-label="Back">
          <ArrowLeft size={18} />
        </button>
      </div>

      <div className="-mt-6 relative rounded-t-3xl bg-slate-50 px-5 pt-5 space-y-5">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">{venue.categoryName}</p>
          <h1 className="text-2xl font-black text-slate-900">{venue.name}</h1>
          {(venue.address || venue.city) && <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-slate-500"><MapPin size={12} />{[venue.address, venue.city].filter(Boolean).join(', ')}</p>}
          {venue.ratingCount > 0 && <p className="mt-1 flex items-center gap-1 text-xs font-bold text-amber-600"><Star size={12} className="fill-amber-500" />{venue.rating} · {venue.ratingCount} reviews</p>}
          {venue.description && <p className="mt-3 text-sm text-slate-600">{venue.description}</p>}
          {venue.amenities?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {venue.amenities.map((item) => <span key={item} className="rounded-full bg-white border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600">{item}</span>)}
            </div>
          )}
          {venue.rules && <p className="mt-3 flex gap-2 rounded-2xl bg-amber-50 p-3 text-xs font-semibold text-amber-800"><Info size={14} className="shrink-0" />{venue.rules}</p>}
        </div>

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

      <div className="fixed bottom-0 left-1/2 w-full max-w-lg -translate-x-1/2 border-t border-slate-200 bg-white px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-slate-500">{selection.totalTickets} ticket(s)</p>
            <p className="text-xl font-black text-slate-900">₹{selection.total.toLocaleString('en-IN')}</p>
          </div>
          <button
            type="button"
            onClick={handlePay}
            disabled={paying || !selection.totalTickets}
            className="rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-black text-white disabled:opacity-40"
          >
            {paying ? 'Processing...' : 'Pay & Book'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EntertainmentVenue;
