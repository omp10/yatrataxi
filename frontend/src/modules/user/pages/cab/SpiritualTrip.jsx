import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ChevronRight, MapPin, Loader2, Sparkles } from 'lucide-react';

const FALLBACK_DESTINATIONS = [
  { id: 'ujjain',      name: 'Ujjain Mahakaleshwar', subtitle: 'Mahakaleshwar Jyotirlinga', dist: '55 km',  fare: '₹800–₹1,200',  emoji: '🛕', accent: 'bg-[linear-gradient(135deg,#FDF4FF_0%,#F3E8FF_100%)]' },
  { id: 'omkareshwar', name: 'Omkareshwar',  subtitle: 'Jyotirlinga on Narmada',   dist: '77 km',  fare: '₹1,000–₹1,500', emoji: '🙏', accent: 'bg-[linear-gradient(135deg,#FFF7ED_0%,#FFE5C2_100%)]' },
  { id: 'maheshwar',   name: 'Maheshwar & Mandu', subtitle: 'Ahilya Fort & Ghats',      dist: '91 km',  fare: '₹1,200–₹1,800', emoji: '⛵', accent: 'bg-[linear-gradient(135deg,#EFF6FF_0%,#DBEAFE_100%)]' },
  { id: 'orchha',      name: 'Orchha Ram Raja', subtitle: 'Sacred Temple Palace',     dist: '320 km', fare: '₹3,500–₹5,000', emoji: '🏯', accent: 'bg-[linear-gradient(135deg,#F0FDF4_0%,#BBF7D0_100%)]' },
  { id: 'datia',       name: 'Pitambara Peeth', subtitle: 'Datia Shakti Shrine',      dist: '210 km', fare: '₹2,500–₹3,500', emoji: '🌸', accent: 'bg-[linear-gradient(135deg,#FDF4FF_0%,#FBCFE8_100%)]' },
  { id: 'amarkantak',  name: 'Amarkantak',   subtitle: 'Source of Narmada River',  dist: '380 km', fare: '₹4,000–₹5,500', emoji: '🏔️', accent: 'bg-[linear-gradient(135deg,#F0FDF4_0%,#D1FAE5_100%)]' },
];

const ACCENT_GRADIENTS = [
  'bg-[linear-gradient(135deg,#FDF4FF_0%,#F3E8FF_100%)]',
  'bg-[linear-gradient(135deg,#FFF7ED_0%,#FFE5C2_100%)]',
  'bg-[linear-gradient(135deg,#EFF6FF_0%,#DBEAFE_100%)]',
  'bg-[linear-gradient(135deg,#F0FDF4_0%,#BBF7D0_100%)]',
  'bg-[linear-gradient(135deg,#FDF4FF_0%,#FBCFE8_100%)]',
  'bg-[linear-gradient(135deg,#F0FDF4_0%,#D1FAE5_100%)]',
];

const SpiritualTrip = () => {
  const navigate = useNavigate();
  const [destinations, setDestinations] = useState(FALLBACK_DESTINATIONS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchDestinations = async () => {
      try {
        const origin = globalThis.__LEGACY_BACKEND_ORIGIN__ || '';
        const res = await fetch(`${origin}/api/v1/explore-destinations?category=spiritual`);
        if (res.ok) {
          const data = await res.json();
          const items = Array.isArray(data?.data) ? data.data : (data?.data?.results || []);
          if (isMounted && items.length > 0) {
            const mapped = items.map((dest, idx) => ({
              id: dest._id || dest.id || `dest-${idx}`,
              name: dest.title || dest.name,
              subtitle: dest.description || dest.label || dest.subtitle || 'Sacred Pilgrimage',
              dist: dest.distance || dest.dist || '55 km',
              fare: dest.baseFare ? `₹${dest.baseFare}–₹${Math.round(dest.baseFare * 1.4)}` : (dest.fare || '₹999–₹1,500'),
              baseFare: dest.baseFare || 999,
              emoji: dest.emoji || '🛕',
              image: dest.image || '',
              dropLocation: dest.dropLocation || dest.drop,
              accent: ACCENT_GRADIENTS[idx % ACCENT_GRADIENTS.length],
            }));
            setDestinations(mapped);
          }
        }
      } catch (err) {
        console.error('Failed to load spiritual destinations dynamically:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDestinations();
    return () => { isMounted = false; };
  }, []);

  const handleSelect = (dest) => {
    navigate('/cab/spiritual-vehicle', {
      state: { isSpiritualTrip: true, trip: dest },
    });
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#F8FAFC_0%,#F3F4F6_38%,#EEF2F7_100%)] max-w-lg mx-auto font-sans pb-12 relative overflow-hidden">
      <div className="absolute -top-16 right-[-40px] h-44 w-44 rounded-full bg-purple-100/60 blur-3xl pointer-events-none" />
      <div className="absolute top-52 left-[-60px] h-52 w-52 rounded-full bg-orange-100/40 blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="bg-white/90 backdrop-blur-md px-5 pt-10 pb-4 sticky top-0 z-20 border-b border-white/80 shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-[12px] border border-white/80 bg-white/90 flex items-center justify-center shadow-sm active:scale-95 transition-all">
            <ArrowLeft size={18} className="text-slate-900" strokeWidth={2.5} />
          </button>
          <div className="flex-1">
            <p className="text-[9px] font-black uppercase tracking-[0.26em] text-slate-400">Auto & Cab</p>
            <h1 className="text-[19px] font-black tracking-tight text-slate-900">Spiritual Trips</h1>
          </div>
          <span className="text-[9px] font-black px-2.5 py-1 rounded-full border bg-purple-50 text-purple-600 border-purple-100">
            Guided Tours
          </span>
        </div>
      </header>

      <div className="px-5 pt-4 space-y-4">
        {/* Intro card */}
        <div className="rounded-[20px] bg-gradient-to-br from-purple-600 to-purple-800 p-5 text-white shadow-[0_8px_24px_rgba(147,51,234,0.25)]">
          <p className="text-[10px] font-black text-purple-200 uppercase tracking-widest mb-1 flex items-center gap-1">
            <Sparkles size={12} />
            <span>Curated Pilgrimages</span>
          </p>
          <h2 className="text-[18px] font-black leading-tight">Sacred Journeys<br />to Holy Sites</h2>
          <p className="text-[11px] font-bold text-purple-200 mt-1">Comfortable cabs · Experienced drivers · Best verified prices</p>
        </div>

        {/* Section label */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-400">Holy Destinations</p>
            <h2 className="mt-0.5 text-[16px] font-black tracking-tight text-slate-900">Choose your pilgrimage</h2>
          </div>
          {loading && <Loader2 size={16} className="animate-spin text-purple-600" />}
        </div>

        {/* Destination grid */}
        <div className="grid grid-cols-2 gap-3">
          {destinations.map((dest, i) => (
            <motion.button
              key={dest.id}
              type="button"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleSelect(dest)}
              className={`rounded-[20px] border border-white/80 shadow-[0_4px_14px_rgba(15,23,42,0.06)] p-3.5 text-left flex flex-col justify-between overflow-hidden relative group ${dest.accent}`}
            >
              {dest.image ? (
                <div className="h-20 -mx-3.5 -mt-3.5 mb-2.5 overflow-hidden relative bg-slate-200">
                  <img
                    src={dest.image}
                    alt={dest.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                  <div className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded-full text-xs bg-white/90 shadow-sm backdrop-blur-xs">
                    {dest.emoji}
                  </div>
                </div>
              ) : (
                <span className="text-3xl mb-1">{dest.emoji}</span>
              )}

              <div>
                <p className="text-[14px] font-black text-slate-900 leading-tight line-clamp-1">{dest.name}</p>
                <p className="text-[10px] font-bold text-slate-500 mt-0.5 leading-tight line-clamp-1">{dest.subtitle}</p>
              </div>

              <div className="flex items-center justify-between mt-3 pt-1 border-t border-black/5">
                <div>
                  <div className="flex items-center gap-1">
                    <MapPin size={9} className="text-slate-400" strokeWidth={2.5} />
                    <span className="text-[9px] font-bold text-slate-400">{dest.dist}</span>
                  </div>
                  <p className="text-[10px] font-black text-slate-800">{dest.fare}</p>
                </div>
                <div className="w-6 h-6 rounded-full bg-white/80 flex items-center justify-center shadow-xs">
                  <ChevronRight size={12} className="text-slate-600" strokeWidth={2.5} />
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Note */}
        <div className="rounded-[16px] border border-white/80 bg-white/90 px-4 py-3 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
          <p className="text-[11px] font-bold text-slate-400 leading-relaxed">
            All fares are estimates managed directly by our travel desk. Final fare depends on vehicle choice and round trip duration.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SpiritualTrip;
