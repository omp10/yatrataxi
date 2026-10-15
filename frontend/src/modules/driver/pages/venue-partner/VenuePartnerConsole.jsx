import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LayoutDashboard, Ticket, ScanLine, Building2, Wallet, LogOut } from 'lucide-react';
import { clearDriverAuthState } from '../../services/registrationService';
import { venuePartnerService } from '../../services/venuePartnerService';
import PartnerOverview from './PartnerOverview';
import PartnerBookings from './PartnerBookings';
import PartnerScan from './PartnerScan';
import PartnerVenues from './PartnerVenues';
import PartnerWallet from './PartnerWallet';

const TABS = [
  { id: 'overview', label: 'Home', Icon: LayoutDashboard },
  { id: 'bookings', label: 'Bookings', Icon: Ticket },
  { id: 'scan', label: 'Scan', Icon: ScanLine },
  { id: 'venues', label: 'Venues', Icon: Building2 },
  { id: 'wallet', label: 'Wallet', Icon: Wallet },
];

const VenuePartnerConsole = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = TABS.some((t) => t.id === searchParams.get('tab')) ? searchParams.get('tab') : 'overview';
  const [partner, setPartner] = useState(null);

  useEffect(() => {
    venuePartnerService.getMe().then((r) => setPartner(r?.data || null)).catch(() => {});
  }, []);

  const goTab = (id) => setSearchParams(id === 'overview' ? {} : { tab: id }, { replace: true });

  const logout = () => {
    if (!window.confirm('Log out of the venue partner console?')) return;
    clearDriverAuthState();
    navigate('/taxi/driver/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 max-w-2xl mx-auto pb-24">
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur px-5 pt-8 pb-4 border-b border-slate-100 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[0.26em] text-indigo-500">Venue Partner</p>
          <h1 className="truncate text-[19px] font-black text-slate-900">{partner?.businessName || partner?.name || 'Dashboard'}</h1>
        </div>
        <button type="button" onClick={logout} className="flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-[11px] font-bold text-slate-600">
          <LogOut size={13} /> Logout
        </button>
      </header>

      <main className="px-4 pt-4">
        {tab === 'overview' && <PartnerOverview onOpenTab={goTab} />}
        {tab === 'bookings' && <PartnerBookings />}
        {tab === 'scan' && <PartnerScan />}
        {tab === 'venues' && <PartnerVenues />}
        {tab === 'wallet' && <PartnerWallet partner={partner} onPartnerChange={setPartner} />}
      </main>

      <nav className="fixed bottom-0 left-1/2 z-30 grid w-full max-w-2xl -translate-x-1/2 grid-cols-5 border-t border-slate-200 bg-white">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => goTab(item.id)}
            className={`flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-black ${tab === item.id ? 'text-indigo-600' : 'text-slate-400'}`}
          >
            <item.Icon size={20} />
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default VenuePartnerConsole;
