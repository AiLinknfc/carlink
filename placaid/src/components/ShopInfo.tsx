/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { 
  Instagram, 
  Facebook, 
  MessageCircle, 
  Globe, 
  MapPin, 
  PhoneCall, 
  Clock, 
  Star, 
  Award, 
  Users, 
  Sparkles 
} from 'lucide-react';
import { ShopDetails } from '../types';

interface ShopInfoProps {
  shop: ShopDetails;
}

export default function ShopInfo({ shop }: ShopInfoProps) {
  // Mock performance badges of the workshop
  const shopBadges = [
    { text: 'Certificado Brembo', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
    { text: 'Especialistas Motul', color: 'bg-brand-lime/10 text-brand-lime border-brand-lime/20' },
    { text: 'Centro Premium', color: 'bg-brand-cyan/10 text-brand-cyan border-brand-cyan/20' }
  ];

  return (
    <div className="w-full max-w-xl mx-auto glass-panel rounded-3xl p-6 border border-carbon-700 shadow-2xl flex flex-col gap-6 relative overflow-hidden" id="shop-info-card">
      {/* Light effect background */}
      <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-brand-lime/5 rounded-full filter blur-3xl pointer-events-none" />

      {/* Title & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-carbon-800 pb-5">
        <div className="flex items-center gap-4">
          {/* Logo Placeholder / Image */}
          {shop.logoUrl ? (
            <img 
              src={shop.logoUrl} 
              alt="Logo Taller" 
              referrerPolicy="no-referrer"
              className="w-14 h-14 rounded-2xl border-2 border-brand-lime shadow-xl object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-carbon-800 to-carbon-700 border-2 border-brand-lime shadow-xl flex items-center justify-center font-mono font-black text-xl text-brand-lime tracking-tighter flex-shrink-0">
              VP
            </div>
          )}
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <Award className="w-4 h-4 text-brand-lime" />
              <span className="text-[10px] font-mono font-bold tracking-widest text-brand-lime uppercase">CENTRO AUTORIZADO</span>
            </div>
            <h3 className="text-xl font-extrabold tracking-tight text-white">{shop.name}</h3>
          </div>
        </div>

        {/* Ratings badge */}
        <div className="flex items-center gap-2 self-start md:self-auto bg-carbon-900 px-4 py-2 rounded-2xl border border-carbon-800 shadow-inner">
          <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
          <span className="font-mono font-black text-white text-base">{shop.rating}</span>
          <span className="text-xs text-carbon-500">/ 5.0</span>
        </div>
      </div>

      {/* Main Info Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Physical Details */}
        <div className="flex flex-col gap-4">
          <h4 className="text-xs font-bold text-carbon-400 uppercase tracking-widest border-l-2 border-brand-cyan pl-2 mb-1">Ubicación y Contacto</h4>
          
          <div className="flex gap-3 text-sm">
            <MapPin className="w-5 h-5 text-brand-cyan flex-shrink-0 mt-0.5" />
            <div className="flex flex-col">
              <span className="text-carbon-200 font-semibold">Taller Físico</span>
              <span className="text-xs text-carbon-400 mt-0.5 leading-relaxed">{shop.address}</span>
            </div>
          </div>

          <div className="flex gap-3 text-sm">
            <PhoneCall className="w-5 h-5 text-brand-cyan flex-shrink-0" />
            <div className="flex flex-col">
              <span className="text-carbon-200 font-semibold">Línea Directa</span>
              <span className="text-xs font-mono text-carbon-400 mt-0.5">{shop.phone}</span>
            </div>
          </div>

          <div className="flex gap-3 text-sm">
            <Clock className="w-5 h-5 text-brand-cyan flex-shrink-0" />
            <div className="flex flex-col">
              <span className="text-carbon-200 font-semibold">Horario de Operación</span>
              <span className="text-xs text-carbon-400 mt-0.5">Lun - Sáb: 8:00 AM - 6:00 PM</span>
            </div>
          </div>
        </div>

        {/* Performance credentials & stats */}
        <div className="flex flex-col gap-4">
          <h4 className="text-xs font-bold text-carbon-400 uppercase tracking-widest border-l-2 border-brand-lime pl-2 mb-1">Credenciales del Negocio</h4>
          
          <div className="flex flex-wrap gap-2">
            {shopBadges.map((badge, idx) => (
              <span 
                key={idx} 
                className={`px-3 py-1 text-xs font-semibold rounded-lg border ${badge.color}`}
              >
                {badge.text}
              </span>
            ))}
          </div>

          <div className="bg-carbon-900/40 border border-carbon-800 rounded-xl p-3 mt-1.5 flex items-center gap-3">
            <Users className="w-5 h-5 text-brand-lime flex-shrink-0" />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white">Mecánicos Certificados</span>
              <span className="text-[11px] text-carbon-400">Personal altamente capacitado para motores turbo e híbridos.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Social Media Grid */}
      <div className="border-t border-carbon-800 pt-5 mt-2">
        <h4 className="text-xs font-bold text-carbon-400 uppercase tracking-widest block mb-4">Canales de Atención y Redes Sociales</h4>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Instagram */}
          <a 
            href={`https://instagram.com/${shop.instagram}`}
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 p-3 rounded-xl bg-gradient-to-r from-pink-500/5 to-purple-500/5 border border-purple-500/10 hover:border-pink-500/50 hover:bg-pink-500/10 transition-all text-carbon-300 hover:text-white"
          >
            <Instagram className="w-5 h-5 text-pink-500" />
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold truncate">Instagram</span>
              <span className="text-[10px] text-carbon-500 truncate font-mono">@{shop.instagram}</span>
            </div>
          </a>

          {/* WhatsApp */}
          <a 
            href={`https://wa.me/${shop.whatsapp}`}
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all text-carbon-300 hover:text-white"
          >
            <MessageCircle className="w-5 h-5 text-emerald-500" />
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold truncate">WhatsApp</span>
              <span className="text-[10px] text-carbon-500 truncate">Mensaje Directo</span>
            </div>
          </a>

          {/* Facebook */}
          <a 
            href={`https://facebook.com/${shop.facebook}`}
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 p-3 rounded-xl bg-blue-600/5 border border-blue-600/10 hover:border-blue-600/50 hover:bg-blue-600/10 transition-all text-carbon-300 hover:text-white"
          >
            <Facebook className="w-5 h-5 text-blue-500" />
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold truncate">Facebook</span>
              <span className="text-[10px] text-carbon-500 truncate">Saber Más</span>
            </div>
          </a>

          {/* Website */}
          <a 
            href={shop.website}
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 p-3 rounded-xl bg-brand-cyan/5 border border-brand-cyan/10 hover:border-brand-cyan hover:bg-brand-cyan/10 transition-all text-carbon-300 hover:text-white"
          >
            <Globe className="w-5 h-5 text-brand-cyan" />
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold truncate">Sitio Web</span>
              <span className="text-[10px] text-carbon-500 truncate font-mono">veloce.com</span>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
