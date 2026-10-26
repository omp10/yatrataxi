import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';

const MotionButton = motion.button;

const HomeSearchBar = () => {
  const navigate = useNavigate();

  return (
    <div className="relative z-20 -mt-9 px-8">
      <MotionButton
        type="button"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05, ease: 'easeOut' }}
        whileTap={{ scale: 0.99 }}
        onClick={() => navigate('/ride/select-location')}
        className="flex w-full items-center gap-3 rounded-full border border-white bg-white py-2 pl-5 pr-2 text-left shadow-[0_16px_34px_rgba(15,23,42,0.12)]"
      >
        <Search size={19} className="shrink-0 text-slate-700" strokeWidth={2.4} />
        <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-slate-400">Where are you going?</span>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#FB923C_0%,#F97316_100%)] text-white shadow-[0_8px_18px_rgba(249,115,22,0.35)]">
          <Search size={18} strokeWidth={2.8} />
        </span>
      </MotionButton>
    </div>
  );
};

export default HomeSearchBar;
