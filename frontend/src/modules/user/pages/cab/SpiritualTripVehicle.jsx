import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Autocomplete } from '@react-google-maps/api';
import { ArrowLeft, Users, ChevronRight, Calendar, Clock, MapPin, Loader2, LocateFixed } from 'lucide-react';
import api from '@/shared/api/axiosInstance';
import { isEligibleSpiritualVehicle } from '../../utils/serviceModulePresentation';
import { useAppGoogleMapsLoader } from '../../../admin/utils/googleMaps';
import { geocodeAddress, getCurrentPositionCoords, reverseGeocode } from '@/shared/utils/geocoding';

const getVehicleIcon = (vehicle) => {
  const cap = Number(vehicle.capacity) || 0;
  if (vehicle.icon_types === 'suv' || (cap >= 6 && cap <= 8)) return '🚙';
  if (cap > 8) return '🚐';
  return '🚗';
};

const SpiritualTripVehicle = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { trip } = location.state || {};
  const routePrefix = location.pathname.startsWith('/taxi/user') ? '/taxi/user' : '';
  const { isLoaded: isMapsLoaded } = useAppGoogleMapsLoader();

  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [vehicles, setVehicles] = useState([]);
  const [vehicleId, setVehicleId] = useState('');
  const [seats, setSeats] = useState(1);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [pickupAddress, setPickupAddress] = useState('');
  const [pickupCoords, setPickupCoords] = useState(null);
  const [autocomplete, setAutocomplete] = useState(null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!trip) {
      navigate(`${routePrefix}/cab/spiritual`, { replace: true });
    }
  }, [navigate, routePrefix, trip]);

  useEffect(() => {
    if (!trip) return undefined;
    let isMounted = true;

    const fetchVehicles = async () => {
      try {
        const res = await api.get('/users/vehicle-types');
        const raw = Array.isArray(res?.data) ? res.data : (res?.data?.results || res?.results || []);
        // Only vehicles the admin priced for this destination can be booked.
        const mapped = raw
          .filter((v) => v.active !== false && Number(v.status ?? 1) !== 0 && isEligibleSpiritualVehicle(v))
          .map((v) => {
            const id = String(v._id || v.id);
            return {
              id,
              name: v.name,
              icon: getVehicleIcon(v),
              iconType: v.icon_types || 'car',
              desc: v.short_description || v.description || '',
              maxSeats: Number(v.capacity) || 1,
              fare: Number(trip.vehicleFares?.[id]) || 0,
            };
          })
          .filter((v) => v.fare > 0);

        if (isMounted) {
          setVehicles(mapped);
          setVehicleId(mapped[0]?.id || '');
        }
      } catch (err) {
        if (isMounted) setError(err?.message || 'Could not load vehicles');
      } finally {
        if (isMounted) setLoadingVehicles(false);
      }
    };

    fetchVehicles();
    return () => { isMounted = false; };
  }, [trip]);

  if (!trip) {
    return null;
  }

  const selectedVehicle = vehicles.find((v) => v.id === vehicleId) || null;

  const handlePlaceChanged = () => {
    const place = autocomplete?.getPlace();
    if (place?.geometry?.location) {
      setPickupAddress(place.formatted_address || place.name || pickupAddress);
      setPickupCoords([place.geometry.location.lng(), place.geometry.location.lat()]);
      setError('');
    }
  };

  const useCurrentLocation = async () => {
    setLocating(true);
    setError('');
    try {
      const coords = await getCurrentPositionCoords();
      setPickupCoords(coords);
      setPickupAddress((await reverseGeocode(coords)) || 'Current location');
    } catch (err) {
      setError(err.message);
    } finally {
      setLocating(false);
    }
  };

  const handleContinue = async () => {
    if (!selectedVehicle) {
      setError('No vehicle is available for this destination yet.');
      return;
    }
    if (!pickupAddress.trim()) {
      setError('Enter your pickup location.');
      return;
    }
    if (!date || !time) {
      setError('Select the travel date and time.');
      return;
    }

    const scheduledAt = new Date(`${date}T${time}:00`);
    if (Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() <= Date.now()) {
      setError('Choose a date and time in the future.');
      return;
    }

    try {
      // A typed address that was not picked from the suggestions is located here.
      const resolvedPickup = pickupCoords || await geocodeAddress(pickupAddress);
      navigate(`${routePrefix}/cab/spiritual-confirm`, {
        state: {
          trip,
          vehicle: selectedVehicle,
          seats,
          date,
          time,
          scheduledAt: scheduledAt.toISOString(),
          pickupAddress: pickupAddress.trim(),
          pickupCoords: resolvedPickup,
        },
      });
    } catch (err) {
      setError(err.message);
    }
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
            <h1 className="text-[19px] font-black tracking-tight text-slate-900 leading-none">Pickup, Vehicle & Time</h1>
          </div>
        </div>
      </header>

      <div className="px-5 pt-4 space-y-4">
        {/* Route Card */}
        <div className="rounded-[20px] bg-gradient-to-br from-purple-600 to-purple-800 p-4 text-white shadow-[0_8px_24px_rgba(147,51,234,0.25)]">
          <p className="text-[10px] font-black text-purple-200 uppercase tracking-widest mb-1">Destination</p>
          <h2 className="text-[18px] font-black leading-tight flex items-center gap-2">
            {trip.name} <span className="text-2xl">{trip.emoji}</span>
          </h2>
          {(trip.dropLocation || trip.dist) && (
            <div className="flex items-center gap-1 mt-1 opacity-80">
              <MapPin size={10} strokeWidth={2.5} />
              <span className="text-[10px] font-bold">{[trip.dropLocation, trip.dist].filter(Boolean).join(' · ')}</span>
            </div>
          )}
        </div>

        {/* Pickup */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 ml-1 flex items-center gap-1"><MapPin size={10} strokeWidth={3} /> Pickup location</label>
          <div className="flex gap-2">
            <div className="flex-1">
              {isMapsLoaded ? (
                <Autocomplete onLoad={setAutocomplete} onPlaceChanged={handlePlaceChanged}>
                  <input
                    type="text"
                    value={pickupAddress}
                    onChange={(e) => { setPickupAddress(e.target.value); setPickupCoords(null); }}
                    placeholder="Search pickup address"
                    className="w-full rounded-[16px] px-3 py-3.5 text-[13px] font-bold text-slate-900 border-2 border-slate-100 bg-white/90 focus:border-purple-300 focus:outline-none transition-all shadow-sm"
                  />
                </Autocomplete>
              ) : (
                <input
                  type="text"
                  value={pickupAddress}
                  onChange={(e) => { setPickupAddress(e.target.value); setPickupCoords(null); }}
                  placeholder="Search pickup address"
                  className="w-full rounded-[16px] px-3 py-3.5 text-[13px] font-bold text-slate-900 border-2 border-slate-100 bg-white/90 focus:border-purple-300 focus:outline-none transition-all shadow-sm"
                />
              )}
            </div>
            <button
              type="button"
              onClick={useCurrentLocation}
              disabled={locating || !isMapsLoaded}
              className="shrink-0 w-12 rounded-[16px] border-2 border-slate-100 bg-white/90 flex items-center justify-center text-purple-600 disabled:opacity-50"
              aria-label="Use current location"
            >
              {locating ? <Loader2 size={18} className="animate-spin" /> : <LocateFixed size={18} />}
            </button>
          </div>
        </div>

        {/* Schedule */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 ml-1 flex items-center gap-1"><Calendar size={10} strokeWidth={3} /> Date</label>
            <input type="date" value={date} min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-[16px] px-3 py-3.5 text-[13px] font-bold text-slate-900 border-2 border-slate-100 bg-white/90 focus:border-purple-300 focus:outline-none transition-all shadow-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 ml-1 flex items-center gap-1"><Clock size={10} strokeWidth={3} /> Time</label>
            <input type="time" value={time}
              onChange={(e) => setTime(e.target.value)}
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
          ) : vehicles.length === 0 ? (
            <div className="py-8 text-center text-[12px] font-bold text-slate-400 bg-white/60 rounded-[18px] border border-slate-100">
              No vehicle is priced for this destination yet.
            </div>
          ) : (
            <div className="space-y-2.5">
              {vehicles.map((v) => (
                <motion.button key={v.id} whileTap={{ scale: 0.98 }} onClick={() => { setVehicleId(v.id); if (seats > v.maxSeats) setSeats(v.maxSeats); }}
                  className={`w-full flex items-center gap-4 p-4 rounded-[18px] border-2 transition-all text-left overflow-hidden relative ${
                    vehicleId === v.id ? 'border-purple-300 bg-purple-50/50 shadow-sm' : 'border-slate-100 bg-white/90 hover:border-purple-100'
                  }`}>
                  <span className="text-3xl">{v.icon}</span>
                  <div className="flex-1">
                    <span className="text-[15px] font-black text-slate-900">{v.name}</span>
                    <p className="text-[11px] font-bold text-slate-500">{v.desc ? `${v.desc} · ` : ''}<span className="text-slate-400 font-medium">Up to</span> {v.maxSeats} seats</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[16px] font-black text-purple-700">₹{v.fare.toLocaleString('en-IN')}</p>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </div>

        {/* Passengers */}
        {selectedVehicle && (
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
        )}

        {error && <p className="text-[12px] font-bold text-rose-600 px-1">{error}</p>}
      </div>

      {/* CTA */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg px-5 pb-6 pt-3 bg-gradient-to-t from-[#EEF2F7] via-[#F3F4F6]/95 to-transparent pointer-events-none z-30">
        <motion.button whileTap={{ scale: 0.97 }} onClick={handleContinue} disabled={!selectedVehicle}
          className="pointer-events-auto w-full bg-purple-600 py-4 rounded-[18px] text-[15px] font-black text-white shadow-[0_8px_24px_rgba(147,51,234,0.25)] flex items-center justify-center gap-2 uppercase tracking-wide disabled:opacity-50">
          {selectedVehicle ? `Review · ₹${selectedVehicle.fare.toLocaleString('en-IN')}` : 'Select a vehicle'} <ChevronRight size={17} strokeWidth={3} className="opacity-60" />
        </motion.button>
      </div>
    </div>
  );
};

export default SpiritualTripVehicle;
