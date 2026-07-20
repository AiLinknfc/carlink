/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { ShieldAlert, Sparkles, Sliders, CheckCircle } from 'lucide-react';
import { VehiclePlate } from '../types';

interface InteractivePlateProps {
  plate: VehiclePlate;
  onChange?: (updatedPlate: VehiclePlate) => void;
  interactive?: boolean;
}

export default function InteractivePlate({ plate, onChange, interactive = true }: InteractivePlateProps) {
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive || !cardRef.current) return;
    const card = cardRef.current;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left; //x position within the element.
    const y = e.clientY - rect.top;  //y position within the element.
    
    // Normalize to range -0.5 to 0.5
    const xc = x / rect.width - 0.5;
    const yc = y / rect.height - 0.5;
    
    // Rotate maximum 15 degrees
    setRotateX(-yc * 20);
    setRotateY(xc * 20);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
  };

  // Style configurations
  const getStyleClasses = () => {
    switch (plate.plateStyle) {
      case 'carbon':
        return {
          bg: 'bg-radial from-carbon-900 to-carbon-950 bg-cover bg-[radial-gradient(#262630_1px,transparent_1px)] [background-size:16px_16px]',
          border: 'border-2 border-carbon-600',
          text: 'text-white plate-embossed',
          headerText: 'text-carbon-400',
          sealColor: 'text-brand-lime',
          accentBorder: 'border-brand-lime/30',
          embossedText: 'font-mono text-5xl md:text-6xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-gray-100 via-white to-gray-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]'
        };
      case 'neon':
        return {
          bg: 'bg-black border-2 border-brand-cyan/80 shadow-[0_0_20px_rgba(0,240,255,0.2)]',
          border: 'border-brand-cyan/30',
          text: 'text-brand-cyan shadow-text-neon',
          headerText: 'text-brand-cyan/60 font-mono tracking-widest',
          sealColor: 'text-brand-cyan',
          accentBorder: 'border-brand-cyan/50',
          embossedText: 'font-mono text-5xl md:text-6xl font-extrabold tracking-widest text-brand-cyan drop-shadow-[0_0_10px_rgba(0,240,255,0.7)]'
        };
      case 'chrome':
        return {
          bg: 'bg-gradient-to-r from-gray-300 via-gray-100 to-gray-400 border-2 border-gray-400 shadow-inner',
          border: 'border-gray-500',
          text: 'text-slate-800 font-bold',
          headerText: 'text-slate-500 font-semibold',
          sealColor: 'text-amber-600',
          accentBorder: 'border-slate-400/40',
          embossedText: 'font-mono text-5xl md:text-6xl font-black tracking-widest text-slate-800 drop-shadow-[0_2px_2px_rgba(255,255,255,0.8)]'
        };
      case 'classic':
      default:
        return {
          bg: 'bg-gradient-to-b from-amber-400 to-amber-500 border-4 border-amber-600 shadow-md',
          border: 'border-amber-700/50',
          text: 'text-slate-900',
          headerText: 'text-amber-900/70 font-semibold',
          sealColor: 'text-amber-800',
          accentBorder: 'border-amber-800/30',
          embossedText: 'font-mono text-5xl md:text-6xl font-extrabold tracking-widest text-slate-900 drop-shadow-[1px_2px_1px_rgba(255,255,255,0.3)]'
        };
    }
  };

  const style = getStyleClasses();

  return (
    <div className="w-full flex flex-col items-center gap-6" id="interactive-plate-root">
      {/* 3D Tilting Plate Container */}
      <div 
        className="w-full max-w-lg perspective-1000 py-4"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <motion.div
          ref={cardRef}
          style={{
            rotateX: rotateX,
            rotateY: rotateY,
            transformStyle: "preserve-3d"
          }}
          transition={{ type: "spring", stiffness: 150, damping: 20 }}
          className={`relative h-44 md:h-52 w-full rounded-2xl p-6 flex flex-col justify-between overflow-hidden ${style.bg} ${plate.customFrame ? 'ring-8 ring-carbon-800/80 shadow-2xl' : ''}`}
          id="vehicle-plate-card"
        >
          {/* Metallic gloss reflection overlay */}
          <div className="absolute inset-0 metal-shimmer pointer-events-none opacity-40 z-10" />

          {/* Bolt Screws in the 4 corners to feel like a real plate */}
          <div className="absolute top-3 left-4 w-4 h-4 rounded-full bg-gradient-to-br from-gray-400 via-gray-100 to-gray-600 border border-black/30 shadow-md flex items-center justify-center">
            <div className="w-2 h-0.5 bg-gray-700/60 rotate-45" />
          </div>
          <div className="absolute top-3 right-4 w-4 h-4 rounded-full bg-gradient-to-br from-gray-400 via-gray-100 to-gray-600 border border-black/30 shadow-md flex items-center justify-center">
            <div className="w-2 h-0.5 bg-gray-700/60 -rotate-45" />
          </div>
          <div className="absolute bottom-3 left-4 w-4 h-4 rounded-full bg-gradient-to-br from-gray-400 via-gray-100 to-gray-600 border border-black/30 shadow-md flex items-center justify-center">
            <div className="w-2 h-0.5 bg-gray-700/60 -rotate-45" />
          </div>
          <div className="absolute bottom-3 right-4 w-4 h-4 rounded-full bg-gradient-to-br from-gray-400 via-gray-100 to-gray-600 border border-black/30 shadow-md flex items-center justify-center">
            <div className="w-2 h-0.5 bg-gray-700/60 rotate-45" />
          </div>

          {/* Border inner rim */}
          <div className={`absolute inset-2.5 rounded-xl border-2 pointer-events-none ${style.accentBorder} opacity-60`} />

          {/* Header - City / Country */}
          <div className="w-full flex justify-between items-center z-20">
            <span className={`text-[11px] md:text-xs font-bold tracking-widest font-mono uppercase ${style.headerText}`}>
              IDENTIDAD VEHICULAR
            </span>
            <div className="flex items-center gap-1">
              <span className={`text-[10px] md:text-[11px] font-mono tracking-wider opacity-80 ${style.headerText}`}>
                PLACA CERTIFICADA
              </span>
              <CheckCircle className={`w-3.5 h-3.5 ${style.sealColor}`} />
            </div>
          </div>

          {/* Plate Main Embossed Number */}
          <div className="flex justify-center items-center h-full my-1 z-20" style={{ transform: "translateZ(30px)" }}>
            <span className={style.embossedText}>
              {plate.plateNumber || '911-LUX'}
            </span>
          </div>

          {/* Footer - Expedition City */}
          <div className="w-full flex justify-between items-end z-20">
            <div className="flex items-center gap-1">
              <span className={`text-[9px] font-mono opacity-50 ${style.headerText}`}>VERIFIED SAAS</span>
            </div>
            
            <span className={`text-sm md:text-base font-extrabold tracking-widest uppercase text-center flex-1 ${style.text}`}>
              {plate.city || 'BOGOTÁ, D.C.'}
            </span>

            <div className="w-8 h-5 rounded bg-gradient-to-r from-yellow-400 via-blue-500 to-red-500 opacity-60 shadow-sm" />
          </div>
        </motion.div>
      </div>

      {/* Real-time Configurator Controls if interactive */}
      {interactive && onChange && (
        <div className="w-full glass-panel rounded-2xl p-6 border border-carbon-700 flex flex-col gap-4">
          <div className="flex items-center gap-2 mb-2">
            <Sliders className="w-5 h-5 text-brand-cyan" />
            <h3 className="text-base font-bold tracking-wider text-carbon-200">Personaliza la Ficha de tu Vehículo</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Style Selector */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-carbon-400 uppercase tracking-wider">Estilo de Placa</label>
              <div className="grid grid-cols-4 gap-2">
                {(['carbon', 'neon', 'chrome', 'classic'] as const).map((styleOpt) => (
                  <button
                    key={styleOpt}
                    type="button"
                    onClick={() => onChange({ ...plate, plateStyle: styleOpt })}
                    className={`px-2 py-2 rounded-lg text-xs font-semibold capitalize transition-all border ${
                      plate.plateStyle === styleOpt
                        ? 'bg-carbon-700 border-brand-cyan text-brand-cyan shadow-lg shadow-brand-cyan/10'
                        : 'bg-carbon-800/40 border-carbon-700 text-carbon-400 hover:text-white hover:border-carbon-600'
                    }`}
                  >
                    {styleOpt}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Frame Switcher */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-carbon-400 uppercase tracking-wider">Marco Portaplaca</label>
              <button
                type="button"
                onClick={() => onChange({ ...plate, customFrame: !plate.customFrame })}
                className={`w-full py-2 rounded-lg text-xs font-semibold transition-all border flex items-center justify-center gap-2 ${
                  plate.customFrame
                    ? 'bg-carbon-700 border-brand-lime text-brand-lime shadow-lg shadow-brand-lime/10'
                    : 'bg-carbon-800/40 border-carbon-700 text-carbon-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                {plate.customFrame ? 'Marco Deportivo Activado' : 'Sin Marco Exterior'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
