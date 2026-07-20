/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Mail, ArrowRight, Chrome, Eye, Key } from 'lucide-react';
import { UserSession } from '../types';

interface GoogleLoginSimulatedProps {
  onLoginSuccess: (session: UserSession) => void;
  plateNumber: string;
  onOpenPolicy: (tab: 'warranty' | 'privacy' | 'support') => void;
}

export default function GoogleLoginSimulated({ onLoginSuccess, plateNumber, onOpenPolicy }: GoogleLoginSimulatedProps) {
  const [email, setEmail] = useState('driver.club@gmail.com');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<'button' | 'loading' | 'success'>('button');
  const [acceptedTerms, setAcceptedTerms] = useState(true);
  const [showTermsError, setShowTermsError] = useState(false);

  const handleStartLogin = () => {
    if (!acceptedTerms) {
      setShowTermsError(true);
      return;
    }
    setShowTermsError(false);
    setIsSubmitting(true);
    setStep('loading');

    // Simulate luxury animation steps
    setTimeout(() => {
      setStep('success');
      setTimeout(() => {
        onLoginSuccess({
          isLoggedIn: true,
          email: email,
          name: 'Alexis Mendoza',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop'
        });
      }, 1800);
    }, 2000);
  };

  return (
    <div className="w-full max-w-md mx-auto glass-panel rounded-3xl p-8 border border-carbon-700 shadow-2xl relative overflow-hidden" id="google-login-container">
      {/* Aesthetic Top Ambient Light */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-brand-cyan to-transparent opacity-80" />
      
      {/* Scanning laser glow on background */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-cyan/20 via-brand-lime/20 to-brand-cyan/20 scan-line pointer-events-none" />

      <AnimatePresence mode="wait">
        {step === 'button' && (
          <motion.div
            key="login-form"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col gap-6"
          >
            <div className="text-center">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-carbon-800/80 border border-carbon-700 flex items-center justify-center mb-4 shadow-inner">
                <Chrome className="w-6 h-6 text-brand-cyan animate-pulse" />
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight text-white mb-2 font-sans">
                Acceso de Conductor
              </h2>
              <p className="text-sm text-carbon-400">
                Para vincular y certificar la placa <span className="text-brand-lime font-mono font-bold tracking-wider">{plateNumber || '911-LUX'}</span> de forma segura.
              </p>
            </div>

            {/* Simulated Credentials Card */}
            <div className="bg-carbon-900/60 rounded-2xl p-5 border border-carbon-800/80 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold tracking-wider text-carbon-400 uppercase">Cuenta de Google Sugerida</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail className="w-4 h-4 text-carbon-500" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-4 py-3 bg-carbon-950 border border-carbon-800 rounded-xl text-sm text-white font-mono focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan/30 focus:outline-none transition-colors"
                    placeholder="correo@google.com"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-bold tracking-wider text-carbon-400 uppercase">Contraseña</label>
                  <span className="text-[10px] text-brand-cyan cursor-pointer hover:underline">Autocompletar</span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Key className="w-4 h-4 text-carbon-500" />
                  </div>
                  <input
                    type="password"
                    disabled
                    value="••••••••••••••••••••"
                    className="block w-full pl-10 pr-10 py-3 bg-carbon-950/60 border border-carbon-900 rounded-xl text-sm text-carbon-500 font-mono select-none pointer-events-none"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                    <Eye className="w-4 h-4 text-carbon-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Checkbox for Privacy and Data Protection compliance */}
            <div className="flex flex-col gap-2 bg-carbon-900/30 p-4 rounded-2xl border border-carbon-800 text-left">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="accept-terms"
                  checked={acceptedTerms}
                  onChange={(e) => {
                    setAcceptedTerms(e.target.checked);
                    if (e.target.checked) setShowTermsError(false);
                  }}
                  className="mt-1 w-4 h-4 rounded bg-carbon-950 border-carbon-800 text-brand-cyan focus:ring-brand-cyan/20 cursor-pointer accent-brand-cyan"
                />
                <label htmlFor="accept-terms" className="text-xs text-carbon-300 leading-relaxed cursor-pointer select-none">
                  Acepto la <span className="text-brand-cyan hover:underline font-bold" onClick={(e) => { e.preventDefault(); onOpenPolicy('privacy'); }}>Política de Privacidad y Datos</span> y los <span className="text-brand-cyan hover:underline font-bold" onClick={(e) => { e.preventDefault(); onOpenPolicy('warranty'); }}>Términos de Garantía</span> del ecosistema PlacaID.
                </label>
              </div>
              {showTermsError && (
                <span className="text-[11px] text-red-400 font-semibold flex items-center gap-1.5 animate-pulse">
                  ⚠️ Debes aceptar la política de protección de datos para continuar.
                </span>
              )}
            </div>

            <button
              onClick={handleStartLogin}
              className={`w-full relative group overflow-hidden text-black font-extrabold py-3.5 px-6 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 ${
                acceptedTerms 
                  ? 'bg-gradient-to-r from-brand-cyan to-brand-cyan/80 hover:shadow-[0_0_20px_rgba(0,240,255,0.4)]' 
                  : 'bg-carbon-800 text-carbon-500 cursor-not-allowed'
              }`}
            >
              <Chrome className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
              <span>Acceder con Google</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <div className="flex items-center justify-center gap-2 text-xs text-carbon-400">
              <ShieldCheck className="w-4 h-4 text-brand-lime" />
              <span>Encriptación SSL Certificada de PlacaID</span>
            </div>
          </motion.div>
        )}

        {step === 'loading' && (
          <motion.div
            key="login-loading"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="py-12 flex flex-col items-center justify-center text-center gap-6"
          >
            {/* Spinning tech wheels */}
            <div className="relative w-24 h-24">
              <div className="absolute inset-0 rounded-full border-4 border-carbon-800" />
              <div className="absolute inset-0 rounded-full border-4 border-t-brand-cyan border-r-transparent border-b-transparent border-l-transparent animate-spin" />
              <div className="absolute inset-2 rounded-full border border-carbon-700" />
              <div className="absolute inset-2 rounded-full border-2 border-b-brand-lime border-t-transparent border-r-transparent border-l-transparent animate-spin [animation-duration:1.5s] [animation-direction:reverse]" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Chrome className="w-8 h-8 text-brand-cyan animate-pulse" />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <h3 className="text-xl font-bold tracking-wider text-white">Sincronizando Identidad</h3>
              <p className="text-sm text-carbon-400 max-w-xs mx-auto">
                Autenticando contra los servidores de Google para vincular el historial de mantenimiento...
              </p>
            </div>
            
            <div className="text-[10px] font-mono text-brand-cyan/60 px-3 py-1 bg-brand-cyan/5 rounded border border-brand-cyan/10">
              OAUTH_REDIRECT_TOKEN: OK
            </div>
          </motion.div>
        )}

        {step === 'success' && (
          <motion.div
            key="login-success"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="py-12 flex flex-col items-center justify-center text-center gap-6"
          >
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-brand-lime to-emerald-500 flex items-center justify-center shadow-lg shadow-brand-lime/20 border-2 border-white/10">
              <motion.svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={3}
                stroke="currentColor"
                className="w-8 h-8 text-black"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </motion.svg>
            </div>

            <div className="flex flex-col gap-2">
              <h3 className="text-2xl font-black text-brand-lime tracking-tight">¡Acceso Autorizado!</h3>
              <p className="text-sm text-carbon-200">
                Bienvenido, <span className="font-semibold text-white">Alexis Mendoza</span>
              </p>
              <p className="text-xs text-carbon-400">
                Redireccionando al panel de control vehicular...
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
