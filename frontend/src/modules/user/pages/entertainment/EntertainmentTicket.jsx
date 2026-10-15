import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, MapPin, Loader2, CheckCircle2, XCircle, Star } from 'lucide-react';
import { entertainmentService } from '../../services/entertainmentService';
import { STATUS_STYLES, formatVisitDate } from './ticketFormat';

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

const EntertainmentTicket = () => {
  const navigate = useNavigate();
  const { bookingId } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const load = useCallback(async () => {
    try {
      const response = await entertainmentService.getBooking(bookingId);
      setBooking(response?.data || null);
      setError('');
    } catch (e) {
      setError(e?.message || 'Could not load this ticket');
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => { load(); }, [load]);

  const handleCancel = async () => {
    setBusy(true);
    setActionError('');
    try {
      await entertainmentService.cancelBooking(bookingId, 'Cancelled by customer');
      setConfirmCancel(false);
      await load();
    } catch (e) {
      setActionError(e?.message || 'Could not cancel this booking');
    } finally {
      setBusy(false);
    }
  };

  const handleReview = async () => {
    if (!rating) return;
    setBusy(true);
    setActionError('');
    try {
      await entertainmentService.reviewBooking(bookingId, { rating, comment });
      await load();
    } catch (e) {
      setActionError(e?.message || 'Could not save your rating');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-400"><Loader2 className="animate-spin" /></div>;
  }

  if (!booking) {
    return (
      <div className="min-h-screen max-w-lg mx-auto flex flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm font-semibold text-slate-500">{error || 'Ticket not found.'}</p>
        <button type="button" onClick={() => navigate('/taxi/user/entertainment/bookings')} className="rounded-full bg-slate-900 px-5 py-2 text-sm font-bold text-white">My tickets</button>
      </div>
    );
  }

  const checkedIn = booking.checkIn?.status === 'checked_in';
  const quote = booking.cancellationQuote;

  return (
    <div className="min-h-screen bg-slate-50 max-w-lg mx-auto pb-16">
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur px-5 pt-10 pb-4 border-b border-slate-100 flex items-center gap-3">
        <button type="button" onClick={() => navigate('/taxi/user/entertainment/bookings')} className="w-9 h-9 rounded-xl border border-slate-100 bg-white flex items-center justify-center" aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <p className="text-[9px] font-black uppercase tracking-[0.26em] text-slate-400">Ticket</p>
          <h1 className="text-[19px] font-black text-slate-900">{booking.bookingCode}</h1>
        </div>
        <span className={`rounded-full px-3 py-1 text-[11px] font-black uppercase ${STATUS_STYLES[booking.status] || STATUS_STYLES.pending}`}>{booking.status}</span>
      </header>

      <div className="px-5 pt-5 space-y-4">
        <div className="rounded-3xl bg-white border border-slate-100 p-5 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">{booking.venue?.categoryName}</p>
          <h2 className="text-xl font-black text-slate-900">{booking.venue?.name}</h2>
          {(booking.venue?.address || booking.venue?.city) && (
            <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-slate-500"><MapPin size={12} />{[booking.venue.address, booking.venue.city].filter(Boolean).join(', ')}</p>
          )}
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <p className="flex items-center gap-1.5 font-bold text-slate-700"><Calendar size={14} />{formatVisitDate(booking.visitDate)}</p>
            <p className="flex items-center gap-1.5 font-bold text-slate-700"><Clock size={14} />{booking.slot?.label} ({booking.slot?.startTime}-{booking.slot?.endTime})</p>
          </div>

          {booking.ticket?.qrDataUrl && (
            <div className="mt-5 flex flex-col items-center border-t border-dashed border-slate-200 pt-5">
              <img src={booking.ticket.qrDataUrl} alt="Ticket QR code" className={`h-56 w-56 ${checkedIn ? 'opacity-30' : ''}`} />
              <p className="mt-2 text-xs font-semibold text-slate-500">
                {checkedIn ? 'Ticket already used at the venue' : 'Show this QR code at the venue entrance'}
              </p>
              <p className="mt-1 font-mono text-sm font-black tracking-widest text-slate-900">{booking.bookingCode}</p>
            </div>
          )}
          {checkedIn && (
            <p className="mt-3 flex items-center justify-center gap-1.5 text-sm font-bold text-emerald-600"><CheckCircle2 size={16} />Checked in{booking.checkIn?.checkedInAt ? ` at ${new Date(booking.checkIn.checkedInAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` : ''}</p>
          )}
        </div>

        <div className="rounded-3xl bg-white border border-slate-100 p-5 shadow-sm space-y-2">
          {(booking.items || []).map((item) => (
            <div key={item.ticketTypeId} className="flex justify-between text-sm">
              <span className="font-semibold text-slate-600">{item.name} × {item.quantity}</span>
              <span className="font-bold text-slate-900">{money(item.amount)}</span>
            </div>
          ))}
          <div className="flex justify-between border-t border-slate-100 pt-2 text-base">
            <span className="font-black text-slate-900">Paid</span>
            <span className="font-black text-slate-900">{money(booking.amount)}</span>
          </div>
          {booking.cancellation && (
            <div className="rounded-2xl bg-rose-50 p-3 text-xs font-semibold text-rose-700">
              <p className="flex items-center gap-1.5 font-black"><XCircle size={14} />Cancelled</p>
              <p className="mt-1">Refund: {money(booking.cancellation.refundAmount)}{booking.cancellation.refundStatus ? ` (${booking.cancellation.refundStatus})` : ''}</p>
            </div>
          )}
        </div>

        {booking.status === 'confirmed' && !checkedIn && (
          <div className="rounded-3xl bg-white border border-slate-100 p-5 shadow-sm">
            {quote?.allowed ? (
              confirmCancel ? (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-slate-700">
                    You will get <span className="font-black text-emerald-600">{money(quote.refundAmount)}</span> back
                    {quote.chargeAmount > 0 ? <> (cancellation charge {money(quote.chargeAmount)})</> : null}. Continue?
                  </p>
                  <div className="flex gap-2">
                    <button type="button" disabled={busy} onClick={handleCancel} className="flex-1 rounded-2xl bg-rose-600 py-2.5 text-sm font-black text-white disabled:opacity-50">{busy ? 'Cancelling...' : 'Yes, cancel'}</button>
                    <button type="button" disabled={busy} onClick={() => setConfirmCancel(false)} className="flex-1 rounded-2xl border border-slate-200 py-2.5 text-sm font-bold text-slate-700">Keep tickets</button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => setConfirmCancel(true)} className="w-full rounded-2xl border border-rose-200 py-2.5 text-sm font-black text-rose-600">Cancel booking</button>
              )
            ) : (
              <p className="text-xs font-semibold text-slate-500">{quote?.reason || 'This booking cannot be cancelled.'}</p>
            )}
          </div>
        )}

        {checkedIn && (
          <div className="rounded-3xl bg-white border border-slate-100 p-5 shadow-sm">
            {booking.review ? (
              <p className="flex items-center gap-1 text-sm font-bold text-amber-600">
                You rated {booking.review.rating}<Star size={14} className="fill-amber-500" />
                {booking.review.comment ? <span className="ml-1 font-semibold text-slate-500">"{booking.review.comment}"</span> : null}
              </p>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-black text-slate-900">Rate your visit</p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button key={value} type="button" aria-label={`${value} stars`} onClick={() => setRating(value)}>
                      <Star size={28} className={value <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'} />
                    </button>
                  ))}
                </div>
                <textarea value={comment} onChange={(e) => setComment(e.target.value)} maxLength={500} rows={2} placeholder="Tell others about it (optional)" className="w-full rounded-2xl border border-slate-200 p-3 text-sm outline-none" />
                <button type="button" disabled={!rating || busy} onClick={handleReview} className="w-full rounded-2xl bg-slate-900 py-2.5 text-sm font-black text-white disabled:opacity-40">Submit rating</button>
              </div>
            )}
          </div>
        )}

        {actionError && <p className="text-sm font-semibold text-rose-600">{actionError}</p>}
      </div>
    </div>
  );
};

export default EntertainmentTicket;
