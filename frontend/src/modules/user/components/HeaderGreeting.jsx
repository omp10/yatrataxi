import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronDown, MapPin, User } from 'lucide-react';
import { getSavedLocationLabel, LOCATION_UPDATED_EVENT } from '../services/locationStore';
import { normalizeAssetUrl, useSettings } from '../../../shared/context/SettingsContext';

const MotionDiv = motion.div;
const MotionButton = motion.button;

const readStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('userInfo') || 'null') || {};
  } catch {
    return {};
  }
};

const HeaderGreeting = () => {
  const navigate = useNavigate();
  const { settings, loading, hasBootstrapSettings } = useSettings();
  const appLogo = settings.general?.logo || settings.customization?.logo || settings.general?.favicon || '';
  const appName = settings.general?.app_name || 'App';
  const [locationLabel, setLocationLabel] = useState(getSavedLocationLabel);
  const [storedUser, setStoredUser] = useState(readStoredUser);
  const [scrolled, setScrolled] = useState(false);
  const showBrandingSkeleton = loading && !hasBootstrapSettings && !appLogo;
  const avatarSrc = normalizeAssetUrl(storedUser.profileImage || storedUser.profile_image || '');
  const shortLocation = String(locationLabel || '').split(',').slice(0, 2).join(',').trim() || locationLabel;

  useEffect(() => {
    const syncFromStorage = () => {
      setLocationLabel(getSavedLocationLabel());
      setStoredUser(readStoredUser());
    };

    syncFromStorage();
    window.addEventListener('storage', syncFromStorage);
    window.addEventListener(LOCATION_UPDATED_EVENT, syncFromStorage);

    return () => {
      window.removeEventListener('storage', syncFromStorage);
      window.removeEventListener(LOCATION_UPDATED_EVENT, syncFromStorage);
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 15);

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 px-5 pt-3 pb-3 transition-all duration-300 ${
        scrolled
          ? 'bg-[#FFFBF2]/95 backdrop-blur-md shadow-[0_10px_25px_rgba(15,23,42,0.06)] border-b border-amber-100/70'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <MotionDiv
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="flex h-11 shrink-0 items-center rounded-full bg-white/95 px-3 shadow-[0_8px_22px_rgba(15,23,42,0.1)]"
        >
          {appLogo ? (
            <img src={appLogo} alt={appName} className="h-8 max-w-[100px] object-contain" />
          ) : showBrandingSkeleton ? (
            <div className="h-8 w-20 animate-pulse rounded-full bg-slate-200/90" />
          ) : (
            <span className="text-[16px] font-black tracking-tight text-slate-900">{appName}</span>
          )}
        </MotionDiv>

        <MotionButton
          type="button"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.04, ease: 'easeOut' }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/ride/select-location')}
          className="flex min-w-0 flex-1 items-center gap-1.5 rounded-full border border-white bg-white/95 px-3 py-2.5 text-left shadow-[0_8px_22px_rgba(15,23,42,0.07)]"
          aria-label="Change location"
        >
          <MapPin size={16} className="shrink-0 text-slate-700" strokeWidth={2.4} />
          <span className="min-w-0 flex-1 truncate text-[12px] font-bold text-slate-900">{shortLocation}</span>
          <ChevronDown size={15} className="shrink-0 text-slate-500" strokeWidth={2.6} />
        </MotionButton>

        <button
          type="button"
          onClick={() => navigate('/taxi/user/profile')}
          className="relative h-11 w-11 shrink-0 rounded-full border-2 border-amber-300 bg-white shadow-[0_8px_22px_rgba(15,23,42,0.1)] active:scale-95 transition-transform"
          aria-label="Open profile"
        >
          <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-amber-50">
            {avatarSrc ? (
              <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
            ) : (
              <User size={20} className="text-amber-700" strokeWidth={2.4} />
            )}
          </span>
        </button>
      </div>
    </header>
  );
};

export default HeaderGreeting;
