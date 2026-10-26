import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Pause, Play } from 'lucide-react';
import api from '../../../shared/api/axiosInstance';
import { normalizeAssetUrl, useSettings } from '../../../shared/context/SettingsContext';
import {
  getOptimizedImageUrl,
  getOptimizedVideoUrl,
  getVideoPosterUrl,
  prefersReducedData,
} from '../../../shared/utils/cloudinaryMedia';

const Motion = motion;
const BANNERS_CACHE_KEY = 'homeHeroBanners';
const IMAGE_SLIDE_MS = 5000;
// A video that never fires "ended" (e.g. it loops or stalls) still moves on.
const VIDEO_SLIDE_MAX_MS = 20000;
const SWIPE_THRESHOLD_PX = 50;
// Height of the sticky home header that floats over the top of the hero.
export const HERO_HEADER_OFFSET_PX = 68;

const readCachedBanners = () => {
  try {
    const cached = JSON.parse(sessionStorage.getItem(BANNERS_CACHE_KEY) || 'null');
    return Array.isArray(cached) ? cached : null;
  } catch {
    return null;
  }
};

const writeCachedBanners = (banners) => {
  try {
    sessionStorage.setItem(BANNERS_CACHE_KEY, JSON.stringify(banners));
  } catch {
    // Storage can be unavailable (private mode, WebView); the hero still works.
  }
};

const useHomeBanners = () => {
  const [banners, setBanners] = useState(() => readCachedBanners());

  useEffect(() => {
    let cancelled = false;

    api.get('/user/home-banners')
      .then((response) => {
        if (cancelled) return;
        // The shared axios instance already unwraps response.data.
        const items = [response?.data, response?.data?.data, response].find(Array.isArray) || [];
        const usable = items.filter((item) => item?.media_url);
        setBanners(usable);
        writeCachedBanners(usable);
      })
      .catch(() => {
        if (!cancelled) setBanners((current) => current || []);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return banners;
};

// Poster for a video banner: the admin's upload, else Cloudinary's first frame.
const getBannerPoster = (banner) =>
  normalizeAssetUrl(banner.poster) || getVideoPosterUrl(banner.media_url);

// The small, optimised URL a slide shows first (what is worth preloading).
const getBannerPreviewUrl = (banner) => (
  banner.media_type === 'video'
    ? getBannerPoster(banner)
    : getOptimizedImageUrl(normalizeAssetUrl(banner.media_url))
);

const SlideMedia = ({ banner, active, paused, reducedData, onVideoEnded }) => {
  const videoRef = useRef(null);
  const originalSrc = normalizeAssetUrl(banner.media_url);
  const [useOriginal, setUseOriginal] = useState(false);
  const isVideo = banner.media_type === 'video';
  const poster = isVideo ? getBannerPoster(banner) : '';
  const src = useOriginal
    ? originalSrc
    : isVideo ? getOptimizedVideoUrl(originalSrc) : getOptimizedImageUrl(originalSrc);
  // If Cloudinary can't serve the optimised copy, fall back to the original.
  const handleError = () => {
    if (!useOriginal && src !== originalSrc) setUseOriginal(true);
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (active && !paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [active, paused, src]);

  useEffect(() => {
    if (active && videoRef.current) {
      videoRef.current.currentTime = 0;
    }
  }, [active]);

  // On slow connections or data saver, show the poster instead of streaming video.
  if (isVideo && reducedData && poster) {
    return (
      <img
        src={poster}
        alt={banner.title || 'Offer'}
        className="absolute inset-0 h-full w-full object-cover"
        draggable={false}
      />
    );
  }

  if (isVideo) {
    return (
      <video
        ref={videoRef}
        src={src}
        poster={poster || undefined}
        className="absolute inset-0 h-full w-full object-cover"
        muted
        playsInline
        preload={active ? 'auto' : 'none'}
        onEnded={onVideoEnded}
        onError={handleError}
      />
    );
  }

  return (
    <img
      src={src}
      alt={banner.title || 'Offer'}
      className="absolute inset-0 h-full w-full object-cover"
      draggable={false}
      onError={handleError}
    />
  );
};

const SlideCopy = ({ banner }) => {
  if (!banner.title && !banner.subtitle && !banner.cta_label) return null;

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/65 via-black/10 to-transparent p-5 pb-14">
      {banner.title ? (
        <h2 className="max-w-[80%] text-[30px] font-black uppercase leading-[0.95] tracking-tight text-[#FFC21A] drop-shadow-[0_4px_14px_rgba(0,0,0,0.35)]">
          {banner.title}
        </h2>
      ) : null}
      {banner.subtitle ? (
        <p className="mt-2 max-w-[75%] text-[13px] font-bold leading-snug text-white drop-shadow">
          {banner.subtitle}
        </p>
      ) : null}
      {banner.cta_label ? (
        <span className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-[11px] font-black text-slate-900 shadow-lg">
          {banner.cta_label}
          <ArrowRight size={13} strokeWidth={3} />
        </span>
      ) : null}
    </div>
  );
};

// Shown when the admin has not published any banner yet.
const FallbackSlide = ({ appName }) => (
  <div className="absolute inset-0 overflow-hidden bg-[linear-gradient(135deg,#1E293B_0%,#0F172A_55%,#422006_100%)]">
    <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-amber-400/25 blur-3xl" aria-hidden="true" />
    <div className="absolute -bottom-16 left-6 h-40 w-40 rounded-full bg-orange-500/20 blur-3xl" aria-hidden="true" />
    <img
      src="/ride_now_banner.png"
      alt=""
      className="absolute -right-6 bottom-2 w-[58%] max-w-[240px] object-contain drop-shadow-2xl"
      draggable={false}
    />
    <div className="relative flex h-full flex-col justify-center p-5 pb-12" style={{ paddingTop: HERO_HEADER_OFFSET_PX }}>
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-200/80">{appName}</p>
      <h2 className="mt-2 max-w-[58%] text-[30px] font-black uppercase leading-[0.95] tracking-tight text-[#FFC21A]">
        Move your way
      </h2>
      <p className="mt-2 max-w-[52%] text-[12px] font-bold leading-snug text-white/80">
        Your next journey starts here
      </p>
    </div>
  </div>
);

const HomeHeroBanner = () => {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const appName = settings.general?.app_name || 'Your ride';
  const banners = useHomeBanners();
  const [rawActiveIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedData] = useState(prefersReducedData);
  const dragStartX = useRef(null);
  const didSwipe = useRef(false);

  const slides = banners || [];
  const slideCount = slides.length;
  // The banner list can shrink after a refetch; keep the index in range.
  const activeIndex = slideCount > 0 ? rawActiveIndex % slideCount : 0;
  const activeBanner = slides[activeIndex] || null;
  // A poster-only video slide (slow connection) behaves like an image slide.
  const isVideoSlide = activeBanner?.media_type === 'video' && !(reducedData && getBannerPoster(activeBanner));

  const goTo = useCallback(
    (index) => {
      if (slideCount === 0) return;
      setActiveIndex(((index % slideCount) + slideCount) % slideCount);
      // Pausing applies to the current video only.
      setPaused(false);
    },
    [slideCount],
  );

  const goNext = useCallback(() => goTo(activeIndex + 1), [activeIndex, goTo]);

  // Warm the cache with the next slide's image or poster so the switch is instant.
  const nextPreviewUrl = slideCount > 1 ? getBannerPreviewUrl(slides[(activeIndex + 1) % slideCount]) : '';
  useEffect(() => {
    if (nextPreviewUrl) new Image().src = nextPreviewUrl;
  }, [nextPreviewUrl]);

  useEffect(() => {
    if (slideCount < 2 || paused) return undefined;

    const timer = window.setTimeout(goNext, isVideoSlide ? VIDEO_SLIDE_MAX_MS : IMAGE_SLIDE_MS);
    return () => window.clearTimeout(timer);
  }, [slideCount, paused, isVideoSlide, goNext, activeIndex]);

  const handleOpen = (banner) => {
    if (didSwipe.current) {
      didSwipe.current = false;
      return;
    }

    const target = String(banner?.redirect_url || '').trim();
    if (!target) return;

    if (/^https?:\/\//i.test(target)) {
      window.open(target, '_blank', 'noopener,noreferrer');
      return;
    }

    navigate(target.startsWith('/') ? target : `/${target}`);
  };

  const handlePointerDown = (event) => {
    dragStartX.current = event.clientX;
    didSwipe.current = false;
  };

  const handlePointerUp = (event) => {
    if (dragStartX.current === null) return;
    const deltaX = event.clientX - dragStartX.current;
    dragStartX.current = null;

    if (Math.abs(deltaX) > SWIPE_THRESHOLD_PX && slideCount > 1) {
      didSwipe.current = true;
      goTo(activeIndex + (deltaX < 0 ? 1 : -1));
    }
  };

  // Still loading with nothing cached: hold the space so the page doesn't jump.
  if (banners === null) {
    return (
      <div className="w-full animate-pulse rounded-b-[28px] bg-slate-200/80" style={{ paddingTop: HERO_HEADER_OFFSET_PX }}>
        <div className="aspect-[16/10] w-full" />
      </div>
    );
  }

  return (
    <div
      className="relative w-full touch-pan-y select-none overflow-hidden rounded-b-[28px] bg-slate-900 shadow-[0_20px_44px_rgba(15,23,42,0.18)]"
      style={{ paddingTop: HERO_HEADER_OFFSET_PX }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => { dragStartX.current = null; }}
    >
        {/* Sizes the hero: the 16:10 area below the header overlay. */}
        <div className="aspect-[16/10] w-full" aria-hidden="true" />

        {slideCount === 0 ? (
          <FallbackSlide appName={appName} />
        ) : (
          <AnimatePresence initial={false}>
            <Motion.button
              key={activeBanner.id}
              type="button"
              initial={{ opacity: 0, scale: 1.03 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              onClick={() => handleOpen(activeBanner)}
              className={`absolute inset-0 block h-full w-full text-left ${activeBanner.redirect_url ? 'cursor-pointer' : 'cursor-default'}`}
              aria-label={activeBanner.title || `Offer ${activeIndex + 1} of ${slideCount}`}
            >
              <SlideMedia banner={activeBanner} active paused={paused} reducedData={reducedData} onVideoEnded={slideCount > 1 ? goNext : undefined} />
              <SlideCopy banner={activeBanner} />
            </Motion.button>
          </AnimatePresence>
        )}

        {isVideoSlide ? (
          <button
            type="button"
            onClick={() => setPaused((value) => !value)}
            className="absolute bottom-12 right-4 z-10 flex h-11 w-11 items-center justify-center rounded-full border-2 border-white/80 bg-black/30 text-white backdrop-blur-sm active:scale-95"
            aria-label={paused ? 'Play video' : 'Pause video'}
          >
            {paused ? <Play size={18} fill="currentColor" className="ml-0.5" /> : <Pause size={18} fill="currentColor" />}
          </button>
        ) : null}

        {slideCount > 1 ? (
          <div className="absolute bottom-12 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5">
            {slides.map((banner, index) => (
              <button
                key={banner.id}
                type="button"
                onClick={() => goTo(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === activeIndex ? 'w-6 bg-[#FFB300]' : 'w-2 bg-white/70'
                }`}
                aria-label={`Show offer ${index + 1}`}
              />
            ))}
          </div>
        ) : null}

        {/* Keeps the header's logo, location and avatar readable over bright media. */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/45 to-transparent"
          aria-hidden="true"
        />
    </div>
  );
};

export default HomeHeroBanner;
