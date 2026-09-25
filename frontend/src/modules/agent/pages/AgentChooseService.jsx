import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, ShieldCheck, Sparkles, Percent } from 'lucide-react';

import imgShared from '@/assets/3d images/AutoCab/taxi.png';
import imgAirport from '@/assets/3d images/AutoCab/airoplan.png';
import imgSpiritual from '@/assets/3d images/AutoCab/temple.png';
import imgOneWay from '@/assets/3d images/AutoCab/one way.png';
import imgBus from '@/assets/3d images/AutoCab/bus.png';

const services = [
  {
    id: 'shared',
    title: 'Shared Taxi',
    sub: 'Split fare with co-passengers',
    img: imgShared,
    path: '/taxi/agent/book-shared-taxi',
    accent: 'bg-[linear-gradient(135deg,#F0FDF4_0%,#BBF7D0_100%)]',
    tag: '50% cheaper',
    tagColor: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    commission: '4% Commission',
  },
  {
    id: 'airport',
    title: 'Airport Cab',
    sub: 'On-time airport transfers',
    img: imgAirport,
    path: '/taxi/agent/book-airport-cab',
    accent: 'bg-[linear-gradient(135deg,#EFF6FF_0%,#DBEAFE_100%)]',
    tag: 'Fixed fare',
    tagColor: 'bg-blue-50 text-blue-600 border-blue-100',
    commission: '5% Commission',
  },
  {
    id: 'spiritual',
    title: 'Spiritual Trips',
    sub: 'Ujjain, Omkareshwar & more',
    img: imgSpiritual,
    path: '/taxi/agent/book-spiritual-trip',
    accent: 'bg-[linear-gradient(135deg,#FDF4FF_0%,#F3E8FF_100%)]',
    tag: 'Guided tours',
    tagColor: 'bg-purple-50 text-purple-600 border-purple-100',
    commission: '5% Commission',
  },
  {
    id: 'oneway',
    title: 'One Way',
    sub: 'Intercity drop at best price',
    img: imgOneWay,
    path: '/taxi/agent/book-one-way',
    accent: 'bg-[linear-gradient(135deg,#FFF7ED_0%,#FFE5C2_100%)]',
    tag: 'No return charge',
    tagColor: 'bg-orange-50 text-orange-600 border-orange-100',
    commission: '6% Commission',
  },
  {
    id: 'bus',
    title: 'Bus Booking',
    sub: 'Comfortable intercity buses',
    img: imgBus,
    path: '/taxi/agent/book-bus',
    accent: 'bg-[linear-gradient(135deg,#FFF1F2_0%,#FECDD3_100%)]',
    tag: 'Sleeper & Seater',
    tagColor: 'bg-rose-50 text-rose-600 border-rose-100',
    commission: '4% Commission',
  },
];

export const AgentChooseService = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#F8FAFC_0%,#F3F4F6_38%,#EEF2F7_100%)] max-w-lg mx-auto font-sans pb-16 relative overflow-hidden">
      <div className="absolute -top-16 right-[-40px] h-44 w-44 rounded-full bg-purple-100/60 blur-3xl pointer-events-none" />
      <div className="absolute top-52 left-[-60px] h-52 w-52 rounded-full bg-blue-100/40 blur-3xl pointer-events-none" />

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/90 backdrop-blur-md px-5 pt-8 pb-4 sticky top-0 z-20 border-b border-white/80 shadow-[0_4px_20px_rgba(15,23,42,0.05)]"
      >
        <div className="flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate('/taxi/agent')}
            className="w-9 h-9 rounded-[12px] border border-white/80 bg-white/90 flex items-center justify-center shadow-[0_4px_12px_rgba(15,23,42,0.07)] shrink-0"
          >
            <ArrowLeft size={18} className="text-slate-900" strokeWidth={2.5} />
          </motion.button>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.26em] text-slate-400">Auto & Cab</p>
            <h1 className="text-[19px] font-black tracking-tight text-slate-900 leading-tight">Choose a Service</h1>
          </div>
          <img src="/4_Taxi.png" alt="cab" className="h-10 w-10 object-contain drop-shadow-md shrink-0" />
        </div>
      </motion.header>

      {/* Agent Desk Commission Highlight Strip */}
      <div className="mx-5 mt-4 rounded-[22px] bg-[linear-gradient(135deg,#143a5a_0%,#0f6aa8_100%)] p-4 text-white shadow-[0_12px_28px_rgba(20,58,90,0.18)]">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-white/70">
              <Sparkles size={13} className="text-amber-300" />
              <span>Agent Desk Booking</span>
            </div>
            <p className="mt-1 text-sm font-black text-white">Book for Walk-ins & Direct Customers</p>
          </div>
          <div className="rounded-full bg-white/15 px-3 py-1 text-center backdrop-blur-md">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300">Wallet Credit</span>
            <p className="text-xs font-black text-white">Instant</p>
          </div>
        </div>
      </div>

      {/* Service list */}
      <div className="px-5 pt-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-400">5 Services Available</p>
            <h2 className="text-[17px] font-black tracking-tight text-slate-900">What do you need?</h2>
          </div>
        </div>

        <div className="space-y-3 pt-1">
          {services.map((service, index) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(service.path)}
              className="group cursor-pointer rounded-[24px] border border-white/80 bg-white/95 p-4 shadow-[0_4px_16px_rgba(15,23,42,0.06)] transition-all hover:border-[#143a5a]/30 hover:shadow-[0_8px_24px_rgba(20,58,90,0.1)]"
            >
              <div className="flex items-center gap-4">
                {/* 3D Image preview */}
                <div className={`relative h-16 w-16 shrink-0 rounded-[18px] p-2 flex items-center justify-center ${service.accent} shadow-inner`}>
                  <img
                    src={service.img}
                    alt={service.title}
                    className="h-full w-full object-contain drop-shadow transition-transform group-hover:scale-110 duration-200"
                  />
                </div>

                {/* Details */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-black text-slate-900 leading-snug">{service.title}</h3>
                    <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black ${service.tagColor}`}>
                      {service.tag}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">{service.sub}</p>

                  <div className="mt-2 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700">
                      <Percent size={10} strokeWidth={3} />
                      {service.commission}
                    </span>
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-400 group-hover:bg-[#143a5a] group-hover:text-white transition-all shadow-sm">
                  <ArrowRight size={16} strokeWidth={2.5} />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Security badge */}
        <div className="mt-4 flex items-center gap-3 rounded-[20px] border border-white/80 bg-white/70 px-4 py-3 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
          <ShieldCheck size={18} className="text-[#0f6aa8] shrink-0" />
          <p className="text-[11px] font-bold text-slate-500">
            All bookings automatically bind the customer to your referral ledger for continuous commissions.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AgentChooseService;
