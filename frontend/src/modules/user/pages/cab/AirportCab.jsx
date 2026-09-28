import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, MapPin, Calendar, Clock, ChevronRight, AlertCircle, Plane, Loader2 } from 'lucide-react';
import api from '@/shared/api/axiosInstance';

const DEFAULT_VEHICLES = [
  { id: 'mini',  name: 'Mini Cab', icon: '🚕', fare: 499,  desc: 'Swift, Alto, WagonR',    seats: 4 },
  { id: 'sedan', name: 'Sedan',    icon: '🚗', fare: 699,  desc: 'Dzire, Amaze, Aspire',   seats: 4 },
  { id: 'suv',   name: 'SUV',      icon: '🚙', fare: 999,  desc: 'Ertiga, Innova, Crysta', seats: 6 },
];

const TERMINALS = ['T1', 'T2', 'T3'];

const AirportCab = () => {
  const navigate = useNavigate();
  const [pickup,   setPickup]   = useState('');
  const [terminal, setTerminal] = useState('');
  const [date,     setDate]     = useState('');
  const [time,     setTime]     = useState('');
  const [vehicles, setVehicles] = useState(DEFAULT_VEHICLES);
  const [vehicle,  setVehicle]  = useState('mini');
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [errors,   setErrors]   = useState({});

  useEffect(() => {
    let isMounted = true;
    const fetchAirportVehicles = async () => {
      try {
        setLoadingVehicles(true);
        const [vTypesRes, setPricesRes] = await Promise.allSettled([
          api.get('/users/vehicle-types'),
          api.get('/users/set-prices'),
        ]);

        const rawVehicles = vTypesRes.status === 'fulfilled'
          ? (vTypesRes.value?.data?.results || vTypesRes.value?.data?.data?.results || vTypesRes.value?.data?.data || [])
          : [];
        const rawSetPrices = setPricesRes.status === 'fulfilled'
          ? (setPricesRes.value?.data?.results || setPricesRes.value?.data?.data?.results || setPricesRes.value?.data?.data || [])
          : [];

        // Build price map per vehicle ID from SetPrices rules
        const airportPriceMap = {};
        const generalPriceMap = {};

        rawSetPrices.forEach((rule) => {
          const vId = String(rule.vehicle_type?._id || rule.vehicle_type?.id || rule.vehicle_type || rule.type_id || '');
          if (!vId) return;

          const baseP = Number(rule.base_price) || 0;
          const surgeP = Number(rule.airport_surge) || 0;
          const feeP = Number(rule.support_airport_fee) || 0;
          const totalAirportFare = baseP + surgeP + feeP;

          if (rule.enable_airport_ride) {
            airportPriceMap[vId] = totalAirportFare > 0 ? totalAirportFare : (baseP || 499);
          }
          if (baseP > 0) {
            generalPriceMap[vId] = baseP;
          }
        });

        const mapped = rawVehicles
          .filter((v) => v.active !== false && Number(v.status ?? 1) !== 0)
          .map((v) => {
            const vId = String(v._id || v.id);
            const isAirportEnabled = Boolean(airportPriceMap[vId]);
            const calculatedFare = airportPriceMap[vId] || generalPriceMap[vId] || (v.capacity > 4 ? 999 : 499);

            let icon = '🚗';
            if (v.icon_types === 'auto') icon = '🛺';
            else if (v.icon_types === 'bike') icon = '🏍️';
            else if (v.icon_types === 'suv' || (v.capacity && v.capacity >= 6)) icon = '🚙';

            return {
              id: vId,
              vehicleTypeId: vId,
              name: v.name,
              icon,
              iconType: v.icon_types || 'car',
              desc: v.short_description || v.description || `${v.name} · ${v.capacity || 4} seats`,
              seats: v.capacity || 4,
              fare: calculatedFare,
              isAirportEnabled,
            };
          });

        const airportOnly = mapped.filter((v) => v.isAirportEnabled);
        const finalVehicles = airportOnly.length > 0 ? airportOnly : (mapped.length > 0 ? mapped : DEFAULT_VEHICLES);

        if (isMounted) {
          setVehicles(finalVehicles);
          if (finalVehicles.length > 0) {
            setVehicle(finalVehicles[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load airport vehicles:', err);
      } finally {
        if (isMounted) setLoadingVehicles(false);
      }
    };

    fetchAirportVehicles();
    return () => { isMounted = false; };
  }, []);

  const selectedVehicle = vehicles.find(v => v.id === vehicle) || vehicles[0];

  const validate = () => {
    const e = {};
    if (!pickup.trim()) e.pickup   = 'Pickup address is required';
    if (!terminal)      e.terminal = 'Select a terminal';
    if (!date)          e.date     = 'Select travel date';
    if (!time)          e.time     = 'Select travel time';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleBook = () => {
    if (!validate()) return;
    if (!selectedVehicle) return;
    navigate('/cab/airport-confirm', {
      state: { 
        isAirport: true, 
        pickup, 
        terminal, 
        date, 
        time, 
        vehicle: selectedVehicle, 
        fare: selectedVehicle.fare,
        vehicleTypeId: selectedVehicle.id,
      },
    });
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#F8FAFC_0%,#F3F4F6_38%,#EEF2F7_100%)] max-w-lg mx-auto font-sans pb-32 relative overflow-hidden">
      <div className="absolute -top-16 right-[-40px] h-44 w-44 rounded-full bg-blue-100/60 blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="bg-white/90 backdrop-blur-md px-5 pt-10 pb-4 sticky top-0 z-20 border-b border-white/80 shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-[12px] border border-white/80 bg-white/90 flex items-center justify-center shadow-sm active:scale-95 transition-all">
            <ArrowLeft size={18} className="text-slate-900" strokeWidth={2.5} />
          </button>
          <div className="flex-1">
            <p className="text-[9px] font-black uppercase tracking-[0.26em] text-slate-400">Auto & Cab</p>
            <h1 className="text-[19px] font-black tracking-tight text-slate-900">Airport Cab</h1>
          </div>
          <span className="text-[9px] font-black px-2.5 py-1 rounded-full border bg-blue-50 text-blue-600 border-blue-100">Fixed Fare</span>
        </div>
      </header>

      {/* Airport banner */}
      <div className="mx-5 mt-4 rounded-[20px] overflow-hidden bg-gradient-to-br from-blue-600 to-blue-800 p-5 flex items-center gap-4 shadow-[0_8px_24px_rgba(37,99,235,0.25)]">
        <div className="flex-1">
          <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest mb-1">On-time transfers</p>
          <h2 className="text-[18px] font-black text-white leading-tight">Indore Airport<br />Cab Booking</h2>
          <p className="text-[11px] font-bold text-blue-200 mt-1">Fixed fares · No surge pricing</p>
        </div>
        <div className="w-16 h-16 bg-white/10 rounded-[18px] flex items-center justify-center">
          <Plane size={32} className="text-white" strokeWidth={1.5} />
        </div>
      </div>

      <div className="px-5 pt-4 space-y-4">
        {/* Pickup */}
        <div>
          <label className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 ml-1 mb-1.5 block">Pickup Address</label>
          <div className={`flex items-center gap-3 rounded-[16px] px-4 py-3.5 border-2 transition-all ${errors.pickup ? 'border-red-200 bg-red-50' : 'border-slate-100 bg-white/90'}`}>
            <MapPin size={16} className="text-slate-400 shrink-0" strokeWidth={2} />
            <input type="text" value={pickup} onChange={e => { setPickup(e.target.value); setErrors(p => ({ ...p, pickup: '' })); }}
              placeholder="Your pickup location"
              className="flex-1 bg-transparent border-none text-[14px] font-bold text-slate-900 focus:outline-none placeholder:text-slate-300" />
          </div>
          {errors.pickup && <p className="text-[11px] font-black text-red-500 ml-1 mt-1 flex items-center gap-1"><AlertCircle size={11} strokeWidth={3} />{errors.pickup}</p>}
        </div>

        {/* Terminal */}
        <div>
          <label className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 ml-1 mb-1.5 block">Terminal</label>
          <div className="flex gap-2">
            {TERMINALS.map(t => (
              <button key={t} onClick={() => { setTerminal(t); setErrors(p => ({ ...p, terminal: '' })); }}
                className={`flex-1 py-3 rounded-[14px] text-[13px] font-black uppercase tracking-widest border-2 transition-all ${
                  terminal === t ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white/90 text-slate-600 border-slate-100'
                }`}>
                {t}
              </button>
            ))}
          </div>
          {errors.terminal && <p className="text-[11px] font-black text-red-500 ml-1 mt-1 flex items-center gap-1"><AlertCircle size={11} strokeWidth={3} />{errors.terminal}</p>}
        </div>

        {/* Date + Time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 ml-1 mb-1.5 block flex items-center gap-1"><Calendar size={10} strokeWidth={3} /> Date</label>
            <input type="date" value={date} min={new Date().toISOString().split('T')[0]}
              onChange={e => { setDate(e.target.value); setErrors(p => ({ ...p, date: '' })); }}
              className={`w-full rounded-[14px] px-3 py-3 text-[13px] font-bold text-slate-900 border-2 focus:outline-none transition-all ${errors.date ? 'border-red-200 bg-red-50' : 'border-slate-100 bg-white/90'}`} />
            {errors.date && <p className="text-[10px] font-black text-red-500 ml-1 mt-1">{errors.date}</p>}
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 ml-1 mb-1.5 block flex items-center gap-1"><Clock size={10} strokeWidth={3} /> Time</label>
            <input type="time" value={time}
              onChange={e => { setTime(e.target.value); setErrors(p => ({ ...p, time: '' })); }}
              className={`w-full rounded-[14px] px-3 py-3 text-[13px] font-bold text-slate-900 border-2 focus:outline-none transition-all ${errors.time ? 'border-red-200 bg-red-50' : 'border-slate-100 bg-white/90'}`} />
            {errors.time && <p className="text-[10px] font-black text-red-500 ml-1 mt-1">{errors.time}</p>}
          </div>
        </div>

        {/* Vehicle selection */}
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-400 mb-2">Choose Vehicle</p>
          {loadingVehicles ? (
            <div className="flex items-center justify-center py-8 text-slate-400 gap-2 bg-white/60 rounded-[18px] border border-slate-100">
              <Loader2 size={18} className="animate-spin text-blue-600" />
              <span className="text-[12px] font-bold">Loading airport cabs...</span>
            </div>
          ) : vehicles.length === 0 ? (
            <div className="text-center py-8 bg-white/60 rounded-[18px] border border-slate-100 text-slate-500">
              <p className="text-[13px] font-bold">No vehicles currently configured for airport rides.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {vehicles.map(v => (
                <motion.button key={v.id} whileTap={{ scale: 0.98 }} onClick={() => setVehicle(v.id)}
                  className={`w-full flex items-center gap-4 p-4 rounded-[18px] border-2 transition-all text-left ${
                    vehicle === v.id ? 'border-blue-300 bg-blue-50/50 shadow-sm' : 'border-slate-100 bg-white/90'
                  }`}>
                  <span className="text-2xl">{v.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-black text-slate-900">{v.name}</span>
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">Fixed Fare</span>
                    </div>
                    <p className="text-[11px] font-bold text-slate-400">{v.desc} · {v.seats} seats</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[17px] font-black text-slate-900">₹{v.fare}</p>
                    <p className="text-[9px] font-bold text-slate-400">one way</p>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CTA */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg px-5 pb-6 pt-3 bg-gradient-to-t from-[#EEF2F7] via-[#F3F4F6]/95 to-transparent pointer-events-none z-30">
        <div className="pointer-events-auto bg-white/90 rounded-[20px] border border-white/80 shadow-[0_4px_14px_rgba(15,23,42,0.06)] px-4 py-3 flex items-center justify-between mb-3">
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Fixed Fare</p>
            <p className="text-[20px] font-black text-slate-900">₹{selectedVehicle?.fare}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Vehicle</p>
            <p className="text-[13px] font-black text-slate-700">{selectedVehicle?.name}</p>
          </div>
        </div>
        <motion.button whileTap={{ scale: 0.97 }} onClick={handleBook}
          className="pointer-events-auto w-full bg-blue-600 py-4 rounded-[18px] text-[15px] font-black text-white shadow-[0_8px_24px_rgba(37,99,235,0.25)] flex items-center justify-center gap-2">
          Book Airport Cab <ChevronRight size={17} strokeWidth={3} className="opacity-60" />
        </motion.button>
      </div>
    </div>
  );
};

export default AirportCab;
