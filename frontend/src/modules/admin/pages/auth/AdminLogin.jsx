import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Mail,
  Lock,
  ArrowRight,
  Loader2,
  AlertCircle,
  KeyRound,
  CheckCircle2,
  ArrowLeft,
  Eye,
  EyeOff,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { adminService } from '../../services/adminService';
import { useSettings } from '../../../../shared/context/SettingsContext';

const InputField = ({
  icon: Icon,
  type,
  placeholder,
  value,
  onChange,
  id,
  rightElement,
  ...props
}) => (
  <div className="relative group">
    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors">
      <Icon size={18} strokeWidth={2.5} />
    </div>
    <input
      id={id}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className={`w-full pl-12 ${rightElement ? 'pr-12' : 'pr-4'} py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[14px] font-bold text-slate-900 placeholder:text-slate-300 outline-none focus:bg-white focus:border-slate-900 focus:ring-8 focus:ring-slate-900/5 transition-all`}
      {...props}
    />
    {rightElement && (
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center">
        {rightElement}
      </div>
    )}
  </div>
);

const AdminLogin = () => {
  const { settings } = useSettings();
  const [view, setView] = useState('login'); // 'login' | 'forgot' | 'reset'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const appLogo = settings.general?.logo || settings.customization?.logo;
  const appName = settings.general?.app_name || 'Yatra Desk';

  const resetMessages = () => {
    setError('');
    setSuccessMessage('');
  };

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    resetMessages();

    try {
      const response = await adminService.login({ email, password });
      localStorage.setItem('adminToken', response?.data?.token || '');
      localStorage.setItem('adminInfo', JSON.stringify(response?.data?.admin || {}));
      setTimeout(() => navigate('/admin/dashboard'), 300);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Authentication failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    if (!forgotEmail) {
      setError('Please enter your admin email address.');
      return;
    }
    setIsLoading(true);
    resetMessages();

    try {
      await adminService.forgotPassword(forgotEmail);
      setSuccessMessage('A 6-digit verification OTP has been sent to your email.');
      setView('reset');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to send reset OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    if (e) e.preventDefault();
    if (!otp || !newPassword) {
      setError('Please enter the OTP and your new password.');
      return;
    }
    setIsLoading(true);
    resetMessages();

    try {
      await adminService.resetPassword({
        email: forgotEmail,
        otp: otp.trim(),
        password: newPassword,
      });
      setSuccessMessage('Password reset successfully! Please sign in with your new password.');
      setEmail(forgotEmail);
      setPassword('');
      setOtp('');
      setNewPassword('');
      setTimeout(() => {
        setView('login');
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Invalid or expired OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col font-sans overflow-hidden">
      {/* Immersive Decorative Elements */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[60%] h-[60%] bg-white rounded-full blur-[160px] opacity-60" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[50%] h-[50%] bg-slate-100 rounded-full blur-[140px] opacity-40" />
      </div>

      <main className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-[440px]"
        >
          {/* Brand Header */}
          <div className="flex flex-col items-center text-center mb-10">
            <motion.div
              whileHover={{ scale: 1.05 }}
              onClick={() => navigate('/')}
              className="cursor-pointer mb-6"
            >
              {appLogo ? (
                <div className="bg-white p-4 rounded-[2.5rem] shadow-2xl shadow-slate-200/50">
                  <img src={appLogo} alt={appName} className="h-12 w-auto object-contain" />
                </div>
              ) : (
                <div className="w-20 h-20 bg-slate-900 rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl shadow-slate-900/20">
                  <ShieldCheck size={36} strokeWidth={2} />
                </div>
              )}
            </motion.div>

            <div className="space-y-2">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-tight">
                {view === 'login' && 'Admin Portal'}
                {view === 'forgot' && 'Reset Password'}
                {view === 'reset' && 'Set New Password'}
              </h1>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">
                {view === 'login' && `${appName} Management Console`}
                {view === 'forgot' && 'Verify your administrative identity'}
                {view === 'reset' && 'Enter verification code & new password'}
              </p>
            </div>
          </div>

          {/* Card Container */}
          <div className="bg-white border border-slate-200 rounded-[3rem] p-10 shadow-2xl shadow-slate-200/40 relative">
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  key="error-box"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600"
                >
                  <AlertCircle size={18} className="shrink-0" />
                  <p className="text-[12px] font-bold leading-tight">{error}</p>
                </motion.div>
              )}

              {successMessage && (
                <motion.div
                  key="success-box"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-700"
                >
                  <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
                  <p className="text-[12px] font-bold leading-tight">{successMessage}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* VIEW 1: Login Form */}
            {view === 'login' && (
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-5">
                  <InputField
                    id="admin-email"
                    icon={Mail}
                    type="email"
                    placeholder="Admin Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoFocus
                    required
                  />
                  <div className="space-y-3">
                    <InputField
                      id="admin-password"
                      icon={Lock}
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      rightElement={
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="p-1 text-slate-400 hover:text-slate-700 transition-colors focus:outline-none cursor-pointer"
                          tabIndex={-1}
                          title={showPassword ? 'Hide password' : 'Show password'}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? (
                            <EyeOff size={18} strokeWidth={2.2} />
                          ) : (
                            <Eye size={18} strokeWidth={2.2} />
                          )}
                        </button>
                      }
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          resetMessages();
                          setForgotEmail(email);
                          setView('forgot');
                        }}
                        className="text-[11px] font-black text-slate-500 uppercase tracking-widest hover:text-slate-900 transition-colors cursor-pointer py-1"
                      >
                        Forgotten Identity?
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="group w-full py-5 bg-slate-900 text-white rounded-[1.5rem] text-[15px] font-black shadow-2xl shadow-slate-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 cursor-pointer"
                >
                  {isLoading ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <>
                      Sign In
                      <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" strokeWidth={2.5} />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* VIEW 2: Forgot Password - Request OTP */}
            {view === 'forgot' && (
              <form onSubmit={handleSendOtp} className="space-y-6">
                <div className="space-y-4">
                  <p className="text-[13px] font-semibold text-slate-500 leading-relaxed">
                    Enter the administrator email associated with your account to receive a reset verification code.
                  </p>
                  <InputField
                    id="forgot-email"
                    icon={Mail}
                    type="email"
                    placeholder="Enter Admin Email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    autoFocus
                    required
                  />
                </div>

                <div className="space-y-3">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="group w-full py-5 bg-slate-900 text-white rounded-[1.5rem] text-[15px] font-black shadow-2xl shadow-slate-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 cursor-pointer"
                  >
                    {isLoading ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : (
                      <>
                        Send Recovery Code
                        <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" strokeWidth={2.5} />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      resetMessages();
                      setView('login');
                    }}
                    className="w-full py-3.5 text-[12px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ArrowLeft size={14} strokeWidth={2.5} /> Back to Sign In
                  </button>
                </div>
              </form>
            )}

            {/* VIEW 3: Reset Password - Enter OTP & New Password */}
            {view === 'reset' && (
              <form onSubmit={handleResetPassword} className="space-y-6">
                <div className="space-y-4">
                  <InputField
                    id="reset-otp"
                    icon={KeyRound}
                    type="text"
                    placeholder="6-Digit Verification Code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    maxLength={6}
                    autoFocus
                    required
                  />
                  <InputField
                    id="new-password"
                    icon={Lock}
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="Enter New Password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    rightElement={
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="p-1 text-slate-400 hover:text-slate-700 transition-colors focus:outline-none cursor-pointer"
                        tabIndex={-1}
                        title={showNewPassword ? 'Hide password' : 'Show password'}
                        aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                      >
                        {showNewPassword ? (
                          <EyeOff size={18} strokeWidth={2.2} />
                        ) : (
                          <Eye size={18} strokeWidth={2.2} />
                        )}
                      </button>
                    }
                  />
                </div>

                <div className="space-y-3">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="group w-full py-5 bg-slate-900 text-white rounded-[1.5rem] text-[15px] font-black shadow-2xl shadow-slate-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 cursor-pointer"
                  >
                    {isLoading ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : (
                      <>
                        Update Password
                        <CheckCircle2 size={18} strokeWidth={2.5} />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      resetMessages();
                      setView('forgot');
                    }}
                    className="w-full py-3.5 text-[12px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ArrowLeft size={14} strokeWidth={2.5} /> Change Email / Resend
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="mt-12 flex flex-col items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full border border-slate-200/50">
              <ShieldCheck size={14} className="text-slate-500" />
              <span className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">
                Secure Admin Portal
              </span>
            </div>
            <p className="text-center text-[11px] text-slate-400 font-bold max-w-[300px]">
              Authorized personnel only. Protected by 256-bit SSL encryption.
            </p>
          </div>
        </motion.div>
      </main>

      <footer className="p-8 text-center relative z-10 border-t border-slate-100 bg-white/50 backdrop-blur-sm">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
          &copy; 2026 {appName}. All rights reserved.
        </p>
      </footer>
    </div>
  );
};

export default AdminLogin;
