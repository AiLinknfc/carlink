/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  ShieldCheck, 
  FileText, 
  Wrench, 
  Download, 
  CheckCircle2, 
  Send, 
  HelpCircle, 
  PhoneCall, 
  Sparkles, 
  Cpu, 
  Terminal 
} from 'lucide-react';
import { VehiclePlate, UserSession } from '../types';

interface PolicyDocsModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'warranty' | 'privacy' | 'support';
  plate: VehiclePlate;
  session: UserSession | null;
}

export default function PolicyDocsModal({ 
  isOpen, 
  onClose, 
  defaultTab = 'privacy',
  plate,
  session
}: PolicyDocsModalProps) {
  const [activeTab, setActiveTab] = useState<'warranty' | 'privacy' | 'support'>(defaultTab);
  
  // Support Form State
  const [supportName, setSupportName] = useState(session?.name || '');
  const [supportEmail, setSupportEmail] = useState(session?.email || 'driver.club@gmail.com');
  const [supportMsg, setSupportMsg] = useState('');
  const [supportType, setSupportType] = useState('NFC_READ_ERROR');
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Sync tab with prop changes when modal opens
  useState(() => {
    setActiveTab(defaultTab);
  });

  if (!isOpen) return null;

  // Generate complete downloadable raw text for the policy
  const handleDownloadPolicy = () => {
    const divider = "================================================================================\n";
    const title = "             PLACAID PLATFORM - EXPEDIENTE LEGAL Y POLÍTICA DE DATOS            \n";
    const timestamp = `Generado el: ${new Date().toLocaleString('es-ES')}\n`;
    const plateInfo = `Vehículo Vinculado Placa: ${plate.plateNumber} (${plate.city})\n`;
    const userInfo = `Usuario Autenticado: ${session?.email || 'No Registrado / Invitado'}\n`;
    
    let textContent = `${divider}${title}${timestamp}${plateInfo}${userInfo}${divider}\n`;

    if (activeTab === 'privacy') {
      textContent += `
1. POLÍTICA DE PRIVACIDAD Y PROTECCIÓN DE DATOS PERSONALES (LFPDPPP)
------------------------------------------------------------------
PlacaID Platform S.A. de C.V. es el responsable del tratamiento de los datos personales recopilados para el Expediente Vehicular Digital asociado a la placa NFC: ${plate.plateNumber}.

A. DATOS RECOPILADOS
- Identificadores vehiculares: Número de placa, Ciudad de Expedición, Marca, Modelo y Año.
- Datos de contacto y cuenta: Correo electrónico vinculado a Google ID, Avatar e historial de sesiones.
- Expediente de mantenimiento técnico: Kilometraje, fecha del servicio, piezas reemplazadas, fluidos aplicados, fotos de evidencia de diagnóstico, recibos escaneados e informes del mecánico.

B. FINALIDAD DEL TRATAMIENTO
Los datos se recopilan única y exclusivamente para:
1. Proveer el pasaporte digital técnico infalsificable del vehículo.
2. Permitir el escaneo instantáneo del código QR o chip de contacto NFC físico por parte de talleres autorizados.
3. Asegurar la trazabilidad física y el control de garantías de reparaciones técnicas automotrices.
4. Prevenir fraudes de millaje en transacciones de compraventa de vehículos seminuevos.

C. SEGURIDAD Y ENCRIPTACIÓN CRIPTOGRÁFICA
- Toda transmisión de datos se realiza a través de túneles TLS 1.3 con cifrado AES-256.
- Los tags físicos NFC emitidos por PlacaID utilizan un identificador UID único e inmutable a nivel de silicio, con firma criptográfica de curva elíptica para prevenir clonaciones o falsificaciones físicas.
- Ningún dato de carácter personal del conductor es almacenado de manera desprotegida o en texto plano en la etiqueta NFC física.

D. DERECHOS ARCO (Acceso, Rectificación, Cancelación y Oposición)
Usted tiene derecho a conocer qué datos personales tenemos de su vehículo, para qué los utilizamos y las condiciones del uso que les damos. Asimismo, es su derecho solicitar la corrección de su información, la eliminación de nuestros registros si considera que no está siendo utilizada adecuadamente, u oponerse al uso para fines específicos. Para ejercer estos derechos, envíe un correo a: soporte@placaid.com con el asunto "DERECHOS ARCO - ${plate.plateNumber}".
`;
    } else if (activeTab === 'warranty') {
      textContent += `
2. TÉRMINOS DE GARANTÍA GENERAL - PLACAID PLATFORM Y RED DE TALLERES
------------------------------------------------------------------
Este documento especifica el alcance, cobertura y exclusiones de la garantía del hardware PlacaID y los servicios mecánicos registrados.

A. COBERTURA DE LOS SERVICIOS DE MANTENIMIENTO
- La garantía estándar sobre cualquier mantenimiento técnico preventivo o correctivo debidamente registrado, firmado digitalmente y respaldado por factura dentro de esta plataforma es de 12 MESES o 15,000 KILÓMETROS, lo que ocurra primero.
- La garantía ampara tanto la mano de obra calificada como las refacciones provistas por el taller afiliado, de acuerdo a la hoja de servicio activa.

B. COBERTURA DEL HARDWARE PLACAID (NFC TAG)
- La placa física de metal o calcomanía inteligente con chip NFC pasivo integrado cuenta con GARANTÍA DE POR VIDA contra defectos de fabricación, pérdida de resonancia magnética o desmagnetización pasiva bajo condiciones meteorológicas severas.
- Soporta temperaturas de -40°C hasta 120°C, exposición directa a rayos UV, humedad extrema y lavados automáticos a presión.

C. EXCLUSIONES DE GARANTÍA
Esta garantía quedará sin efecto en cualquiera de los siguientes casos:
1. Daño mecánico severo derivado de accidentes de tránsito, colisiones o fuego que destruyan el microchip o la antena de cobre.
2. Manipulación, perforación o alteración física intencional de la placa inteligente PlacaID.
3. Mantenimientos intermedios realizados en talleres externos que no firmen digitalmente sobre la plataforma de validación.
`;
    } else {
      textContent += `
3. INFORMACIÓN DE SOPORTE TÉCNICO Y SISTEMA DE DIAGNÓSTICO
------------------------------------------------------------------
PlacaID cuenta con un equipo de ingenieros dedicados las 24 horas del día, los 7 días de la semana, para resolver contingencias en la lectura de placas físicas o acceso a la plataforma digital de mantenimiento.

INFORMACIÓN DEL SISTEMA DE DIAGNÓSTICO:
- Identificador de Placa Activa: ${plate.plateNumber}
- Ubicación de Registro: ${plate.city}
- Estado del Dispositivo Físico NFC: Activo, enlazado y certificado.
- Taller de Servicio Asociado: Red Global PlacaID
- Canal de Soporte Técnico Directo: soporte@placaid.com

Si requiere soporte inmediato, por favor comuníquese por correo electrónico o a través de su asesor de servicio técnico en el taller autorizado.
`;
    }

    // Create text blob and download
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `PlacaID_Documentacion_${activeTab}_${plate.plateNumber}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSupportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportMsg.trim()) return;

    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setFormSubmitted(true);
      setSupportMsg('');
      setTimeout(() => {
        setFormSubmitted(false);
      }, 5000);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" id="policy-modal-overlay">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/90 backdrop-blur-md" 
        onClick={onClose} 
      />

      {/* Modal Card */}
      <div className="bg-carbon-950 border border-carbon-800 rounded-[32px] w-full max-w-4xl max-h-[85vh] flex flex-col relative z-10 shadow-2xl overflow-hidden text-left">
        {/* Modal Ambient Corner Light */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-brand-cyan/5 rounded-full filter blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-brand-lime/5 rounded-full filter blur-2xl pointer-events-none" />

        {/* Modal Header */}
        <div className="p-6 md:p-8 border-b border-carbon-900 flex justify-between items-center bg-carbon-950/80 sticky top-0 backdrop-blur-md z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-cyan/10 border border-brand-cyan/20 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-brand-cyan" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white leading-tight">Expediente Legal & Centro de Ayuda</h2>
              <p className="text-xs text-carbon-400">
                PlacaID {plate.plateNumber} • Certificación técnica vehicular en regla
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-3 bg-carbon-900 hover:bg-carbon-850 rounded-2xl border border-carbon-800 hover:border-carbon-700 text-carbon-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 md:px-8 py-3 bg-carbon-900/40 border-b border-carbon-900/60 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('privacy')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black tracking-wide transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'privacy'
                ? 'bg-brand-cyan text-black'
                : 'text-carbon-400 hover:text-white bg-transparent hover:bg-carbon-900/60'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Privacidad de Datos</span>
          </button>

          <button
            onClick={() => setActiveTab('warranty')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black tracking-wide transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'warranty'
                ? 'bg-brand-cyan text-black'
                : 'text-carbon-400 hover:text-white bg-transparent hover:bg-carbon-900/60'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Términos de Garantía</span>
          </button>

          <button
            onClick={() => setActiveTab('support')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black tracking-wide transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'support'
                ? 'bg-brand-cyan text-black'
                : 'text-carbon-400 hover:text-white bg-transparent hover:bg-carbon-900/60'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>Soporte Técnico</span>
          </button>
        </div>

        {/* Modal Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8" id="modal-scroll-area">
          <AnimatePresence mode="wait">
            {activeTab === 'privacy' && (
              <motion.div
                key="tab-privacy"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col gap-6"
              >
                <div className="flex items-start gap-4 p-5 rounded-2xl bg-brand-cyan/5 border border-brand-cyan/10">
                  <Cpu className="w-6 h-6 text-brand-cyan flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1">Criptografía Avanzada en PlacaID</h4>
                    <p className="text-xs text-carbon-300 leading-relaxed">
                      Utilizamos microcontroladores pasivos con encriptación a nivel de circuito integrado. El chip de silicio no contiene datos legibles en texto plano, garantizando el 100% de la anonimidad de tus datos de conducción a menos que escanees de forma autorizada en un taller certificado de la red.
                    </p>
                  </div>
                </div>

                <div className="space-y-4 text-xs text-carbon-300 leading-relaxed">
                  <section className="space-y-2">
                    <h3 className="text-sm font-bold text-white font-sans flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-cyan" />
                      1. Responsable del Tratamiento
                    </h3>
                    <p className="pl-3">
                      <strong>PlacaID Platform S.A. de C.V.</strong>, con domicilio en Ciudad de México, México, y oficinas regionales en Madrid (España) y Bogotá (Colombia), es el único propietario y administrador de la infraestructura descentralizada de pasaportes vehiculares y de la encriptación de placas inteligentes asociadas al ID <strong>{plate.plateNumber}</strong>.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h3 className="text-sm font-bold text-white font-sans flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-cyan" />
                      2. Datos Personales Recabados
                    </h3>
                    <p className="pl-3">
                      Recopilamos la información técnica necesaria para certificar las condiciones operativas de tu auto. Estos datos incluyen: placa vehicular (<strong>{plate.plateNumber}</strong>), ciudad de tránsito (<strong>{plate.city}</strong>), marca y especificaciones del motor, bitácoras de kilometraje diario, reportes de fallos OBD-II guardados por tu mecánico, recibos del taller y el correo de autenticación segura Google ID ({session?.email || 'driver.club@gmail.com'}).
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h3 className="text-sm font-bold text-white font-sans flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-cyan" />
                      3. Seguridad Física y Almacenamiento Criptográfico
                    </h3>
                    <p className="pl-3">
                      La información recopilada se almacena en contenedores cerrados con encriptación AES-256 en la nube. Las placas metálicas NFC se validan a través de tokens web JSON firmados asimétricamente. Ningún taller o tercero no autorizado puede escribir de forma maliciosa en el chip o alterar los kilómetros de forma fraudulenta.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h3 className="text-sm font-bold text-white font-sans flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-cyan" />
                      4. Ejercicio de los Derechos ARCO
                    </h3>
                    <p className="pl-3">
                      Puedes revocar el consentimiento del uso de tus datos vehiculares o solicitar la exportación total en formato JSON para llevarla a otro taller en cualquier momento enviando un correo con firma digital a <span className="text-brand-cyan underline">soporte@placaid.com</span>. El expediente físico se purgará de forma inmediata tras validar la propiedad legal de la matrícula vehicular.
                    </p>
                  </section>
                </div>
              </motion.div>
            )}

            {activeTab === 'warranty' && (
              <motion.div
                key="tab-warranty"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col gap-6"
              >
                <div className="flex items-start gap-4 p-5 rounded-2xl bg-brand-lime/5 border border-brand-lime/10">
                  <Wrench className="w-6 h-6 text-brand-lime flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1">Garantía Automotriz Certificada PlacaID</h4>
                    <p className="text-xs text-carbon-300 leading-relaxed">
                      Todos los talleres afiliados a nuestra red se comprometen contractualmente a respaldar la mano de obra registrada en esta plataforma. El millaje actúa como sello inmutable de vigencia para mayor claridad de ambas partes.
                    </p>
                  </div>
                </div>

                <div className="space-y-4 text-xs text-carbon-300 leading-relaxed">
                  <section className="space-y-2">
                    <h3 className="text-sm font-bold text-white font-sans flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-lime" />
                      1. Garantía del Tag de Metal o Sticker Inteligente NFC
                    </h3>
                    <p className="pl-3">
                      La matrícula PlacaID física cuenta con <strong>Garantía de por Vida</strong>. Ante cualquier desmagnetización o falla de lectura pasiva debida al desgaste por lavado, lluvia ácida o altas temperaturas del cofre/parrilla, repondremos el dispositivo sin costo en cualquier distribuidor autorizado.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h3 className="text-sm font-bold text-white font-sans flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-lime" />
                      2. Cobertura Estándar de Servicios Técnicos
                    </h3>
                    <p className="pl-3">
                      Las reparaciones mecánicas generales amparadas bajo el expediente PlacaID cuentan con <strong>12 meses o 15,000 km</strong> de cobertura. La fecha y millaje impresos en la base de datos inmutable actúan como la prueba fehaciente para reclamos.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h3 className="text-sm font-bold text-white font-sans flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-lime" />
                      3. Proceso para Reclamos de Garantía
                    </h3>
                    <p className="pl-3">
                      En caso de un fallo secundario de una pieza reemplazada, el conductor acude al taller de la red. El mecánico escaneará la placa con su smartphone y la plataforma validará de inmediato si el plazo está vigente, autorizando el servicio sin burocracia ni necesidad de tickets físicos extraviados.
                    </p>
                  </section>
                </div>
              </motion.div>
            )}

            {activeTab === 'support' && (
              <motion.div
                key="tab-support"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 md:grid-cols-12 gap-8"
              >
                {/* Left Column: Form */}
                <div className="md:col-span-7 flex flex-col gap-4">
                  <h3 className="text-base font-black text-white">Enviar Ticket de Soporte Inmediato</h3>
                  <p className="text-xs text-carbon-400">
                    Nuestros ingenieros responderán directamente al correo electrónico asociado.
                  </p>

                  <form onSubmit={handleSupportSubmit} className="flex flex-col gap-4 mt-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-carbon-400 uppercase tracking-wider">Tu Nombre</label>
                        <input 
                          type="text" 
                          required
                          value={supportName}
                          onChange={(e) => setSupportName(e.target.value)}
                          className="px-3.5 py-2.5 bg-carbon-950 border border-carbon-800 rounded-xl text-xs text-white focus:outline-none focus:border-brand-cyan font-semibold"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-carbon-400 uppercase tracking-wider">Email de Contacto</label>
                        <input 
                          type="email" 
                          required
                          value={supportEmail}
                          onChange={(e) => setSupportEmail(e.target.value)}
                          className="px-3.5 py-2.5 bg-carbon-950 border border-carbon-800 rounded-xl text-xs text-white focus:outline-none focus:border-brand-cyan font-mono"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-carbon-400 uppercase tracking-wider">Tipo de Incidencia</label>
                      <select 
                        value={supportType}
                        onChange={(e) => setSupportType(e.target.value)}
                        className="px-3.5 py-2.5 bg-carbon-950 border border-carbon-800 rounded-xl text-xs text-white focus:outline-none focus:border-brand-cyan"
                      >
                        <option value="NFC_READ_ERROR">Error al escanear la placa NFC</option>
                        <option value="MILEAGE_CORRECTION">Deseo corregir kilometraje registrado</option>
                        <option value="OWNER_TRANSFER">Transferir propiedad del vehículo / Baja de placa</option>
                        <option value="SHOP_AFFILIATION">Quiero afiliar mi taller mecánico</option>
                        <option value="BUG_REPORT">Error en el portal de software</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-carbon-400 uppercase tracking-wider">Detalles del Caso</label>
                      <textarea 
                        required
                        rows={4}
                        placeholder="Describe detalladamente qué ocurre con la matrícula o el expediente..."
                        value={supportMsg}
                        onChange={(e) => setSupportMsg(e.target.value)}
                        className="px-3.5 py-2.5 bg-carbon-950 border border-carbon-800 rounded-xl text-xs text-white focus:outline-none focus:border-brand-cyan resize-none leading-relaxed"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting || formSubmitted}
                      className="py-3 px-5 bg-brand-cyan hover:bg-brand-cyan/80 text-black text-xs font-black tracking-wider uppercase rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98 disabled:opacity-55"
                    >
                      {submitting ? (
                        <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      <span>Enviar Solicitud</span>
                    </button>

                    <AnimatePresence>
                      {formSubmitted && (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/20 text-brand-lime text-xs flex items-center gap-2"
                        >
                          <CheckCircle2 className="w-4.5 h-4.5 text-brand-lime flex-shrink-0" />
                          <span>¡Ticket #P-{Math.floor(Math.random() * 90000 + 10000)} enviado con éxito! Nos comunicaremos en menos de 2 horas.</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </form>
                </div>

                {/* Right Column: FAQ & Diagnostic Bundle */}
                <div className="md:col-span-5 flex flex-col gap-6">
                  <div className="bg-carbon-900/40 border border-carbon-800/80 rounded-2xl p-5 flex flex-col gap-3">
                    <span className="text-[9px] font-mono font-bold text-brand-cyan uppercase tracking-widest block">Línea de Atención</span>
                    <h4 className="text-xs font-bold text-white flex items-center gap-2">
                      <PhoneCall className="w-4 h-4 text-brand-cyan" />
                      <span>Soporte Directo Red Talleres</span>
                    </h4>
                    <p className="text-xs text-carbon-400 leading-relaxed">
                      Si eres mecánico de la red autorizada PlacaID y presentas inconvenientes escribiendo los chips con la app móvil de inducción magnética, comunícate al canal exclusivo:
                    </p>
                    <span className="font-mono text-xs font-bold text-brand-lime bg-black px-3 py-1.5 rounded border border-carbon-800 text-center">
                      +1 (800) 555-PLACAID
                    </span>
                  </div>

                  <div className="bg-carbon-900/40 border border-carbon-800/80 rounded-2xl p-5 flex flex-col gap-3">
                    <span className="text-[9px] font-mono font-bold text-brand-cyan uppercase tracking-widest block">Autodiagnóstico Técnico</span>
                    <h4 className="text-xs font-bold text-white flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-brand-cyan" />
                      <span>Paquete de Metadatos del Sistema</span>
                    </h4>
                    <p className="text-xs text-carbon-400 leading-relaxed">
                      Descarga el paquete que contiene los logs criptográficos activos y el estado de tu matrícula, útil para acelerar la resolución de tu ticket de soporte.
                    </p>
                    <button
                      onClick={handleDownloadPolicy}
                      className="py-2.5 px-4 bg-carbon-950 hover:bg-carbon-900 border border-carbon-800 hover:border-carbon-700 text-xs text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                    >
                      <Download className="w-4 h-4 text-brand-cyan" />
                      <span>Descargar Log de Diagnóstico</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-carbon-900 flex flex-col sm:flex-row justify-between items-center gap-4 bg-carbon-950/60 sticky bottom-0 z-20">
          <div className="flex items-center gap-2 text-[10px] text-carbon-500 font-mono">
            <span className="px-1.5 py-0.5 rounded bg-carbon-900 border border-carbon-800 text-brand-lime">v1.0.3-RELEASE</span>
            <span>SECURE_ID: {plate.plateNumber}-AES-GCM</span>
          </div>
          
          <button
            onClick={handleDownloadPolicy}
            className="w-full sm:w-auto py-2.5 px-5 rounded-2xl bg-carbon-900 hover:bg-carbon-850 border border-carbon-800 hover:border-carbon-700 text-white font-black tracking-wide text-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <Download className="w-4.5 h-4.5 text-brand-cyan" />
            <span>Descargar Documento en Texto Completo</span>
          </button>
        </div>
      </div>
    </div>
  );
}
