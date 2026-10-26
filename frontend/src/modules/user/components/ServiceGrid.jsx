import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { useSettings, normalizeAssetUrl } from '../../../shared/context/SettingsContext';
import { getActiveServiceModules, getServiceModulePath } from '../utils/serviceModulePresentation';

const MotionButton = motion.button;
const COLLAPSED_SERVICE_COUNT = 6;

const getServiceKey = (service, index) => {
  const label = String(service?.label || '').trim();
  const path = String(service?.path || '').trim();
  return label || path ? `${label || 'service'}-${path || index}` : `service-${index}`;
};

const getAccent = (index) => {
  const accents = [
    'bg-[radial-gradient(circle_at_50%_40%,#FEF3C7_0%,#FFFBEB_70%)]',
    'bg-[radial-gradient(circle_at_50%_40%,#DBEAFE_0%,#EFF6FF_70%)]',
    'bg-[radial-gradient(circle_at_50%_40%,#FFEDD5_0%,#FFF7ED_70%)]',
    'bg-[radial-gradient(circle_at_50%_40%,#FCE7F3_0%,#FDF2F8_70%)]',
    'bg-[radial-gradient(circle_at_50%_40%,#DCFCE7_0%,#F0FDF4_70%)]',
    'bg-[radial-gradient(circle_at_50%_40%,#E0F2FE_0%,#F0F9FF_70%)]',
  ];
  return accents[index % accents.length];
};

const ServiceTile = ({ icon, label, description, path, accentClass, loading }) => {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex h-[124px] animate-pulse flex-col items-center justify-center gap-2.5 rounded-[20px] bg-white/80 p-2 shadow-[0_8px_22px_rgba(15,23,42,0.05)]">
        <div className="h-[70px] w-[86%] rounded-[16px] bg-slate-100" />
        <div className="h-3 w-14 rounded-full bg-slate-100" />
      </div>
    );
  }

  return (
    <MotionButton
      type="button"
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => path && navigate(path)}
      className="flex h-[124px] flex-col items-center justify-center gap-2 rounded-[20px] border border-white bg-white p-2 shadow-[0_8px_22px_rgba(15,23,42,0.06)]"
    >
      <div className={`flex h-[74px] w-full items-center justify-center rounded-[16px] ${accentClass}`}>
        {icon ? (
          <img src={icon} alt="" className="h-[66px] w-[86%] object-contain drop-shadow-sm" draggable={false} />
        ) : null}
      </div>
      <span className="line-clamp-1 px-1 text-center text-[12.5px] font-bold leading-tight text-slate-900">
        {label}
      </span>
      <span className="sr-only">{description}</span>
    </MotionButton>
  );
};

const ServiceGrid = () => {
  const { modules, loading } = useSettings();
  const [expanded, setExpanded] = useState(false);
  const services = useMemo(() => getActiveServiceModules(modules).map((m, idx) => ({
      icon: normalizeAssetUrl(m.mobile_menu_icon),
      label: m.name,
      description: m.short_description,
      path: getServiceModulePath(m),
      accentClass: getAccent(idx)
    })), [modules]);

  const canExpand = services.length > COLLAPSED_SERVICE_COUNT;
  const visibleServices = canExpand && !expanded ? services.slice(0, COLLAPSED_SERVICE_COUNT) : services;

  if (!loading && services.length === 0) return null;

  return (
    <div className="px-5">
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[21px] font-black tracking-tight text-slate-950">Explore services</h2>
          {canExpand ? (
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              className="inline-flex items-center gap-0.5 text-[13px] font-bold text-orange-500 active:opacity-70"
            >
              {expanded ? 'Show less' : 'View all'}
              <ChevronRight
                size={16}
                strokeWidth={2.8}
                className={`transition-transform ${expanded ? '-rotate-90' : ''}`}
              />
            </button>
          ) : null}
        </div>

        <div className="mt-3.5 grid grid-cols-3 gap-3 md:grid-cols-4">
          {loading
            ? [...Array(6)].map((_, i) => <ServiceTile key={i} loading />)
            : visibleServices.map((service, index) => (
                <ServiceTile key={getServiceKey(service, index)} {...service} />
              ))}
        </div>
      </motion.section>
    </div>
  );
};

export default ServiceGrid;
