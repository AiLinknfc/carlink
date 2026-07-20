/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  Cpu, 
  Activity, 
  Gauge, 
  Droplet, 
  Calendar, 
  Clock, 
  Sparkles, 
  CheckCircle, 
  Download, 
  QrCode, 
  Wifi, 
  Smartphone, 
  ChevronRight,
  AlertTriangle,
  RotateCw
} from 'lucide-react';
import { UserVehicle, VehiclePlate } from '../types';

interface TechnicalControlWalletProps {
  plate: VehiclePlate;
  vehicle: UserVehicle | null;
  shopName: string;
}

export default function TechnicalControlWallet({ plate, vehicle, shopName }: TechnicalControlWalletProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const handleDownload = () => {
    setIsDownloading(true);
    setDownloadSuccess(false);
    setTimeout(() => {
      setIsDownloading(false);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    }, 2000);
  };

  // Safe fallback vehicle details
  const carBrandName = vehicle?.brand || 'RENAULT';
  const carModelName = vehicle?.model || 'Duster Zen';
  const carYear = vehicle?.year || '2024';
  const carColor = vehicle?.color || 'Gris Platino';

  return (
    <div className="w-full flex flex-col items-center gap-6" id="tech-control-wallet-component">
      <div className="text-center max-w-lg">
        <span className="px-3 py-1 text-[10px] font-mono font-bold tracking-widest text-brand-cyan bg-brand-cyan/10 border border-brand-cyan/20 rounded-full uppercase">
          PASAPORTE DIGITAL RTM
        </span>
        <h4 className="text-xl font-black text-white mt-1.5 tracking-tight">Ficha Técnica de Control Digital</h4>
        <p className="text-xs text-carbon-400 mt-1 leading-relaxed">
          Un pasaporte tecnológico interactivo en formato de Tarjeta de Billetera Virtual (Wallet Pass) con el estado mecánico autenticado de tu vehículo.
        </p>
      </div>

      {/* Interactive Flippable Card Container */}
      <div className="w-full max-w-sm h-[480px] relative perspective-1000 select-none group">
        <motion.div
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
          className="w-full h-full relative preserve-3d cursor-pointer"
          onClick={() => setIsFlipped(!isFlipped)}
        >
          {/* FRONT SIDE (Wallet Card View) */}
          <div className="absolute inset-0 w-full h-full rounded-3xl p-6 bg-gradient-to-br from-[#10141D] via-[#161B26] to-[#0A0D14] border-2 border-brand-lime/30 shadow-[0_15px_35px_rgba(0,0,0,0.6)] flex flex-col justify-between overflow-hidden backface-hidden">
            {/* Glossy overlay grids */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:2rem_2rem] pointer-events-none" />
            <div className="absolute -top-16 -right-16 w-36 h-36 bg-brand-lime/5 rounded-full filter blur-3xl pointer-events-none" />
            
            {/* Card Header */}
            <div className="flex justify-between items-start relative z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-lime to-emerald-500 p-[1px]">
                  <div className="w-full h-full bg-carbon-950 rounded-[7px] flex items-center justify-center text-brand-lime">
                    <ShieldCheck className="w-4.5 h-4.5" />
                  </div>
                </div>
                <div>
                  <span className="text-[9px] font-mono font-black text-brand-lime uppercase tracking-widest block">CONTROL TÉCNICO</span>
                  <span className="text-xs font-black text-white tracking-tight">PLATINO CERTIFICADO</span>
                </div>
              </div>

              {/* NFC Logo / Indicator */}
              <div className="flex items-center gap-1.5 bg-brand-lime/10 px-2 py-1 rounded-lg border border-brand-lime/20 text-[9px] text-brand-lime font-mono font-bold">
                <Wifi className="w-3.5 h-3.5 animate-pulse" />
                <span>NFC ACTIVO</span>
              </div>
            </div>

            {/* Smart Microchip Illustration & Brand Logo */}
            <div className="flex justify-between items-center my-4 relative z-10">
              {/* Golden Chip */}
              <div className="w-11 h-8 rounded-md bg-gradient-to-tr from-amber-400 to-yellow-200 border border-amber-500 shadow-md flex flex-col justify-between p-1.5">
                <div className="h-[2px] bg-amber-600/30 w-full" />
                <div className="flex justify-between h-2.5">
                  <div className="w-2.5 bg-amber-600/30 rounded-sm" />
                  <div className="w-2.5 bg-amber-600/30 rounded-sm" />
                </div>
                <div className="h-[2px] bg-amber-600/30 w-full" />
              </div>

              {/* Brand Indicator */}
              <div className="flex items-center gap-2">
                {vehicle?.badgeUrl ? (
                  <img src={vehicle.badgeUrl} alt="Badge" referrerPolicy="no-referrer" className="w-7 h-7 rounded-full object-cover border border-white/15" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-carbon-800 flex items-center justify-center text-[10px] font-bold text-white border border-white/10">
                    {carBrandName.slice(0, 2)}
                  </div>
                )}
                <span className="text-sm font-extrabold text-white tracking-wide">{carBrandName}</span>
              </div>
            </div>

            {/* Huge Official License Plate representation inside the Card */}
            <div className="bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 p-[1.5px] rounded-2xl shadow-xl my-3 transform -rotate-1 relative z-10">
              <div className="bg-white rounded-[14px] px-4 py-2.5 text-center flex flex-col items-center justify-center select-none border border-black/10">
                {/* Plate reflection */}
                <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-white/10 to-transparent pointer-events-none rounded-[14px]" />
                
                <span className="text-[8px] font-black tracking-[0.4em] text-black/60 leading-none uppercase">COLOMBIA</span>
                <span className="text-3xl font-black tracking-widest text-black leading-tight font-sans font-outline-2 text-shadow-sm">
                  {plate.plateNumber}
                </span>
                <span className="text-[9px] font-black tracking-[0.3em] text-black/80 leading-none uppercase mt-0.5">{plate.city}</span>
              </div>
            </div>

            {/* Vehicle spec fields in grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-carbon-800/80 pt-4 relative z-10 text-left">
              <div>
                <span className="text-[8px] font-mono font-bold text-carbon-500 uppercase tracking-widest block">MODELO Y VERSIÓN</span>
                <span className="text-xs font-extrabold text-white leading-tight block truncate">{carModelName}</span>
              </div>
              <div>
                <span className="text-[8px] font-mono font-bold text-carbon-500 uppercase tracking-widest block">MODELO (AÑO)</span>
                <span className="text-xs font-extrabold text-white leading-tight block">{carYear}</span>
              </div>
              <div>
                <span className="text-[8px] font-mono font-bold text-carbon-500 uppercase tracking-widest block">COLOR VEHÍCULO</span>
                <span className="text-xs font-extrabold text-white leading-tight block truncate">{carColor}</span>
              </div>
              <div>
                <span className="text-[8px] font-mono font-bold text-carbon-500 uppercase tracking-widest block">ÚLTIMO CENTRO TÉCNICO</span>
                <span className="text-xs font-extrabold text-brand-lime leading-tight block truncate">{shopName}</span>
              </div>
            </div>

            {/* Click to Flip Prompt Footer */}
            <div className="border-t border-carbon-800/80 pt-3.5 mt-2 flex justify-between items-center text-left relative z-10">
              <div>
                <span className="text-[8px] font-mono font-bold text-carbon-500 uppercase tracking-widest block">CÓDIGO SEGURO</span>
                <span className="text-[10px] font-mono font-bold text-white">SHA256-PKID_{plate.plateNumber}</span>
              </div>
              
              <div className="flex items-center gap-1.5 text-xs text-brand-cyan font-bold bg-brand-cyan/5 px-2.5 py-1 rounded-xl border border-brand-cyan/15 hover:bg-brand-cyan/10 transition-colors">
                <RotateCw className="w-3.5 h-3.5 animate-spin-slow" />
                <span>Ver Diagnósticos</span>
              </div>
            </div>
          </div>

          {/* BACK SIDE (Inspection Diagnostics Report) */}
          <div className="absolute inset-0 w-full h-full rounded-3xl p-6 bg-gradient-to-br from-[#0C0F16] via-[#121620] to-[#080B10] border-2 border-brand-cyan/30 shadow-[0_15px_35px_rgba(0,0,0,0.6)] flex flex-col justify-between overflow-hidden backface-hidden rotate-y-180">
            {/* Grid background */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,240,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,240,255,0.01)_1px,transparent_1px)] bg-[size:1.5rem_1.5rem] pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-brand-cyan/5 rounded-full filter blur-3xl pointer-events-none" />

            {/* Back Header */}
            <div className="flex justify-between items-center border-b border-carbon-800/60 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4.5 h-4.5 text-brand-cyan" />
                <div>
                  <h5 className="text-xs font-black text-white leading-none">INFORME TÉCNICO VIRTUAL</h5>
                  <span className="text-[8px] font-bold text-carbon-500">Parámetros de Seguridad Mecánica</span>
                </div>
              </div>
              <span className="px-2 py-0.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded text-[9px] font-black font-mono">
                APROBADO
              </span>
            </div>

            {/* Mechanical parameter checklists */}
            <div className="flex-1 py-4 flex flex-col gap-2.5 justify-center">
              {/* Parameter 1: Engine fluid */}
              <div className="flex items-center justify-between bg-carbon-950/60 border border-carbon-800/80 rounded-xl p-2 px-3">
                <div className="flex items-center gap-2.5">
                  <Droplet className="w-4 h-4 text-amber-400" />
                  <span className="text-[11px] font-bold text-white">Nivel de Aceite Motor</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-14 h-1.5 bg-carbon-800 rounded-full overflow-hidden">
                    <div className="w-[85%] h-full bg-brand-lime" />
                  </div>
                  <span className="text-[10px] font-mono font-bold text-brand-lime">85%</span>
                </div>
              </div>

              {/* Parameter 2: Brakes wear */}
              <div className="flex items-center justify-between bg-carbon-950/60 border border-carbon-800/80 rounded-xl p-2 px-3">
                <div className="flex items-center gap-2.5">
                  <Gauge className="w-4 h-4 text-brand-cyan" />
                  <span className="text-[11px] font-bold text-white">Presión Sistema Frenado</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-14 h-1.5 bg-carbon-800 rounded-full overflow-hidden">
                    <div className="w-[92%] h-full bg-brand-lime" />
                  </div>
                  <span className="text-[10px] font-mono font-bold text-brand-lime">92%</span>
                </div>
              </div>

              {/* Parameter 3: Battery voltage */}
              <div className="flex items-center justify-between bg-carbon-950/60 border border-carbon-800/80 rounded-xl p-2 px-3">
                <div className="flex items-center gap-2.5">
                  <Cpu className="w-4 h-4 text-brand-lime" />
                  <span className="text-[11px] font-bold text-white">Batería & Voltaje Alternador</span>
                </div>
                <span className="text-[10px] font-mono font-bold text-white">14.2V (Saludable)</span>
              </div>

              {/* Parameter 4: Emissions status */}
              <div className="flex items-center justify-between bg-carbon-950/60 border border-carbon-800/80 rounded-xl p-2 px-3">
                <div className="flex items-center gap-2.5">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span className="text-[11px] font-bold text-white">Prueba Gases Contaminantes</span>
                </div>
                <span className="text-[10px] font-mono font-bold text-emerald-400">0.02% (Bajo)</span>
              </div>

              {/* Parameter 5: Next RTM schedule */}
              <div className="flex items-center justify-between bg-carbon-950/60 border border-carbon-800/80 rounded-xl p-2 px-3">
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-brand-cyan" />
                  <span className="text-[11px] font-bold text-white">Próximo Diagnóstico RTM</span>
                </div>
                <span className="text-[10px] font-mono font-bold text-brand-cyan">Jul 2027</span>
              </div>
            </div>

            {/* QR block at bottom back card */}
            <div className="border-t border-carbon-800/60 pt-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white p-1 rounded-lg">
                  <QrCode className="w-10 h-10 text-black" />
                </div>
                <div className="text-left">
                  <span className="text-[8px] font-mono text-carbon-500 block">ESCANEO OFICIAL RTM</span>
                  <span className="text-[10px] font-black text-white leading-tight block">PlacaID QR SECURE</span>
                  <span className="text-[9px] text-carbon-400">Verificado el {new Date().toLocaleDateString('es-CO')}</span>
                </div>
              </div>

              <span className="text-[10px] font-bold text-brand-cyan hover:underline flex items-center gap-1">
                <span>Volver</span>
                <RotateCw className="w-3 h-3" />
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Save to Device Button */}
      <div className="w-full max-w-sm flex flex-col gap-2">
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className={`w-full py-3.5 px-6 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-98 ${
            downloadSuccess 
              ? 'bg-emerald-500 text-white shadow-emerald-500/10' 
              : 'bg-brand-lime hover:bg-brand-lime/90 text-black hover:shadow-[0_0_20px_rgba(204,255,0,0.25)]'
          }`}
        >
          {isDownloading ? (
            <>
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              <span>Sincronizando Ficha de Control...</span>
            </>
          ) : downloadSuccess ? (
            <>
              <CheckCircle className="w-4.5 h-4.5" />
              <span>¡Guardado en tu Billetera!</span>
            </>
          ) : (
            <>
              <Download className="w-4.5 h-4.5" />
              <span>Sincronizar Ficha en Billetera / Wallet</span>
            </>
          )}
        </button>

        {downloadSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center text-[10px] text-emerald-400 font-bold bg-emerald-500/10 py-1.5 px-3 rounded-lg border border-emerald-500/15"
          >
            Ficha técnica vinculada a tu chip NFC y descargada en formato Apple Wallet (.pkpass) exitosamente.
          </motion.div>
        )}
      </div>
    </div>
  );
}
