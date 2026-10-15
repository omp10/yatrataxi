import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, MapPin, Star, Ticket, Loader2 } from 'lucide-react';
import { entertainmentService } from '../../services/entertainmentService';

const unwrapList = (response) => (Array.isArray(response?.data) ? response.data : (response?.data?.results || []));

const EntertainmentHome = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState('');
  const [search, setSearch] = useState('');
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    entertainmentService.getCategories().then((r) => setCategories(unwrapList(r))).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      setLoading(true);
      entertainmentService.getVenues({ categoryId: categoryId || undefined, search: search.trim() || undefined })
        .then((r) => { if (active) { setVenues(unwrapList(r)); setError(''); } })
        .catch((e) => { if (active) setError(e?.message || 'Could not load venues'); })
        .finally(() => { if (active) setLoading(false); });
    }, search ? 300 : 0);
    return () => { active = false; clearTimeout(timer); };
  }, [categoryId, search]);

  const chips = useMemo(() => [{ id: '', name: 'All' }, ...categories], [categories]);

  return (
    <div className="min-h-screen bg-slate-50 max-w-lg mx-auto pb-24">
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur px-5 pt-10 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl border border-slate-100 bg-white flex items-center justify-center" aria-label="Back">
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1">
            <p className="text-[9px] font-black uppercase tracking-[0.26em] text-slate-400">Tickets</p>
            <h1 className="text-[19px] font-black text-slate-900">Entertainment</h1>
          </div>
          <button type="button" onClick={() => navigate('/taxi/user/entertainment/bookings')} className="flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1.5 text-[11px] font-bold text-white">
            <Ticket size={13} /> My Tickets
          </button>
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-2xl bg-slate-100 px-3 py-2.5">
          <Search size={16} className="text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search waterparks, theme parks..." className="flex-1 bg-transparent text-sm font-semibold outline-none" />
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {chips.map((chip) => (
            <button
              key={chip.id || 'all'}
              type="button"
              onClick={() => setCategoryId(chip.id)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-bold border ${categoryId === chip.id ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}
            >
              {chip.name}
            </button>
          ))}
        </div>
      </header>

      <div className="px-5 pt-4 space-y-3">
        {loading ? (
          <div className="py-20 flex justify-center text-slate-400"><Loader2 className="animate-spin" /></div>
        ) : error ? (
          <p className="py-16 text-center text-sm font-semibold text-rose-600">{error}</p>
        ) : venues.length === 0 ? (
          <p className="py-16 text-center text-sm font-semibold text-slate-400">No venues available right now.</p>
        ) : venues.map((venue) => (
          <button
            key={venue.id}
            type="button"
            onClick={() => navigate(`/taxi/user/entertainment/venue/${venue.id}`)}
            className="w-full overflow-hidden rounded-3xl bg-white text-left shadow-sm border border-slate-100"
          >
            <div className="h-36 bg-slate-200">
              {venue.coverImage && <img src={venue.coverImage} alt={venue.name} className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">{venue.categoryName}</p>
                  <h2 className="truncate text-base font-black text-slate-900">{venue.name}</h2>
                  {(venue.city || venue.address) && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-slate-500"><MapPin size={12} />{[venue.address, venue.city].filter(Boolean).join(', ')}</p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[10px] font-bold text-slate-400">from</p>
                  <p className="text-lg font-black text-slate-900">₹{Number(venue.minPrice).toLocaleString('en-IN')}</p>
                </div>
              </div>
              {venue.ratingCount > 0 && (
                <p className="mt-2 flex items-center gap-1 text-xs font-bold text-amber-600"><Star size={12} className="fill-amber-500" />{venue.rating} ({venue.ratingCount})</p>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default EntertainmentHome;
