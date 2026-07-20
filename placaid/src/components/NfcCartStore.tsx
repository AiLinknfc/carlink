/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingBag, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard, 
  CheckCircle, 
  Sparkles, 
  Wifi, 
  QrCode, 
  Truck, 
  MapPin, 
  Smartphone, 
  ArrowRight 
} from 'lucide-react';
import { CartItem } from '../types';

interface NfcCartStoreProps {
  plateNumber: string;
  carBrand: string;
}

const PRODUCTS: Omit<CartItem, 'quantity'>[] = [
  {
    id: 'prod-carbon-card',
    name: 'Tarjeta PlacaID Fibra de Carbono NFC',
    price: 120000,
    description: 'Tarjeta de fibra de carbono aeroespacial de alta densidad con chip NFC NTAG213 ultrarrápido y código QR de respaldo grabado con láser.',
    imageUrl: 'https://images.unsplash.com/photo-154224155-8d04cb21cd6c?q=80&w=300&auto=format&fit=crop',
    type: 'card'
  },
  {
    id: 'prod-metal-keychain',
    name: 'Llavero de Titanio PlacaID NFC',
    price: 65000,
    description: 'Llavero robusto fabricado en aleación de titanio con chip NFC impermeable y grabado láser de alta precisión con tu número de placa.',
    imageUrl: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?q=80&w=300&auto=format&fit=crop',
    type: 'keychain'
  },
  {
    id: 'prod-glass-sticker',
    name: 'Sticker de Parabrisas Inteligente NFC',
    price: 45000,
    description: 'Adhesivo reflectivo resistente a rayos UV con chip NFC integrado y QR para parabrisas de vehículos. Permite escaneo sin contacto físico.',
    imageUrl: 'https://images.unsplash.com/photo-1507537297725-24a1c029d3ca?q=80&w=300&auto=format&fit=crop',
    type: 'sticker'
  }
];

export default function NfcCartStore({ plateNumber, carBrand }: NfcCartStoreProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [shippingName, setShippingName] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingPhone, setShippingPhone] = useState('');
  const [isOrdered, setIsOrdered] = useState(false);
  const [isScanningSimulated, setIsScanningSimulated] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);

  // Add item to cart
  const addToCart = (product: Omit<CartItem, 'quantity'>) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  // Remove or decrement
  const updateQuantity = (id: string, amount: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.id === id) {
          const newQty = item.quantity + amount;
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        return item;
      }).filter(Boolean) as CartItem[];
    });
  };

  // Remove single item
  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  // Clear cart
  const clearCart = () => setCart([]);

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shippingCost = subtotal > 150000 ? 0 : 12000;
  const total = subtotal + shippingCost;

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    setIsOrdered(true);
    // Keep cart items to show in invoice, clear later if desired
  };

  const handleSimulateScan = () => {
    setIsScanningSimulated(true);
    setScanSuccess(false);

    // Simulate phone detecting NFC tag
    setTimeout(() => {
      setScanSuccess(true);
      setTimeout(() => {
        setIsScanningSimulated(false);
      }, 3500);
    }, 2500);
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-8 text-left" id="nfc-cart-store-section">
      {/* Title block */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="px-3 py-1 text-[10px] font-mono font-bold tracking-widest text-brand-lime bg-brand-lime/10 border border-brand-lime/20 rounded-full uppercase">
            TIENDA OFICIAL PLACAID
          </span>
          <h3 className="text-2xl font-black text-white mt-1.5 tracking-tight">Solicita tu Tarjeta Física e Inteligente</h3>
          <p className="text-xs text-carbon-400 mt-1">
            Personaliza accesorios NFC y QR enlazados automáticamente a tu placa <span className="text-brand-lime font-mono font-bold">{plateNumber}</span> y marca <span className="text-brand-cyan font-bold">{carBrand || '[No registrada]'}</span>.
          </p>
        </div>

        {/* Floating Scan Simulator Activator */}
        <button
          onClick={handleSimulateScan}
          className="py-2.5 px-4 bg-gradient-to-r from-brand-cyan/20 to-brand-lime/20 hover:from-brand-cyan hover:to-brand-lime hover:text-black border border-brand-cyan/30 rounded-xl text-xs font-extrabold tracking-wide text-brand-cyan transition-all flex items-center gap-2 cursor-pointer shadow-lg active:scale-95"
        >
          <Smartphone className="w-4 h-4 animate-bounce" />
          <span>Simulador Escaneo NFC</span>
        </button>
      </div>

      {!isOrdered ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Products List (Col span 7) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <span className="text-xs font-bold text-carbon-400 uppercase tracking-widest block px-1">Accesorios Disponibles</span>
            
            <div className="flex flex-col gap-4">
              {PRODUCTS.map((prod) => {
                const inCart = cart.find(item => item.id === prod.id);
                return (
                  <div 
                    key={prod.id} 
                    className="glass-panel p-5 rounded-3xl border border-carbon-800 flex flex-col sm:flex-row gap-5 hover:border-carbon-700 transition-all relative overflow-hidden"
                  >
                    {/* Floating customization tag */}
                    <div className="absolute top-3 right-3 bg-black/80 px-2 py-0.5 rounded-lg border border-white/5 text-[9px] font-mono text-brand-lime font-bold">
                      Personalizado: {plateNumber}
                    </div>

                    {/* Left: Product visualization rendering */}
                    <div className="w-full sm:w-32 h-24 rounded-2xl bg-gradient-to-tr from-carbon-900 to-black border border-carbon-800 flex-shrink-0 flex items-center justify-center relative overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-r from-brand-cyan/5 to-brand-lime/5 opacity-40" />
                      
                      {prod.type === 'card' && (
                        <div className="w-20 h-12 bg-carbon-950 border-2 border-brand-lime rounded-lg shadow-2xl flex flex-col items-center justify-between p-1.5 select-none rotate-6 group-hover:rotate-12 transition-transform">
                          <div className="flex justify-between w-full text-[6px] font-mono text-brand-lime">
                            <span>PLACAID</span>
                            <Wifi className="w-1.5 h-1.5" />
                          </div>
                          <span className="text-[9px] font-black tracking-wider text-white font-mono">{plateNumber}</span>
                          <span className="text-[5px] text-carbon-500 font-bold tracking-widest uppercase">{carBrand || 'SPORTS'}</span>
                        </div>
                      )}

                      {prod.type === 'keychain' && (
                        <div className="w-10 h-14 bg-gradient-to-b from-carbon-800 to-carbon-950 border border-brand-cyan rounded-xl flex flex-col items-center justify-between p-1 shadow-xl rotate-12 group-hover:scale-105 transition-all">
                          <div className="w-2.5 h-2.5 rounded-full border border-carbon-700 bg-carbon-950 mt-0.5" />
                          <QrCode className="w-4 h-4 text-brand-cyan my-1" />
                          <span className="text-[5px] text-white font-black font-mono tracking-tighter leading-none">{plateNumber}</span>
                        </div>
                      )}

                      {prod.type === 'sticker' && (
                        <div className="w-16 h-16 rounded-full border border-dashed border-brand-lime/40 flex flex-col items-center justify-center p-1 bg-black/60 scale-95 group-hover:scale-100 transition-all">
                          <Smartphone className="w-4 h-4 text-brand-lime animate-pulse" />
                          <span className="text-[6px] text-white font-black font-mono tracking-widest leading-none mt-1">{plateNumber}</span>
                          <span className="text-[4px] text-carbon-500 font-bold uppercase tracking-widest">NFC GLASSTAG</span>
                        </div>
                      )}
                    </div>

                    {/* Right: details */}
                    <div className="flex-1 flex flex-col justify-between gap-3">
                      <div>
                        <h4 className="text-base font-extrabold text-white leading-tight">{prod.name}</h4>
                        <p className="text-xs text-carbon-400 mt-1 leading-relaxed">{prod.description}</p>
                      </div>

                      <div className="flex justify-between items-center gap-4">
                        <span className="text-base font-black text-white font-mono">
                          ${prod.price.toLocaleString('es-CO')} COP
                        </span>

                        {inCart ? (
                          <div className="flex items-center gap-2.5 bg-carbon-900 px-3 py-1.5 rounded-xl border border-carbon-800">
                            <button 
                              onClick={() => updateQuantity(prod.id, -1)}
                              className="text-carbon-400 hover:text-white transition-colors"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="font-mono font-bold text-white text-xs">{inCart.quantity}</span>
                            <button 
                              onClick={() => addToCart(prod)}
                              className="text-carbon-400 hover:text-white transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => addToCart(prod)}
                            className="py-1.5 px-4 bg-brand-cyan hover:bg-brand-cyan/80 text-black text-xs font-black tracking-wide rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <ShoppingBag className="w-3.5 h-3.5" />
                            <span>Añadir al Carro</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Checkout & Summary (Col span 5) */}
          <div className="lg:col-span-5 flex flex-col gap-6 sticky top-8">
            <span className="text-xs font-bold text-carbon-400 uppercase tracking-widest block px-1">Resumen del Pedido</span>

            <div className="glass-panel p-6 rounded-3xl border border-carbon-800 shadow-xl flex flex-col gap-5">
              {cart.length === 0 ? (
                <div className="py-10 text-center flex flex-col items-center justify-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-carbon-900 border border-carbon-800 flex items-center justify-center text-carbon-500">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-white block">Tu carrito está vacío</span>
                    <span className="text-xs text-carbon-500">Escoge uno de los productos de la izquierda para comenzar.</span>
                  </div>
                </div>
              ) : (
                <>
                  {/* Cart Items list */}
                  <div className="flex flex-col gap-3 max-h-48 overflow-y-auto pr-1">
                    {cart.map((item) => (
                      <div key={item.id} className="flex justify-between items-center gap-3 border-b border-carbon-900 pb-2.5">
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-white block truncate leading-tight">{item.name}</span>
                          <span className="text-[10px] text-carbon-400 font-mono mt-0.5">
                            {item.quantity} x ${item.price.toLocaleString('es-CO')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-white text-xs">${(item.price * item.quantity).toLocaleString('es-CO')}</span>
                          <button 
                            onClick={() => removeFromCart(item.id)}
                            className="text-carbon-500 hover:text-red-400 p-1 rounded-lg"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pricing break downs */}
                  <div className="flex flex-col gap-2 border-b border-carbon-900 pb-4">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-carbon-400">Subtotal del Pedido</span>
                      <span className="font-mono text-white">${subtotal.toLocaleString('es-CO')} COP</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-carbon-400">Envío Certificado</span>
                      <span className="font-mono text-white">
                        {shippingCost === 0 ? <span className="text-brand-lime font-bold">GRATIS</span> : `$${shippingCost.toLocaleString('es-CO')} COP`}
                      </span>
                    </div>
                    {shippingCost > 0 && (
                      <span className="text-[9px] text-brand-cyan/80 bg-brand-cyan/5 p-1 px-2 rounded-lg border border-brand-cyan/10">
                        ¡Agrega ${(150000 - subtotal).toLocaleString('es-CO')} COP más para Envío Gratis!
                      </span>
                    )}
                    <div className="flex justify-between items-center text-sm font-bold border-t border-carbon-900 pt-3 mt-1">
                      <span className="text-white">Total a Pagar</span>
                      <span className="font-mono text-brand-lime">${total.toLocaleString('es-CO')} COP</span>
                    </div>
                  </div>

                  {/* Shipping address form */}
                  <form onSubmit={handleCheckoutSubmit} className="flex flex-col gap-3.5">
                    <span className="text-[10px] font-bold text-carbon-400 uppercase tracking-widest block">Información de Despacho</span>
                    
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-carbon-500 uppercase">Nombre Completo</label>
                      <input 
                        type="text" 
                        required
                        placeholder="ej. Juan Pablo Montoya"
                        value={shippingName}
                        onChange={(e) => setShippingName(e.target.value)}
                        className="w-full px-3 py-2 bg-carbon-950 border border-carbon-800 rounded-lg text-xs text-white focus:outline-none focus:border-brand-cyan"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-carbon-500 uppercase">Dirección de Entrega</label>
                      <input 
                        type="text" 
                        required
                        placeholder="ej. Calle 127 # 15-45, Apto 502, Bogotá"
                        value={shippingAddress}
                        onChange={(e) => setShippingAddress(e.target.value)}
                        className="w-full px-3 py-2 bg-carbon-950 border border-carbon-800 rounded-lg text-xs text-white focus:outline-none focus:border-brand-cyan"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-carbon-500 uppercase">Teléfono Móvil</label>
                      <input 
                        type="tel" 
                        required
                        placeholder="ej. 315 412 9876"
                        value={shippingPhone}
                        onChange={(e) => setShippingPhone(e.target.value)}
                        className="w-full px-3 py-2 bg-carbon-950 border border-carbon-800 rounded-lg text-xs text-white focus:outline-none focus:border-brand-cyan"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full relative group overflow-hidden bg-gradient-to-r from-brand-lime to-brand-cyan text-black font-black py-3 px-5 rounded-xl hover:shadow-[0_0_20px_rgba(204,255,0,0.2)] transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 text-xs uppercase tracking-wide"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Proceder al Despacho</span>
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Order Complete invoice view */
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-2xl mx-auto glass-panel p-8 rounded-3xl border border-brand-lime/30 text-center flex flex-col items-center gap-6 relative overflow-hidden"
        >
          {/* Decorative background glow */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-brand-lime/10 rounded-full filter blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-brand-cyan/10 rounded-full filter blur-3xl pointer-events-none" />

          <div className="w-16 h-16 rounded-full bg-brand-lime/10 border border-brand-lime/20 flex items-center justify-center text-brand-lime">
            <CheckCircle className="w-10 h-10" />
          </div>

          <div>
            <h4 className="text-2xl font-black text-white tracking-tight">¡Orden Recibida con Éxito!</h4>
            <p className="text-xs text-carbon-400 mt-1.5 max-w-md mx-auto leading-relaxed">
              Hola <span className="text-white font-bold">{shippingName}</span>, tu solicitud para la tarjeta física de PlacaID <span className="text-brand-lime font-mono font-bold">{plateNumber}</span> ha sido registrada en el sistema de producción.
            </p>
          </div>

          <div className="w-full bg-carbon-900 border border-carbon-800 p-5 rounded-2xl flex flex-col gap-3 text-xs text-left">
            <span className="font-bold text-white border-b border-carbon-800 pb-2 flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-brand-lime" />
              <span>Resumen de Despacho</span>
            </span>
            <div className="grid grid-cols-2 gap-4 mt-1">
              <div>
                <span className="text-carbon-500 font-bold block uppercase text-[9px]">DIRECCIÓN</span>
                <span className="text-carbon-200 font-semibold">{shippingAddress}</span>
              </div>
              <div>
                <span className="text-carbon-500 font-bold block uppercase text-[9px]">TELÉFONO</span>
                <span className="text-carbon-200 font-semibold font-mono">{shippingPhone}</span>
              </div>
            </div>
            <div className="border-t border-carbon-800 pt-2.5 flex justify-between items-center text-xs">
              <span className="text-carbon-400">Total Facturado (Simulado)</span>
              <span className="text-brand-lime font-mono font-black">${total.toLocaleString('es-CO')} COP</span>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => {
                setIsOrdered(false);
                clearCart();
              }}
              className="py-2.5 px-5 bg-carbon-800 border border-carbon-700 rounded-xl text-xs font-bold text-carbon-300 hover:text-white transition-colors cursor-pointer"
            >
              Comprar de Nuevo
            </button>
            <button
              onClick={handleSimulateScan}
              className="py-2.5 px-5 bg-brand-cyan text-black rounded-xl text-xs font-black transition-all hover:shadow-lg flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Smartphone className="w-4 h-4" />
              <span>Escanear Tarjeta Virtual</span>
            </button>
          </div>
        </motion.div>
      )}

      {/* NFC SCANNING DIALOG MODAL SIMULATOR */}
      <AnimatePresence>
        {isScanningSimulated && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm bg-carbon-950 border border-carbon-800 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center gap-6"
            >
              {/* Top scanner graphic */}
              <div className="w-24 h-24 rounded-full bg-brand-cyan/10 border-2 border-dashed border-brand-cyan flex items-center justify-center relative">
                {scanSuccess ? (
                  <CheckCircle className="w-12 h-12 text-brand-lime animate-pulse" />
                ) : (
                  <div className="absolute inset-2 rounded-full border-2 border-brand-cyan animate-ping opacity-40" />
                )}
                <Wifi className="w-10 h-10 text-brand-cyan rotate-90" />
              </div>

              <div>
                <h4 className="text-lg font-black text-white">
                  {scanSuccess ? '¡NFC Escaneado Correctamente!' : 'Aproxima tu Tarjeta PlacaID'}
                </h4>
                <p className="text-xs text-carbon-400 mt-2 max-w-xs mx-auto leading-relaxed">
                  {scanSuccess 
                    ? `Sincronizando expediente de la placa ${plateNumber} de marca ${carBrand || 'General'}...` 
                    : 'Buscando señal NFC de tu teléfono inteligente. Mantén el accesorio cerca.'
                  }
                </p>
              </div>

              {scanSuccess && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-full bg-carbon-900 border border-carbon-800 p-3 rounded-xl flex items-center gap-3 text-left text-xs"
                >
                  <div className="px-2 py-1 bg-black border-2 border-brand-lime rounded-lg font-mono font-bold text-brand-lime text-[10px]">
                    {plateNumber}
                  </div>
                  <div>
                    <span className="font-extrabold text-white block">Socio PlacaID Activado</span>
                    <span className="text-carbon-400">Canales digitales vinculados con éxito.</span>
                  </div>
                </motion.div>
              )}

              <button
                onClick={() => setIsScanningSimulated(false)}
                className="w-full py-2 bg-carbon-800 hover:bg-carbon-700 text-xs font-semibold text-carbon-300 rounded-xl transition-colors cursor-pointer"
              >
                Cerrar Simulación
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
