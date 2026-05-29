import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Building2, ChevronRight, MessageSquare } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  agentService,
  clearAgentLoginSession,
  getLocalAgentToken,
  getStoredAgentLoginSession,
  persistAgentSession,
  saveAgentLoginSession,
} from '../services/agentService';

const AgentOtpVerification = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const inputs = useRef([]);
  const session = {
    ...getStoredAgentLoginSession(),
    ...(location.state || {}),
  };
  const phone = String(session.phone || '').replace(/\D/g, '').slice(-10);

  const [otp, setOtp] = useState(['', '', '', '']);
  const [timer, setTimer] = useState(60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (getLocalAgentToken()) {
      navigate('/taxi/agent', { replace: true });
      return;
    }

    if (!phone) {
      navigate('/taxi/agent/login', { replace: true });
      return;
    }

    const interval = window.setInterval(() => {
      setTimer((current) => (current > 0 ? current - 1 : 0));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [navigate, phone]);

  useEffect(() => {
    const focusTimer = window.setTimeout(() => {
      inputs.current[0]?.focus();
    }, 250);

    return () => window.clearTimeout(focusTimer);
  }, []);

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) {
      return;
    }

    const nextOtp = [...otp];
    nextOtp[index] = value.slice(-1);
    setOtp(nextOtp);

    if (value && index < 3) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, event) => {
    if (event.key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    if (otp.join('').length !== 4) {
      setError('Enter the 4-digit OTP');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await agentService.verifyLoginOtp({
        phone,
        otp: otp.join(''),
      });
      const payload = response?.data?.data || response?.data || {};
      if (payload?.nextStep === 'onboarding') {
        saveAgentLoginSession({
          ...session,
          phone,
          verified: true,
        });
        navigate('/taxi/agent/onboarding', { replace: true });
        return;
      }

      if (payload?.nextStep === 'pending_review') {
        clearAgentLoginSession();
        navigate('/taxi/agent/pending', {
          replace: true,
          state: {
            agent: payload?.agent || {},
          },
        });
        return;
      }

      persistAgentSession(payload);
      clearAgentLoginSession();
      navigate('/taxi/agent', { replace: true });
    } catch (err) {
      setError(err?.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (timer > 0) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await agentService.sendLoginOtp({ phone });
      const payload = response?.data?.data || response?.data || {};
      saveAgentLoginSession({
        phone,
        debugOtp: payload?.session?.debugOtp || '',
      });
      setOtp(['', '', '', '']);
      setTimer(60);
      inputs.current[0]?.focus();
      setError('OTP sent successfully');
    } catch (err) {
      setError(err?.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_#d7f4ff_0%,_#f8fbff_46%,_#f3f4f8_100%)] px-5 py-8">
      <div className="mx-auto max-w-lg">
        <div className="rounded-[34px] border border-white/70 bg-white/85 p-6 shadow-[0_22px_50px_rgba(20,58,90,0.12)] backdrop-blur-xl">
          <button
            type="button"
            onClick={() => navigate('/taxi/agent/login')}
            className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[#d9e7f3] bg-white text-[#143a5a] shadow-sm"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="mb-8 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#5b7a93]">Secure Access</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-[#143a5a]">Verify OTP</h1>
              <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">
                We sent a 4-digit code to <span className="font-black text-[#143a5a]">+91 {phone}</span>
              </p>
            </div>
            <div className="rounded-[28px] bg-[#143a5a] p-4 text-white shadow-lg shadow-[#143a5a]/20">
              <Building2 size={28} />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(element) => {
                  inputs.current[index] = element;
                }}
                type="tel"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(event) => handleChange(index, event.target.value)}
                onKeyDown={(event) => handleKeyDown(index, event)}
                className="h-16 rounded-[22px] border border-[#d9e7f3] bg-white text-center text-2xl font-black text-[#143a5a] outline-none transition focus:border-[#143a5a] focus:ring-4 focus:ring-[#143a5a]/8"
              />
            ))}
          </div>

          {error ? (
            <p className={`mt-5 text-sm font-bold ${error.toLowerCase().includes('successfully') ? 'text-emerald-600' : 'text-rose-500'}`}>
              {error}
            </p>
          ) : null}

          <div className="mt-6 flex items-center justify-between gap-4 rounded-[24px] border border-[#d9e7f3] bg-[#eff7ff] px-4 py-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#143a5a]">Didn&apos;t get the code?</p>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                {timer > 0 ? `Retry in ${timer}s` : 'You can resend a fresh OTP now'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleResend}
              disabled={timer > 0 || loading}
              className="inline-flex items-center gap-2 rounded-[18px] bg-white px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-[#143a5a] shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
            >
              <MessageSquare size={14} />
              Resend
            </button>
          </div>

          <button
            type="button"
            onClick={handleVerify}
            disabled={loading || otp.join('').length !== 4}
            className="mt-6 flex w-full items-center justify-center gap-3 rounded-[26px] bg-[#143a5a] px-5 py-4 text-sm font-black uppercase tracking-[0.2em] text-white shadow-[0_18px_36px_rgba(20,58,90,0.22)] transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Verify & Continue'}
            {!loading ? <ChevronRight size={18} /> : null}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgentOtpVerification;
