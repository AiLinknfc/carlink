/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Camera, 
  FileText, 
  AlertCircle, 
  Plus, 
  Trash2, 
  Sparkles, 
  Coins, 
  ArrowRight,
  TrendingUp,
  Award
} from 'lucide-react';
import { DocumentItem, MaintenanceCard, UserSession, UserVehicle } from '../types';

interface LateralDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  documents: DocumentItem[];
  onAddDocument: (doc: DocumentItem) => void;
  onDeleteDocument: (id: string) => void;
  maintenance: MaintenanceCard;
  session: UserSession | null;
  vehicle: UserVehicle | null;
  plateNumber: string;
}

export default function LateralDrawer({ 
  isOpen, 
  onClose, 
  documents, 
  onAddDocument, 
  onDeleteDocument,
  maintenance,
  session,
  vehicle,
  plateNumber
}: LateralDrawerProps) {
  
  const [activeTab, setActiveTab] = useState<'photos' | 'receipts' | 'diagnostics'>('photos');
  const [newTitle, setNewTitle] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Suggested diagnostic tips based on mileage
  const getDiagnosticTips = () => {
    const tips = [];
    const mileage = maintenance.currentMileage;

    if (mileage > 40000 && !maintenance.filtersReplaced.sparkPlugs) {
      tips.push({
        title: 'Inspección de Bujías de Iridio',
        desc: 'Tu kilometraje actual supera los 40,000 KM. Se sugiere revisar la calibración de las bujías para evitar fallas de encendido y optimizar consumo.',
        severity: 'medium',
        system: 'Sistema de Ignición'
      });
    }
    if (!maintenance.filtersReplaced.brakeFluid) {
      tips.push({
        title: 'Cambio de Líquido de Frenos DOT 4/5.1',
        desc: 'El líquido de frenos absorbe humedad con el tiempo. Recomendamos certificar el nivel y porcentaje de humedad en tu próximo servicio.',
        severity: 'high',
        system: 'Seguridad / Frenado'
      });
    }
    if (mileage > 50000) {
      tips.push({
        title: 'Revisión de Correa de Accesorios',
        desc: 'Superados los 50,000 KM, es prudente inspeccionar visualmente si existen grietas en la correa del alternador y bomba de agua.',
        severity: 'low',
        system: 'Transmisión de Fuerza'
      });
    }
    if (!maintenance.filtersReplaced.air) {
      tips.push({
        title: 'Filtro de Aire Obstruido',
        desc: 'El filtro de aire no ha sido marcado como reemplazado. Un filtro limpio mejora la potencia del motor hasta un 5% y reduce emisiones.',
        severity: 'high',
        system: 'Admisión de Aire'
      });
    }

    // Default tip if everything is fully updated
    if (tips.length === 0) {
      tips.push({
        title: 'Estado Mecánico Impecable',
        desc: '¡Felicidades! Los parámetros de mantenimiento registrados y el kilometraje actual indican un vehículo excelentemente preservado.',
        severity: 'optimum',
        system: 'Control General'
      });
    }

    return tips;
  };

  const diagnostics = getDiagnosticTips();

  // Handle local file uploads
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Prebaked gallery templates to make "Adding Photos" super quick and satisfying
  const handleAddSamplePhoto = (url: string, title: string) => {
    const newDoc: DocumentItem = {
      id: `doc-${Date.now()}`,
      title: title || 'Inspección Mecánica Detallada',
      type: 'photo',
      url: url,
      date: new Date().toISOString().split('T')[0],
      fileSize: '3.4 MB'
    };
    onAddDocument(newDoc);
  };

  const handleAddReceipt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const priceText = newPrice ? ` - $${Number(newPrice).toLocaleString('es-CO')} COP` : '';
    const newDoc: DocumentItem = {
      id: `doc-${Date.now()}`,
      title: `${newTitle}${priceText}`,
      type: 'certificate',
      url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?q=80&w=600&auto=format&fit=crop',
      date: new Date().toISOString().split('T')[0],
      fileSize: '1.2 MB'
    };

    onAddDocument(newDoc);
    setNewTitle('');
    setNewPrice('');
  };

  const handleAddCustomPhoto = () => {
    if (!previewImage) return;
    const newDoc: DocumentItem = {
      id: `doc-${Date.now()}`,
      title: newTitle || 'Fotografía de Servicio',
      type: 'photo',
      url: previewImage,
      date: new Date().toISOString().split('T')[0],
      fileSize: '2.8 MB'
    };
    onAddDocument(newDoc);
    setPreviewImage(null);
    setNewTitle('');
  };

  // Sum up prices for total investment calculation
  const getTotalInvestment = () => {
    let total = 0;
    documents.forEach(doc => {
      if (doc.type === 'certificate') {
        const match = doc.title.match(/\$([\d.,]+)/);
        if (match) {
          const val = Number(match[1].replace(/[.,]/g, ''));
          if (!isNaN(val)) total += val;
        }
      }
    });
    return total;
  };

  const totalInv = getTotalInvestment();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />

          {/* Drawer Body */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-md bg-carbon-950 border-l border-carbon-800 z-50 shadow-2xl flex flex-col justify-between overflow-hidden"
            id="lateral-drawer-container"
          >
            {/* Header */}
            <div className="p-6 border-b border-carbon-800 flex justify-between items-center bg-carbon-900/40">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-brand-cyan/10 border border-brand-cyan/20 flex items-center justify-center">
                  <Award className="w-5 h-5 text-brand-cyan" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white tracking-wide">Expediente de Servicio</h3>
                  <p className="text-xs text-carbon-400">Historial, fotos y diagnósticos</p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-carbon-800 hover:bg-carbon-700 hover:text-brand-cyan flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6" id="drawer-scrollable-content">
              
              {/* ==================== DATOS DEL USUARIO (PROFILE PANEL) ==================== */}
              <div className="glass-panel p-6 rounded-[28px] border-2 border-brand-cyan/20 bg-gradient-to-b from-[#14171d] to-[#0d0f13] flex flex-col gap-5 relative overflow-hidden shadow-xl" id="drawer-user-profile-panel">
                {/* Dynamic Neon Corner Glow */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-cyan/10 rounded-full filter blur-2xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-brand-lime/5 rounded-full filter blur-2xl pointer-events-none" />
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 border-b border-carbon-800/80 pb-4">
                  <div className="relative mx-auto sm:mx-0">
                    <img 
                      src={session?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150'} 
                      alt={session?.name || 'Usuario'} 
                      className="w-20 h-20 rounded-2xl border-2 border-brand-cyan object-cover shadow-lg hover:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                    />
                    <span className="absolute -bottom-1 -right-1 px-2 py-0.5 bg-brand-cyan text-black font-black text-[8px] rounded-full uppercase tracking-widest border border-carbon-950 shadow">
                      Google ID
                    </span>
                  </div>

                  <div className="flex-1 min-w-0 text-center sm:text-left w-full">
                    <span className="text-[9px] font-mono font-bold text-brand-lime bg-brand-lime/10 px-2 py-0.5 border border-brand-lime/20 rounded-md uppercase tracking-widest inline-block">
                      Propietario Certificado
                    </span>
                    <h4 className="text-lg font-black text-white truncate leading-tight mt-1.5 font-sans">
                      {session?.name || 'Propietario PlacaID'}
                    </h4>
                    <p className="text-xs text-brand-cyan truncate mt-0.5 font-mono font-semibold">
                      {session?.email || 'usuario@placaid.com'}
                    </p>
                  </div>
                </div>

                {/* Grid details */}
                <div className="grid grid-cols-2 gap-4 text-xs text-left">
                  <div className="bg-carbon-950/50 p-3 rounded-2xl border border-carbon-900">
                    <span className="text-[8px] font-mono font-bold text-carbon-500 uppercase tracking-widest block">PLACA VINCULADA</span>
                    <span className="font-mono font-black text-white text-sm mt-1 block tracking-wider">{plateNumber}</span>
                  </div>
                  <div className="bg-carbon-950/50 p-3 rounded-2xl border border-carbon-900">
                    <span className="text-[8px] font-mono font-bold text-carbon-500 uppercase tracking-widest block">NIVEL DE SEGURIDAD</span>
                    <span className="text-brand-lime font-mono font-bold text-xs mt-1 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-brand-lime animate-pulse shadow-[0_0_8px_#ccff00]" />
                      <span>AES-256 Sinc</span>
                    </span>
                  </div>
                </div>

                {/* Synced vehicle summary */}
                {vehicle ? (
                  <div className="bg-carbon-950/85 rounded-2xl p-4 border border-carbon-800/80 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                    {vehicle.badgeUrl ? (
                      <img 
                        src={vehicle.badgeUrl} 
                        alt={vehicle.brand} 
                        referrerPolicy="no-referrer"
                        className="w-12 h-12 rounded-full object-cover border-2 border-brand-lime bg-carbon-900" 
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-carbon-900 border border-carbon-800 flex items-center justify-center font-bold text-sm text-white">
                        {vehicle.brand.slice(0, 2)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <span className="text-[8px] font-mono font-bold text-brand-cyan uppercase tracking-widest block">Vehículo Sincronizado</span>
                      <span className="text-sm font-black text-white block truncate leading-tight mt-0.5">
                        {vehicle.brand} {vehicle.model}
                      </span>
                      <span className="text-xs text-carbon-400 block mt-1 font-mono">
                        Modelo {vehicle.year} • {vehicle.color}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-carbon-900/30 rounded-2xl p-4 border border-carbon-800 border-dashed text-center">
                    <p className="text-xs text-carbon-400">Ningún vehículo sincronizado aún.</p>
                    <span className="text-[10px] text-brand-cyan font-bold block mt-1">Registrar marca de carro para activar expediente completo.</span>
                  </div>
                )}

                {/* Simulated Criptographic Signature */}
                <div className="bg-black/40 p-3 rounded-2xl border border-carbon-900 flex flex-col gap-1.5 text-[9px] font-mono text-carbon-500 text-left">
                  <div className="flex justify-between items-center text-[8px] text-carbon-400 uppercase tracking-widest">
                    <span>Firma Criptográfica</span>
                    <span className="text-brand-cyan font-bold">ACTIVA</span>
                  </div>
                  <div className="truncate text-carbon-300">
                    SHA256: e84755094c1c42bcb9153b3c4f5ad6a7b2d2d0f13f18e95
                  </div>
                  <div className="flex justify-between text-[8px] text-carbon-500 mt-0.5">
                    <span>IP: 189.203.22.155</span>
                    <span>PROTOCOLO: PlacaID v1.0.3</span>
                  </div>
                </div>

                {/* Download Driver Pass Button */}
                <button
                  onClick={() => {
                    const divider = "================================================================================\n";
                    const title = "                  PLACAID PLATFORM - CREDENCIAL DIGITAL DE CONDUCCIÓN            \n";
                    const subtitle = "                       COMPROBANTE DE PROPIETARIO AUTENTICADO                    \n";
                    const time = `Generado el: ${new Date().toLocaleString('es-ES')}\n`;
                    const credentials = `
DATOS DEL PROPIETARIO:
---------------------
- Nombre completo: ${session?.name || 'Alexis Mendoza'}
- Cuenta enlazada: ${session?.email || 'driver.club@gmail.com'}
- Estado de verificación: 100% VERIFICADO Y SINCRONIZADO

DATOS DE LA MATRÍCULA:
---------------------
- Número de placa: ${plateNumber}
- Ciudad de emisión: ${vehicle?.brand ? 'México / Red Central' : 'Consulta Regional'}
- Criptografía de chip NFC: AES-GCM 256 bits

VEHÍCULO ASOCIADO:
-----------------
- Marca y línea: ${vehicle?.brand || 'Sin Sincronizar'} ${vehicle?.model || ''}
- Año de fabricación: ${vehicle?.year || 'N/A'}
- Color de carrocería: ${vehicle?.color || 'N/A'}
- Diagnóstico técnico de la Red: Conforme / Sin fallas críticas
`;
                    const signature = `
SEGURIDAD CRIPTOGRÁFICA:
-----------------------
Este pasaporte digital cuenta con un respaldo matemático inalterable en los servidores de PlacaID.
FIRMA INTEGRAL: SHA256/e84755094c1c42bcb9153b3c4f5ad6a7b2d2d0f13f18e95
`;
                    const blob = new Blob([divider + title + subtitle + time + divider + credentials + signature + divider], { type: 'text/plain;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `PlacaID_Pasaporte_Driver_${plateNumber}.txt`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                  }}
                  className="py-2.5 px-4 bg-carbon-900 hover:bg-carbon-850 hover:text-brand-cyan border border-carbon-800 hover:border-carbon-700 rounded-xl text-xs font-bold text-white transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                  title="Descargar credencial oficial"
                >
                  <svg className="w-4 h-4 text-brand-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                  <span>Descargar Credencial Oficial PlacaID</span>
                </button>
              </div>

              {/* Separator / Title for Expediente Digital */}
              <div className="flex items-center gap-2 border-t border-carbon-800 pt-5 text-left">
                <FileText className="w-4.5 h-4.5 text-brand-lime" />
                <span className="text-[10px] font-black text-white uppercase tracking-widest">Expediente de Servicio / Diagnósticos</span>
              </div>

              {/* Custom Tab Bar inside scrollable */}
              <div className="p-1 rounded-2xl bg-carbon-900/60 border border-carbon-800 flex gap-1">
                <button
                  onClick={() => setActiveTab('photos')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold tracking-wide transition-all ${
                    activeTab === 'photos'
                      ? 'bg-carbon-800 text-brand-cyan border border-brand-cyan/20'
                      : 'text-carbon-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <Camera className="w-3.5 h-3.5" />
                    <span>Fotos</span>
                  </div>
                </button>
                
                <button
                  onClick={() => setActiveTab('receipts')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold tracking-wide transition-all ${
                    activeTab === 'receipts'
                      ? 'bg-carbon-800 text-brand-cyan border border-brand-cyan/20'
                      : 'text-carbon-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    <span>Certificados</span>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('diagnostics')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold tracking-wide transition-all ${
                    activeTab === 'diagnostics'
                      ? 'bg-carbon-800 text-brand-cyan border border-brand-cyan/20'
                      : 'text-carbon-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Alertas</span>
                  </div>
                </button>
              </div>
              
              {/* ==================== PHOTOS TAB ==================== */}
              {activeTab === 'photos' && (
                <div className="flex flex-col gap-5">
                  <div className="flex flex-col gap-1.5">
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider">Bitácora Fotográfica</h4>
                    <p className="text-xs text-carbon-400 leading-relaxed">
                      Sube fotos del motor, piezas nuevas o el proceso técnico para validar la garantía del servicio.
                    </p>
                  </div>

                  {/* Photo Upload Simulator */}
                  <div className="bg-carbon-900/40 border border-dashed border-carbon-800 rounded-2xl p-5 flex flex-col items-center justify-center text-center gap-3 relative">
                    {previewImage ? (
                      <div className="w-full flex flex-col gap-3">
                        <img 
                          src={previewImage} 
                          alt="Previsualización" 
                          className="h-32 w-full object-cover rounded-xl border border-carbon-700" 
                        />
                        <input
                          type="text"
                          value={newTitle}
                          onChange={(e) => setNewTitle(e.target.value)}
                          placeholder="Etiqueta tu foto (ej. Frenos Traseros)"
                          className="w-full px-3 py-1.5 bg-carbon-950 border border-carbon-800 rounded-lg text-xs text-white focus:border-brand-cyan focus:outline-none"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => setPreviewImage(null)}
                            className="flex-1 py-1.5 text-xs font-semibold text-carbon-400 bg-carbon-800 rounded-lg"
                          >
                            Eliminar
                          </button>
                          <button
                            onClick={handleAddCustomPhoto}
                            className="flex-1 py-1.5 text-xs font-bold text-black bg-brand-cyan rounded-lg"
                          >
                            Subir Foto
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="w-10 h-10 rounded-full bg-carbon-800/80 border border-carbon-700 flex items-center justify-center text-carbon-400">
                          <Camera className="w-5 h-5 text-brand-cyan" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-semibold text-brand-cyan cursor-pointer hover:underline">
                            Selecciona una imagen real de tu disco
                            <input 
                              type="file" 
                              accept="image/*" 
                              onChange={handleImageChange} 
                              className="hidden" 
                            />
                          </label>
                          <span className="text-[10px] text-carbon-500">Formatos PNG, JPG • Máx 5MB</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Quick Preset Presets to instantly demonstrate awesome UX */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-bold text-carbon-400 uppercase tracking-widest">Añadir Fotos de Muestra Rápida</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleAddSamplePhoto(
                          'https://images.unsplash.com/photo-1486006920555-c77dce18193b?q=80&w=600&auto=format&fit=crop',
                          'Cambio de Bujías de Competición'
                        )}
                        className="p-2 rounded-xl bg-carbon-900 border border-carbon-800/80 hover:border-brand-lime text-left text-[11px] font-semibold text-carbon-300 flex items-center gap-2 transition-all cursor-pointer"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-lime" />
                        <span>Bujías Nuevas</span>
                      </button>
                      
                      <button
                        onClick={() => handleAddSamplePhoto(
                          'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=80&w=600&auto=format&fit=crop',
                          'Inspección Mecánica de Bahía'
                        )}
                        className="p-2 rounded-xl bg-carbon-900 border border-carbon-800/80 hover:border-brand-lime text-left text-[11px] font-semibold text-carbon-300 flex items-center gap-2 transition-all cursor-pointer"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-lime" />
                        <span>Inspección General</span>
                      </button>
                    </div>
                  </div>

                  {/* Uploaded Gallery */}
                  <div className="flex flex-col gap-3 mt-2">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Galería del Expediente ({documents.filter(d => d.type === 'photo').length})</span>
                    <div className="grid grid-cols-2 gap-3">
                      {documents.filter(d => d.type === 'photo').map((doc) => (
                        <div 
                          key={doc.id} 
                          className="group relative h-28 rounded-xl overflow-hidden border border-carbon-800 bg-carbon-900"
                        >
                          <img 
                            src={doc.url} 
                            alt={doc.title} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-2.5 flex flex-col justify-end">
                            <span className="text-[10px] font-semibold text-white truncate leading-tight">{doc.title}</span>
                            <span className="text-[8px] text-carbon-400 font-mono mt-0.5">{doc.date}</span>
                          </div>
                          
                          <button
                            onClick={() => onDeleteDocument(doc.id)}
                            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-red-600/90 hover:bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer shadow-md"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ==================== RECEIPTS & PURCHASE CERTIFICATES TAB ==================== */}
              {activeTab === 'receipts' && (
                <div className="flex flex-col gap-5">
                  <div className="flex flex-col gap-1.5">
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider">Gastos & Certificados de Compra</h4>
                    <p className="text-xs text-carbon-400 leading-relaxed">
                      Lleva una contabilidad interactiva de tus repuestos. Al ingresar un valor, se sumará dinámicamente al total de inversión vehicular.
                    </p>
                  </div>

                  {/* Add Receipt Form */}
                  <form onSubmit={handleAddReceipt} className="bg-carbon-900/40 rounded-2xl p-4 border border-carbon-800 flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-semibold text-carbon-400">Descripción del Gasto</label>
                        <input
                          type="text"
                          required
                          value={newTitle}
                          onChange={(e) => setNewTitle(e.target.value)}
                          placeholder="Filtro Aire K&N"
                          className="w-full px-3 py-2 bg-carbon-950 border border-carbon-800 rounded-lg text-xs text-white focus:outline-none focus:border-brand-cyan"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-semibold text-carbon-400">Precio (COP)</label>
                        <input
                          type="number"
                          value={newPrice}
                          onChange={(e) => setNewPrice(e.target.value)}
                          placeholder="120000"
                          className="w-full px-3 py-2 bg-carbon-950 border border-carbon-800 rounded-lg text-xs text-white focus:outline-none focus:border-brand-cyan"
                        />
                      </div>
                    </div>
                    
                    <button
                      type="submit"
                      className="w-full py-2 bg-carbon-800 border border-carbon-700 text-xs font-bold text-brand-cyan rounded-lg hover:border-brand-cyan hover:bg-brand-cyan/10 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Registrar Certificado</span>
                    </button>
                  </form>

                  {/* Total Invested Display */}
                  <div className="bg-gradient-to-r from-brand-cyan/10 to-brand-lime/10 border border-brand-cyan/20 rounded-2xl p-4 flex justify-between items-center shadow-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-carbon-950 border border-brand-cyan/20 flex items-center justify-center">
                        <Coins className="w-5 h-5 text-brand-cyan" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-carbon-400 uppercase tracking-widest">Inversión Certificada</span>
                        <h4 className="text-lg font-black text-white font-mono leading-tight mt-0.5">
                          ${totalInv > 0 ? totalInv.toLocaleString('es-CO') : '420.000'} COP
                        </h4>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-brand-lime font-bold">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>PlacaID Core</span>
                    </div>
                  </div>

                  {/* Receipt list */}
                  <div className="flex flex-col gap-2.5">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Lista de Comprobantes ({documents.filter(d => d.type === 'certificate').length})</span>
                    <div className="flex flex-col gap-2">
                      {documents.filter(d => d.type === 'certificate').map((doc) => (
                        <div 
                          key={doc.id} 
                          className="p-3 rounded-xl bg-carbon-900 border border-carbon-800/80 hover:border-carbon-700 flex justify-between items-center transition-all group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <FileText className="w-5 h-5 text-brand-cyan flex-shrink-0" />
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-bold text-white truncate leading-tight">{doc.title}</span>
                              <span className="text-[9px] text-carbon-400 font-mono mt-0.5">{doc.date} • {doc.fileSize}</span>
                            </div>
                          </div>

                          <button
                            onClick={() => onDeleteDocument(doc.id)}
                            className="text-carbon-500 hover:text-red-500 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ==================== DIAGNOSTICS & ALERTS TAB ==================== */}
              {activeTab === 'diagnostics' && (
                <div className="flex flex-col gap-5">
                  <div className="flex flex-col gap-1.5">
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider">Recomendaciones Preventivas</h4>
                    <p className="text-xs text-carbon-400 leading-relaxed">
                      Basado en el millaje actual de <span className="text-brand-lime font-mono font-bold">{maintenance.currentMileage.toLocaleString()} KM</span> y tus filtros registrados:
                    </p>
                  </div>

                  <div className="flex flex-col gap-3">
                    {diagnostics.map((tip, idx) => {
                      const badgeColor = 
                        tip.severity === 'high' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                        tip.severity === 'medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                        tip.severity === 'optimum' ? 'bg-brand-lime/10 text-brand-lime border-brand-lime/20' :
                        'bg-brand-cyan/10 text-brand-cyan border-brand-cyan/20';
                      
                      return (
                        <div 
                          key={idx} 
                          className="bg-carbon-900/30 rounded-2xl p-4 border border-carbon-800 flex flex-col gap-2 hover:border-carbon-700/80 transition-colors"
                        >
                          <div className="flex justify-between items-start">
                            <span className="text-[10px] font-mono font-bold text-carbon-500 uppercase tracking-widest">{tip.system}</span>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${badgeColor}`}>
                              {tip.severity === 'optimum' ? 'ÓPTIMO' : tip.severity.toUpperCase()}
                            </span>
                          </div>

                          <h5 className="text-xs font-bold text-white leading-snug">{tip.title}</h5>
                          <p className="text-[11px] text-carbon-400 leading-relaxed">{tip.desc}</p>
                          
                          {tip.severity !== 'optimum' && (
                            <div className="flex justify-end mt-1.5">
                              <span className="text-[10px] font-bold text-brand-cyan flex items-center gap-1 cursor-pointer hover:underline">
                                <span>Ver guía de reemplazo</span>
                                <ArrowRight className="w-3 h-3" />
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="p-4 border-t border-carbon-800 bg-carbon-900/60 text-center">
              <span className="text-[10px] font-mono text-carbon-500">
                PlacaID Secure Diagnostic Protocol © 2026
              </span>
            </div>

          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
