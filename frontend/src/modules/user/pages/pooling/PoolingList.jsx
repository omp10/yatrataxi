import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  MapPin, 
  Clock, 
  Users, 
  ChevronRight, 
  Filter,
  Car,
  Star,
  ShieldCheck,
  Zap,
  Ticket,
  Navigation,
  Calendar,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { userService } from '../../services/userService';
import toast from 'react-hot-toast';

// Asset Imports
import taxiImg from '../../../../assets/3d images/AutoCab/taxi.png';

const PoolingList = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const date = searchParams.get('date');

  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRoutes();
  }, [from, to, date]);

  const fetchRoutes = async () => {
    setLoading(true);
    try {
      const res = await userService.searchPoolingRoutes({ from, to, date });
      let data = Array.isArray(res?.data?.data) ? res.data.data : Array.isArray(res?.data) ? res.data : [];

      if (from || to) {
        const cleanFrom = (from || '').trim().toLowerCase();
        const cleanTo = (to || '').trim().toLowerCase();

        const scoreRoute = (route) => {
          const origin = (route.originLabel || '').trim().toLowerCase();
          const destination = (route.destinationLabel || '').trim().toLowerCase();

          const originExact = cleanFrom && origin === cleanFrom;
          const destExact = cleanTo && destination === cleanTo;

          if (originExact && destExact) return 10;

          const originIncludes = cleanFrom && origin.includes(cleanFrom);
          const destIncludes = cleanTo && destination.includes(cleanTo);

          if (originIncludes && destIncludes) return 8;
          if (originExact) return 5;
          if (originIncludes) return 4;
          if (destExact) return 3;
          if (destIncludes) return 2;
          return 0;
        };

        data = [...data].sort((a, b) => scoreRoute(b) - scoreRoute(a));
      }

      setRoutes(data);
    } catch (error) {
      toast.error('Failed to fetch routes');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 max-w-lg mx-auto font-sans pb-24 selection:bg-indigo-100">
      {/* Immersive Header */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl px-5 pt-12 pb-6 shadow-sm border-b border-slate-200/80">
        <div className="flex items-center gap-4 mb-6">
          <button 
            onClick={() => navigate('/taxi/user/pooling')}
            className="w-11 h-11 rounded-2xl border border-slate-100 bg-white flex items-center justify-center text-slate-900 shadow-sm active:scale-95 transition-all hover:bg-slate-50"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 overflow-hidden">
            <div className="flex items-center gap-2">
              <span className="truncate text-base font-black text-slate-900 leading-tight">{from}</span>
              <ChevronRight size={14} className="text-slate-500 shrink-0" />
              <span className="truncate text-base font-black text-slate-900 leading-tight">{to}</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
               <div className="flex items-center gap-1 text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                  <Calendar size={10} />
                  {date}
               </div>
               <span className="bg-indigo-50 text-indigo-600 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">Step 1/3</span>
            </div>
          </div>
          <button className="w-11 h-11 rounded-2xl border border-slate-100 bg-white flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors">
            <Filter size={18} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="flex items-center gap-2 px-1">
          <div className="h-1.5 flex-1 rounded-full bg-indigo-600 shadow-[0_0_8px_rgba(79,70,229,0.4)]" />
          <div className="h-1.5 flex-1 rounded-full bg-slate-100" />
          <div className="h-1.5 flex-1 rounded-full bg-slate-100" />
        </div>
      </div>

      <div className="px-5 pt-8">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-44 w-full animate-pulse rounded-2xl bg-white border border-slate-200/80 shadow-sm" />
            ))}
          </div>
        ) : routes.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-24 text-center"
          >
            <div className="mb-8 relative">
               <div className="h-32 w-32 rounded-full bg-indigo-50/50 flex items-center justify-center text-indigo-100 animate-pulse" />
               <Car size={56} className="absolute inset-0 m-auto text-indigo-200" />
            </div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">No Rides Found</h3>
            <p className="mt-3 max-w-[260px] text-sm font-medium text-slate-600 leading-relaxed">
              We couldn't find any carpools matching your route for this date.
            </p>
            <button 
              onClick={() => navigate('/taxi/user/pooling')}
              className="mt-10 flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-white px-8 py-4 bg-slate-900 rounded-[20px] shadow-2xl shadow-slate-200 active:scale-95 transition-all"
            >
              <ArrowLeft size={16} />
              Modify Search
            </button>
          </motion.div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
               <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-600">{routes.length} Available Rides</p>
               <div className="flex items-center gap-1.5 text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-widest">
                  <ShieldCheck size={12} />
                  Verified
               </div>
            </div>

            {routes.map((route, idx) => {
              const vehicle = route.assignedVehicleTypeIds?.[0] || {};
              const vehicleImage = (vehicle.images && vehicle.images.length > 0) ? vehicle.images[0] : taxiImg;
              const serviceTaxPercentage = Number(vehicle.serviceTaxPercentage || 0);

              return (
                <motion.div
                  key={route._id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.06 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() =>
                    navigate(`/taxi/user/pooling/seats/${route._id}`, {
                      state: {
                        travelDate: date,
                      },
                    })
                  }
                  className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4.5 sm:p-5 shadow-sm hover:shadow-md transition-all hover:border-indigo-200 cursor-pointer"
                >
                  {/* Decorative Elements */}
                  <div className="absolute top-0 right-0 -mr-12 -mt-12 h-36 w-36 rounded-full bg-slate-100/50 blur-2xl group-hover:bg-indigo-50/50 transition-colors pointer-events-none" />
                  
                  {/* Top: Route + Vehicle & Price */}
                  <div className="flex items-start justify-between gap-3 relative z-10">
                    {/* Route Timeline */}
                    <div className="flex items-start gap-2.5 flex-1 min-w-0">
                      <div className="flex flex-col items-center pt-1 shrink-0">
                        <div className="h-2.5 w-2.5 rounded-full border-2 border-indigo-600 bg-white shadow-[0_0_6px_rgba(79,70,229,0.3)]" />
                        <div className="h-7 w-0.5 border-l-2 border-dashed border-slate-200 my-0.5" />
                        <div className="h-2.5 w-2.5 rounded-full bg-slate-900" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-2">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Pickup</p>
                          <p className="text-sm font-black text-slate-900 truncate leading-tight mt-0.5">{route.originLabel}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Destination</p>
                          <p className="text-sm font-black text-slate-900 truncate leading-tight mt-0.5">{route.destinationLabel}</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Vehicle Preview + Fare */}
                    <div className="flex flex-col items-end shrink-0">
                      <div className="mb-2 relative h-14 w-24 overflow-hidden rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center group-hover:bg-white transition-colors">
                        <img src={vehicleImage} alt={vehicle.name} className="w-full h-full object-contain p-1 transform group-hover:scale-105 transition-transform duration-300" />
                        <div className="absolute bottom-1 right-1 bg-white/90 backdrop-blur-xs px-1.5 py-0.5 rounded text-[8px] font-black text-slate-800 uppercase tracking-wider border border-slate-100">
                          {vehicle.vehicleType || 'Sedan'}
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="flex items-baseline justify-end gap-1">
                          <span className="text-2xl font-black tracking-tight text-slate-900 leading-none">₹{route.farePerSeat}</span>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">/ seat</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Middle Strip: Instant Badge, Seats Left & Tax info */}
                  <div className="flex items-center justify-between py-2 border-y border-slate-100 my-3 relative z-10">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md uppercase tracking-wider">
                        <Zap size={10} fill="currentColor" /> Instant
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600">
                        <Users size={12} className="text-slate-400" /> {route.maxSeatsPerBooking} seats left
                      </span>
                    </div>
                    {serviceTaxPercentage > 0 ? (
                      <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wide">
                        +{serviceTaxPercentage}% service tax
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                        All taxes incl.
                      </span>
                    )}
                  </div>

                  {/* Footer Info: Captain details & Select Button */}
                  <div className="flex items-center justify-between relative z-10 pt-0.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative shrink-0">
                        <div className="h-9 w-9 overflow-hidden rounded-xl bg-slate-100 border border-slate-200">
                          <img src={`https://ui-avatars.com/api/?name=${route.driverName || 'Verified'}&background=4f46e5&color=fff&bold=true&font-size=0.45`} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div className="absolute -right-1 -bottom-1 h-3.5 w-3.5 rounded-full bg-emerald-500 border border-white flex items-center justify-center">
                          <ShieldCheck size={7} className="text-white" />
                        </div>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-slate-900 truncate leading-tight">{route.driverName || 'Verified Captain'}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} size={8} className={i < 4 ? "text-amber-400 fill-amber-400" : "text-slate-200 fill-slate-200"} />
                            ))}
                          </div>
                          <span className="text-[9px] font-black text-slate-600 uppercase tracking-wider">4.8 • Top Pilot</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* "Select" Button (replacing the arrow) */}
                    <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-black uppercase tracking-wider shadow-sm group-hover:bg-indigo-600 group-hover:shadow-indigo-100 transition-all shrink-0">
                      <span>Select</span>
                      <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PoolingList;
