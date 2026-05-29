import React, { useEffect, useState } from 'react';
import { Bus, CarFront } from 'lucide-react';
import { agentService } from '../services/agentService';

const cardClass = 'rounded-[28px] border border-white/70 bg-white/85 p-5 shadow-[0_18px_34px_rgba(20,58,90,0.08)] backdrop-blur-xl';

const AgentBookings = () => {
  const [payload, setPayload] = useState({ rides: [], buses: [] });

  useEffect(() => {
    const load = async () => {
      const response = await agentService.getBookings();
      setPayload(response?.data?.data || response?.data || { rides: [], buses: [] });
    };

    load();
  }, []);

  return (
    <div className="space-y-4">
      <section className={cardClass}>
        <div className="flex items-center gap-3">
          <div className="rounded-[18px] bg-[#eef7ff] p-3 text-[#0f6aa8]"><CarFront size={18} /></div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#5b7a93]">Ride bookings</p>
            <h2 className="text-xl font-black tracking-tight text-[#143a5a]">{payload.rides.length} total</h2>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          {payload.rides.map((ride) => (
            <div key={ride.id} className="rounded-[22px] border border-[#dfebf5] bg-white px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-[#143a5a]">{ride.customerName || 'Customer'} · {ride.customerPhone || '--'}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{ride.serviceType} · {ride.pickupAddress || 'Pickup'} to {ride.dropAddress || 'Drop'}</p>
                </div>
                <span className="rounded-full bg-[#eff7ff] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#0f6aa8]">
                  {ride.status}
                </span>
              </div>
            </div>
          ))}
          {!payload.rides.length ? <p className="text-sm font-semibold text-slate-500">No ride bookings yet.</p> : null}
        </div>
      </section>

      <section className={cardClass}>
        <div className="flex items-center gap-3">
          <div className="rounded-[18px] bg-[#eef7ff] p-3 text-[#0f6aa8]"><Bus size={18} /></div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#5b7a93]">Bus bookings</p>
            <h2 className="text-xl font-black tracking-tight text-[#143a5a]">{payload.buses.length} total</h2>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          {payload.buses.map((booking) => (
            <div key={booking.id} className="rounded-[22px] border border-[#dfebf5] bg-white px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-[#143a5a]">{booking.customerName || 'Passenger'} · {booking.customerPhone || '--'}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{booking.route?.fromCity} to {booking.route?.toCity} · {booking.route?.busName}</p>
                </div>
                <span className="rounded-full bg-[#eff7ff] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#0f6aa8]">
                  {booking.status}
                </span>
              </div>
            </div>
          ))}
          {!payload.buses.length ? <p className="text-sm font-semibold text-slate-500">No bus bookings yet.</p> : null}
        </div>
      </section>
    </div>
  );
};

export default AgentBookings;
