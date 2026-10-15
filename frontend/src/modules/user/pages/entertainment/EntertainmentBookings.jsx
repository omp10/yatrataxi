import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, Loader2, Ticket } from 'lucide-react';
import { entertainmentService } from '../../services/entertainmentService';
import { STATUS_STYLES, formatVisitDate } from './ticketFormat';

const EntertainmentBookings = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    entertainmentService.getMyBookings({ limit: 50 })
      .then((response) => setBookings(response?.data?.results || []))
      .catch((e) => setError(e?.message || 'Could not load your tickets'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 max-w-lg mx-auto pb-16">
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur px-5 pt-10 pb-4 border-b border-slate-100 flex items-center gap-3">
        <button type="button" onClick={() => navigate('/taxi/user/entertainment')} className="w-9 h-9 rounded-xl border border-slate-100 bg-white flex items-center justify-center" aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.26em] text-slate-400">Entertainment</p>
          <h1 className="text-[19px] font-black text-slate-900">My Tickets</h1>
        </div>
      </header>

      <div className="px-5 pt-4 space-y-3">
        {loading ? (
          <div className="py-20 flex justify-center text-slate-400"><Loader2 className="animate-spin" /></div>
        ) : error ? (
          <p className="py-16 text-center text-sm font-semibold text-rose-600">{error}</p>
        ) : bookings.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-center">
            <Ticket className="text-slate-300" size={40} />
            <p className="text-sm font-semibold text-slate-400">No tickets booked yet.</p>
            <button type="button" onClick={() => navigate('/taxi/user/entertainment')} className="rounded-full bg-slate-900 px-5 py-2 text-sm font-bold text-white">Explore venues</button>
          </div>
        ) : bookings.map((booking) => (
          <button
            key={booking.id}
            type="button"
            onClick={() => navigate(`/taxi/user/entertainment/bookings/${booking.id}`)}
            className="w-full rounded-3xl bg-white border border-slate-100 p-4 text-left shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-base font-black text-slate-900">{booking.venue?.name}</p>
                <p className="font-mono text-[11px] font-bold text-slate-400">{booking.bookingCode}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${STATUS_STYLES[booking.status] || STATUS_STYLES.pending}`}>
                {booking.checkIn?.status === 'checked_in' ? 'used' : booking.status}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-slate-600">
              <span className="flex items-center gap-1"><Calendar size={12} />{formatVisitDate(booking.visitDate)}</span>
              <span className="flex items-center gap-1"><Clock size={12} />{booking.slot?.label}</span>
              <span>{booking.totalTickets} ticket(s)</span>
              <span className="ml-auto text-sm font-black text-slate-900">₹{Number(booking.amount).toLocaleString('en-IN')}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default EntertainmentBookings;
