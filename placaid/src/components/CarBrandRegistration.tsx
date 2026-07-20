/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Car, Check, Award, Compass, Sparkles, Filter, Search } from 'lucide-react';
import { UserVehicle } from '../types';

interface CarBrandRegistrationProps {
  vehicle: UserVehicle | null;
  onRegister: (v: UserVehicle) => void;
}

// 24 highly prominent brands commercially relevant in Colombia today
const CAR_BRANDS = [
  {
    name: 'Renault',
    category: 'Hatchback',
    badgeUrl: 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?q=80&w=150&auto=format&fit=crop',
    carUrl: 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?q=80&w=800&auto=format&fit=crop',
    tagline: 'Líder histórico en las calles de Colombia con vehículos ágiles y duraderos.'
  },
  {
    name: 'Chevrolet',
    category: 'Sedán',
    badgeUrl: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?q=80&w=150&auto=format&fit=crop',
    carUrl: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?q=80&w=800&auto=format&fit=crop',
    tagline: 'El carro de la familia colombiana, confiable y con repuestos en cada rincón.'
  },
  {
    name: 'Toyota',
    category: 'SUV',
    badgeUrl: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?q=80&w=150&auto=format&fit=crop',
    carUrl: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?q=80&w=800&auto=format&fit=crop',
    tagline: 'La fuerza indestructible elegida para la topografía extrema de las cordilleras colombianas.'
  },
  {
    name: 'Mazda',
    category: 'SUV',
    badgeUrl: 'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?q=80&w=150&auto=format&fit=crop',
    carUrl: 'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?q=80&w=800&auto=format&fit=crop',
    tagline: 'Diseño Kodo y tecnología SkyActiv para una conducción premium y sofisticada.'
  },
  {
    name: 'Kia',
    category: 'SUV',
    badgeUrl: 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?q=80&w=150&auto=format&fit=crop',
    carUrl: 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?q=80&w=800&auto=format&fit=crop',
    tagline: 'Diseño audaz y garantías líderes para moverte con estilo por las metrópolis.'
  },
  {
    name: 'Hyundai',
    category: 'Sedán',
    badgeUrl: 'https://images.unsplash.com/photo-1502877338535-766e1452684a?q=80&w=150&auto=format&fit=crop',
    carUrl: 'https://images.unsplash.com/photo-1502877338535-766e1452684a?q=80&w=800&auto=format&fit=crop',
    tagline: 'Tecnología coreana de vanguardia hecha para resistir el día a día.'
  },
  {
    name: 'Suzuki',
    category: 'SUV',
    badgeUrl: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?q=80&w=150&auto=format&fit=crop',
    carUrl: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?q=80&w=800&auto=format&fit=crop',
    tagline: 'Eficiencia de combustible incomparable y agilidad 4x4 legendaria.'
  },
  {
    name: 'BYD',
    category: 'Eléctrico',
    badgeUrl: 'https://images.unsplash.com/photo-1563720223185-11003d516935?q=80&w=150&auto=format&fit=crop',
    carUrl: 'https://images.unsplash.com/photo-1563720223185-11003d516935?q=80&w=800&auto=format&fit=crop',
    tagline: 'Liderando la transición hacia la movilidad eléctrica inteligente en Colombia.'
  },
  {
    name: 'BMW',
    category: 'Deportivo',
    badgeUrl: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?q=80&w=150&auto=format&fit=crop',
    carUrl: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?q=80&w=800&auto=format&fit=crop',
    tagline: 'El placer de conducir con ingeniería deportiva alemana de alto nivel.'
  },
  {
    name: 'Mercedes-Benz',
    category: 'Sedán',
    badgeUrl: 'https://images.unsplash.com/photo-1617531653332-bd46c24f2068?q=80&w=150&auto=format&fit=crop',
    carUrl: 'https://images.unsplash.com/photo-1617531653332-bd46c24f2068?q=80&w=800&auto=format&fit=crop',
    tagline: 'El pináculo del lujo automotriz y la sofisticación tecnológica.'
  },
  {
    name: 'Nissan',
    category: 'Pick-up',
    badgeUrl: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?q=80&w=150&auto=format&fit=crop',
    carUrl: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?q=80&w=800&auto=format&fit=crop',
    tagline: 'Innovación que emociona. Robustez japonesa para el agro y la ciudad.'
  },
  {
    name: 'Ford',
    category: 'Pick-up',
    badgeUrl: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?q=80&w=150&auto=format&fit=crop',
    carUrl: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?q=80&w=800&auto=format&fit=crop',
    tagline: 'Nacidos Fuertes. Potencia americana para superar cualquier desafío.'
  },
  {
    name: 'Volkswagen',
    category: 'Hatchback',
    badgeUrl: 'https://images.unsplash.com/photo-1489824900674-917625d51bb4?q=80&w=150&auto=format&fit=crop',
    carUrl: 'https://images.unsplash.com/photo-1489824900674-917625d51bb4?q=80&w=800&auto=format&fit=crop',
    tagline: 'El carro del pueblo alemán con una calidad de ensamble de clase mundial.'
  },
  {
    name: 'Foton',
    category: 'Pick-up',
    badgeUrl: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?q=80&w=150&auto=format&fit=crop',
    carUrl: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?q=80&w=800&auto=format&fit=crop',
    tagline: 'Potencia diésel y fuerza de carga para mover la economía nacional.'
  },
  {
    name: 'Porsche',
    category: 'Deportivo',
    badgeUrl: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?q=80&w=150&auto=format&fit=crop',
    carUrl: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?q=80&w=800&auto=format&fit=crop',
    tagline: 'Ingeniería de Stuttgart creada para domar los circuitos y las carreteras.'
  },
  {
    name: 'Ferrari',
    category: 'Deportivo',
    badgeUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=150&auto=format&fit=crop',
    carUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=800&auto=format&fit=crop',
    tagline: 'Pura pasión de Maranello con el rugido inconfundible del cavallino rampante.'
  },
  {
    name: 'Audi',
    category: 'SUV',
    badgeUrl: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?q=80&w=150&auto=format&fit=crop',
    carUrl: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?q=80&w=800&auto=format&fit=crop',
    tagline: 'A la vanguardia de la tecnología, elegancia ejecutiva y tracción Quattro.'
  },
  {
    name: 'Honda',
    category: 'Sedán',
    badgeUrl: 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?q=80&w=150&auto=format&fit=crop',
    carUrl: 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?q=80&w=800&auto=format&fit=crop',
    tagline: 'El poder de los sueños. Ingeniería de precisión y máxima eficiencia.'
  },
  {
    name: 'Jeep',
    category: 'SUV',
    badgeUrl: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?q=80&w=150&auto=format&fit=crop',
    carUrl: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?q=80&w=800&auto=format&fit=crop',
    tagline: 'Auténtica libertad 4x4. Descubre el mundo sin límites de asfalto.'
  },
  {
    name: 'Mitsubishi',
    category: 'Pick-up',
    badgeUrl: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?q=80&w=150&auto=format&fit=crop',
    carUrl: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?q=80&w=800&auto=format&fit=crop',
    tagline: 'Trayectoria en rally y robustez para resistir cualquier trocha colombiana.'
  },
  {
    name: 'Subaru',
    category: 'SUV',
    badgeUrl: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?q=80&w=150&auto=format&fit=crop',
    carUrl: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?q=80&w=800&auto=format&fit=crop',
    tagline: 'Motor Boxer y Symmetrical AWD. Seguridad y tracción total en lluvia.'
  },
  {
    name: 'JAC',
    category: 'Pick-up',
    badgeUrl: 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?q=80&w=150&auto=format&fit=crop',
    carUrl: 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?q=80&w=800&auto=format&fit=crop',
    tagline: 'Rentabilidad, potencia comercial y excelente desempeño de transporte.'
  },
  {
    name: 'MG',
    category: 'Eléctrico',
    badgeUrl: 'https://images.unsplash.com/photo-1563720223185-11003d516935?q=80&w=150&auto=format&fit=crop',
    carUrl: 'https://images.unsplash.com/photo-1563720223185-11003d516935?q=80&w=800&auto=format&fit=crop',
    tagline: 'Herencia británica renacida con tecnología eléctrica de última generación.'
  },
  {
    name: 'Chery',
    category: 'Eléctrico',
    badgeUrl: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?q=80&w=150&auto=format&fit=crop',
    carUrl: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?q=80&w=800&auto=format&fit=crop',
    tagline: 'Eco-movilidad accesible, compactos dinámicos e híbridos de gran autonomía.'
  }
];

const CATEGORIES = ['Todos', 'SUV', 'Sedán', 'Hatchback', 'Deportivo', 'Pick-up', 'Eléctrico'];

export default function CarBrandRegistration({ vehicle, onRegister }: CarBrandRegistrationProps) {
  const [selectedBrand, setSelectedBrand] = useState(() => {
    if (vehicle) {
      const match = CAR_BRANDS.find(b => b.name.toLowerCase() === vehicle.brand.toLowerCase());
      if (match) return match;
    }
    return CAR_BRANDS[0];
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [model, setModel] = useState(vehicle?.model || '');
  const [year, setYear] = useState(vehicle?.year || '2025');
  const [color, setColor] = useState(vehicle?.color || 'Gris Carbono Metálico');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!model.trim()) return;

    const updatedVehicle: UserVehicle = {
      brand: selectedBrand.name,
      model: model.trim(),
      year: year,
      color: color,
      badgeUrl: selectedBrand.badgeUrl,
      carUrl: selectedBrand.carUrl
    };

    onRegister(updatedVehicle);
    setSuccessMsg('¡Vehículo registrado con éxito en PlacaID!');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // Filter logic
  const filteredBrands = CAR_BRANDS.filter((brand) => {
    const matchesSearch = brand.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'Todos' || brand.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleBrandSelect = (brand: typeof CAR_BRANDS[0]) => {
    setSelectedBrand(brand);
  };

  return (
    <div className="w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start text-left" id="car-brand-reg-section">
      {/* Left panel: Car brand selector form (Col span 7) */}
      <div className="lg:col-span-7 flex flex-col gap-6">
        <div className="glass-panel p-6 rounded-3xl border border-carbon-800 shadow-xl flex flex-col gap-5">
          <div>
            <h3 className="text-xl font-black text-white flex items-center gap-2">
              <Car className="w-5 h-5 text-brand-lime" />
              <span>Registro de Marca y Modelo</span>
            </h3>
            <p className="text-xs text-carbon-400 mt-1 leading-relaxed">
              Selecciona la marca comercial de tu auto, asocia su categoría y guárdala en tu perfil para sincronizar el historial técnico y preventivo.
            </p>
          </div>

          {/* Filtering and search controls */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-2">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-carbon-500" />
                <input
                  type="text"
                  placeholder="Buscar marca (ej. Renault, Toyota)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-carbon-950 border border-carbon-800 rounded-xl text-xs text-white placeholder-carbon-500 focus:outline-none focus:border-brand-lime"
                />
              </div>
            </div>

            {/* Category horizontal bar filters */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all border ${
                    activeCategory === cat
                      ? 'bg-brand-lime text-black border-brand-lime'
                      : 'bg-carbon-900/60 border-carbon-800 text-carbon-400 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Brands grid */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center px-1">
              <label className="text-[10px] font-black text-carbon-400 uppercase tracking-wider">
                Marcas en Colombia ({filteredBrands.length})
              </label>
              <span className="text-[10px] text-carbon-500 font-medium">Click para seleccionar</span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-56 overflow-y-auto pr-1 border border-carbon-900 rounded-xl p-2 bg-carbon-950/40">
              {filteredBrands.length > 0 ? (
                filteredBrands.map((b) => {
                  const isSelected = selectedBrand.name === b.name;
                  return (
                    <button
                      key={b.name}
                      type="button"
                      onClick={() => handleBrandSelect(b)}
                      className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-center relative ${
                        isSelected 
                          ? 'bg-brand-lime/10 border-brand-lime/40 text-white shadow-md' 
                          : 'bg-carbon-900/60 border-carbon-800/80 text-carbon-400 hover:text-white hover:border-carbon-700'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-carbon-950 flex items-center justify-center font-black text-xs text-white border border-white/5 relative overflow-hidden">
                        <img 
                          src={b.badgeUrl} 
                          alt={b.name} 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover" 
                        />
                        <div className="absolute inset-0 bg-black/10 hover:bg-transparent transition-colors" />
                      </div>
                      <span className="text-[10px] font-bold tracking-tight truncate w-full">{b.name}</span>
                      <span className="text-[7px] text-carbon-500 font-bold uppercase tracking-wider leading-none">{b.category}</span>
                      {isSelected && (
                        <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-brand-lime text-black flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </span>
                      )}
                    </button>
                  );
                })
              ) : (
                <div className="col-span-full py-8 text-center text-xs text-carbon-500">
                  Ninguna marca coincide con los filtros aplicados.
                </div>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4 border-t border-carbon-900 pt-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-carbon-400 uppercase tracking-wider">Modelo / Versión</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Duster Zen o Mazda 3 Grand Touring"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full px-4 py-2.5 bg-carbon-950 border border-carbon-800 rounded-xl text-xs text-white focus:border-brand-lime focus:outline-none transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-carbon-400 uppercase tracking-wider">Año de Fabricación</label>
                <select
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full px-4 py-2.5 bg-carbon-950 border border-carbon-800 rounded-xl text-xs text-white focus:border-brand-lime focus:outline-none transition-colors"
                >
                  {['2027', '2026', '2025', '2024', '2023', '2022', '2021', '2020', '2019', '2018', '2017', '2016', '2015', '2014', '2013', '2012'].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-carbon-400 uppercase tracking-wider">Color de Carrocería</label>
              <input
                type="text"
                placeholder="ej. Blanco Glaciar / Gris Platino"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-full px-4 py-2.5 bg-carbon-950 border border-carbon-800 rounded-xl text-xs text-white focus:border-brand-lime focus:outline-none transition-colors"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-brand-lime text-black font-extrabold rounded-xl hover:shadow-[0_0_20px_rgba(204,255,0,0.25)] transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 text-xs uppercase tracking-wide"
            >
              <Sparkles className="w-4 h-4" />
              <span>Registrar Ficha Vehicular</span>
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

      {/* Right panel: Digital Certificate & Vehicle Showcase (Col span 5) */}
      <div className="lg:col-span-5 flex flex-col gap-6">
        <div className="glass-panel rounded-3xl border border-carbon-800 overflow-hidden shadow-2xl relative">
          {/* Top image */}
          <div className="h-52 relative overflow-hidden bg-carbon-900">
            <img 
              src={selectedBrand.carUrl} 
              alt="Vehículo Showcase" 
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-carbon-950 via-carbon-950/40 to-transparent" />
            
            {/* Overlay brand badge */}
            <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2">
              <img 
                src={selectedBrand.badgeUrl} 
                alt="Badge" 
                referrerPolicy="no-referrer"
                className="w-5 h-5 rounded-full object-cover" 
              />
              <span className="text-xs font-black text-white tracking-wide">
                {selectedBrand.name}
              </span>
            </div>
          </div>

          {/* Info Card Body */}
          <div className="p-5 flex flex-col gap-4 text-left relative">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[9px] font-mono font-bold text-brand-lime uppercase tracking-widest block mb-0.5">VINCULADO A PLACAID</span>
                <h4 className="text-xl font-black text-white tracking-tight">
                  {vehicle ? `${vehicle.brand} ${vehicle.model}` : `${selectedBrand.name} ${model || '[Ingresa modelo]'}`}
                </h4>
              </div>
              <div className="bg-carbon-900 border border-carbon-800 px-2.5 py-1 rounded-xl flex flex-col items-end">
                <span className="text-[8px] font-bold text-carbon-500 leading-none">AÑO</span>
                <span className="font-mono font-bold text-white text-xs mt-1">{vehicle ? vehicle.year : year}</span>
              </div>
            </div>

            <p className="text-xs text-carbon-400 italic leading-relaxed">
              "{selectedBrand.tagline}"
            </p>

            <div className="grid grid-cols-2 gap-4 border-t border-b border-carbon-800/60 py-3 text-xs">
              <div>
                <span className="text-[8px] font-bold text-carbon-500 uppercase tracking-widest block">COLOR REGISTRADO</span>
                <span className="text-xs font-black text-white mt-1 block truncate">{vehicle ? vehicle.color : color}</span>
              </div>
              <div>
                <span className="text-[8px] font-bold text-carbon-500 uppercase tracking-widest block">CERTIFICACIÓN</span>
                <span className="text-xs font-black text-brand-lime flex items-center gap-1 mt-1">
                  <Award className="w-3.5 h-3.5" />
                  <span>{vehicle ? 'ACTIVO' : 'PENDIENTE'}</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-carbon-900/40 border border-carbon-800 p-3 rounded-2xl text-xs">
              <div className="w-8 h-8 rounded-lg bg-brand-lime/10 flex items-center justify-center text-brand-lime flex-shrink-0">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-white block">Pasaporte Vial de Colombia</span>
                <span className="text-carbon-400 text-[11px] leading-relaxed">Compatible con la normativa de control de marcas y RTM vigente en el territorio nacional.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
