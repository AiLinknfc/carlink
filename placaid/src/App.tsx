/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wrench, 
  ShieldCheck, 
  Plus, 
  Menu, 
  Activity, 
  LogOut, 
  Layers, 
  Settings, 
  AlertCircle, 
  Calendar, 
  MapPin,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Award,
  Car,
  ShoppingBag,
  SlidersHorizontal,
  Store
} from 'lucide-react';

import { 
  VehiclePlate, 
  MaintenanceCard, 
  ShopDetails, 
  DocumentItem, 
  UserSession,
  UserVehicle
} from './types';

import { 
  INITIAL_PLATE, 
  INITIAL_MAINTENANCE, 
  INITIAL_SHOP, 
  INITIAL_DOCUMENTS, 
  AVAILABLE_CITIES 
} from './initialData';

// Subcomponents
import InteractivePlate from './components/InteractivePlate';
import GoogleLoginSimulated from './components/GoogleLoginSimulated';
import MaintenanceCardComp from './components/MaintenanceCardComp';
import ShopInfo from './components/ShopInfo';
import LateralDrawer from './components/LateralDrawer';
import CarBrandRegistration from './components/CarBrandRegistration';
import ShopConfigurator from './components/ShopConfigurator';
import NfcCartStore from './components/NfcCartStore';
import TechnicalControlWallet from './components/TechnicalControlWallet';
import PolicyDocsModal from './components/PolicyDocsModal';

export default function App() {
  // Navigation states
  const [currentStep, setCurrentStep] = useState<'plate-config' | 'login' | 'dashboard'>('plate-config');
  const [slideDirection, setSlideDirection] = useState<number>(1); // 1 = forward, -1 = backward
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [policyModalOpen, setPolicyModalOpen] = useState(false);
  const [policyActiveTab, setPolicyActiveTab] = useState<'warranty' | 'privacy' | 'support'>('privacy');

  // Application data states with LocalStorage persistence
  const [plate, setPlate] = useState<VehiclePlate>(() => {
    const saved = localStorage.getItem('placaid_plate');
    return saved ? JSON.parse(saved) : INITIAL_PLATE;
  });

  const [maintenance, setMaintenance] = useState<MaintenanceCard>(() => {
    const saved = localStorage.getItem('placaid_maintenance');
    return saved ? JSON.parse(saved) : INITIAL_MAINTENANCE;
  });

  const [shop, setShop] = useState<ShopDetails>(() => {
    const saved = localStorage.getItem('placaid_shop');
    return saved ? JSON.parse(saved) : INITIAL_SHOP;
  });

  const [documents, setDocuments] = useState<DocumentItem[]>(() => {
    const saved = localStorage.getItem('placaid_documents');
    return saved ? JSON.parse(saved) : INITIAL_DOCUMENTS;
  });

  const [session, setSession] = useState<UserSession | null>(() => {
    const saved = localStorage.getItem('placaid_session');
    return saved ? JSON.parse(saved) : null;
  });

  const [vehicle, setVehicle] = useState<UserVehicle | null>(() => {
    const saved = localStorage.getItem('placaid_vehicle');
    return saved ? JSON.parse(saved) : null;
  });

  // Active dashboard sub tab
  const [activeSubTab, setActiveSubTab] = useState<'expediente' | 'vehicle' | 'shop-config' | 'store'>('expediente');

  // Local validation and inputs
  const [inputPlateNumber, setInputPlateNumber] = useState(plate.plateNumber);
  const [selectedCity, setSelectedCity] = useState(plate.city);
  const [plateError, setPlateError] = useState('');

  // Save states to LocalStorage on changes
  useEffect(() => {
    localStorage.setItem('placaid_plate', JSON.stringify(plate));
  }, [plate]);

  useEffect(() => {
    localStorage.setItem('placaid_maintenance', JSON.stringify(maintenance));
  }, [maintenance]);

  useEffect(() => {
    localStorage.setItem('placaid_shop', JSON.stringify(shop));
  }, [shop]);

  useEffect(() => {
    localStorage.setItem('placaid_documents', JSON.stringify(documents));
  }, [documents]);

  useEffect(() => {
    if (session) {
      localStorage.setItem('placaid_session', JSON.stringify(session));
    } else {
      localStorage.removeItem('placaid_session');
    }
  }, [session]);

  useEffect(() => {
    if (vehicle) {
      localStorage.setItem('placaid_vehicle', JSON.stringify(vehicle));
    } else {
      localStorage.removeItem('placaid_vehicle');
    }
  }, [vehicle]);

  // Navigate helper with slider direction settings
  const navigateTo = (step: 'plate-config' | 'login' | 'dashboard', direction: number) => {
    setSlideDirection(direction);
    setCurrentStep(step);
  };

  // Step 1 validation
  const handleProceedToLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clean and validate plate format (simple regex, eg. 3 letters, 3 numbers or similar custom alphanumeric)
    const cleaned = inputPlateNumber.trim().toUpperCase();
    if (!cleaned) {
      setPlateError('Por favor ingresa un número de placa válido.');
      return;
    }
    if (cleaned.length < 3) {
      setPlateError('La placa debe tener mínimo 3 caracteres.');
      return;
    }

    setPlateError('');
    // Update master plate state
    const updatedPlate = {
      ...plate,
      plateNumber: cleaned,
      city: selectedCity.toUpperCase()
    };
    setPlate(updatedPlate);
    
    // Smooth lateral transition forward
    navigateTo('login', 1);
  };

  const handleLoginSuccess = (newSession: UserSession) => {
    setSession(newSession);
    // Smooth lateral transition forward to main dashboard
    navigateTo('dashboard', 1);
  };

  const handleLogout = () => {
    setSession(null);
    navigateTo('plate-config', -1);
  };

  // Document controls
  const handleAddDocument = (newDoc: DocumentItem) => {
    setDocuments(prev => [newDoc, ...prev]);
  };

  const handleDeleteDocument = (id: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== id));
  };

  // Update maintenance card callback
  const handleUpdateMaintenance = (updated: MaintenanceCard) => {
    setMaintenance(updated);
  };

  // Parallax / sliding animation profiles for views
  const pageVariants = {
    initial: (dir: number) => ({
      x: dir > 0 ? '100vw' : '-100vw',
      opacity: 0
    }),
    animate: {
      x: 0,
      opacity: 1,
      transition: { type: 'spring', damping: 26, stiffness: 120 }
    },
    exit: (dir: number) => ({
      x: dir > 0 ? '-100vw' : '100vw',
      opacity: 0,
      transition: { type: 'spring', damping: 26, stiffness: 120 }
    })
  };

  // Parallax delayed text animation variants (slides opposite or staggered)
  const textVariants = {
    initial: (dir: number) => ({
      x: dir > 0 ? 120 : -120,
      opacity: 0
    }),
    animate: {
      x: 0,
      opacity: 1,
      transition: { delay: 0.15, type: 'spring', damping: 22, stiffness: 100 }
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -120 : 120,
      opacity: 0,
      transition: { type: 'spring', damping: 22, stiffness: 100 }
    })
  };

  return (
    <div className="min-h-screen relative bg-carbon-950 flex flex-col md:flex-row overflow-x-hidden" id="app-viewport">
      {/* Dynamic Grid Atmospheric Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_70%,transparent_100%)] pointer-events-none z-0" />
      
      {/* Decorative colored glow orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-brand-cyan/5 rounded-full filter blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-brand-lime/3.5 rounded-full filter blur-[120px] pointer-events-none z-0" />

      {/* Lateral Navigation Rail */}
      <nav className="w-full md:w-[80px] border-b md:border-b-0 md:border-r border-white/10 flex flex-row md:flex-col justify-between items-center px-6 py-4 md:px-0 md:py-10 bg-[#15181E] z-50 md:sticky md:top-0 md:h-screen flex-shrink-0">
        <div className="flex flex-row md:flex-col gap-6 md:gap-12 items-center">
          <div className="w-9 h-9 border-2 border-brand-cyan rotate-45 flex items-center justify-center transition-transform hover:scale-115 duration-300">
            <div className="w-3.5 h-3.5 bg-brand-cyan"></div>
          </div>
          <div className="hidden md:flex [writing-mode:vertical-rl] rotate-180 gap-10 text-[10px] uppercase tracking-[0.4em] font-bold text-white/40">
            <button 
              onClick={() => navigateTo('plate-config', -1)} 
              className={`hover:text-brand-cyan transition-colors cursor-pointer text-left outline-none ${currentStep === 'plate-config' ? 'text-brand-cyan' : ''}`}
            >
              Configurador
            </button>
            <button 
              onClick={() => navigateTo('login', currentStep === 'plate-config' ? 1 : -1)} 
              className={`hover:text-brand-cyan transition-colors cursor-pointer text-left outline-none ${currentStep === 'login' ? 'text-brand-cyan' : ''}`}
            >
              Acceso
            </button>
            <button 
              onClick={() => {
                if (session) {
                  navigateTo('dashboard', 1);
                } else {
                  navigateTo('login', 1);
                }
              }} 
              className={`hover:text-brand-cyan transition-colors cursor-pointer text-left outline-none ${currentStep === 'dashboard' ? 'text-brand-cyan' : ''}`}
            >
              Expediente
            </button>
          </div>
        </div>
        <div className="flex flex-row md:flex-col gap-3 md:gap-6 items-center">
          <div className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${currentStep === 'plate-config' ? 'bg-brand-cyan shadow-[0_0_12px_#FFD700] scale-125' : 'bg-white/20'}`}></div>
          <div className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${currentStep === 'login' ? 'bg-brand-cyan shadow-[0_0_12px_#FFD700] scale-125' : 'bg-white/20'}`}></div>
          <div className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${currentStep === 'dashboard' ? 'bg-brand-cyan shadow-[0_0_12px_#FFD700] scale-125' : 'bg-white/20'}`}></div>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 z-10 relative">
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 py-8 flex flex-col justify-center relative z-10">
        
        <AnimatePresence mode="wait" custom={slideDirection}>
          {/* ================= STEP 1: LICENSE PLATE CONFIGURATOR ================= */}
          {currentStep === 'plate-config' && (
            <motion.div
              key="step-plate-config"
              custom={slideDirection}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center"
              id="view-plate-config"
            >
              {/* Left Column - Typography & Explanation */}
              <div className="lg:col-span-5 flex flex-col gap-6 text-left">
                <motion.div 
                  custom={slideDirection} 
                  variants={textVariants}
                  className="flex flex-col gap-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 text-[10px] font-mono font-bold tracking-widest text-brand-lime bg-brand-lime/10 border border-brand-lime/20 rounded-full uppercase">
                      Lanzamiento SaaS v1.0
                    </span>
                    <span className="w-2 h-2 rounded-full bg-brand-cyan animate-pulse" />
                  </div>
                  
                  <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-none font-sans">
                    Certifica tu Mantenimiento con <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-cyan via-white to-brand-lime">PlacaID</span>
                  </h1>
                  
                  <p className="text-base text-carbon-400 mt-2 leading-relaxed">
                    Personaliza la placa de tu vehículo y accede al pasaporte digital de mantenimiento técnico. Mantén al día kilometrajes, filtros, fluidos y la garantía del taller que te atendió, todo en un único ecosistema interactivo y seguro.
                  </p>
                </motion.div>

                {/* Interactive Configurator inputs Form */}
                <motion.form 
                  onSubmit={handleProceedToLogin}
                  custom={slideDirection}
                  variants={textVariants}
                  className="glass-panel p-6 rounded-3xl border border-carbon-800 shadow-xl flex flex-col gap-4"
                >
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-carbon-400 uppercase tracking-wider">Número de Placa</label>
                    <input
                      type="text"
                      required
                      placeholder="ABC-123"
                      value={inputPlateNumber}
                      onChange={(e) => {
                        setInputPlateNumber(e.target.value);
                        setPlate({ ...plate, plateNumber: e.target.value.toUpperCase() });
                      }}
                      className="w-full px-4 py-3 bg-carbon-950 border border-carbon-800 rounded-xl text-lg font-mono font-black text-white tracking-widest uppercase focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan/20 focus:outline-none transition-colors"
                    />
                    {plateError && <span className="text-xs font-semibold text-rose-500 mt-0.5">{plateError}</span>}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-carbon-400 uppercase tracking-wider">Ciudad de Expedición</label>
                    <select
                      value={selectedCity}
                      onChange={(e) => {
                        setSelectedCity(e.target.value);
                        setPlate({ ...plate, city: e.target.value.toUpperCase() });
                      }}
                      className="w-full px-4 py-3 bg-carbon-950 border border-carbon-800 rounded-xl text-sm text-white focus:border-brand-cyan focus:outline-none transition-colors"
                    >
                      {AVAILABLE_CITIES.map((city) => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full relative group overflow-hidden bg-gradient-to-r from-brand-cyan to-brand-lime text-black font-extrabold py-3.5 px-6 rounded-xl hover:shadow-[0_0_25px_rgba(204,255,0,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                  >
                    <span>Configurar y Continuar</span>
                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </motion.form>

                {/* Trust anchors */}
                <motion.div 
                  custom={slideDirection}
                  variants={textVariants}
                  className="flex gap-4 items-center"
                >
                  <div className="flex -space-x-2">
                    <img className="w-8 h-8 rounded-full border border-carbon-950 object-cover" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=100&auto=format&fit=crop" />
                    <img className="w-8 h-8 rounded-full border border-carbon-950 object-cover" src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=100&auto=format&fit=crop" />
                    <img className="w-8 h-8 rounded-full border border-carbon-950 object-cover" src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=100&auto=format&fit=crop" />
                  </div>
                  <div className="text-xs text-carbon-400">
                    <span className="text-white font-bold block">1,850+ conductores certificados</span>
                    en México, Colombia y España.
                  </div>
                </motion.div>
              </div>

              {/* Right Column - Beautiful Real-Time Interactive Plate Viewer */}
              <div className="lg:col-span-7 flex flex-col justify-center items-center">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring' }}
                  className="w-full flex justify-center"
                >
                  <InteractivePlate 
                    plate={plate} 
                    onChange={(updated) => setPlate(updated)} 
                    interactive={true} 
                  />
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* ================= STEP 2: SIMULATED GOOGLE LOGIN ================= */}
          {currentStep === 'login' && (
            <motion.div
              key="step-login"
              custom={slideDirection}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="flex flex-col items-center justify-center py-10"
              id="view-login"
            >
              <div className="w-full max-w-lg mb-8 flex justify-start">
                <button
                  onClick={() => navigateTo('plate-config', -1)}
                  className="px-4 py-2 rounded-xl bg-carbon-900 hover:bg-carbon-800 border border-carbon-800 text-xs font-bold text-carbon-300 hover:text-white transition-colors cursor-pointer flex items-center gap-2 active:scale-95"
                >
                  Volver al Configurador
                </button>
              </div>

              <GoogleLoginSimulated 
                onLoginSuccess={handleLoginSuccess} 
                plateNumber={plate.plateNumber} 
                onOpenPolicy={(tab) => {
                  setPolicyActiveTab(tab);
                  setPolicyModalOpen(true);
                }}
              />
            </motion.div>
          )}

          {/* ================= STEP 3: SAAS DASHBOARD (MAINTENANCE AND WORKSHOP INFO) ================= */}
          {currentStep === 'dashboard' && (
            <motion.div
              key="step-dashboard"
              custom={slideDirection}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="flex flex-col gap-8"
              id="view-dashboard"
            >
              {/* Dashboard Nav bar header */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-carbon-900/60 p-4 rounded-3xl border border-carbon-800">
                <div className="flex items-center gap-4">
                  {/* Dynamic mini-plate indicator */}
                  <div className="px-3.5 py-1.5 bg-black border-2 border-brand-lime rounded-xl flex flex-col items-center shadow-inner select-none">
                    <span className="text-[9px] font-mono font-extrabold text-brand-lime tracking-widest">{plate.plateNumber}</span>
                    <span className="text-[7px] text-carbon-400 font-bold tracking-widest uppercase">{plate.city}</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-white leading-tight">Control Panel Vehicular</h2>
                    <p className="text-xs text-carbon-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm" />
                      Sesión activa: {session?.email}
                    </p>
                  </div>
                </div>

                {/* Actions & Avatar */}
                <div className="flex items-center gap-3.5 w-full md:w-auto justify-between md:justify-end">
                  {/* Clickable Profile Badge with tooltip/label */}
                  <div 
                    onClick={() => setDrawerOpen(true)}
                    className="flex items-center gap-2.5 bg-carbon-950/80 hover:bg-carbon-900 border border-carbon-800 px-3 py-1.5 rounded-2xl cursor-pointer hover:scale-102 active:scale-98 transition-all group shadow-md"
                    title="Ver Perfil y Expediente"
                  >
                    <div className="text-right hidden sm:block">
                      <span className="text-[9px] font-mono font-bold text-brand-lime uppercase tracking-widest block">Ver Perfil</span>
                      <span className="text-xs font-black text-white leading-none block mt-0.5 group-hover:text-brand-cyan transition-colors">
                        {session?.name || 'Propietario'}
                      </span>
                    </div>

                    <div className="relative">
                      <img 
                        src={session?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150'} 
                        alt={session?.name} 
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-xl border-2 border-brand-cyan object-cover shadow-md group-hover:border-brand-lime transition-colors"
                      />
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-brand-lime border-2 border-carbon-950" />
                    </div>
                  </div>

                  {/* Logout Button */}
                  <button
                    onClick={handleLogout}
                    className="p-3 rounded-2xl bg-carbon-900/60 hover:bg-red-950/20 hover:border-red-500/20 border border-carbon-800 text-carbon-400 hover:text-red-400 transition-all cursor-pointer"
                    title="Cerrar Sesión"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Premium Dashboard Sub-Tabs */}
              <div className="flex flex-wrap gap-2 border-b border-carbon-800 pb-4 overflow-x-auto scrollbar-none" id="dashboard-subtabs">
                <button
                  onClick={() => setActiveSubTab('expediente')}
                  className={`px-5 py-3 rounded-2xl text-xs font-black tracking-wide transition-all cursor-pointer flex items-center gap-2 border ${
                    activeSubTab === 'expediente'
                      ? 'bg-brand-lime text-black border-brand-lime shadow-[0_0_15px_rgba(204,255,0,0.2)]'
                      : 'bg-[#15181E] text-carbon-400 border-carbon-800 hover:text-white hover:border-carbon-700'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span>Expediente de Mantenimiento</span>
                </button>

                <button
                  onClick={() => setActiveSubTab('vehicle')}
                  className={`px-5 py-3 rounded-2xl text-xs font-black tracking-wide transition-all cursor-pointer flex items-center gap-2 border ${
                    activeSubTab === 'vehicle'
                      ? 'bg-brand-lime text-black border-brand-lime shadow-[0_0_15px_rgba(204,255,0,0.2)]'
                      : 'bg-[#15181E] text-carbon-400 border-carbon-800 hover:text-white hover:border-carbon-700'
                  }`}
                >
                  <Car className="w-4 h-4" />
                  <span>Registro de Carro</span>
                  {vehicle && (
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-cyan animate-pulse" />
                  )}
                </button>

                <button
                  onClick={() => setActiveSubTab('shop-config')}
                  className={`px-5 py-3 rounded-2xl text-xs font-black tracking-wide transition-all cursor-pointer flex items-center gap-2 border ${
                    activeSubTab === 'shop-config'
                      ? 'bg-brand-lime text-black border-brand-lime shadow-[0_0_15px_rgba(204,255,0,0.2)]'
                      : 'bg-[#15181E] text-carbon-400 border-carbon-800 hover:text-white hover:border-carbon-700'
                  }`}
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  <span>Configurar Redes & Taller</span>
                </button>

                <button
                  onClick={() => setActiveSubTab('store')}
                  className={`px-5 py-3 rounded-2xl text-xs font-black tracking-wide transition-all cursor-pointer flex items-center gap-2 border relative ${
                    activeSubTab === 'store'
                      ? 'bg-brand-lime text-black border-brand-lime shadow-[0_0_15px_rgba(204,255,0,0.2)]'
                      : 'bg-[#15181E] text-carbon-400 border-carbon-800 hover:text-white hover:border-carbon-700'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Carrito de Compras NFC</span>
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-brand-cyan text-black font-black text-[8px] rounded-full animate-bounce">
                    NUEVO
                  </span>
                </button>
              </div>

              {/* Conditional rendering of Sub-Tabs content */}
              <div className="w-full">
                {activeSubTab === 'expediente' && (
                  <div className="flex flex-col gap-8">
                    {/* Grid with 2 primary functional components */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                      {/* Visual Section A: Maintenance Certificate Card */}
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-2 px-1">
                          <Wrench className="w-5 h-5 text-brand-lime" />
                          <h3 className="text-base font-black text-white uppercase tracking-wider">Ficha de Mantenimiento Activa</h3>
                        </div>
                        <MaintenanceCardComp 
                          maintenance={maintenance} 
                          plate={plate} 
                          onUpdate={handleUpdateMaintenance} 
                        />
                      </div>

                      {/* Visual Section B: Workshop details */}
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-2 px-1">
                          <Award className="w-5 h-5 text-brand-cyan" />
                          <h3 className="text-base font-black text-white uppercase tracking-wider">Centro Técnico Proveedor</h3>
                        </div>
                        <ShopInfo shop={shop} />
                      </div>
                    </div>

                    {/* Technical Control Wallet Pass */}
                    <div className="border-t border-carbon-900/60 pt-8 mt-4">
                      <TechnicalControlWallet 
                        plate={plate} 
                        vehicle={vehicle} 
                        shopName={shop.name} 
                      />
                    </div>

                    {/* Dynamic summary footer panel */}
                    <div className="bg-carbon-900/20 border border-carbon-800 rounded-3xl p-6 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-carbon-500 uppercase tracking-widest">ESTADO GENERAL DE PLACA</span>
                        <div className="text-sm font-bold text-white flex items-center gap-2 mt-1">
                          <ShieldCheck className="w-4.5 h-4.5 text-brand-lime" />
                          <span>PlacaID Encriptada con Éxito</span>
                        </div>
                        <span className="text-xs text-carbon-400">Firmado por {shop.name}</span>
                      </div>

                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-carbon-500 uppercase tracking-widest">ÚLTIMA FIRMA DIGITAL</span>
                        <div className="text-sm font-bold text-white flex items-center gap-2 mt-1">
                          <Calendar className="w-4.5 h-4.5 text-brand-cyan" />
                          <span>{new Date(maintenance.serviceDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </div>
                        <span className="text-xs text-carbon-400">Actualizado hace unos momentos</span>
                      </div>

                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-carbon-500 uppercase tracking-widest">EXPEDIENTE DIGITAL</span>
                        <div className="text-sm font-bold text-white flex items-center gap-2 mt-1">
                          <Layers className="w-4.5 h-4.5 text-brand-lime" />
                          <span>{documents.length} Archivos Adjuntos</span>
                        </div>
                        <span className="text-xs text-brand-cyan cursor-pointer hover:underline" onClick={() => setDrawerOpen(true)}>Gestionar fotos y recibos →</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeSubTab === 'vehicle' && (
                  <CarBrandRegistration vehicle={vehicle} onRegister={(v) => setVehicle(v)} />
                )}

                {activeSubTab === 'shop-config' && (
                  <ShopConfigurator shop={shop} onUpdate={(updated) => setShop(updated)} />
                )}

                {activeSubTab === 'store' && (
                  <NfcCartStore plateNumber={plate.plateNumber} carBrand={vehicle?.brand || ''} />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </main>

      {/* ================= LATERAL DRAWER SYSTEM ================= */}
      <LateralDrawer 
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        documents={documents}
        onAddDocument={handleAddDocument}
        onDeleteDocument={handleDeleteDocument}
        maintenance={maintenance}
        session={session}
        vehicle={vehicle}
        plateNumber={plate.plateNumber}
      />

      {/* Footer bar */}
      <footer className="w-full border-t border-carbon-900 py-6 text-center text-xs text-carbon-500 mt-12 relative z-10 bg-carbon-950/80">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-brand-cyan/10 flex items-center justify-center font-mono font-black text-xs text-brand-cyan border border-brand-cyan/20">
              P
            </div>
            <span className="font-bold text-white">PlacaID Platform</span>
            <span className="text-carbon-600">|</span>
            <span>Estética automotriz y control técnico inteligente.</span>
          </div>
          
          <div className="flex gap-4">
            <span 
              onClick={() => { setPolicyActiveTab('warranty'); setPolicyModalOpen(true); }}
              className="hover:text-brand-cyan hover:underline cursor-pointer transition-all"
            >
              Términos de Garantía
            </span>
            <span 
              onClick={() => { setPolicyActiveTab('privacy'); setPolicyModalOpen(true); }}
              className="hover:text-brand-cyan hover:underline cursor-pointer transition-all"
            >
              Privacidad de Datos
            </span>
            <span 
              onClick={() => { setPolicyActiveTab('support'); setPolicyModalOpen(true); }}
              className="hover:text-brand-cyan hover:underline cursor-pointer transition-all flex items-center gap-1"
            >
              <span>Soporte Técnico</span>
              <ExternalLink className="w-3 h-3 text-brand-cyan" />
            </span>
          </div>
        </div>
      </footer>

      {/* ================= POLICY & LEGAL DOCS MODAL ================= */}
      <PolicyDocsModal 
        isOpen={policyModalOpen}
        onClose={() => setPolicyModalOpen(false)}
        defaultTab={policyActiveTab}
        plate={plate}
        session={session}
      />
      </div>
    </div>
  );
}
