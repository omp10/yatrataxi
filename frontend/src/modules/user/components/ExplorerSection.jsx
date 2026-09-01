import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, MapPin, Sparkles, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../../shared/api/axiosInstance';
import indiaGateImg from '@/assets/india_gate_real.png';
import jaipurImg from '@/assets/jaipur.avif';
import tajMahalImg from '@/assets/taj mahal.jpeg';

const DEFAULT_FALLBACK_CITIES = [
  {
    title: 'Taj Mahal',
    image: tajMahalImg,
    label: 'Agra',
    code: 'AGR',
    drop: 'Taj Mahal, Dharmapuri, Forest Colony, Agra, Uttar Pradesh',
  },
  {
    title: 'Hawa Mahal',
    image: jaipurImg,
    label: 'Jaipur',
    code: 'JAI',
    drop: 'Hawa Mahal, Badi Choupad, J.D.A. Market, Pink City, Jaipur, Rajasthan',
  },
  {
    title: 'India Gate',
    image: indiaGateImg,
    label: 'New Delhi',
    code: 'DEL',
    drop: 'India Gate, Rajpath, India Gate, New Delhi, Delhi',
  },
];

const ExplorerSection = () => {
  const navigate = useNavigate();
  const [destinations, setDestinations] = useState(DEFAULT_FALLBACK_CITIES);
  const [loading, setLoading] = useState(true);
  const [showAllModal, setShowAllModal] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchExploreDestinations = async () => {
      try {
        const res = await api.get('/taxi/explore-destinations');
        const items = res?.data?.data || (Array.isArray(res?.data) ? res.data : []);
        if (isMounted && Array.isArray(items) && items.length > 0) {
          setDestinations(items);
        }
      } catch (error) {
        // Try alternate route
        try {
          const altRes = await api.get('/explore-destinations');
          const altItems = altRes?.data?.data || (Array.isArray(altRes?.data) ? altRes.data : []);
          if (isMounted && Array.isArray(altItems) && altItems.length > 0) {
            setDestinations(altItems);
            return;
          }
        } catch {
          // Graceful fallback to default destinations
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchExploreDestinations();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleExploreDestination = (city) => {
    setShowAllModal(false);
    navigate('/taxi/user/ride/select-location', {
      state: {
        drop: city.dropLocation || city.drop || city.title,
      },
    });
  };

  if (!loading && destinations.length === 0) {
    return null;
  }

  return (
    <div className="px-5 pb-8 flex flex-col gap-10">
      {/* Explore India Section */}
      <div>
        <div className="mb-3 ml-1 flex items-end justify-between">
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <Sparkles size={13} className="text-amber-500" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600">Featured Tours</span>
            </div>
            <h2 className="text-[19px] font-black text-gray-900 tracking-tight">Explore India</h2>
            <p className="mt-0.5 text-[11px] font-bold text-gray-400">
              Top tourist destinations across the country
            </p>
          </div>

          {destinations.length > 3 && (
            <button
              type="button"
              onClick={() => setShowAllModal(true)}
              className="text-xs font-black text-primary hover:text-primary/80 flex items-center gap-0.5 pb-1 transition-all"
            >
              <span>View All</span>
              <ArrowRight size={13} strokeWidth={2.5} />
            </button>
          )}
        </div>

        {/* Horizontal Carousel */}
        <div className="flex gap-4 overflow-x-auto no-scrollbar scroll-smooth pb-5 px-1">
          {loading ? (
            /* Skeleton Loading State */
            Array.from({ length: 3 }).map((_, idx) => (
              <div
                key={idx}
                className="flex-shrink-0 w-[214px] rounded-[20px] bg-slate-100 animate-pulse h-[190px] border border-slate-200/60 p-2 flex flex-col justify-between"
              >
                <div className="w-full h-[120px] bg-slate-200 rounded-[16px]" />
                <div className="px-1 py-1 space-y-1.5">
                  <div className="w-3/4 h-3.5 bg-slate-200 rounded" />
                  <div className="w-1/2 h-2.5 bg-slate-200 rounded" />
                </div>
              </div>
            ))
          ) : (
            <>
              {destinations.map((city, idx) => (
                <button
                  key={city._id || city.id || idx}
                  type="button"
                  onClick={() => handleExploreDestination(city)}
                  className="flex-shrink-0 w-[214px] group text-left transition-all active:scale-[0.98] cursor-pointer"
                >
                  <div className="rounded-[20px] bg-white/92 border border-white/80 shadow-[0_18px_40px_rgba(15,23,42,0.07)] overflow-hidden h-[136px] transition-all relative">
                    <img
                      src={city.image}
                      alt={city.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = tajMahalImg;
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/30 to-transparent" />
                    <div className="absolute top-3.5 right-3.5 bg-white/92 backdrop-blur-md px-2.5 py-1 rounded-full shadow-sm border border-white/60 z-10">
                      <p className="text-[9px] font-black text-primary tracking-widest uppercase">{city.code || 'IND'}</p>
                    </div>
                  </div>
                  <div className="mt-3 px-2">
                    <h4 className="text-[15px] font-black text-gray-900 leading-tight tracking-tight flex items-center justify-between">
                      <span className="truncate pr-1">{city.title}</span>
                      <div className="w-7 h-7 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-primary group-hover:bg-primary/10 transition-colors flex-shrink-0">
                        <ArrowRight size={14} strokeWidth={2.5} />
                      </div>
                    </h4>
                    <p className="text-[11px] text-gray-400 font-bold mt-1 tracking-tight flex items-center gap-1 truncate">
                      <MapPin size={10} className="text-slate-400 flex-shrink-0" />
                      <span>{city.label}</span>
                    </p>
                  </div>
                </button>
              ))}

              {destinations.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (destinations.length > 3) {
                      setShowAllModal(true);
                    } else {
                      handleExploreDestination(destinations[0]);
                    }
                  }}
                  className="flex-shrink-0 w-[128px] flex flex-col justify-center items-center gap-2 bg-white/75 border border-white/80 rounded-[18px] active:scale-95 transition-all text-slate-500 font-black h-[136px] self-start shadow-[0_14px_32px_rgba(15,23,42,0.05)] hover:bg-white hover:text-primary transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-slate-50 border border-white/80 shadow-sm flex items-center justify-center">
                    <ArrowRight size={18} strokeWidth={2.5} className="text-slate-400" />
                  </div>
                  <span className="text-[11px] uppercase tracking-[0.14em]">View All</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* View All Destinations Modal / Drawer */}
      <AnimatePresence>
        {showAllModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAllModal(false)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ y: '100%', opacity: 0.8 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 280 }}
              className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-10 max-h-[85vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="text-lg font-black text-gray-900">Explore India Destinations</h3>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">Select a destination to book a ride directly</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAllModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-700 bg-white rounded-full border border-gray-200 shadow-sm"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Destinations Grid */}
              <div className="p-5 overflow-y-auto space-y-3">
                {destinations.map((city, idx) => (
                  <button
                    key={city._id || city.id || idx}
                    type="button"
                    onClick={() => handleExploreDestination(city)}
                    className="w-full flex items-center gap-3.5 p-3 rounded-2xl bg-slate-50/80 hover:bg-slate-100 border border-slate-200/70 transition-all text-left group active:scale-[0.99]"
                  >
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-slate-200">
                      <img
                        src={city.image}
                        alt={city.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = tajMahalImg;
                        }}
                      />
                      <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[8px] font-black bg-black/70 text-white">
                        {city.code || 'IND'}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-black text-gray-900 group-hover:text-primary transition-colors truncate">
                        {city.title}
                      </h4>
                      <p className="text-xs text-gray-500 font-medium flex items-center gap-1 mt-0.5 truncate">
                        <MapPin size={11} className="text-gray-400 flex-shrink-0" />
                        <span>{city.label}</span>
                      </p>
                      <p className="text-[10px] text-gray-400 truncate mt-0.5" title={city.dropLocation || city.drop}>
                        {city.dropLocation || city.drop}
                      </p>
                    </div>

                    <div className="w-8 h-8 rounded-full bg-white shadow-sm border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-primary group-hover:border-primary/30 transition-all flex-shrink-0">
                      <ArrowRight size={15} strokeWidth={2.5} />
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ExplorerSection;
