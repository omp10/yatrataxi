import React from 'react';
import { Home, ReceiptText, QrCode, Wallet, UserRound } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

const tabs = [
  { label: 'Home', path: '/taxi/agent', Icon: Home },
  { label: 'Bookings', path: '/taxi/agent/bookings', Icon: ReceiptText },
  { label: 'QR', path: '/taxi/agent/referral', Icon: QrCode },
  { label: 'Wallet', path: '/taxi/agent/wallet', Icon: Wallet },
  { label: 'Profile', path: '/taxi/agent/profile', Icon: UserRound },
];

const AgentBottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 mx-auto w-full max-w-lg px-4 pb-[max(env(safe-area-inset-bottom),16px)] pt-3">
      <div className="flex items-center justify-between rounded-[28px] border border-[#d6e4f5] bg-white/95 px-2 py-2 shadow-[0_18px_40px_rgba(14,60,96,0.16)] backdrop-blur-xl">
        {tabs.map(({ label, path, Icon }) => {
          const active = path === '/taxi/agent'
            ? location.pathname === path
            : location.pathname === path || location.pathname.startsWith(`${path}/`);

          return (
            <button
              key={label}
              type="button"
              onClick={() => navigate(path)}
              className={`flex min-w-0 flex-1 flex-col items-center justify-center rounded-[22px] px-2 py-2 transition-all ${
                active ? 'bg-[#143a5a] text-white' : 'text-slate-500'
              }`}
            >
              <Icon size={18} strokeWidth={active ? 2.6 : 2.1} />
              <span className="mt-1 text-[10px] font-black uppercase tracking-[0.18em]">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default AgentBottomNav;
