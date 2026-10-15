import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, CheckCircle2, Share2 } from 'lucide-react';
import { agentService } from '../services/agentService';

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const AgentEntertainmentTicket = () => {
  const navigate = useNavigate();
  const { bookingId } = useParams();
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    agentService.getEntertainmentBooking(bookingId)
      .then((r) => setBooking(r?.data || null))
      .catch((e) => setError(e?.message || 'Could not load this ticket'));
  }, [bookingId]);

  const share = async () => {
    const text = `Your tickets for ${booking.venue?.name} on ${booking.visitDate} (${booking.slot?.label}). Booking code: ${booking.bookingCode}. Show this code or the QR in the app at the entrance.`;
    try {
      if (navigator.share) await navigator.share({ title: 'Entertainment tickets', text });
      else await navigator.clipboard.writeText(text);
    } catch {
      // Sharing was cancelled.
    }
  };

  if (error) return <p className="py-20 text-center text-sm font-semibold text-rose-600">{error}</p>;
  if (!booking) return <div className="min-h-screen flex items-center justify-center text-slate-400"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#F8FAFC_0%,#EEF2F7_100%)] max-w-lg mx-auto pb-16">
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md px-5 pt-8 pb-4 border-b border-white/80 flex items-center gap-3">
        <button type="button" onClick={() => navigate('/taxi/agent/book-entertainment')} className="w-9 h-9 rounded-[12px] border border-slate-100 bg-white flex items-center justify-center" aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <p className="text-[9px] font-black uppercase tracking-[0.26em] text-slate-400">Ticket</p>
          <h1 className="text-[19px] font-black text-slate-900">{booking.bookingCode}</h1>
        </div>
      </header>
      <div className="px-5 pt-5 space-y-4">
        {booking.status === 'confirmed' && (
          <p className="flex items-center gap-2 rounded-2xl bg-emerald-50 p-3 text-sm font-black text-emerald-700"><CheckCircle2 size={18} />Payment received · ticket issued</p>
        )}
        <div className="rounded-3xl bg-white border border-slate-100 p-5 shadow-sm text-center">
          <p className="text-lg font-black text-slate-900">{booking.venue?.name}</p>
          <p className="text-xs font-semibold text-slate-500">{booking.visitDate} · {booking.slot?.label} ({booking.slot?.startTime}-{booking.slot?.endTime})</p>
          {booking.ticket?.qrDataUrl && <img src={booking.ticket.qrDataUrl} alt="Ticket QR code" className="mx-auto mt-4 h-56 w-56" />}
          <p className="mt-2 font-mono text-sm font-black tracking-widest">{booking.bookingCode}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">The customer can also see this ticket in the app under Entertainment Tickets.</p>
          {booking.status === 'confirmed' && (
            <button type="button" onClick={share} className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2 text-sm font-black text-white"><Share2 size={14} />Share with customer</button>
          )}
        </div>
        <div className="rounded-3xl bg-white border border-slate-100 p-5 shadow-sm space-y-1.5 text-sm">
          <p className="font-black text-slate-900">{booking.customer?.name} · {booking.customer?.phone}</p>
          {(booking.items || []).map((item) => (
            <div key={item.ticketTypeId} className="flex justify-between font-semibold text-slate-600"><span>{item.name} × {item.quantity}</span><span>{money(item.amount)}</span></div>
          ))}
          <div className="flex justify-between border-t border-slate-100 pt-2 font-black text-slate-900"><span>Collected</span><span>{money(booking.amount)}</span></div>
          <div className="flex justify-between font-black text-emerald-600"><span>Your commission</span><span>{money(booking.agentCommission)}</span></div>
          {booking.status === 'cancelled' && <p className="font-black text-rose-600">This booking was cancelled.</p>}
        </div>
      </div>
    </div>
  );
};

export default AgentEntertainmentTicket;
