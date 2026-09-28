import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Users, ChevronRight, Calendar, Clock, MapPin, Loader2 } from 'lucide-react';
import api from '@/shared/api/axiosInstance';

const DEFAULT_VEHICLES = [
  { id: 'sedan', name: 'Sedan', icon: '🚗', desc: 'Dzire, Etios', maxSeats: 4 },
  { id: 'suv', name: 'SUV', icon: '🚙', desc: 'Ertiga, Innova', maxSeats: 6 },
  { id: 'tempo', name: 'Mini Coach / Tempo', icon: '🚐', desc: 'Tempo / Traveller', maxSeats: 12 },
];

const SpiritualTripVehicle = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isSpiritualTrip, trip } = location.state || {};

  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [vehicles, setVehicles] = useState(DEFAULT_VEHICLES);
  const [vehicle, setVehicle] = useState('sedan');
  const [seats, setSeats] = useState(2);
  const [loadingVehicles, setLoadingVehicles] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchVehicles = async () => {
      try {
        setLoadingVehicles(true);
        const res = await api.get('/users/vehicle-types');
        const raw = res?.data?.results || res?.data?.data?.results || res?.data?.data || [];
        if (isMounted && Array.isArray(raw) && raw.length > 0) {
          const mapped = raw
            .filter((v) => v.active !== false && Number(v.status ?? 1) !== 0)
            .map((v) => {
              const cap = Number(v.capacity) || 4;
              let icon = '🚗';
              if (v.icon_types === 'auto') icon = '🛺';
              else if (v.icon_types === 'bike') icon = '🏍️';
              else if (v.icon_types === 'suv' || (cap >= 6 && cap <= 8)) icon = '🚙';
              else if (cap > 8) icon = '🚐';

              return {
                id: String(v._id || v.id),
                vehicleTypeId: String(v._id || v.id),
                name: v.name,
                icon,
                iconType: v.icon_types || 'car',
                desc: v.short_description || v.description || `${v.name} · ${cap} Seats`,
                maxSeats: cap,
              };
            });

          if (mapped.length > 0) {
            setVehicles(mapped);
            setVehicle(mapped[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load spiritual trip vehicles:', err);
      } finally {
        if (isMounted) setLoadingVehicles(false);
      }
    };

    fetchVehicles();
    return () => { isMounted = false; };
  }, []);

  const routePrefix = location.pathname.startsWith('/taxi/user') ? '/taxi/user' : '';

  if (!trip) {
    navigate(`${routePrefix}/cab/spiritual`);
    return null;
  }

  const selectedVehicle = vehicles.find(v => v.id === vehicle) || vehicles[0];
  
  const getVehicleFare = (veh) => {
    const vehId = typeof veh === 'object' ? veh?.id : veh;
    if (trip?.vehicleFares?.[vehId]) return Number(trip.vehicleFares[vehId]);
    const bFare = Number(trip?.baseFare) || 999;
    const maxSeats = typeof veh === 'object' ? veh?.maxSeats : (veh === 'suv' ? 6 : veh === 'tempo' ? 12 : 4);
    if (maxSeats <= 4) return bFare;
    if (maxSeats <= 7) return Math.round(bFare * 1.4);
    return Math.round(bFare * 2.2);
  };

  const estimatedFare = getVehicleFare(selectedVehicle);

  const handleContinue = () => {
    if (!date || !time) return alert("Please select date and time");
    
    navigate(`${routePrefix}/cab/spiritual-confirm`, {
      state: { 
        isSpiritualTrip: true, 
        trip: { ...trip, fare: `₹${estimatedFare.toLocaleString()}` },
        vehicle: selectedVehicle,
        vehicleTypeId: selectedVehicle.id,
        seats,
        date,
        time
      },
    });
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#F8FAFC_0%,#F3F4F6_38%,#EEF2F7_100%)] max-w-lg mx-auto font-sans pb-32 relative overflow-hidden">
      <div className="absolute -top-16 right-[-40px] h-44 w-44 rounded-full bg-purple-100/60 blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="bg-white/90 backdrop-blur-md px-5 pt-10 pb-4 sticky top-0 z-20 border-b border-white/80 shadow-[0_4px_20px_rgba(15,23,42,0.05)] text-slate-900">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-[12px] border border-white/80 bg-white/90 flex items-center justify-center shadow-sm active:scale-95 transition-all">
            <ArrowLeft size={18} className="text-slate-900" strokeWidth={2.5} />
          </button>
          <div className="flex-1">
            <p className="text-[9px] font-black uppercase tracking-[0.26em] text-slate-400">Step 2</p>
            <h1 className="text-[19px] font-black tracking-tight text-slate-900 leading-none">Vehicle & Seats</h1>
          </div>
        </div>
      </header>

      <div className="px-5 pt-4 space-y-4">
        {/* Route Card */}
        <div className="rounded-[20px] bg-gradient-to-br from-purple-600 to-purple-800 p-4 text-white shadow-[0_8px_24px_rgba(147,51,234,0.25)] flex items-center justify-between">
            <div>
                <p className="text-[10px] font-black text-purple-200 uppercase tracking-widest mb-1">Destination</p>
                <h2 className="text-[18px] font-black leading-tight flex items-center gap-2">
                    {trip.name} <span className="text-2xl">{trip.emoji}</span>
                </h2>
                <div className="flex items-center gap-1 mt-1 opacity-80">
                    <MapPin size={10} strokeWidth={2.5} />
                    <span className="text-[10px] font-bold">{trip.dist}</span>
                </div>
            </div>
            <div className="text-right">
                 <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border border-purple-200/30 bg-purple-500/30 text-white uppercase tracking-widest block`}>
                    Guided Tour
                 </span>
            </div>
        </div>

        {/* Schedule */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 ml-1 flex items-center gap-1"><Calendar size={10} strokeWidth={3} /> Date</label>
            <input type="date" value={date} min={new Date().toISOString().split('T')[0]}
              onChange={e => setDate(e.target.value)}
              className="w-full rounded-[16px] px-3 py-3.5 text-[13px] font-bold text-slate-900 border-2 border-slate-100 bg-white/90 focus:border-purple-300 focus:outline-none transition-all shadow-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 ml-1 flex items-center gap-1"><Clock size={10} strokeWidth={3} /> Time</label>
            <input type="time" value={time}
              onChange={e => setTime(e.target.value)}
              className="w-full rounded-[16px] px-3 py-3.5 text-[13px] font-bold text-slate-900 border-2 border-slate-100 bg-white/90 focus:border-purple-300 focus:outline-none transition-all shadow-sm" />
          </div>
        </div>

        {/* Vehicle selection */}
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-400 mb-2 ml-1 mt-2">Select Vehicle</p>
          {loadingVehicles ? (
            <div className="flex items-center justify-center py-8 text-slate-400 gap-2 bg-white/60 rounded-[18px] border border-slate-100">
              <Loader2 size={18} className="animate-spin text-purple-600" />
              <span className="text-[12px] font-bold">Loading available vehicles...</span>
            </div>
          ) : (
            <div className="space-y-2.5">
              {vehicles.map(v => (
                <motion.button key={v.id} whileTap={{ scale: 0.98 }} onClick={() => { setVehicle(v.id); if(seats > v.maxSeats) setSeats(v.maxSeats); }}
                  className={`w-full flex items-center gap-4 p-4 rounded-[18px] border-2 transition-all text-left overflow-hidden relative ${
                    vehicle === v.id ? 'border-purple-300 bg-purple-50/50 shadow-sm' : 'border-slate-100 bg-white/90 hover:border-purple-100'
                  }`}>
                  {vehicle === v.id && <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/5 rounded-bl-full pointer-events-none" />}
                  <span className="text-3xl">{v.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[15px] font-black text-slate-900">{v.name}</span>
                    </div>
                    <p className="text-[11px] font-bold text-slate-500">{v.desc} · <span className="text-slate-400 font-medium">Upto</span> {v.maxSeats} seats</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[16px] font-black text-purple-700">₹{getVehicleFare(v).toLocaleString()}</p>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </div>

        {/* Passenger/Seats Selection */}
        <div className="bg-white/90 rounded-[18px] border border-slate-100 shadow-[0_4px_14px_rgba(15,23,42,0.04)] p-4 flex items-center justify-between mt-4">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-50 rounded-[12px] flex items-center justify-center border border-slate-100">
                    <Users size={18} className="text-slate-500" strokeWidth={2.5} />
                </div>
                <div>
                   <p className="text-[13px] font-black text-slate-900">Total Passengers</p>
                   <p className="text-[10px] font-bold text-slate-400">Max {selectedVehicle.maxSeats} for {selectedVehicle.name}</p>
                </div>
            </div>
            
            <div className="flex items-center gap-3 bg-slate-50 rounded-full p-1 border border-slate-100">
                <button onClick={() => setSeats(Math.max(1, seats - 1))} className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm text-slate-700 font-bold active:scale-90 transition-transform">-</button>
                <span className="w-4 text-center text-[15px] font-black text-slate-900">{seats}</span>
                <button onClick={() => setSeats(Math.min(selectedVehicle.maxSeats, seats + 1))} className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm text-slate-700 font-bold active:scale-90 transition-transform">+</button>
            </div>
        </div>

      </div>

      {/* CTA */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg px-5 pb-6 pt-3 bg-gradient-to-t from-[#EEF2F7] via-[#F3F4F6]/95 to-transparent pointer-events-none z-30">
        <motion.button whileTap={{ scale: 0.97 }} onClick={handleContinue}
          className="pointer-events-auto w-full bg-purple-600 py-4 rounded-[18px] text-[15px] font-black text-white shadow-[0_8px_24px_rgba(147,51,234,0.25)] flex items-center justify-center gap-2 uppercase tracking-wide">
          Confirm Details <ChevronRight size={17} strokeWidth={3} className="opacity-60" />
        </motion.button>
      </div>
    </div>
  );
};

export default SpiritualTripVehicle;
