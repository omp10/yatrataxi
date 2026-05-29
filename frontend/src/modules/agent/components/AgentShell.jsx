import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import AgentBottomNav from './AgentBottomNav';
import { clearAgentSession } from '../services/agentService';

const hiddenNavMatchers = ['/taxi/agent/book-ride', '/taxi/agent/book-bus'];

const AgentShell = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const hideBottomNav = hiddenNavMatchers.some((path) => location.pathname.startsWith(path));

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#dff5ff_0%,_#eef6ff_48%,_#f6f7fb_100%)] pb-28">
      <header className="sticky top-0 z-40 border-b border-white/60 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg items-center justify-between px-5 py-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#5d7c96]">Agent Desk</p>
            <h1 className="text-xl font-black tracking-tight text-[#143a5a]">Bookings & Commissions</h1>
          </div>
          <button
            type="button"
            onClick={() => {
              clearAgentSession();
              navigate('/taxi/agent/login', { replace: true });
            }}
            className="inline-flex items-center gap-2 rounded-2xl border border-[#d8e5f1] bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#143a5a] shadow-sm"
          >
            <LogOut size={14} />
            Logout
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-5">
        <Outlet />
      </main>

      {!hideBottomNav && <AgentBottomNav />}
    </div>
  );
};

export default AgentShell;
