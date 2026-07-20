/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, 
  RotateCw, 
  Wrench, 
  Check, 
  Sparkles, 
  Activity, 
  Coins, 
  SlidersHorizontal,
  Flame,
  CheckSquare,
  Square
} from 'lucide-react';
import { MaintenanceCard, VehiclePlate } from '../types';
import { LUBRICANT_BRANDS, LUBRICANT_TYPES } from '../initialData';

interface MaintenanceCardCompProps {
  maintenance: MaintenanceCard;
  plate: VehiclePlate;
  onUpdate: (updated: MaintenanceCard) => void;
}

export default function MaintenanceCardComp({ maintenance, plate, onUpdate }: MaintenanceCardCompProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Local edit states
  const [currentMileage, setCurrentMileage] = useState(maintenance.currentMileage);
  const [nextMileage, setNextMileage] = useState(maintenance.nextServiceMileage);
  const [lubricantType, setLubricantType] = useState(maintenance.lubricantType);
  const [lubricantBrand, setLubricantBrand] = useState(maintenance.lubricantBrand);
  const [serviceDate, setServiceDate] = useState(maintenance.serviceDate);
  const [filters, setFilters] = useState({ ...maintenance.filtersReplaced });

  const handleToggleFilter = (key: keyof typeof filters) => {
    setFilters(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      onUpdate({
        currentMileage: Number(currentMileage),
        nextServiceMileage: Number(nextMileage),
        lubricantType,
        lubricantBrand,
        serviceDate,
        filtersReplaced: filters
      });
      setIsSaving(false);
      setIsFlipped(false); // Flip back to show gorgeous updated certificate!
    }, 1200);
  };

  const getMileageProgress = () => {
    const total = nextMileage - currentMileage;
    if (total <= 0) return 100;
    
    // Assume standard 5000km or 10000km intervals
    const interval = nextMileage - (maintenance.currentMileage - 3000); // offset
    const progress = Math.max(0, Math.min(100, ((currentMileage - (nextMileage - 5000)) / 5000) * 100));
    return isNaN(progress) ? 50 : progress;
  };

  const getMileageWarning = () => {
    const diff = nextMileage - currentMileage;
    if (diff <= 500) {
      return { text: '¡ALERTA CRÍTICA: Servicio Excedido o Inminente!', color: 'text-rose-500 bg-rose-500/10 border-rose-500/30' };
    }
    if (diff <= 1500) {
      return { text: 'Mantenimiento preventivo requerido pronto', color: 'text-brand-amber bg-brand-amber/10 border-brand-amber/30' };
    }
    return { text: 'Rendimiento de motor óptimo y certificado', color: 'text-brand-lime bg-brand-lime/10 border-brand-lime/30' };
  };

  const activeWarning = getMileageWarning();

  return (
    <div className="w-full max-w-xl mx-auto perspective-1000 py-4" id="maintenance-perspective-container">
      <motion.div
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 15 }}
        className="relative w-full h-[540px] transform-style-3d cursor-default"
        id="maintenance-3d-card"
      >
        {/* ==================== CARD FRONT (CERTIFICATE VIEW) ==================== */}
        <div className={`absolute inset-0 w-full h-full backface-hidden glass-panel rounded-3xl p-6 border border-carbon-700/80 shadow-2xl flex flex-col justify-between overflow-hidden`}>
          {/* Subtle decorative circuit traces */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-brand-cyan/5 via-transparent to-transparent rounded-bl-full pointer-events-none" />
          
          {/* Header */}
          <div className="flex justify-between items-start border-b border-carbon-800 pb-4">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-2 h-2 rounded-full bg-brand-cyan animate-pulse" />
                <span className="text-[10px] font-mono font-bold tracking-widest text-brand-cyan uppercase">EXPEDIENTE CERTIFICADO</span>
              </div>
              <h2 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
                Ficha Técnica de Control
              </h2>
            </div>
            
            {/* Stamp Plate Number on the Certificate */}
            <div className="px-3.5 py-1.5 bg-carbon-900 border border-brand-lime/30 rounded-xl flex items-center gap-1.5 shadow-inner">
              <span className="text-xs text-carbon-400 font-bold uppercase tracking-wider">PLACA:</span>
              <span className="text-sm font-black font-mono text-brand-lime tracking-widest">{plate.plateNumber}</span>
            </div>
          </div>

          {/* Core Body - Gauges and Statuses */}
          <div className="my-5 flex flex-col gap-5">
            {/* Mileage Section with Progress Arc */}
            <div className="bg-carbon-900/60 rounded-2xl p-5 border border-carbon-800 flex flex-col gap-4">
              <div className="flex justify-between items-end">
                <div>
                  <span className="text-xs text-carbon-400 font-bold tracking-wider uppercase">Kilometraje Actual</span>
                  <div className="text-3xl font-black font-mono text-white tracking-wide mt-1 flex items-baseline gap-1">
                    {maintenance.currentMileage.toLocaleString()}
                    <span className="text-xs font-semibold text-carbon-500">KM</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs text-carbon-400 font-bold tracking-wider uppercase">Próximo Servicio</span>
                  <div className="text-xl font-bold font-mono text-brand-cyan tracking-wide mt-1 flex items-baseline justify-end gap-1">
                    {maintenance.nextServiceMileage.toLocaleString()}
                    <span className="text-xs font-semibold text-brand-cyan/70">KM</span>
                  </div>
                </div>
              </div>

              {/* Progress bar to next service */}
              <div className="flex flex-col gap-1.5">
                <div className="w-full h-2 bg-carbon-950 rounded-full overflow-hidden p-[1px] border border-carbon-800">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${getMileageProgress()}%` }}
                    transition={{ duration: 1 }}
                    className={`h-full rounded-full bg-gradient-to-r ${
                      getMileageProgress() > 85 ? 'from-amber-500 to-rose-500' : 'from-brand-cyan to-brand-lime'
                    }`} 
                  />
                </div>
                <div className="flex justify-between text-[10px] font-mono text-carbon-500">
                  <span>Mantenimiento previo</span>
                  <span className="text-brand-cyan">Faltan {(maintenance.nextServiceMileage - maintenance.currentMileage).toLocaleString()} KM</span>
                </div>
              </div>

              {/* Live Technical Diagnostic Stamping */}
              <div className={`px-3 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${activeWarning.color}`}>
                <Activity className="w-4 h-4 animate-pulse flex-shrink-0" />
                <span>{activeWarning.text}</span>
              </div>
            </div>

            {/* Lubricant Specs Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-carbon-900/40 rounded-xl p-4 border border-carbon-800 flex flex-col gap-1">
                <span className="text-[10px] font-bold text-carbon-400 uppercase tracking-wider">LUBRICANTE RECOMENDADO</span>
                <span className="text-base font-extrabold text-white">{maintenance.lubricantBrand}</span>
                <span className="text-xs font-mono text-brand-cyan font-semibold">{maintenance.lubricantType}</span>
              </div>

              <div className="bg-carbon-900/40 rounded-xl p-4 border border-carbon-800 flex flex-col gap-1">
                <span className="text-[10px] font-bold text-carbon-400 uppercase tracking-wider">ÚLTIMO REGISTRO</span>
                <span className="text-base font-extrabold text-white flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-brand-lime" />
                  {new Date(maintenance.serviceDate).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
                <span className="text-xs font-mono text-carbon-400">Fecha del servicio</span>
              </div>
            </div>

            {/* Replaced Components Grid */}
            <div className="bg-carbon-900/20 rounded-xl p-4 border border-carbon-800/80">
              <span className="text-[10px] font-bold text-carbon-400 uppercase tracking-wider block mb-2.5">FILTROS & COMPONENTES CERTIFICADOS</span>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(maintenance.filtersReplaced).map(([key, val]) => {
                  const labelMap: Record<string, string> = {
                    oil: 'Filtro Aceite',
                    air: 'Filtro Aire',
                    fuel: 'Filtro Comb.',
                    cabin: 'Filtro Habit.',
                    sparkPlugs: 'Bujías',
                    brakeFluid: 'Líq. Frenos'
                  };
                  return (
                    <div 
                      key={key} 
                      className={`py-1.5 px-2.5 rounded-lg border text-xs flex items-center gap-1.5 transition-colors ${
                        val 
                          ? 'bg-brand-lime/5 border-brand-lime/20 text-brand-lime font-bold' 
                          : 'bg-carbon-950/40 border-carbon-900 text-carbon-500'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${val ? 'bg-brand-lime shadow-[0_0_8px_#ccff00]' : 'bg-carbon-700'}`} />
                      <span className="truncate">{labelMap[key] || key}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer controls - Flip Trigger */}
          <div className="flex justify-between items-center border-t border-carbon-800 pt-4 mt-auto">
            <span className="text-xs font-mono text-carbon-500">APEX SECURE BLOCK ID: #78921-M</span>
            
            <button
              onClick={() => setIsFlipped(true)}
              className="py-2.5 px-5 rounded-xl bg-carbon-800 border border-carbon-700 hover:border-brand-cyan hover:text-brand-cyan text-sm font-bold tracking-wide transition-all cursor-pointer flex items-center gap-2 active:scale-95"
            >
              <RotateCw className="w-4 h-4" />
              <span>Actualizar Mantenimiento</span>
            </button>
          </div>
        </div>

        {/* ==================== CARD BACK (EDIT FORM VIEW) ==================== */}
        <div className={`absolute inset-0 w-full h-full backface-hidden rotate-y-180 glass-panel rounded-3xl p-6 border border-brand-cyan/20 shadow-2xl flex flex-col justify-between overflow-y-auto`}>
          
          {/* Back Header */}
          <div className="flex justify-between items-center border-b border-carbon-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand-cyan/10 border border-brand-cyan/30 flex items-center justify-center">
                <SlidersHorizontal className="w-4 h-4 text-brand-cyan" />
              </div>
              <h3 className="text-lg font-extrabold text-white">Editar Registro Técnico</h3>
            </div>

            <button
              onClick={() => setIsFlipped(false)}
              className="text-xs text-carbon-400 hover:text-white underline cursor-pointer"
            >
              Volver
            </button>
          </div>

          {/* Edit Form */}
          <div className="my-4 flex flex-col gap-4 overflow-y-auto max-h-[360px] pr-1">
            {/* Mileage inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-carbon-400 uppercase tracking-wider">KM Actual</label>
                <input
                  type="number"
                  value={currentMileage}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setCurrentMileage(val);
                    // auto calculate next service recommendation if empty or default
                    if (nextMileage <= val) {
                      setNextMileage(val + 5000);
                    }
                  }}
                  className="w-full px-3.5 py-2 bg-carbon-950 border border-carbon-800 rounded-xl text-sm text-white font-mono focus:border-brand-cyan focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-carbon-400 uppercase tracking-wider">KM Próximo Servicio</label>
                <input
                  type="number"
                  value={nextMileage}
                  onChange={(e) => setNextMileage(Number(e.target.value))}
                  className="w-full px-3.5 py-2 bg-carbon-950 border border-carbon-800 rounded-xl text-sm text-white font-mono focus:border-brand-cyan focus:outline-none"
                />
              </div>
            </div>

            {/* Lubricants selection */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-carbon-400 uppercase tracking-wider">Marca Lubricante</label>
                <select
                  value={lubricantBrand}
                  onChange={(e) => setLubricantBrand(e.target.value)}
                  className="w-full px-3 py-2 bg-carbon-950 border border-carbon-800 rounded-xl text-sm text-white focus:border-brand-cyan focus:outline-none"
                >
                  {LUBRICANT_BRANDS.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-carbon-400 uppercase tracking-wider">Tipo de Viscosidad</label>
                <select
                  value={lubricantType}
                  onChange={(e) => setLubricantType(e.target.value)}
                  className="w-full px-3 py-2 bg-carbon-950 border border-carbon-800 rounded-xl text-sm text-white focus:border-brand-cyan focus:outline-none"
                >
                  {LUBRICANT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Service Date */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-carbon-400 uppercase tracking-wider">Fecha del Mantenimiento</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar className="w-4 h-4 text-brand-cyan" />
                </div>
                <input
                  type="date"
                  value={serviceDate}
                  onChange={(e) => setServiceDate(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 bg-carbon-950 border border-carbon-800 rounded-xl text-sm text-white font-mono focus:border-brand-cyan focus:outline-none"
                />
              </div>
            </div>

            {/* Checkbox itemized grid */}
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-bold text-carbon-400 uppercase tracking-wider">Filtros & Líquidos Reemplazados</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(filters).map(([key, val]) => {
                  const labelMap: Record<string, string> = {
                    oil: 'Filtro de Aceite',
                    air: 'Filtro de Aire',
                    fuel: 'Filtro de Combustible',
                    cabin: 'Filtro de Habitáculo',
                    sparkPlugs: 'Bujías Nuevas',
                    brakeFluid: 'Líquido de Frenos'
                  };
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleToggleFilter(key as keyof typeof filters)}
                      className={`px-3 py-2 rounded-xl border text-left text-xs transition-all flex items-center justify-between cursor-pointer ${
                        val
                          ? 'bg-brand-cyan/5 border-brand-cyan text-brand-cyan font-bold'
                          : 'bg-carbon-950/60 border-carbon-800/80 text-carbon-400 hover:border-carbon-700'
                      }`}
                    >
                      <span>{labelMap[key] || key}</span>
                      {val ? (
                        <CheckSquare className="w-4 h-4 text-brand-cyan" />
                      ) : (
                        <Square className="w-4 h-4 text-carbon-700" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 border-t border-carbon-800 pt-4 mt-auto">
            <button
              onClick={() => setIsFlipped(false)}
              className="flex-1 py-3 px-4 bg-carbon-800 border border-carbon-700 rounded-xl text-sm text-white hover:bg-carbon-700 transition-colors cursor-pointer text-center font-bold"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 py-3 px-4 bg-brand-cyan hover:bg-brand-cyan/80 text-black rounded-xl text-sm font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-brand-cyan/20"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-black border-t-transparent animate-spin" />
                  <span>Sincronizando...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Guardar Cambios</span>
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
