import React, { useEffect, useState } from 'react';
import { Building2, ChevronRight, CheckCircle2 } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { agentService, clearAgentLoginSession, getLocalAgentToken, saveAgentLoginSession } from '../services/agentService';
import { useSettings } from '../../../shared/context/SettingsContext';
import taxiBg from '../../../assets/images/light-taxi-bg.png';

const AgentLogin = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { settings } = useSettings();
    const appName = settings?.general?.app_name || 'Yatra Desk Trawler';
    const appLogo = settings?.general?.logo || settings?.customization?.logo || settings?.general?.favicon || '';
    
    const [phone, setPhone] = useState('');
    const [agreed, setAgreed] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (getLocalAgentToken()) {
            navigate('/taxi/agent', { replace: true });
        }
    }, [navigate]);

    useEffect(() => {
        document.title = `${appName} | Agent Login`;
    }, [appName]);

    const handleSubmit = async () => {
        if (phone.length !== 10) {
            setError('Please enter 10 digits');
            return;
        }
        if (!agreed) {
            setError('Accept terms to continue');
            return;
        }

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
        <div className="min-h-screen relative bg-[#F8FAFC] select-none overflow-x-hidden font-['Outfit']">
            {/* Bright Background */}
            <div className="fixed inset-0 z-0">
                <motion.img 
                    initial={{ scale: 1.05, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    src={taxiBg} 
                    alt="" 
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px]" />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/40 to-white" />
            </div>

            <main className="relative z-10 mx-auto max-w-sm px-6 flex flex-col min-h-screen pt-24 pb-32">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex-1 space-y-8"
                >
                    {/* Header */}
                    <header className="text-center space-y-4">
                        <div className="flex flex-col items-center gap-3">
                            {appLogo ? (
                                <img
                                    src={appLogo}
                                    alt={`${appName} logo`}
                                    className="h-14 w-14 rounded-2xl object-cover bg-white p-1.5 shadow-xl shadow-slate-200/70 border border-white"
                                />
                            ) : (
                                <div className="rounded-2xl bg-slate-900 px-4 py-2 text-base font-black tracking-tight text-white shadow-xl shadow-slate-900/10">
                                    {appName}
                                </div>
                            )}
                            <div className="space-y-1">
                                <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">
                                    {appName}
                                </p>
                            </div>
                        </div>
                        <motion.div 
                            layoutId="icon"
                            className="w-20 h-20 bg-white rounded-3xl shadow-xl shadow-[#143a5a]/10 mx-auto flex items-center justify-center border border-slate-50 mb-6"
                        >
                            <Building2 size={36} className="text-[#143a5a]" strokeWidth={2.5} />
                        </motion.div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight">
                            Hello!
                        </h1>
                        <p className="text-slate-500 font-medium text-lg">
                            Sign in to your agent account
                        </p>
                    </header>

                    {/* Input Card */}
                    <motion.div 
                        layout
                        className="bg-white rounded-[40px] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.06)] border border-slate-50 space-y-8"
                    >
                        <div className="space-y-4">
                            <div className={`flex items-center gap-4 p-5 rounded-2xl transition-all border-2 ${error ? 'border-rose-100 bg-rose-50/30' : 'border-slate-50 bg-slate-50 focus-within:border-[#143a5a] focus-within:bg-white focus-within:shadow-xl focus-within:shadow-[#143a5a]/10'}`}>
                                <div className="flex items-center gap-2 pr-4 border-r border-slate-200">
                                    <span className="text-slate-400 text-sm font-black">+91</span>
                                </div>
                                <input 
                                    type="tel" 
                                    inputMode="numeric"
                                    maxLength={10}
                                    value={phone}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, '');
                                        setPhone(val);
                                        if (error) setError('');
                                    }}
                                    placeholder="Phone Number"
                                    className="flex-1 bg-transparent border-none p-0 text-xl font-bold text-slate-900 outline-none focus:ring-0 placeholder:text-slate-300"
                                />
                                {phone.length === 10 && (
                                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                                        <CheckCircle2 size={20} className="text-emerald-500" />
                                    </motion.div>
                                )}
                            </div>
                        </div>

                        {/* Minimal Agreement */}
                        <div className="flex gap-4 items-start px-1">
                            <input 
                                type="checkbox" 
                                id="terms"
                                checked={agreed}
                                onChange={() => setAgreed(!agreed)}
                                className="h-6 w-6 rounded-lg border-2 border-slate-100 bg-slate-50 text-[#143a5a] focus:ring-[#143a5a] transition-all cursor-pointer"
                            />
                            <label htmlFor="terms" className="text-sm font-medium text-slate-400 leading-snug cursor-pointer select-none">
                                I accept the <span className="text-[#143a5a] font-bold hover:underline">Terms</span> & <span className="text-[#143a5a] font-bold hover:underline">Privacy</span>
                            </label>
                        </div>

                        <AnimatePresence>
                            {error && (
                                <motion.div 
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="text-rose-500 text-xs font-bold text-center bg-rose-50 p-3 rounded-xl"
                                >
                                    {error}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>

                    <div className="text-center">
                        <button
                            type="button"
                            className="text-slate-400 text-sm font-bold hover:text-slate-600 transition-colors"
                        >
                            Need help? <span className="text-[#143a5a]">Contact Support</span>
                        </button>

                    </div>
                </motion.div>

                {/* Fixed Bottom Button */}
                <div className="fixed bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-white via-white/80 to-transparent">
                    <div className="mx-auto max-w-sm">
                        <motion.button 
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleSubmit}
                            disabled={loading || !agreed || phone.length !== 10}
                            className={`group flex h-18 w-full items-center justify-center gap-3 rounded-[24px] text-lg font-black transition-all ${
                                agreed && phone.length === 10 
                                    ? 'bg-[#143a5a] text-white shadow-2xl shadow-[#143a5a]/20' 
                                    : 'bg-slate-100 text-slate-300 pointer-events-none'
                            }`}
                        >
                            {loading ? (
                                <div className="h-6 w-6 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <span className="uppercase tracking-widest">Get Started</span>
                                    <ChevronRight size={24} strokeWidth={3} className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </motion.button>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AgentLogin;
