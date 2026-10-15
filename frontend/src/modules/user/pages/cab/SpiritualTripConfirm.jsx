import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, ArrowLeft, Home, Loader2 } from 'lucide-react';
import api from '@/shared/api/axiosInstance';
import { useAppGoogleMapsLoader } from '../../../admin/utils/googleMaps';
import { geocodeAddress } from '@/shared/utils/geocoding';

const SpiritualTripConfirm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state || {};
  const { trip, vehicle, seats, date, time, scheduledAt, pickupAddress, pickupCoords } = state;
  const routePrefix = location.pathname.startsWith('/taxi/user') ? '/taxi/user' : '';
  const { isLoaded: isMapsLoaded } = useAppGoogleMapsLoader();
  const [status, setStatus] = useState('review'); // review | booking | booked
  const [error, setError] = useState('');

  useEffect(() => {
    if (!trip || !vehicle || !pickupCoords) {
      navigate(`${routePrefix}/cab/spiritual`, { replace: true });
    }
  }, [navigate, pickupCoords, routePrefix, trip, vehicle]);

  if (!trip || !vehicle || !pickupCoords) return null;

  const handleBook = async () => {
    if (status === 'booking') return;
    setStatus('booking');
    setError('');

    try {
      const dropCoords = await geocodeAddress(trip.dropLocation);
      await api.post('/rides', {
        pickup: pickupCoords,
        drop: dropCoords,
        pickupAddress,
        dropAddress: trip.dropLocation,
        // The server prices pilgrimage bookings from the destination's admin fare.
        fare: vehicle.fare,
        fareContext: { type: 'spiritual', destinationId: trip.id },
        vehicleTypeId: vehicle.id,
        vehicleTypeIds: [vehicle.id],
        vehicleIconType: vehicle.iconType || 'car',
        paymentMethod: 'cash',
        serviceType: 'spiritual',
        transport_type: 'taxi',
        scheduledAt,
      });
      setStatus('booked');
    } catch (err) {
      setError(err?.message || 'Could not book this trip. Please try again.');
      setStatus('review');
    }
  };

  const isBooked = status === 'booked';

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#F8FAFC_0%,#F3F4F6_38%,#EEF2F7_100%)] max-w-lg mx-auto font-sans pb-40 relative overflow-hidden">
      <div className="absolute -top-16 right-[-40px] h-44 w-44 rounded-full bg-purple-100/60 blur-3xl pointer-events-none" />

      <header className="bg-white/90 backdrop-blur-md px-5 pt-10 pb-4 sticky top-0 z-20 border-b border-white/80 shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
        <div className="flex items-center gap-3">
          <button onClick={() => (isBooked ? navigate(`${routePrefix || '/taxi/user'}`) : navigate(-1))} className="w-9 h-9 rounded-[12px] border border-white/80 bg-white/90 flex items-center justify-center shadow-sm active:scale-95 transition-all">
            <ArrowLeft size={18} className="text-slate-900" strokeWidth={2.5} />
          </button>
          <div className="flex-1">
            <p className="text-[9px] font-black uppercase tracking-[0.26em] text-slate-400">Tour Booking</p>
            <h1 className="text-[19px] font-black tracking-tight text-slate-900">{isBooked ? 'Confirmed' : 'Review & Book'}</h1>
          </div>
        </div>
      </header>

      <div className="px-5 pt-8 flex flex-col items-center">
        {isBooked && (
          <>
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="w-24 h-24 bg-purple-50 rounded-full flex items-center justify-center mb-6 shadow-[0_8px_24px_rgba(147,51,234,0.2)]"
            >
              <CheckCircle2 size={48} className="text-purple-500" strokeWidth={2.5} />
            </motion.div>
            <div className="text-center mb-8">
              <h2 className="text-[24px] font-black tracking-tight text-slate-900 leading-tight">Journey Booked</h2>
              <p className="text-[13px] font-bold text-slate-500 mt-2">We will assign a driver before your pickup time.</p>
            </div>
          </>
        )}

        <div className="w-full bg-white/90 backdrop-blur-md rounded-[20px] shadow-[0_8px_30px_rgba(15,23,42,0.06)] border border-white/80 p-5 space-y-4">
          <div className="pb-4 border-b border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Destination</p>
            <h3 className="text-[18px] font-black tracking-tight text-slate-900 leading-none">{trip.name} {trip.emoji}</h3>
          </div>

          <div className="flex gap-4">
            <div className="flex flex-col items-center gap-1 mt-1 shrink-0">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
              <div className="w-0.5 h-10 bg-slate-200" />
              <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pickup</p>
                <p className="text-[14px] font-bold text-slate-900 leading-snug">{pickupAddress}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Drop</p>
                <p className="text-[14px] font-bold text-slate-900 leading-snug tracking-tight">{trip.dropLocation}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Date & Time</p>
              <p className="text-[12px] font-bold text-slate-900">{date} at {time}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Vehicle</p>
              <p className="text-[12px] font-bold text-slate-900">{vehicle.icon} {vehicle.name} <span className="opacity-50">· {seats} Pax</span></p>
            </div>
          </div>
        </div>

        {error && <p className="w-full mt-4 text-[12px] font-bold text-rose-600">{error}</p>}
      </div>

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg px-5 pb-6 pt-3 bg-gradient-to-t from-[#EEF2F7] via-[#F3F4F6]/95 to-transparent pointer-events-none z-30">
        <div className="pointer-events-auto bg-white/90 rounded-[20px] border border-white/80 shadow-[0_4px_14px_rgba(15,23,42,0.06)] px-5 py-4 flex items-center justify-between mb-3">
          <div>
            <p className="text-[11px] font-black text-slate-700 tracking-tight">Trip Fare</p>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mt-0.5">Pay the driver in cash</p>
          </div>
          <p className="text-[22px] font-black text-slate-900 tracking-tight text-right">₹{Number(vehicle.fare).toLocaleString('en-IN')}</p>
        </div>
        {isBooked ? (
          <motion.button onClick={() => navigate(routePrefix || '/taxi/user')}
            className="pointer-events-auto w-full bg-slate-900 py-4 rounded-[18px] text-[15px] font-black text-white shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95">
            <Home size={16} strokeWidth={2.5} /> Go to Home
          </motion.button>
        ) : (
          <motion.button onClick={handleBook} disabled={status === 'booking' || !isMapsLoaded}
            className="pointer-events-auto w-full bg-purple-600 py-4 rounded-[18px] text-[15px] font-black text-white shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-60">
            {status === 'booking' ? <Loader2 size={16} className="animate-spin" /> : null}
            {status === 'booking' ? 'Booking...' : 'Book Trip'}
          </motion.button>
        )}
      </div>
    </div>
  );
};

export default SpiritualTripConfirm;
