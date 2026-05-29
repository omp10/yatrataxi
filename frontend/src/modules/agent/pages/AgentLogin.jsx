import React, { useEffect, useState } from 'react';
import { Building2, Phone, ShieldCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { agentService, clearAgentLoginSession, getLocalAgentToken, saveAgentLoginSession } from '../services/agentService';

const inputClass =
  'w-full rounded-3xl border border-[#d9e7f3] bg-white px-5 py-4 text-[15px] font-semibold text-slate-900 shadow-sm outline-none transition focus:border-[#143a5a] focus:ring-4 focus:ring-[#143a5a]/8';

const AgentLogin = () => {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (getLocalAgentToken()) {
      navigate('/taxi/agent', { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      clearAgentLoginSession();
      const response = await agentService.sendLoginOtp({ phone });
      const payload = response?.data?.data || response?.data || {};
      saveAgentLoginSession({
        phone,
        debugOtp: payload?.session?.debugOtp || '',
      });
      navigate('/taxi/agent/verify-otp', { replace: true });
    } catch (err) {
      setError(err?.message || 'Agent login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_#d7f4ff_0%,_#f8fbff_46%,_#f3f4f8_100%)] px-5 py-8">
      <div className="mx-auto max-w-lg">
        <div className="rounded-[34px] border border-white/70 bg-white/85 p-6 shadow-[0_22px_50px_rgba(20,58,90,0.12)] backdrop-blur-xl">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#5b7a93]">Separate Portal</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-[#143a5a]">Agent Login</h1>
            </div>
            <div className="rounded-[28px] bg-[#143a5a] p-4 text-white shadow-lg shadow-[#143a5a]/20">
              <Building2 size={28} />
            </div>
          </div>

          <p className="mb-6 text-sm font-semibold leading-6 text-slate-500">
            Book rides and bus tickets for walk-in customers, share your QR referral, and track your wallet from one place.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-[0.18em] text-[#5b7a93]">Phone</label>
              <div className="relative">
                <Phone size={16} className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="tel"
                  value={phone}
                  maxLength={10}
                  onChange={(event) => setPhone(event.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 10-digit number"
                  className={`${inputClass} pl-12`}
                />
              </div>
            </div>

            <div className="rounded-[28px] border border-[#d9e7f3] bg-[#eff7ff] p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-white p-3 text-[#143a5a] shadow-sm">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#143a5a]">Phone OTP Login</p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                    Enter your number and we&apos;ll send a 4-digit OTP. New agent numbers will continue into onboarding and document upload automatically.
                  </p>
                </div>
              </div>
            </div>

            {error ? <p className="text-sm font-bold text-rose-500">{error}</p> : null}

            <button
              type="submit"
              disabled={loading || phone.length !== 10}
              className="w-full rounded-[26px] bg-[#143a5a] px-5 py-4 text-sm font-black uppercase tracking-[0.2em] text-white shadow-[0_18px_36px_rgba(20,58,90,0.22)] transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </button>
          </form>

          <div className="mt-6 rounded-[28px] border border-[#d9e7f3] bg-[#eff7ff] p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#143a5a]">Need the driver portal instead?</p>
            <Link
              to="/taxi/driver/login"
              className="mt-2 inline-flex text-sm font-bold text-[#0f6aa8] underline underline-offset-4"
            >
              Switch to driver login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentLogin;
