import React, { useEffect, useMemo, useState } from 'react';
import { Bus, CarFront, Users } from 'lucide-react';
import { agentService } from '../services/agentService';

const cardClass = 'rounded-[28px] border border-white/70 bg-white/85 p-5 shadow-[0_18px_34px_rgba(20,58,90,0.08)] backdrop-blur-xl';
const formatMoney = (value) => `Rs ${Number(value || 0).toFixed(2)}`;
const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : '');

const MODE_LABEL = { direct: 'Booked by you', referral: 'Your referral' };

// Every booking row shows what the agent actually earned on it. A zero here is
// real information (commission disabled, or the rule evaluated to nothing), so
// it is shown as "no commission" rather than hidden.
const BookingRow = ({ title, subtitle, meta, amount, commissionAmount, commissionMode, status }) => (
  <div className="rounded-[22px] border border-[#dfebf5] bg-white px-4 py-3">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-black text-[#143a5a]">{title}</p>
        <p className="mt-1 truncate text-xs font-semibold text-slate-500">{subtitle}</p>
        {meta ? <p className="mt-1 truncate text-[11px] font-semibold text-slate-400">{meta}</p> : null}
      </div>
      <span className="shrink-0 rounded-full bg-[#eff7ff] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#0f6aa8]">
        {status || '--'}
      </span>
    </div>

    <div className="mt-3 flex items-end justify-between gap-3 border-t border-dashed border-[#e6eff7] pt-3">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Booking value</p>
        <p className="mt-0.5 text-sm font-black text-[#143a5a]">{formatMoney(amount)}</p>
      </div>
      <div className="text-right">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Your commission</p>
        {Number(commissionAmount) > 0 ? (
          <>
            <p className="mt-0.5 text-base font-black text-emerald-600">+{formatMoney(commissionAmount)}</p>
            {commissionMode ? (
              <p className="text-[10px] font-bold text-slate-400">{MODE_LABEL[commissionMode] || commissionMode}</p>
            ) : null}
          </>
        ) : (
          <p className="mt-0.5 text-sm font-bold text-slate-400">No commission</p>
        )}
      </div>
    </div>
  </div>
);

const Section = ({ icon, label, count, children, empty }) => (
  <section className={cardClass}>
    <div className="flex items-center gap-3">
      <div className="rounded-[18px] bg-[#eef7ff] p-3 text-[#0f6aa8]">{icon}</div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#5b7a93]">{label}</p>
        <h2 className="text-xl font-black tracking-tight text-[#143a5a]">{count} total</h2>
      </div>
    </div>
    <div className="mt-4 space-y-3">
      {count ? children : <p className="text-sm font-semibold text-slate-500">{empty}</p>}
    </div>
  </section>
);

const AgentBookings = () => {
  const [payload, setPayload] = useState({ rides: [], buses: [], pooling: [], summary: null });

  useEffect(() => {
    const load = async () => {
      const response = await agentService.getBookings();
      const data = response?.data?.data || response?.data || {};
      setPayload({
        rides: data.rides || [],
        buses: data.buses || [],
        pooling: data.pooling || [],
        summary: data.summary || null,
      });
    };

    load();
  }, []);

  const summary = useMemo(() => {
    if (payload.summary) return payload.summary;
    const all = [...payload.rides, ...payload.buses, ...payload.pooling];
    return {
      totalBookings: all.length,
      totalCommission: all.reduce((sum, item) => sum + Number(item.commissionAmount || 0), 0),
      totalBookingValue: all.reduce((sum, item) => sum + Number(item.amount || item.fare || 0), 0),
    };
  }, [payload]);

  return (
    <div className="space-y-4">
      <section className={`${cardClass} bg-[linear-gradient(155deg,_rgba(20,58,90,1)_0%,_rgba(13,106,168,0.95)_100%)] text-white`}>
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/60">Commission earned</p>
        <h2 className="mt-2 text-4xl font-black tracking-tight">{formatMoney(summary.totalCommission)}</h2>
        <p className="mt-2 text-xs font-bold text-white/70">
          across {summary.totalBookings} booking{summary.totalBookings === 1 ? '' : 's'} worth {formatMoney(summary.totalBookingValue)}
        </p>
      </section>

      <Section icon={<CarFront size={18} />} label="Ride bookings" count={payload.rides.length} empty="No ride bookings yet.">
        {payload.rides.map((ride) => (
          <BookingRow
            key={ride.id}
            title={`${ride.customerName || 'Customer'} · ${ride.customerPhone || '--'}`}
            subtitle={`${ride.serviceType || 'ride'} · ${ride.pickupAddress || 'Pickup'} to ${ride.dropAddress || 'Drop'}`}
            meta={formatDate(ride.createdAt)}
            amount={ride.amount ?? ride.fare}
            commissionAmount={ride.commissionAmount}
            commissionMode={ride.commissionMode}
            status={ride.status}
          />
        ))}
      </Section>

      <Section icon={<Bus size={18} />} label="Bus bookings" count={payload.buses.length} empty="No bus bookings yet.">
        {payload.buses.map((booking) => (
          <BookingRow
            key={booking.id}
            title={`${booking.customerName || 'Passenger'} · ${booking.customerPhone || '--'}`}
            subtitle={`${booking.route?.fromCity || ''} to ${booking.route?.toCity || ''} · ${booking.route?.busName || ''}`}
            meta={[booking.bookingCode, (booking.seatLabels || []).join(', '), booking.travelDate].filter(Boolean).join(' · ')}
            amount={booking.amount}
            commissionAmount={booking.commissionAmount}
            commissionMode={booking.commissionMode}
            status={booking.status}
          />
        ))}
      </Section>

      <Section icon={<Users size={18} />} label="Pooling bookings" count={payload.pooling.length} empty="No pooling bookings yet.">
        {payload.pooling.map((booking) => (
          <BookingRow
            key={booking.id}
            title={`${booking.customerName || 'Passenger'} · ${booking.customerPhone || '--'}`}
            subtitle={`${booking.route?.fromCity || ''} to ${booking.route?.toCity || ''}`}
            meta={[booking.bookingCode, (booking.seatLabels || []).join(', ')].filter(Boolean).join(' · ')}
            amount={booking.amount}
            commissionAmount={booking.commissionAmount}
            commissionMode={booking.commissionMode}
            status={booking.status}
          />
        ))}
      </Section>
    </div>
  );
};

export default AgentBookings;
