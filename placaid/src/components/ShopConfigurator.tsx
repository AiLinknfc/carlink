/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Settings, Globe, Phone, MapPin, Star, Sparkles, MessageSquare, Image, RefreshCw, Check } from 'lucide-react';
import { ShopDetails } from '../types';

interface ShopConfiguratorProps {
  shop: ShopDetails;
  onUpdate: (updated: ShopDetails) => void;
}

const PRESET_LOGOS = [
  {
    name: 'Veloce Yellow',
    url: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?q=80&w=150&auto=format&fit=crop'
  },
  {
    name: 'Tuned Carbon',
    url: 'https://images.unsplash.com/photo-155215695-3004980ad54e?q=80&w=150&auto=format&fit=crop'
  },
  {
    name: 'Sport Red Line',
    url: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?q=80&w=150&auto=format&fit=crop'
  },
  {
    name: 'Hyper Silver',
    url: 'https://images.unsplash.com/photo-1617531653332-bd46c24f2068?q=80&w=150&auto=format&fit=crop'
  }
];

export default function ShopConfigurator({ shop, onUpdate }: ShopConfiguratorProps) {
  const [name, setName] = useState(shop.name);
  const [address, setAddress] = useState(shop.address);
  const [phone, setPhone] = useState(shop.phone);
  const [website, setWebsite] = useState(shop.website);
  const [whatsapp, setWhatsapp] = useState(shop.whatsapp);
  const [instagram, setInstagram] = useState(shop.instagram);
  const [facebook, setFacebook] = useState(shop.facebook);
  const [rating, setRating] = useState(shop.rating.toString());
  const [logoUrl, setLogoUrl] = useState(shop.logoUrl || '');
  const [successMsg, setSuccessMsg] = useState('');

  const handlePresetSelect = (url: string) => {
    setLogoUrl(url);
    const updated = { ...shop, logoUrl: url };
    onUpdate(updated);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const updatedShop: ShopDetails = {
      name: name.trim(),
      rating: parseFloat(rating) || 5.0,
      address: address.trim(),
      phone: phone.trim(),
      website: website.trim(),
      whatsapp: whatsapp.trim(),
      instagram: instagram.trim(),
      facebook: facebook.trim(),
      logoUrl: logoUrl.trim() || undefined
    };

    onUpdate(updatedShop);
    setSuccessMsg('¡Configuración del Taller guardada con éxito!');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  return (
    <div className="w-full max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start text-left" id="shop-config-section">
      {/* Configuration Form */}
      <div className="lg:col-span-7 flex flex-col gap-6">
        <div className="glass-panel p-6 rounded-3xl border border-carbon-800 shadow-xl flex flex-col gap-5">
          <div>
            <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-brand-cyan" />
              <span>Configuración del Taller & Perfil</span>
            </h3>
            <p className="text-xs text-carbon-400 mt-1 leading-relaxed">
              Personaliza los datos públicos del taller que atiende tu vehículo. Estos datos se mostrarán en la firma digital pública del certificado de garantía de tu PlacaID.
            </p>
          </div>

          <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
            {/* Shop name & rating */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-carbon-400 uppercase tracking-wider">Nombre del Taller</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-carbon-950 border border-carbon-800 rounded-xl text-sm text-white focus:border-brand-cyan focus:outline-none transition-colors"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-carbon-400 uppercase tracking-wider">Calificación</label>
                <select
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                  className="w-full px-4 py-2.5 bg-carbon-950 border border-carbon-800 rounded-xl text-sm text-white focus:border-brand-cyan focus:outline-none transition-colors"
                >
                  {['5.0', '4.9', '4.8', '4.7', '4.5', '4.0'].map(r => (
                    <option key={r} value={r}>{r} ★</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Address & Phone */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-carbon-400 uppercase tracking-wider">Dirección Física</label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-4 py-2.5 bg-carbon-950 border border-carbon-800 rounded-xl text-sm text-white focus:border-brand-cyan focus:outline-none transition-colors"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-carbon-400 uppercase tracking-wider">Teléfono de Soporte</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2.5 bg-carbon-950 border border-carbon-800 rounded-xl text-sm text-white focus:border-brand-cyan focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Website & WhatsApp */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-carbon-400 uppercase tracking-wider">Sitio Web (URL)</label>
                <input
                  type="url"
                  required
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="w-full px-4 py-2.5 bg-carbon-950 border border-carbon-800 rounded-xl text-sm text-white focus:border-brand-cyan focus:outline-none transition-colors"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-carbon-400 uppercase tracking-wider">Número WhatsApp</label>
                <input
                  type="text"
                  required
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="w-full px-4 py-2.5 bg-carbon-950 border border-carbon-800 rounded-xl text-sm text-white focus:border-brand-cyan focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Instagram & Facebook */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-carbon-400 uppercase tracking-wider">Instagram (usuario)</label>
                <input
                  type="text"
                  required
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  className="w-full px-4 py-2.5 bg-carbon-950 border border-carbon-800 rounded-xl text-sm text-white focus:border-brand-cyan focus:outline-none transition-colors"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-carbon-400 uppercase tracking-wider">Facebook (usuario)</label>
                <input
                  type="text"
                  required
                  value={facebook}
                  onChange={(e) => setFacebook(e.target.value)}
                  className="w-full px-4 py-2.5 bg-carbon-950 border border-carbon-800 rounded-xl text-sm text-white focus:border-brand-cyan focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Custom Logo input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-carbon-400 uppercase tracking-wider">URL de Logo Personalizado / Foto</label>
              <input
                type="url"
                placeholder="https://ejemplo.com/logo.png"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                className="w-full px-4 py-2.5 bg-carbon-950 border border-carbon-800 rounded-xl text-sm text-white focus:border-brand-cyan focus:outline-none transition-colors"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-brand-cyan text-black font-extrabold rounded-xl hover:shadow-[0_0_20px_rgba(0,240,255,0.25)] transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 text-sm"
            >
              <Sparkles className="w-4 h-4" />
              <span>Guardar Perfil de Taller</span>
            </button>
          </form>

          {successMsg && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs py-2 px-3 rounded-lg text-center font-bold"
            >
              {successMsg}
            </motion.div>
          )}
        </div>
      </div>

      {/* Preset Logos Selector & Live Preview */}
      <div className="lg:col-span-5 flex flex-col gap-6">
        {/* Preset logos gallery */}
        <div className="glass-panel p-5 rounded-3xl border border-carbon-800 flex flex-col gap-4">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Image className="w-4 h-4 text-brand-cyan" />
              <span>Imágenes de Taller / Logos</span>
            </h4>
            <p className="text-[11px] text-carbon-400 mt-1">
              Escoge uno de nuestros diseños pre-configurados para el logo del taller o sube tu propia imagen de marca arriba.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {PRESET_LOGOS.map((p) => {
              const isSelected = logoUrl === p.url;
              return (
                <button
                  key={p.name}
                  onClick={() => handlePresetSelect(p.url)}
                  className={`p-2 rounded-xl border flex flex-col items-center gap-2 transition-all relative ${
                    isSelected 
                      ? 'bg-brand-cyan/10 border-brand-cyan/50 text-white' 
                      : 'bg-carbon-900 border-carbon-800 text-carbon-400 hover:text-white'
                  }`}
                >
                  <img 
                    src={p.url} 
                    alt={p.name} 
                    referrerPolicy="no-referrer"
                    className="w-16 h-16 rounded-xl object-cover border border-white/5" 
                  />
                  <span className="text-[10px] font-bold tracking-tight truncate w-full text-center">{p.name}</span>
                  {isSelected && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-brand-cyan text-black flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Informative alert */}
        <div className="bg-gradient-to-tr from-brand-cyan/5 to-carbon-900/40 border border-brand-cyan/10 p-5 rounded-3xl text-xs flex flex-col gap-3">
          <span className="font-bold text-white uppercase tracking-wider text-[10px] text-brand-cyan">Escaneo NFC de Pruebas</span>
          <p className="text-carbon-400 leading-relaxed">
            Al escanear la placa física, el usuario será dirigido a una página web interactiva personalizada con estos mismos canales digitales de WhatsApp, Instagram, sitio web y registro de marcas.
          </p>
        </div>
      </div>
    </div>
  );
}
