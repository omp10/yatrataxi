import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HelpCircle,
  Info,
  X,
  Search,
  BookOpen,
  Zap,
  ListOrdered,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  ChevronRight,
  ExternalLink,
  Layers,
  Lightbulb,
} from 'lucide-react';
import { PAGE_GUIDES, findGuideForPath } from '../constants/pageGuides';

const TABS = [
  { id: 'overview', label: 'Overview', icon: BookOpen },
  { id: 'features', label: 'Key Features', icon: Zap },
  { id: 'workflow', label: 'How It Works', icon: ListOrdered },
  { id: 'tips', label: 'Pro Tips', icon: Lightbulb },
];

export const PageGuideDropdown = ({ buttonClassName = '', showTextLabel = true }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGuideId, setSelectedGuideId] = useState(null);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Derive the active guide based on current URL or manual selection inside dropdown
  const currentPathGuide = useMemo(() => findGuideForPath(location.pathname), [location.pathname]);

  const activeGuide = useMemo(() => {
    if (selectedGuideId) {
      const found = PAGE_GUIDES.find((g) => g.id === selectedGuideId);
      if (found) return found;
    }
    return currentPathGuide;
  }, [currentPathGuide, selectedGuideId]);

  // Reset selectedGuideId when route changes
  useEffect(() => {
    setSelectedGuideId(null);
  }, [location.pathname]);

  // Handle outside click & escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Filtered guides when searching
  const filteredSearchGuides = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return PAGE_GUIDES.filter(
      (g) =>
        g.title.toLowerCase().includes(q) ||
        g.category.toLowerCase().includes(q) ||
        g.summary.toLowerCase().includes(q) ||
        g.path.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const handleSelectSearchedGuide = (guide) => {
    setSelectedGuideId(guide.id);
    setSearchQuery('');
    setActiveTab('overview');
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        title="Click to learn how this page works"
        className={`group relative flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-bold transition-all duration-200 active:scale-95 ${
          isOpen
            ? 'border-indigo-500 bg-indigo-50/80 text-indigo-700 shadow-md shadow-indigo-100'
            : 'border-slate-200 bg-white text-slate-700 shadow-sm hover:border-indigo-300 hover:bg-slate-50 hover:text-indigo-600'
        } ${buttonClassName}`}
      >
        <div className="relative flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-600/10 text-indigo-600 transition-transform group-hover:scale-110">
          <HelpCircle size={15} strokeWidth={2.5} />
          <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500" />
          </span>
        </div>

        {showTextLabel && (
          <span className="hidden sm:inline font-black tracking-tight text-[11px] uppercase">
            Page Guide
          </span>
        )}
      </button>

      {/* Floating Modal / Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute right-0 top-full z-[80] mt-3 w-[92vw] max-w-[540px] overflow-hidden rounded-[2rem] border border-slate-200/90 bg-white shadow-[0_25px_60px_-15px_rgba(15,23,42,0.25)] ring-1 ring-black/5"
          >
            {/* Header section */}
            <div className="relative border-b border-slate-100 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-5 text-white">
              {/* Background decorative circles */}
              <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-indigo-500/20 blur-2xl" />
              <div className="pointer-events-none absolute -left-10 bottom-0 h-24 w-24 rounded-full bg-emerald-500/10 blur-xl" />

              <div className="relative flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-400/20 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-indigo-200 backdrop-blur-md border border-indigo-400/30">
                      <Sparkles size={10} className="text-indigo-300" />
                      {activeGuide.category || 'Page Manual'}
                    </span>
                    {selectedGuideId && selectedGuideId !== currentPathGuide?.id && (
                      <button
                        type="button"
                        onClick={() => setSelectedGuideId(null)}
                        className="text-[10px] font-bold text-slate-300 underline hover:text-white"
                      >
                        Reset to Current Page
                      </button>
                    )}
                  </div>
                  <h3 className="text-base sm:text-lg font-black tracking-tight text-white leading-snug">
                    {activeGuide.title}
                  </h3>
                  <p className="mt-1 text-xs text-slate-300/90 leading-relaxed font-normal line-clamp-2">
                    {activeGuide.summary}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="shrink-0 rounded-xl p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
                  aria-label="Close guide"
                >
                  <X size={18} strokeWidth={2.5} />
                </button>
              </div>

              {/* Quick search input */}
              <div className="relative mt-4">
                <div className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs backdrop-blur-md border border-white/15 focus-within:border-indigo-400 focus-within:bg-white/20 transition-all">
                  <Search size={14} className="text-slate-300 shrink-0" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search guides (e.g., Drivers, Pricing, Bus, SOS)..."
                    className="w-full bg-transparent text-xs font-semibold text-white placeholder:text-slate-400 outline-none"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="text-slate-300 hover:text-white"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                {/* Search auto-suggestions dropdown */}
                {filteredSearchGuides.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-56 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl text-slate-800">
                    <p className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Search Results ({filteredSearchGuides.length})
                    </p>
                    {filteredSearchGuides.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => handleSelectSearchedGuide(g)}
                        className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition-colors hover:bg-indigo-50 hover:text-indigo-700"
                      >
                        <div>
                          <p className="font-bold text-slate-900">{g.title}</p>
                          <p className="text-[11px] text-slate-500 line-clamp-1">{g.summary}</p>
                        </div>
                        <ChevronRight size={14} className="text-slate-400 shrink-0 ml-2" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-100 bg-slate-50/80 px-4 pt-2 gap-1 overflow-x-auto no-scrollbar">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 rounded-t-xl px-3.5 py-2.5 text-xs font-black transition-all border-b-2 ${
                      isActive
                        ? 'border-indigo-600 bg-white text-indigo-700 shadow-sm'
                        : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100/60'
                    }`}
                  >
                    <Icon size={13} strokeWidth={isActive ? 2.5 : 2} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Content Body */}
            <div className="max-h-[380px] overflow-y-auto p-5 space-y-4 text-slate-700">
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4">
                    <div className="flex items-center gap-2 mb-2 text-indigo-900 font-bold text-xs uppercase tracking-wider">
                      <BookOpen size={14} className="text-indigo-600" />
                      <span>About This Page</span>
                    </div>
                    <p className="text-xs sm:text-[13px] leading-relaxed text-slate-700 font-medium">
                      {activeGuide.overview}
                    </p>
                  </div>

                  {activeGuide.relatedPaths && activeGuide.relatedPaths.length > 0 && (
                    <div className="pt-2">
                      <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2">
                        Related Sections & Actions:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {activeGuide.relatedPaths.map((path) => (
                          <button
                            key={path}
                            type="button"
                            onClick={() => {
                              navigate(path);
                              setIsOpen(false);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 transition-all shadow-xs"
                          >
                            <span>{path.replace('/admin/', '').replaceAll('-', ' ').toUpperCase()}</span>
                            <ArrowRight size={12} />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* TAB 2: KEY FEATURES */}
              {activeTab === 'features' && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-2.5"
                >
                  {activeGuide.keyActions?.map((action, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-3.5 hover:bg-white hover:border-slate-200 hover:shadow-sm transition-all"
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs font-black text-xs">
                        {idx + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-black text-slate-900 leading-tight">
                          {action.title}
                        </h4>
                        <p className="mt-1 text-[12px] text-slate-600 leading-relaxed">
                          {action.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}

              {/* TAB 3: STEP-BY-STEP WORKFLOW */}
              {activeTab === 'workflow' && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3"
                >
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                    Standard Operating Procedure:
                  </p>
                  <div className="relative pl-6 space-y-4 border-l-2 border-indigo-200 ml-2">
                    {activeGuide.steps?.map((step, idx) => (
                      <div key={idx} className="relative">
                        {/* Step Marker */}
                        <div className="absolute -left-[31px] top-0 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-black text-white ring-4 ring-white shadow-xs">
                          {step.step || idx + 1}
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-slate-900">
                            {step.title}
                          </h4>
                          <p className="mt-1 text-[12px] text-slate-600 leading-relaxed">
                            {step.desc}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* TAB 4: PRO TIPS & WARNINGS */}
              {activeTab === 'tips' && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3"
                >
                  {activeGuide.tips?.map((tip, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-3.5 text-amber-900"
                    >
                      <Lightbulb size={18} className="shrink-0 text-amber-600 mt-0.5" />
                      <p className="text-xs leading-relaxed font-medium">
                        {tip}
                      </p>
                    </div>
                  ))}

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-600">
                    <p className="font-bold text-slate-800 mb-1">💡 Need customized help?</p>
                    <p>
                      If you need technical assistance or custom rule changes for this module, check System Settings or contact the platform administrator.
                    </p>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/80 px-5 py-3">
              <span className="text-[11px] font-semibold text-slate-400">
                Route: <code className="text-indigo-600 font-mono text-[10px]">{activeGuide.path || location.pathname}</code>
              </span>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-xl bg-slate-900 px-4 py-1.5 text-xs font-black text-white shadow-sm hover:bg-slate-800 active:scale-95 transition-all"
              >
                Got it
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PageGuideDropdown;

