import React, { useState } from 'react';
import { useAdminAuth } from '../context/AuthContext';
import { LogIn, Eye, EyeOff, Lock, Mail, Train, Sparkles, AlertCircle } from 'lucide-react';
import bgVandeOrange from '../assets/bg_vande_orange.jpg';
import logoImg from '../assets/logo.png';

export const AdminAuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile, isLoading, isAdmin, signIn } = useAdminAuth();

  const [email, setEmail] = useState('admin@railio.ai');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-900 p-4">
        <div className="w-14 h-14 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4 shadow-md shadow-orange-500/20" />
        <p className="text-slate-600 font-medium text-sm tracking-wide notranslate" translate="no">
          Loading Rail<span className="text-[#FF671F]">io</span> Control Portal...
        </p>
      </div>
    );
  }

  if (user && profile && isAdmin) {
    return <>{children}</>;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      await signIn(email, password);
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid administrator credentials');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickDemoAdmin = async () => {
    setErrorMsg(null);
    setIsSubmitting(true);
    setEmail('admin@railio.ai');
    setPassword('password123');
    try {
      await signIn('admin@railio.ai', 'password123');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to initialize demo controller session');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 relative overflow-hidden selection:bg-orange-500 selection:text-white font-sans">
      {/* Background Visual Overlay */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <img
          src={bgVandeOrange}
          alt="RailIo Vande Bharat Train Background"
          className="w-full h-full object-cover object-center opacity-65 filter contrast-105 scale-105 transition-all duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/45 via-slate-900/30 to-slate-950/50 backdrop-blur-[1px]" />
      </div>

      {/* Main White & Orange Card */}
      <div className="relative z-10 max-w-md w-full bg-white/95 border border-slate-200/80 rounded-3xl shadow-2xl shadow-orange-950/10 backdrop-blur-xl overflow-hidden transition-all duration-300">
        {/* Vibrant Orange Top Accent */}
        <div className="h-2 w-full bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600" />

        {/* Card Header */}
        <div className="p-8 pb-3 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-md shadow-orange-500/15 overflow-hidden bg-white p-1 border border-orange-100">
            <img src={logoImg} alt="Railio Logo" className="w-full h-full object-contain scale-110" />
          </div>

          <div className="flex items-center justify-center space-x-2">
            <h1 className="font-russo text-3xl tracking-wider text-black notranslate whitespace-nowrap" translate="no">
              Rail<span className="text-[#FF671F]">io</span>
            </h1>
            <span className="px-2.5 py-0.5 text-[10px] font-bold tracking-widest uppercase bg-orange-50 text-rail-orange border border-orange-200 rounded-full whitespace-nowrap">
              HQ Controller
            </span>
          </div>
          <p className="text-[10px] font-bold tracking-wider text-[#FF671F] uppercase mt-1">
            AI RAILWAY INTELLIGENCE
          </p>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Sign in to access your railway operations portal
          </p>
        </div>

        {/* Card Form Body */}
        <div className="p-8 pt-2 space-y-5">
          {user && profile && !isAdmin && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block mb-0.5">Access Restricted</span>
                Account <code className="bg-red-100 px-1 py-0.5 rounded text-red-800">{user.email}</code> does not have administrator privileges.
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-xs flex items-center space-x-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span className="font-medium">{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                <Mail className="w-3.5 h-3.5 text-orange-500" />
                <span>Admin Email</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-slate-50/80 border border-slate-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 rounded-2xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none transition-all"
                placeholder="admin@railio.ai"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                <Lock className="w-3.5 h-3.5 text-orange-500" />
                <span>Password</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-slate-50/80 border border-slate-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 rounded-2xl pl-4 pr-11 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-orange-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Authenticate Access Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 active:scale-[0.99] flex items-center justify-center space-x-2 transition-all text-sm disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Authenticate Access</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Access Divider */}
          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-200" />
            <span className="flex-shrink mx-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              QUICK ACCESS
            </span>
            <div className="flex-grow border-t border-slate-200" />
          </div>

          {/* Quick One-Tap Super Admin Access Button */}
          <button
            onClick={handleQuickDemoAdmin}
            disabled={isSubmitting}
            className="w-full bg-orange-50 hover:bg-orange-100/80 border border-orange-200 text-orange-700 font-bold py-3 rounded-2xl flex items-center justify-center space-x-2 transition-all text-xs"
          >
            <Sparkles className="w-4 h-4 text-orange-500" />
            <span>⚡ One-Tap Controller Login</span>
          </button>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-8 py-3.5 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-500 font-medium notranslate" translate="no">
            <span className="font-russo font-normal text-slate-800">Rail<span className="text-[#FF671F]">io</span></span> AI Railway Operating System
          </p>
        </div>
      </div>
    </div>
  );
};
