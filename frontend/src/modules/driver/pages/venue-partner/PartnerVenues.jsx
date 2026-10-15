import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Plus, MapPin, Pencil } from 'lucide-react';
import { venuePartnerService } from '../../services/venuePartnerService';
import { VENUE_STATUS_STYLES } from './partnerFormat';

const PartnerVenues = () => {
  const navigate = useNavigate();
  const [venues, setVenues] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    venuePartnerService.getVenues()
      .then((r) => setVenues(r?.data || []))
      .catch((e) => setError(e?.message || 'Could not load venues'));
  }, []);

  if (error) return <p className="py-16 text-center text-sm font-semibold text-rose-600">{error}</p>;
  if (!venues) return <div className="py-20 flex justify-center text-slate-400"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-3">
      <button type="button" onClick={() => navigate('/taxi/driver/venue-partner/venues/new')} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-3 text-sm font-black text-white">
        <Plus size={16} /> Add a venue
      </button>
      <p className="text-[11px] font-semibold text-slate-500">New venues and changes to rejected venues are reviewed by the admin before they go live.</p>
      {venues.length === 0 ? (
        <p className="py-10 text-center text-sm font-semibold text-slate-400">You have no venues yet.</p>
      ) : venues.map((venue) => {
        const status = VENUE_STATUS_STYLES[venue.status] || VENUE_STATUS_STYLES.pending;
        return (
          <button key={venue.id} type="button" onClick={() => navigate(`/taxi/driver/venue-partner/venues/${venue.id}`)} className="w-full overflow-hidden rounded-3xl bg-white border border-slate-100 text-left shadow-sm">
            {venue.coverImage && <img src={venue.coverImage} alt="" className="h-28 w-full object-cover" />}
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">{venue.categoryName}</p>
                  <p className="truncate text-base font-black text-slate-900">{venue.name}</p>
                  {venue.city && <p className="flex items-center gap-1 text-xs font-semibold text-slate-500"><MapPin size={11} />{venue.city}</p>}
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black ${status.className}`}>{status.label}</span>
              </div>
              <p className="mt-2 text-xs font-semibold text-slate-600">
                {(venue.ticketTypes || []).filter((t) => t.active).length} ticket type(s) · {(venue.timeSlots || []).filter((s) => s.active).length} slot(s)
                {venue.commissionPercent !== null && venue.commissionPercent !== undefined ? ` · ${venue.commissionPercent}% commission` : ''}
              </p>
              {venue.adminNote && <p className="mt-2 rounded-xl bg-amber-50 p-2 text-[11px] font-semibold text-amber-800">Admin note: {venue.adminNote}</p>}
              <p className="mt-2 flex items-center gap-1 text-xs font-black text-indigo-600"><Pencil size={12} />Edit prices, slots & details</p>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default PartnerVenues;
