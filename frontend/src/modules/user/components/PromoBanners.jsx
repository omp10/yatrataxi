import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Clock3, ShieldCheck, Sparkles } from 'lucide-react';
import { normalizeAssetUrl, useSettings } from '../../../shared/context/SettingsContext';
import {
  getActiveServiceModules,
  getServiceModuleButtonText,
  getServiceModuleDescription,
  getServiceModulePath,
} from '../utils/serviceModulePresentation';

const MotionDiv = motion.div;
const MotionButton = motion.button;
const cardThemes = [
  {
    icon: Clock3,
    iconClass: 'text-orange-600',
    actionClass: 'bg-orange-50 text-orange-500',
  },
  {
    icon: ShieldCheck,
    iconClass: 'text-blue-600',
    actionClass: 'bg-blue-50 text-blue-500',
  },
];

const ImageCarousel = ({ images, className }) => {
  const activeImage = images?.[0];

  if (!activeImage) return null;

  return (
    <div className={className}>
      <img src={activeImage.src} alt={activeImage.alt} className="w-full object-contain drop-shadow-xl" />
    </div>
  );
};

const PromoCard = ({ icon: Icon, iconClass, title, description, actionClass, path, images, onNavigate }) => (
  <MotionDiv
    whileTap={{ scale: 0.98 }}
    onClick={() => onNavigate(path)}
    className="relative min-h-[140px] overflow-hidden rounded-2xl border border-white/80 bg-white/88 p-3.5 shadow-[0_12px_28px_rgba(15,23,42,0.07)]"
  >
    <div className={`flex items-center gap-2 ${iconClass}`}>
      <Icon size={11} strokeWidth={2.5} />
    </div>
    <h3 className="mt-2.5 text-[17px] font-black leading-snug tracking-tight text-gray-900">{title}</h3>
    <p className="mt-1 max-w-[132px] text-[10px] font-bold leading-snug text-gray-500">{description}</p>
    <div className={`mt-3 inline-flex h-8 w-8 items-center justify-center rounded-full ${actionClass}`}>
      <ArrowRight size={15} strokeWidth={2.5} />
    </div>
    <ImageCarousel images={images} className="absolute bottom-1 right-1 w-[74px] opacity-95 pointer-events-none" />
  </MotionDiv>
);

const PromoBanners = () => {
  const navigate = useNavigate();
  const { modules, loading } = useSettings();
  const activeModules = getActiveServiceModules(modules);
  const recommendedCards = activeModules.map((module, index) => ({
    ...cardThemes[index % cardThemes.length],
    title: module.name,
    description: getServiceModuleDescription(module),
    path: getServiceModulePath(module),
    images: [{
      src: normalizeAssetUrl(module.mobile_menu_icon || module.mobile_menu_cover_image),
      alt: module.name,
    }],
    key: module.id || module._id || `${module.name}-${index}`,
  }));
  const featuredModule = activeModules[0];

  if (loading || !featuredModule) return null;

  return (
    <div className="px-5 space-y-4">
      <div className="mb-1 ml-1">
        <h2 className="text-[19px] font-black text-gray-900 tracking-tight">Recommended for you</h2>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {recommendedCards.map((card) => (
          <PromoCard key={card.key} {...card} onNavigate={navigate} />
        ))}
      </div>

      <MotionDiv
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="relative overflow-hidden rounded-2xl border border-white/80 bg-gradient-to-br from-slate-900 to-slate-800 p-4 shadow-[0_18px_44px_rgba(15,23,42,0.12)]"
      >
        <div className="absolute inset-0 bg-[radial-gradient(240px_160px_at_20%_25%,rgba(56,189,248,0.16),transparent_60%)]" aria-hidden="true" />
        <div className="absolute inset-0 bg-[radial-gradient(260px_180px_at_85%_85%,rgba(251,191,36,0.10),transparent_62%)]" aria-hidden="true" />

        <div className="relative z-10 flex min-h-[168px] items-end justify-between gap-4">
          <div className="max-w-[62%]">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/85">
              <Sparkles size={12} strokeWidth={2.5} className="text-cyan-200" />
              {featuredModule.service_type || featuredModule.transport_type || 'Recommended'}
            </div>

            <h3 className="mt-3 text-[20px] font-black leading-tight tracking-tight text-white">
              Try {featuredModule.name} for your next trip.
            </h3>
            <p className="mt-1.5 text-[11px] font-bold leading-relaxed text-white/70">
              {getServiceModuleDescription(featuredModule)}
            </p>

            <MotionButton
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(getServiceModulePath(featuredModule))}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[12px] font-black text-slate-900 shadow-lg shadow-black/15"
            >
              {getServiceModuleButtonText(featuredModule)}
              <ArrowRight size={14} strokeWidth={3} />
            </MotionButton>
          </div>

          <div className="pointer-events-none w-[140px] shrink-0 opacity-95">
            <img
              src={normalizeAssetUrl(featuredModule.mobile_menu_cover_image || featuredModule.mobile_menu_icon) || '/ride_now_banner.png'}
              alt={featuredModule.name}
              className="w-full drop-shadow-2xl"
            />
          </div>
        </div>
      </MotionDiv>
    </div>
  );
};

export default PromoBanners;
