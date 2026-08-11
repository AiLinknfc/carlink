/* @ds-bundle: {"format":3,"namespace":"AilinkDesignSystem_ee7646","components":[],"sourceHashes":{"ui_kits/marketing-site/AIAgentSection.jsx":"c30993e1e7ff","ui_kits/marketing-site/AIAgentSection.standalone.jsx":"779c9e6e301f","ui_kits/marketing-site/FabricationSection.jsx":"70a13dcf05db","ui_kits/marketing-site/Footer.jsx":"21870b8288f1","ui_kits/marketing-site/Footer.standalone.jsx":"d61f5dd2caf6","ui_kits/marketing-site/HeroCustomizer.jsx":"8bdfdaceff71","ui_kits/marketing-site/Nav.jsx":"3a4629bdaa4d","ui_kits/marketing-site/Nav.standalone.jsx":"fe28c2b8b3be","ui_kits/marketing-site/ShaderBackground.jsx":"d5a7ddc83875","ui_kits/marketing-site/ShopSection.jsx":"946b62f5b12e","ui_kits/marketing-site/SimpleQR.jsx":"5cf8b70d91b8"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.AilinkDesignSystem_ee7646 = window.AilinkDesignSystem_ee7646 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// ui_kits/marketing-site/AIAgentSection.jsx
try { (() => {
// AIAgentSection.jsx — describe your need, the agent recommends a sector package.
// Uses window.claude.complete for real responses; falls back to a rule-based
// matcher if Claude isn't available (e.g. file:// preview).

const {
  useState: useStateA,
  useRef: useRefA,
  useEffect: useEffectA
} = React;
const SECTORS = [{
  id: 'emergencias',
  name: 'Emergencias',
  color: '#ff4d6a',
  icon: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M14 9V5a3 3 0 0 0-6 0v4"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "2",
    y: "9",
    width: "20",
    height: "12",
    rx: "2"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "15",
    r: "1.5"
  })),
  pitch: 'Llavero personal o vehicular con datos de emergencia, contacto, tipo de sangre y alergias. Un toque y los datos críticos llegan a primer respondiente.',
  keywords: ['emergencia', 'accidente', 'salud', 'medico', 'sos', 'alergia', 'mascota', 'niño', 'pets', 'perro']
}, {
  id: 'fidelizacion',
  name: 'Fidelización',
  color: '#b14fff',
  icon: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
  })),
  pitch: 'Programa de puntos, sellos digitales y recompensas. Tu cliente toca el llavero y suma — tú ves su recorrido en el dashboard.',
  keywords: ['fideliz', 'cliente', 'recurrente', 'puntos', 'recompensa', 'programa', 'crm', 'retencion', 'lealtad']
}, {
  id: 'restaurantes',
  name: 'Restaurantes',
  color: '#4cf5ff',
  icon: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M3 2v7a3 3 0 0 0 3 3h0a3 3 0 0 0 3-3V2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M6 2v20"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M15 2v20"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M15 8h3a3 3 0 0 1 3 3v0a3 3 0 0 1-3 3h-3z"
  })),
  pitch: 'Llavero en cada mesa: menú digital, pedido sin mesero, encuesta express y cupón de retorno. Conviertes cada visita en datos.',
  keywords: ['restaurante', 'bar', 'cafe', 'cafeteria', 'menu', 'mesa', 'comida', 'bebida', 'propina', 'reservas']
}, {
  id: 'mantenimiento',
  name: 'Movilidad',
  color: '#ffb020',
  icon: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "3"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
  })),
  pitch: 'Llavero por vehículo con historial de servicios, próximo mantenimiento y recordatorios. El cliente lo toca y tú ya sabes qué le toca.',
  keywords: ['taller', 'mecanic', 'carro', 'auto', 'moto', 'vehiculo', 'servicio', 'mantenimiento', 'reparacion', 'llanta', 'movilidad', 'flota', 'transporte', 'uber', 'taxi']
}, {
  id: 'servicios',
  name: 'Servicios',
  color: '#2ecc71',
  icon: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M12 2L2 7l10 5 10-5-10-5z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M2 17l10 5 10-5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M2 12l10 5 10-5"
  })),
  pitch: 'Llavero para profesionales y técnicos: tarjeta digital, portafolio, reseñas y agendamiento en un tap. Tu marca personal, en metal.',
  keywords: ['servicio', 'profesional', 'tecnico', 'plomero', 'electricista', 'consultor', 'agencia', 'portafolio', 'tarjeta']
}, {
  id: 'turismo',
  name: 'Turismo',
  color: '#ff3df0',
  icon: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "10"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "2",
    y1: "12",
    x2: "22",
    y2: "12"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"
  })),
  pitch: 'Llaveros en hoteles, tours y rutas: información del destino, mapas, idioma, llamadas a recepción y ofertas locales — todo offline.',
  keywords: ['turismo', 'hotel', 'viajero', 'tour', 'ruta', 'agencia de viajes', 'hospedaje', 'hostal', 'airbnb']
}];
function pickSectorLocal(prompt) {
  const text = (prompt || '').toLowerCase();
  let best = SECTORS[1],
    bestScore = 0;
  for (const s of SECTORS) {
    let sc = 0;
    for (const k of s.keywords) if (text.includes(k)) sc += 1;
    if (sc > bestScore) {
      bestScore = sc;
      best = s;
    }
  }
  return best;
}
function SectorIcon({
  children,
  color
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "sector-ico",
    style: {
      background: `${color}22`,
      color
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "22",
    height: "22",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.7",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, children));
}
function AIAgentSection() {
  const [messages, setMessages] = useStateA([{
    role: 'assistant',
    kind: 'text',
    text: 'Hola. Cuéntame qué tipo de negocio tienes o qué problema quieres resolver — te recomiendo el paquete Ailink que más encaja.'
  }]);
  const [input, setInput] = useStateA('');
  const [busy, setBusy] = useStateA(false);
  const [pinned, setPinned] = useStateA(null); // sector
  const scrollRef = useRefA(null);
  useEffectA(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);
  const send = async text => {
    const q = text ?? input;
    if (!q.trim() || busy) return;
    setInput('');
    setBusy(true);
    setMessages(m => [...m, {
      role: 'user',
      kind: 'text',
      text: q
    }]);
    const sector = pickSectorLocal(q);
    setPinned(sector);

    // try real Claude; fallback to canned recommendation
    let aiText = null;
    try {
      if (window.claude?.complete) {
        const sys = `Eres el agente IA de Ailink, fabricante de llaveros NFC personalizables con servicios de marketing/fidelización por IA. Responde MUY brevemente en español (2-3 frases máximo), conversacional y cercano (tutea). Recomienda al usuario el paquete "${sector.name}" y explica en una frase por qué encaja. Empieza con la recomendación, sin saludos.`;
        const res = await window.claude.complete({
          messages: [{
            role: 'user',
            content: `${sys}\n\nUsuario: ${q}`
          }]
        });
        if (typeof res === 'string') aiText = res.trim();
      }
    } catch (e) {/* swallow */}
    if (!aiText) aiText = `Te recomiendo el paquete ${sector.name}. ${sector.pitch}`;
    setMessages(m => [...m, {
      role: 'assistant',
      kind: 'card',
      sector,
      text: aiText
    }]);
    setBusy(false);
  };
  return /*#__PURE__*/React.createElement("section", {
    className: "agent",
    id: "agente"
  }, /*#__PURE__*/React.createElement("div", {
    className: "agent-head"
  }, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow"
  }, "AGENTE IA \xB7 RECOMENDADOR"), /*#__PURE__*/React.createElement("h2", {
    className: "h1"
  }, "Cu\xE9ntale a la IA qu\xE9 necesitas.", /*#__PURE__*/React.createElement("br", null), "Te arma el paquete."), /*#__PURE__*/React.createElement("p", {
    className: "lead"
  }, "Siete sectores. La IA escucha tu caso y te recomienda el que m\xE1s encaja \u2014 junto con el llavero, el flujo y la integraci\xF3n exacta para tu negocio.")), /*#__PURE__*/React.createElement("div", {
    className: "agent-grid",
    id: "sectores"
  }, /*#__PURE__*/React.createElement("div", {
    className: "agent-sectors"
  }, SECTORS.map(s => /*#__PURE__*/React.createElement("button", {
    key: s.id,
    className: `sector-card ${pinned?.id === s.id ? 'is-pinned' : ''}`,
    onClick: () => {
      setPinned(s);
      send(`Cuéntame del paquete ${s.name}.`);
    }
  }, /*#__PURE__*/React.createElement(SectorIcon, {
    color: s.color
  }, s.icon), /*#__PURE__*/React.createElement("div", {
    className: "sector-name"
  }, s.name), /*#__PURE__*/React.createElement("div", {
    className: "sector-pitch"
  }, s.pitch)))), /*#__PURE__*/React.createElement("div", {
    className: "agent-chat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "chat-head"
  }, /*#__PURE__*/React.createElement("div", {
    className: "chat-avatar"
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo-mark.svg",
    alt: ""
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "chat-name"
  }, "Ailink AI"), /*#__PURE__*/React.createElement("div", {
    className: "chat-status"
  }, /*#__PURE__*/React.createElement("span", {
    className: "dot dot--ok"
  }), " en l\xEDnea"))), /*#__PURE__*/React.createElement("div", {
    className: "chat-body",
    ref: scrollRef
  }, messages.map((m, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: `bubble bubble--${m.role}`
  }, m.role === 'assistant' && m.kind === 'card' && m.sector && /*#__PURE__*/React.createElement("div", {
    className: "bubble-eyebrow"
  }, "RECOMENDACI\xD3N \xB7 ", m.sector.name.toUpperCase()), /*#__PURE__*/React.createElement("div", {
    className: "bubble-text"
  }, m.text), m.kind === 'card' && m.sector && /*#__PURE__*/React.createElement("div", {
    className: "bubble-cta"
  }, /*#__PURE__*/React.createElement("span", {
    className: "chip",
    style: {
      borderColor: `${m.sector.color}55`,
      color: m.sector.color,
      background: `${m.sector.color}14`
    }
  }, "Paquete ", m.sector.name), /*#__PURE__*/React.createElement("a", {
    href: "#",
    className: "bubble-link"
  }, "Ver detalle \u2192")))), busy && /*#__PURE__*/React.createElement("div", {
    className: "bubble bubble--assistant"
  }, /*#__PURE__*/React.createElement("div", {
    className: "typing"
  }, /*#__PURE__*/React.createElement("span", null), /*#__PURE__*/React.createElement("span", null), /*#__PURE__*/React.createElement("span", null)))), /*#__PURE__*/React.createElement("form", {
    className: "chat-input",
    onSubmit: e => {
      e.preventDefault();
      send();
    }
  }, /*#__PURE__*/React.createElement("input", {
    value: input,
    onChange: e => setInput(e.target.value),
    placeholder: "Tengo un restaurante con clientes recurrentes\u2026",
    disabled: busy
  }), /*#__PURE__*/React.createElement("button", {
    type: "submit",
    className: "btn btn--primary btn--sm",
    disabled: busy || !input.trim()
  }, "Enviar")), /*#__PURE__*/React.createElement("div", {
    className: "chat-suggest"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => send('Tengo un taller mecánico y quiero recordar mantenimientos.')
  }, "Taller mec\xE1nico"), /*#__PURE__*/React.createElement("button", {
    onClick: () => send('Quiero fidelizar clientes en mi cafetería.')
  }, "Cafeter\xEDa con repeat"), /*#__PURE__*/React.createElement("button", {
    onClick: () => send('Tengo un hotel y quiero ofrecer información a huéspedes.')
  }, "Hotel boutique")))));
}
window.AIAgentSection = AIAgentSection;
window.SECTORS = SECTORS;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing-site/AIAgentSection.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing-site/FabricationSection.jsx
try { (() => {
// FabricationSection.jsx
// Pro 3D exploded view of the keychain — brushed metal aesthetic, modeled on
// the reference photos. Four stacked discs separated vertically with dashed
// alignment guides + a side reference photo for context.

const {
  useState: useStateF
} = React;
const LAYERS = [{
  id: 1,
  title: 'Capa 1 · Diseño del cliente',
  body: 'La cara superior del llavero — tu logo, texto o QR. Si el diseño es muy complejo, no se imprime en 3D: se incrusta la imagen original como inserto para no perder calidad ni detalle.',
  coord: 'z = +1.40mm  ·  custom finish  ·  0.16mm',
  tone: '#dadce4',
  detail: 'logo'
}, {
  id: 2,
  title: 'Capa 2 · Placa NFC NTAG213',
  body: 'Se pausa la impresión y se incrusta la antena NFC circular. 144B de memoria, lectura instantánea desde cualquier smartphone.',
  coord: 'pause @ z = +0.40mm  ·  NTAG213 14mm',
  tone: '#b8bcc8',
  detail: 'antenna'
}, {
  id: 3,
  title: 'Capa 3 · Base estructural',
  body: 'La base sólida que sella la electrónica y le da rigidez al llavero. Espesor calibrado para no atenuar la lectura NFC.',
  coord: 'z = -0.40mm  ·  PLA-metal  ·  0.20mm',
  tone: '#a4a8b3',
  detail: 'solid'
}, {
  id: 4,
  title: 'Capa 4 · Aro + herraje',
  body: 'El aro metálico exterior y el split-ring superior se ensamblan al final. El QR de la cara trasera es opcional — si no subes uno, la plataforma genera y vincula uno propio automáticamente.',
  coord: 'assembly  ·  acero · acabado brillado',
  tone: '#8f93a0',
  detail: 'ring'
}];
function LayerDetail({
  kind
}) {
  if (kind === 'logo') {
    return /*#__PURE__*/React.createElement("div", {
      className: "layer-detail layer-detail--logo"
    }, /*#__PURE__*/React.createElement("span", null, "LOGO"));
  }
  if (kind === 'antenna') {
    // NFC antenna spiral
    return /*#__PURE__*/React.createElement("svg", {
      className: "layer-detail",
      viewBox: "-50 -50 100 100",
      xmlns: "http://www.w3.org/2000/svg",
      "aria-hidden": "true"
    }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("radialGradient", {
      id: "ant-bg",
      cx: "50%",
      cy: "50%",
      r: "55%"
    }, /*#__PURE__*/React.createElement("stop", {
      offset: "0%",
      stopColor: "#e9ebef"
    }), /*#__PURE__*/React.createElement("stop", {
      offset: "100%",
      stopColor: "#9095a3"
    }))), /*#__PURE__*/React.createElement("circle", {
      r: "46",
      fill: "url(#ant-bg)"
    }), [...Array(6)].map((_, i) => /*#__PURE__*/React.createElement("circle", {
      key: i,
      r: 14 + i * 5,
      fill: "none",
      stroke: "#6b6e7a",
      strokeWidth: "0.9",
      opacity: "0.85"
    })), /*#__PURE__*/React.createElement("line", {
      x1: "0",
      y1: "14",
      x2: "0",
      y2: "44",
      stroke: "#6b6e7a",
      strokeWidth: "0.9"
    }), /*#__PURE__*/React.createElement("rect", {
      x: "-3",
      y: "-3",
      width: "6",
      height: "6",
      fill: "#3a3c47"
    }));
  }
  if (kind === 'ring') {
    return /*#__PURE__*/React.createElement("svg", {
      className: "layer-detail",
      viewBox: "-50 -50 100 100",
      xmlns: "http://www.w3.org/2000/svg",
      "aria-hidden": "true"
    }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
      id: "ring-grad",
      x1: "0",
      y1: "0",
      x2: "1",
      y2: "1"
    }, /*#__PURE__*/React.createElement("stop", {
      offset: "0%",
      stopColor: "#f4f5fa"
    }), /*#__PURE__*/React.createElement("stop", {
      offset: "50%",
      stopColor: "#5a5d72"
    }), /*#__PURE__*/React.createElement("stop", {
      offset: "100%",
      stopColor: "#f4f5fa"
    }))), /*#__PURE__*/React.createElement("circle", {
      r: "46",
      fill: "none",
      stroke: "url(#ring-grad)",
      strokeWidth: "6"
    }), /*#__PURE__*/React.createElement("circle", {
      r: "43",
      fill: "none",
      stroke: "#000",
      strokeWidth: "0.5",
      opacity: "0.3"
    }));
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "layer-detail layer-detail--solid"
  });
}
function FabricationSection() {
  const [active, setActive] = useStateF(1); // 1-indexed
  const [explode, setExplode] = useStateF(1); // 0..1 — how separated the layers are

  return /*#__PURE__*/React.createElement("section", {
    className: "fab",
    id: "fabricacion"
  }, /*#__PURE__*/React.createElement("div", {
    className: "fab-head"
  }, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow"
  }, "IMPRESI\xD3N 3D \xB7 PROCESO POR CAPAS"), /*#__PURE__*/React.createElement("h2", {
    className: "h1"
  }, "Cuatro capas. Un llavero inteligente."), /*#__PURE__*/React.createElement("p", {
    className: "lead"
  }, "Cada llavero Ailink se ensambla capa por capa. Una pausa precisa permite incrustar la antena NFC en el coraz\xF3n del producto \u2014 invisible, pero siempre activa.")), /*#__PURE__*/React.createElement("div", {
    className: "fab-stage"
  }, /*#__PURE__*/React.createElement("div", {
    className: "fab-canvas"
  }, /*#__PURE__*/React.createElement("div", {
    className: "fab-stack",
    style: {
      '--explode': explode,
      '--active': active
    }
  }, LAYERS.map((L, i) => /*#__PURE__*/React.createElement("div", {
    key: L.id,
    className: `fab-disc fab-disc--${L.id} ${active === L.id ? 'is-active' : ''}`,
    style: {
      '--idx': i,
      '--tone': L.tone
    },
    onClick: () => setActive(L.id)
  }, /*#__PURE__*/React.createElement("span", {
    className: "fab-disc__guide"
  }), /*#__PURE__*/React.createElement("span", {
    className: "fab-disc__index"
  }, String(L.id).padStart(2, '0')), /*#__PURE__*/React.createElement("div", {
    className: "fab-disc__top"
  }, /*#__PURE__*/React.createElement(LayerDetail, {
    kind: L.detail
  })), /*#__PURE__*/React.createElement("div", {
    className: "fab-disc__side"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "fab-hardware"
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 80 80",
    xmlns: "http://www.w3.org/2000/svg"
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
    id: "fab-ring",
    x1: "0",
    y1: "0",
    x2: "1",
    y2: "1"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0%",
    stopColor: "#f4f5fa"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "50%",
    stopColor: "#5a5d72"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "100%",
    stopColor: "#f4f5fa"
  }))), /*#__PURE__*/React.createElement("circle", {
    cx: "40",
    cy: "40",
    r: "28",
    fill: "none",
    stroke: "url(#fab-ring)",
    strokeWidth: "5"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "fab-floor"
  })), /*#__PURE__*/React.createElement("div", {
    className: "fab-explode"
  }, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow eyebrow--dim"
  }, "Vista"), /*#__PURE__*/React.createElement("input", {
    type: "range",
    min: "0",
    max: "1",
    step: "0.01",
    value: explode,
    onChange: e => setExplode(parseFloat(e.target.value))
  }), /*#__PURE__*/React.createElement("span", {
    className: "mono"
  }, explode < 0.05 ? 'ensamblado' : explode > 0.95 ? 'explotado' : 'separar'))), /*#__PURE__*/React.createElement("div", {
    className: "fab-steps"
  }, LAYERS.map(L => /*#__PURE__*/React.createElement("button", {
    key: L.id,
    className: `fab-step ${active === L.id ? 'is-active' : ''}`,
    onClick: () => setActive(L.id)
  }, /*#__PURE__*/React.createElement("div", {
    className: "fab-step__num"
  }, String(L.id).padStart(2, '0')), /*#__PURE__*/React.createElement("div", {
    className: "fab-step__body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "fab-step__title"
  }, L.title), /*#__PURE__*/React.createElement("div", {
    className: "fab-step__desc"
  }, L.body), /*#__PURE__*/React.createElement("div", {
    className: "fab-step__mono"
  }, L.coord)))))));
}
window.FabricationSection = FabricationSection;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing-site/FabricationSection.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing-site/Footer.jsx
try { (() => {
// Footer.jsx
function Footer() {
  return /*#__PURE__*/React.createElement("footer", {
    className: "footer"
  }, /*#__PURE__*/React.createElement("div", {
    className: "footer-grid"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "footer-brand"
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo-mark.svg",
    alt: "",
    width: "36",
    height: "36"
  }), /*#__PURE__*/React.createElement("span", null, "Ai", /*#__PURE__*/React.createElement("b", null, "Link"))), /*#__PURE__*/React.createElement("p", {
    className: "footer-tag"
  }, "Plataforma NFC para automatizaci\xF3n, redes sociales y fidelizaci\xF3n. Conecta tu negocio al mundo digital sin complicaciones.")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "footer-h"
  }, "Producto"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Llavero Ailink Pro"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Personalizaci\xF3n"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Fabricaci\xF3n 3D")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "footer-h"
  }, "Sectores"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Emergencias"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Fidelizaci\xF3n"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Restaurantes"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Mantenimiento")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "footer-h"
  }, "Compa\xF1\xEDa"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Nosotros"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Contacto"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Pol\xEDtica de privacidad"))), /*#__PURE__*/React.createElement("div", {
    className: "footer-base"
  }, /*#__PURE__*/React.createElement("div", null, "\xA9 2026 Ailink \xB7 Colombia"), /*#__PURE__*/React.createElement("div", {
    className: "mono"
  }, "v1.0 \xB7 NTAG213 \xB7 NDEF")));
}
window.Footer = Footer;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing-site/Footer.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing-site/HeroCustomizer.jsx
try { (() => {
// HeroCustomizer.jsx
// One-piece NFC keychain. Front face = brand (text/logo). Back face = QR.
// Controls are CONTEXTUAL: when the keychain is showing its front, the
// drawer shows the brand inputs; when flipped, it shows the QR URL input
// and Generate button. The finish picker's color palette controls the body
// color on the front, and the QR module color on the back (only when a QR
// is generated).

const {
  useState,
  useRef,
  useEffect,
  useCallback
} = React;
const PALETTE_DARK = ['#0a0a0a', '#1a1a1a', '#2a2a3a', '#0c0c16', '#542aad', '#3b1080', '#b14fff', '#7b3cff', '#0000ee', '#2e2eff', '#003a6b', '#0099aa', '#1a5e1a', '#066b3a', '#7a3b00', '#a30033'];
const PALETTE_LIGHT = ['#ffffff', '#f0f0f5', '#cfcfd9', '#b8b8cf', '#e5c8ff', '#c878ff', '#b14fff', '#8585ff', '#4cf5ff', '#7afff0', '#9bd16e', '#fff080', '#ffb020', '#ff8a00', '#ff7ef0', '#ffd1e0'];
const PALETTE_BG = ['#ffffff', '#f0f0f5', '#e5e8f0', '#0a0a0a', '#0c0c16', '#1a1a1a', '#542aad', '#0000ee'];
const PALETTE = PALETTE_DARK; // used by the body-finish picker

const FINISHES = [{
  id: 'violet',
  name: 'Violeta',
  body: 'radial-gradient(circle at 35% 30%,#e5c8ff 0%,#b14fff 35%,#542aad 75%,#1a0a3a 100%)',
  swatch: 'radial-gradient(circle at 35% 30%,#e5c8ff 0%,#b14fff 50%,#542aad 100%)',
  fg: '#ffffff'
}, {
  id: 'white',
  name: 'Blanco',
  body: 'radial-gradient(circle at 35% 30%,#ffffff 0%,#f0f0f5 45%,#cfcfd9 100%)',
  swatch: 'radial-gradient(circle at 35% 30%,#ffffff 0%,#e6e6ee 60%,#bcbccd 100%)',
  fg: '#1a1a1a'
}, {
  id: 'midnight',
  name: 'Medianoche',
  body: 'radial-gradient(circle at 35% 30%,#555 0%,#222 75%,#000 100%)',
  swatch: 'radial-gradient(circle at 35% 30%,#3a3a45 0%,#1a1a1a 70%,#000 100%)',
  fg: '#ffffff'
}, {
  id: 'custom',
  name: 'Personalizado',
  body: null,
  swatch: 'conic-gradient(from 90deg,#ff4d6a,#ffb020,#9bd16e,#4cf5ff,#2e2eff,#b14fff,#ff3df0,#ff4d6a)',
  fg: '#ffffff',
  isCustom: true
}];
function pickFgForColor(hex) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.62 ? '#1a1a1a' : '#ffffff';
}
function buildCustomBody(color) {
  const hex = color.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const light = `rgb(${Math.min(255, r + 70)}, ${Math.min(255, g + 70)}, ${Math.min(255, b + 70)})`;
  const deep = `rgb(${Math.max(0, Math.floor(r * 0.35))}, ${Math.max(0, Math.floor(g * 0.35))}, ${Math.max(0, Math.floor(b * 0.35))})`;
  return `radial-gradient(circle at 35% 30%, ${light} 0%, ${color} 45%, ${deep} 100%)`;
}
function HeroCustomizer() {
  const [brand, setBrand] = useState(null);
  const [finishId, setFinishId] = useState('violet');
  const [customColor, setCustomColor] = useState('#b14fff');
  const [qrColor, setQrColor] = useState('#0a0a0a');
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [textInput, setTextInput] = useState('Café El Mirador');
  const [logoScale, setLogoScale] = useState(1);
  const [qrUrl, setQrUrl] = useState('https://ailink.com.co/');
  const [qrValue, setQrValue] = useState(null);
  const [qrScale, setQrScale] = useState(1);
  const [showingBack, setShowingBack] = useState(false);
  const [hover, setHover] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [snapped, setSnapped] = useState(false);
  const fileRef = useRef(null);

  // expose customizer state to other sections (cart) via a global event
  useEffect(() => {
    window.__ailinkCustomizer = {
      brand,
      finishId,
      customColor,
      qrValue,
      qrUrl,
      qrScale,
      qrColor,
      logoScale,
      textInput,
      finishName: FINISHES.find(f => f.id === finishId)?.name
    };
    window.dispatchEvent(new CustomEvent('ailink:customizer-change'));
  }, [brand, finishId, customColor, qrValue, qrUrl, qrScale, qrColor, logoScale, textInput]);

  // back-side palette mode: only when QR is generated AND we're showing the back
  const paletteControlsQR = showingBack && !!qrValue;
  const baseFinish = FINISHES.find(f => f.id === finishId);
  const finish = baseFinish.isCustom ? {
    ...baseFinish,
    body: buildCustomBody(customColor),
    fg: pickFgForColor(customColor)
  } : baseFinish;

  // The QR bg can be edited directly. Default = contrast complement of the
  // module color, but the user can override.
  const [qrBg, setQrBg] = useState('#ffffff');
  const [qrTarget, setQrTarget] = useState('pattern'); // 'pattern' | 'bg'

  const applyText = () => {
    const t = textInput.trim();
    if (!t) {
      setBrand(null);
      return;
    }
    setBrandSafe({
      kind: 'text',
      label: t
    });
  };
  const setBrandSafe = b => {
    setBrand(b);
    setSnapped(true);
    setTimeout(() => setSnapped(false), 600);
  };
  const onDragStart = (e, b) => {
    const payload = b.kind === 'text' && !b.label ? {
      ...b,
      label: textInput
    } : b;
    e.dataTransfer.setData('application/json', JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'copy';
  };
  const onDrop = e => {
    e.preventDefault();
    setDragOver(false);
    let payload = null;
    const raw = e.dataTransfer.getData('application/json');
    if (raw) {
      try {
        payload = JSON.parse(raw);
      } catch {}
    }
    if (!payload && e.dataTransfer.files?.[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        setLogoScale(1);
        setBrandSafe({
          kind: 'image',
          src: reader.result,
          label: file.name
        });
      };
      reader.readAsDataURL(file);
      return;
    }
    if (payload) {
      if (payload.kind === 'image') setLogoScale(1);
      setBrandSafe(payload);
    }
  };
  const onFile = e => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      setLogoScale(1);
      setBrandSafe({
        kind: 'image',
        src: r.result,
        label: f.name
      });
    };
    r.readAsDataURL(f);
  };
  const onGenerateQR = () => {
    const seed = (qrUrl || '').trim() || 'https://ailink.com.co/';
    setQrValue(seed);
    setSnapped(true);
    setTimeout(() => setSnapped(false), 600);
  };

  // The palette behavior depends on which face is showing AND which target
  // is selected on the back. On the front, palette = body color. On the back
  // with a QR generated: palette = either pattern color or bg color.
  const onPickColor = c => {
    if (paletteControlsQR) {
      if (qrTarget === 'pattern') setQrColor(c);else setQrBg(c);
    } else {
      setCustomColor(c);
      setFinishId('custom');
    }
  };
  const onPickFinish = f => {
    if (f.isCustom) {
      // toggle palette popover
      setPaletteOpen(o => !o);
      // if not in QR mode, also switch the body to custom
      if (!paletteControlsQR) setFinishId('custom');
    } else {
      setFinishId(f.id);
      setPaletteOpen(false);
    }
  };
  const renderFront = () => /*#__PURE__*/React.createElement("div", {
    className: "keychain-face",
    style: {
      background: finish.body,
      color: finish.fg
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "keychain-spec"
  }), /*#__PURE__*/React.createElement("div", {
    className: "keychain-content"
  }, !brand && /*#__PURE__*/React.createElement("div", {
    className: "keychain-placeholder",
    style: {
      color: finish.fg
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "ph-glyph"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "36",
    height: "36",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M5 12a7 7 0 0 1 7-7"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M5 12a11 11 0 0 1 11-11",
    opacity: "0.7"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M5 12a15 15 0 0 1 15-15",
    opacity: "0.45"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "5",
    cy: "12",
    r: "1.5",
    fill: "currentColor"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "ph-label"
  }, "Arrastra o escribe tu marca")), brand?.kind === 'text' && /*#__PURE__*/React.createElement("div", {
    className: "keychain-text",
    style: {
      color: finish.fg
    }
  }, brand.label), brand?.kind === 'image' && brand.src && /*#__PURE__*/React.createElement("img", {
    className: "keychain-img",
    src: brand.src,
    alt: "",
    style: {
      transform: `scale(${logoScale})`
    }
  })));
  const renderBack = () => {
    // When a QR is generated, the entire inner face becomes the QR's background
    // color (so the QR “touches the aro”), and the QR pattern sits inscribed
    // inside that circle so all 3 finder patterns are fully visible.
    const faceBg = qrValue ? qrBg : finish.body;
    return /*#__PURE__*/React.createElement("div", {
      className: "keychain-face keychain-face--back",
      style: {
        background: faceBg,
        color: finish.fg
      }
    }, !qrValue && /*#__PURE__*/React.createElement("div", {
      className: "keychain-spec"
    }), /*#__PURE__*/React.createElement("div", {
      className: "keychain-content keychain-content--full"
    }, qrValue ? /*#__PURE__*/React.createElement("div", {
      className: "keychain-qr",
      style: {
        transform: `scale(${qrScale})`
      }
    }, /*#__PURE__*/React.createElement(SimpleQR, {
      value: qrValue,
      size: 29,
      color: qrColor,
      bg: qrBg
    })) : /*#__PURE__*/React.createElement("div", {
      className: "keychain-placeholder",
      style: {
        color: finish.fg
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "ph-glyph"
    }, /*#__PURE__*/React.createElement("svg", {
      width: "44",
      height: "44",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "1.5",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    }, /*#__PURE__*/React.createElement("rect", {
      x: "3",
      y: "3",
      width: "6",
      height: "6"
    }), /*#__PURE__*/React.createElement("rect", {
      x: "15",
      y: "3",
      width: "6",
      height: "6"
    }), /*#__PURE__*/React.createElement("rect", {
      x: "3",
      y: "15",
      width: "6",
      height: "6"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M15 15h2v2h-2zM19 15h2v2h-2zM15 19h2v2h-2zM19 19h2v2h-2z"
    }))), /*#__PURE__*/React.createElement("div", {
      className: "ph-label"
    }, "Pega tu URL y pulsa Generar QR"))));
  };
  return /*#__PURE__*/React.createElement("section", {
    className: "hero",
    id: "producto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hero-copy"
  }, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow"
  }, "PERSONALIZACI\xD3N INSTANT\xC1NEA"), /*#__PURE__*/React.createElement("h1", {
    className: "display"
  }, "Tu marca en un ", /*#__PURE__*/React.createElement("span", {
    className: "brand-grad"
  }, "llavero NFC"), " que conecta y vende."), /*#__PURE__*/React.createElement("p", {
    className: "lead"
  }, "Escribe el nombre de tu empresa o arrastra tu logo al llavero. Volt\xE9alo para a\xF1adir un QR que apunte a donde t\xFA quieras. Cada toque o escaneo dispara una experiencia inteligente."), /*#__PURE__*/React.createElement("div", {
    className: "hero-cta"
  }, /*#__PURE__*/React.createElement("a", {
    href: "#tienda",
    className: "btn btn--primary"
  }, "Pedir ahora"), /*#__PURE__*/React.createElement("a", {
    href: "#fabricacion",
    className: "btn btn--outline"
  }, "Ver c\xF3mo se fabrica")), /*#__PURE__*/React.createElement("div", {
    className: "brand-drawer"
  }, !showingBack ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("label", {
    className: "brand-field"
  }, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow eyebrow--dim"
  }, "Texto del llavero"), /*#__PURE__*/React.createElement("div", {
    className: "brand-field__row"
  }, /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: textInput,
    onChange: e => setTextInput(e.target.value),
    onKeyDown: e => {
      if (e.key === 'Enter') applyText();
    },
    placeholder: "Tu marca, nombre o frase",
    maxLength: 28
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "btn btn--primary btn--sm",
    onClick: applyText
  }, "Aplicar"))), /*#__PURE__*/React.createElement("div", {
    className: "brand-or"
  }, /*#__PURE__*/React.createElement("span", null, "o")), /*#__PURE__*/React.createElement("div", {
    className: "brand-chips"
  }, /*#__PURE__*/React.createElement("div", {
    className: "brand-chip",
    draggable: true,
    onDragStart: e => onDragStart(e, {
      kind: 'text',
      label: 'Café El Mirador'
    }),
    onClick: () => {
      setTextInput('Café El Mirador');
      setBrandSafe({
        kind: 'text',
        label: 'Café El Mirador'
      });
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "brand-chip__dot",
    style: {
      background: '#b14fff'
    }
  }), "Caf\xE9 El Mirador"), /*#__PURE__*/React.createElement("label", {
    className: "brand-chip brand-chip--upload"
  }, /*#__PURE__*/React.createElement("input", {
    ref: fileRef,
    type: "file",
    accept: "image/*",
    onChange: onFile,
    hidden: true
  }), /*#__PURE__*/React.createElement("svg", {
    width: "14",
    height: "14",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "17 8 12 3 7 8"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "3",
    x2: "12",
    y2: "15"
  })), "Subir tu logo")), brand?.kind === 'image' && /*#__PURE__*/React.createElement("div", {
    className: "brand-resize"
  }, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow eyebrow--dim"
  }, "Tama\xF1o del logo"), /*#__PURE__*/React.createElement("input", {
    type: "range",
    min: "0.4",
    max: "1",
    step: "0.01",
    value: logoScale,
    onChange: e => setLogoScale(parseFloat(e.target.value))
  }), /*#__PURE__*/React.createElement("span", {
    className: "mono brand-resize__val"
  }, Math.round(logoScale * 100), "%"))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("label", {
    className: "brand-field"
  }, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow eyebrow--dim"
  }, "Enlace del QR"), /*#__PURE__*/React.createElement("div", {
    className: "brand-field__row"
  }, /*#__PURE__*/React.createElement("input", {
    type: "url",
    value: qrUrl,
    onChange: e => setQrUrl(e.target.value),
    onKeyDown: e => {
      if (e.key === 'Enter') onGenerateQR();
    },
    placeholder: "https://ailink.com.co/",
    spellCheck: false
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "btn btn--primary btn--sm",
    onClick: onGenerateQR
  }, qrValue ? 'Regenerar' : 'Generar QR'))), /*#__PURE__*/React.createElement("p", {
    className: "brand-hint"
  }, "Por defecto apunta a ", /*#__PURE__*/React.createElement("strong", null, "ailink.com.co"), ". Pega cualquier URL \u2014 tu men\xFA, tu Instagram, tu landing \u2014 y la plataforma la vincula al chip NFC."), qrValue && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "brand-resize"
  }, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow eyebrow--dim"
  }, "Tama\xF1o del QR"), /*#__PURE__*/React.createElement("input", {
    type: "range",
    min: "0.4",
    max: "1",
    step: "0.01",
    value: qrScale,
    onChange: e => setQrScale(parseFloat(e.target.value))
  }), /*#__PURE__*/React.createElement("span", {
    className: "mono brand-resize__val"
  }, Math.round(qrScale * 100), "%")), /*#__PURE__*/React.createElement("div", {
    className: "brand-hint brand-hint--accent"
  }, "La paleta de abajo cambia el color de tu QR."))))), /*#__PURE__*/React.createElement("div", {
    className: "hero-stage"
  }, /*#__PURE__*/React.createElement("div", {
    className: `keychain-mount ${dragOver ? 'is-dropzone' : ''} ${hover ? 'is-hover' : ''} ${snapped ? 'is-snap' : ''} ${showingBack ? 'is-flipped' : ''}`,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    onDragOver: e => {
      e.preventDefault();
      setDragOver(true);
    },
    onDragLeave: () => setDragOver(false),
    onDrop: onDrop
  }, /*#__PURE__*/React.createElement("svg", {
    className: "keychain-hardware",
    viewBox: "0 0 200 92",
    xmlns: "http://www.w3.org/2000/svg",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
    id: "hw-ring",
    x1: "0",
    y1: "0",
    x2: "1",
    y2: "1"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0%",
    stopColor: "#f4f5fa"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "22%",
    stopColor: "#bcc0d2"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "55%",
    stopColor: "#5a5d72"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "78%",
    stopColor: "#bcc0d2"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "100%",
    stopColor: "#f4f5fa"
  })), /*#__PURE__*/React.createElement("linearGradient", {
    id: "hw-bridge",
    x1: "0",
    y1: "0",
    x2: "0",
    y2: "1"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0%",
    stopColor: "#e6e8f0"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "50%",
    stopColor: "#9da0b3"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "100%",
    stopColor: "#5a5d72"
  }))), /*#__PURE__*/React.createElement("circle", {
    cx: "100",
    cy: "30",
    r: "22",
    fill: "none",
    stroke: "url(#hw-ring)",
    strokeWidth: "5"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "100",
    cy: "30",
    r: "22",
    fill: "none",
    stroke: "#000",
    strokeWidth: "0.6",
    opacity: "0.35"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "100",
    cy: "30",
    r: "19",
    fill: "none",
    stroke: "#fff",
    strokeWidth: "0.4",
    opacity: "0.4"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "94",
    y: "48",
    width: "12",
    height: "44",
    rx: "3",
    fill: "url(#hw-bridge)",
    stroke: "#3e3f4d",
    strokeWidth: "0.6"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "96",
    y: "50",
    width: "8",
    height: "2",
    rx: "1",
    fill: "#fff",
    opacity: "0.45"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "100",
    cy: "60",
    r: "1.5",
    fill: "#2a2b36"
  })), /*#__PURE__*/React.createElement("div", {
    className: "keychain-aro"
  }, /*#__PURE__*/React.createElement("div", {
    className: "keychain-flipper"
  }, renderFront(), renderBack()))), /*#__PURE__*/React.createElement("div", {
    className: "finish-picker"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: `flip-btn ${showingBack ? 'is-back' : ''}`,
    onClick: () => {
      setShowingBack(s => !s);
      setPaletteOpen(false);
    },
    "aria-label": "Voltear llavero"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M21 2v6h-6"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M3 12a9 9 0 0 1 15-6.7L21 8"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M3 22v-6h6"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M21 12a9 9 0 0 1-15 6.7L3 16"
  })), /*#__PURE__*/React.createElement("span", null, showingBack ? 'Ver frente' : 'Voltear')), FINISHES.map(f => /*#__PURE__*/React.createElement("button", {
    key: f.id,
    className: `finish-dot ${!paletteControlsQR && finishId === f.id ? 'is-active' : ''} ${f.isCustom ? 'is-custom' : ''}`,
    onClick: () => onPickFinish(f),
    "aria-label": `Acabado ${f.name}`,
    title: paletteControlsQR ? 'Cambia el color del QR' : `Acabado ${f.name}`,
    disabled: paletteControlsQR && !f.isCustom,
    style: paletteControlsQR && !f.isCustom ? {
      opacity: 0.4,
      cursor: 'not-allowed'
    } : {}
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      background: f.isCustom ? f.swatch : f.body || f.swatch
    }
  }))), paletteOpen && /*#__PURE__*/React.createElement("div", {
    className: "palette-pop",
    role: "dialog",
    "aria-label": "Paleta personalizada"
  }, /*#__PURE__*/React.createElement("div", {
    className: "palette-title"
  }, paletteControlsQR ? 'Color del QR' : 'Color personalizado'), paletteControlsQR && /*#__PURE__*/React.createElement("div", {
    className: "palette-target"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: qrTarget === 'pattern' ? 'is-on' : '',
    onClick: () => setQrTarget('pattern')
  }, "Patr\xF3n"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: qrTarget === 'bg' ? 'is-on' : '',
    onClick: () => setQrTarget('bg')
  }, "Fondo")), paletteControlsQR && qrTarget === 'pattern' && /*#__PURE__*/React.createElement("div", {
    className: "palette-hint"
  }, "Contraste ", pickFgForColor(qrBg) === '#1a1a1a' ? 'oscuro' : 'claro', " sobre fondo ", qrBg.toUpperCase()), /*#__PURE__*/React.createElement("div", {
    className: "palette-grid"
  }, (paletteControlsQR ? qrTarget === 'pattern' ? pickFgForColor(qrBg) === '#1a1a1a' ? PALETTE_DARK : PALETTE_LIGHT : PALETTE_BG : PALETTE_DARK).map(c => /*#__PURE__*/React.createElement("button", {
    key: c,
    className: `palette-sw ${(paletteControlsQR ? qrTarget === 'pattern' ? qrColor : qrBg : customColor) === c ? 'is-active' : ''}`,
    style: {
      background: c
    },
    onClick: () => onPickColor(c),
    "aria-label": c
  }))), /*#__PURE__*/React.createElement("label", {
    className: "palette-hex"
  }, /*#__PURE__*/React.createElement("span", null, "Hex"), /*#__PURE__*/React.createElement("input", {
    type: "color",
    value: paletteControlsQR ? qrTarget === 'pattern' ? qrColor : qrBg : customColor,
    onChange: e => onPickColor(e.target.value)
  }), /*#__PURE__*/React.createElement("span", {
    className: "mono"
  }, (paletteControlsQR ? qrTarget === 'pattern' ? qrColor : qrBg : customColor).toUpperCase()))))));
}
window.HeroCustomizer = HeroCustomizer;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing-site/HeroCustomizer.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing-site/Nav.jsx
try { (() => {
// Nav.jsx — frosted, fixed top navigation
function Nav() {
  return /*#__PURE__*/React.createElement("nav", {
    className: "nav"
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    className: "nav-brand",
    "aria-label": "Ailink"
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo-mark.svg",
    alt: "",
    width: "32",
    height: "32"
  }), /*#__PURE__*/React.createElement("span", {
    className: "nav-wordmark"
  }, "Ai", /*#__PURE__*/React.createElement("b", null, "Link"))), /*#__PURE__*/React.createElement("div", {
    className: "nav-links"
  }, /*#__PURE__*/React.createElement("a", {
    href: "#producto"
  }, "Producto"), /*#__PURE__*/React.createElement("a", {
    href: "#fabricacion"
  }, "Fabricaci\xF3n"), /*#__PURE__*/React.createElement("a", {
    href: "#sectores"
  }, "Sectores"), /*#__PURE__*/React.createElement("a", {
    href: "#agente"
  }, "Agente IA"), /*#__PURE__*/React.createElement("a", {
    href: "#tienda"
  }, "Pedir")), /*#__PURE__*/React.createElement("div", {
    className: "nav-actions"
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    className: "btn btn--ghost btn--sm"
  }, "Iniciar sesi\xF3n"), /*#__PURE__*/React.createElement("a", {
    href: "#",
    className: "btn btn--primary btn--sm"
  }, "Empezar")));
}
window.Nav = Nav;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing-site/Nav.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing-site/ShaderBackground.jsx
try { (() => {
// ShaderBackground.jsx
// WebGL fragment-shader wallpaper. Mouse-reactive metaballs of violet/electric/cyan.
// Acts as the "futuristic OS" wallpaper for every product surface.

const VERT = `
  attribute vec2 a_pos;
  void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;
const FRAG = `
  precision highp float;
  uniform float u_time;
  uniform vec2 u_resolution;
  uniform vec2 u_mouse;
  uniform float u_intensity;

  float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    vec2 mp = u_mouse / u_resolution.xy;
    float ar = u_resolution.x / u_resolution.y;
    vec2 aspect = vec2(ar, 1.0);

    float t = u_time * 0.15;
    vec2 mo = (mp - 0.5) * 0.25 * u_intensity;

    vec2 p1 = vec2(0.30 + 0.18 * sin(t * 1.10),       0.40 + 0.12 * cos(t * 1.30)) + mo * 1.0;
    vec2 p2 = vec2(0.72 + 0.14 * sin(t * 0.90 + 1.0), 0.60 + 0.20 * cos(t * 0.70 + 0.5)) + mo * 0.7;
    vec2 p3 = vec2(0.50 + 0.22 * sin(t * 0.60 + 2.0), 0.85 + 0.10 * cos(t * 1.20 + 1.3)) + mo * 0.4;
    vec2 p4 = vec2(0.20 + 0.18 * sin(t * 0.70 + 3.0), 0.72 + 0.14 * cos(t * 0.90 + 2.2));
    vec2 p5 = vec2(0.82 + 0.10 * sin(t * 0.80 + 4.0), 0.20 + 0.18 * cos(t * 0.70 + 3.1));

    float d1 = 0.075 / length((uv - p1) * aspect);
    float d2 = 0.060 / length((uv - p2) * aspect);
    float d3 = 0.090 / length((uv - p3) * aspect);
    float d4 = 0.055 / length((uv - p4) * aspect);
    float d5 = 0.055 / length((uv - p5) * aspect);
    float md = 0.11  / length((uv - mp) * aspect);

    float total = d1 + d2 + d3 + d4 + d5 + md;
    total = smoothstep(0.4, 1.8, total);

    vec3 violet   = vec3(0.69, 0.31, 1.00);
    vec3 deep     = vec3(0.33, 0.16, 0.68);
    vec3 electric = vec3(0.18, 0.18, 1.00);
    vec3 cyan     = vec3(0.30, 0.96, 1.00);
    vec3 bg       = vec3(0.027, 0.027, 0.054);

    vec3 color = bg;
    color = mix(color, deep,     clamp(d1 * 0.55, 0.0, 1.0));
    color = mix(color, violet,   clamp(d2 * 0.55, 0.0, 1.0));
    color = mix(color, electric, clamp(d3 * 0.40, 0.0, 1.0));
    color = mix(color, violet,   clamp(d4 * 0.35, 0.0, 1.0));
    color = mix(color, cyan,     clamp(d5 * 0.35, 0.0, 1.0));
    color = mix(color, violet,   clamp(md * 0.55, 0.0, 1.0));

    // soft vignette
    float vig = 1.0 - length(uv - 0.5) * 0.9;
    color *= clamp(vig, 0.3, 1.0);

    // film grain
    float g = (hash(uv * (u_time * 60.0 + 1.0)) - 0.5) * 0.035;
    color += g;

    gl_FragColor = vec4(color, 1.0);
  }
`;
function ShaderBackground({
  intensity = 1.0,
  style = {}
}) {
  const canvasRef = React.useRef(null);
  const mouseRef = React.useRef({
    x: 0.5,
    y: 0.5,
    tx: 0.5,
    ty: 0.5
  });
  React.useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas.getContext('webgl', {
      antialias: true,
      alpha: false
    });
    if (!gl) {
      canvas.style.background = 'radial-gradient(circle at 30% 30%,#b14fff 0%,#542aad 40%,#07070d 80%)';
      return;
    }
    const compile = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(s));
      }
      return s;
    };
    const prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uTime = gl.getUniformLocation(prog, 'u_time');
    const uRes = gl.getUniformLocation(prog, 'u_resolution');
    const uMouse = gl.getUniformLocation(prog, 'u_mouse');
    const uInt = gl.getUniformLocation(prog, 'u_intensity');
    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
    resize();
    window.addEventListener('resize', resize);
    function onMove(e) {
      const r = canvas.getBoundingClientRect();
      mouseRef.current.tx = (e.clientX - r.left) / r.width;
      mouseRef.current.ty = 1 - (e.clientY - r.top) / r.height;
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', e => {
      if (e.touches[0]) onMove(e.touches[0]);
    }, {
      passive: true
    });
    const start = performance.now();
    let raf;
    const loop = () => {
      const m = mouseRef.current;
      // ease mouse for that fluid drift feel
      m.x += (m.tx - m.x) * 0.06;
      m.y += (m.ty - m.y) * 0.06;
      gl.uniform1f(uTime, (performance.now() - start) / 1000);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform2f(uMouse, m.x * canvas.width, m.y * canvas.height);
      gl.uniform1f(uInt, intensity);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMove);
    };
  }, [intensity]);
  return /*#__PURE__*/React.createElement("canvas", {
    ref: canvasRef,
    style: {
      position: 'fixed',
      inset: 0,
      width: '100%',
      height: '100%',
      zIndex: 0,
      pointerEvents: 'none',
      ...style
    }
  });
}
window.ShaderBackground = ShaderBackground;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing-site/ShaderBackground.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing-site/ShopSection.jsx
try { (() => {
// ShopSection.jsx — practical e-commerce close.
// Knows the customizer state (color, text/logo, QR), so checkout is one step:
// quantity → email → card. Free-shipping rail, delivery ETA, PQR modal with
// star rating. No registration.

const {
  useState: useStateS,
  useEffect: useEffectS
} = React;
const PRICE_PER_UNIT = 28000; // COP
const FREE_SHIPPING_THRESHOLD = 5; // units
const PRODUCTION_DAYS = [3, 5];
const SHIPPING_DAYS_LOCAL = 2;
function formatCOP(n) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(n);
}
function ConfigSummary({
  cfg
}) {
  if (!cfg) return null;
  const swatchStyle = cfg.finishId === 'custom' ? {
    background: cfg.customColor
  } : {
    background: {
      violet: 'radial-gradient(circle at 30% 30%,#e5c8ff,#b14fff 50%,#542aad)',
      white: 'radial-gradient(circle at 30% 30%,#ffffff,#cfcfd9)',
      midnight: 'radial-gradient(circle at 30% 30%,#3a3a45,#000)'
    }[cfg.finishId]
  };
  return /*#__PURE__*/React.createElement("ul", {
    className: "cfg-summary"
  }, /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("span", {
    className: "cfg-summary__k"
  }, "Acabado"), /*#__PURE__*/React.createElement("span", {
    className: "cfg-summary__v"
  }, /*#__PURE__*/React.createElement("span", {
    className: "cfg-summary__swatch",
    style: swatchStyle
  }), cfg.finishId === 'custom' ? cfg.customColor.toUpperCase() : cfg.finishName)), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("span", {
    className: "cfg-summary__k"
  }, "Frente"), /*#__PURE__*/React.createElement("span", {
    className: "cfg-summary__v"
  }, cfg.brand?.kind === 'image' ? `Logo (${Math.round((cfg.logoScale ?? 1) * 100)}%)` : cfg.brand?.kind === 'text' ? `“${cfg.brand.label}”` : '—')), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("span", {
    className: "cfg-summary__k"
  }, "QR atr\xE1s"), /*#__PURE__*/React.createElement("span", {
    className: "cfg-summary__v"
  }, cfg.qrValue ? `Activo · ${cfg.qrValue.slice(0, 28)}` : 'No (la plataforma puede generarlo)')));
}
function PQRModal({
  open,
  onClose
}) {
  const [stars, setStars] = useStateS(0);
  const [hover, setHover] = useStateS(0);
  const [topic, setTopic] = useStateS('peticion');
  const [text, setText] = useStateS('');
  const [sent, setSent] = useStateS(false);
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    className: "modal-backdrop",
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", {
    className: "modal",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("button", {
    className: "modal-close",
    onClick: onClose,
    "aria-label": "Cerrar"
  }, "\xD7"), sent ? /*#__PURE__*/React.createElement("div", {
    className: "pqr-thanks"
  }, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow"
  }, "RECIBIDO"), /*#__PURE__*/React.createElement("h3", {
    className: "h3"
  }, "Gracias."), /*#__PURE__*/React.createElement("p", null, "Te respondemos en menos de 24h al correo que registraste. Si fue urgente, tambi\xE9n puedes escribirnos por WhatsApp."), /*#__PURE__*/React.createElement("button", {
    className: "btn btn--primary",
    onClick: onClose
  }, "Cerrar")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow"
  }, "PQR \xB7 Servicio al cliente"), /*#__PURE__*/React.createElement("h3", {
    className: "h3"
  }, "\xBFC\xF3mo te atendimos?"), /*#__PURE__*/React.createElement("div", {
    className: "stars",
    role: "radiogroup",
    "aria-label": "Calificaci\xF3n"
  }, [1, 2, 3, 4, 5].map(i => /*#__PURE__*/React.createElement("button", {
    key: i,
    type: "button",
    className: `star ${(hover || stars) >= i ? 'is-on' : ''}`,
    onClick: () => setStars(i),
    onMouseEnter: () => setHover(i),
    onMouseLeave: () => setHover(0),
    "aria-label": `${i} estrella${i > 1 ? 's' : ''}`
  }, "\u2605"))), /*#__PURE__*/React.createElement("div", {
    className: "pqr-topics"
  }, [{
    id: 'peticion',
    label: 'Petición'
  }, {
    id: 'queja',
    label: 'Queja'
  }, {
    id: 'reclamo',
    label: 'Reclamo'
  }, {
    id: 'sugerencia',
    label: 'Sugerencia'
  }].map(o => /*#__PURE__*/React.createElement("button", {
    key: o.id,
    type: "button",
    className: `pqr-topic ${topic === o.id ? 'is-on' : ''}`,
    onClick: () => setTopic(o.id)
  }, o.label))), /*#__PURE__*/React.createElement("textarea", {
    className: "pqr-text",
    placeholder: "Cu\xE9ntanos en una o dos frases.",
    value: text,
    onChange: e => setText(e.target.value),
    rows: 4
  }), /*#__PURE__*/React.createElement("button", {
    className: "btn btn--primary",
    disabled: !text.trim() || stars === 0,
    onClick: () => setSent(true)
  }, "Enviar"))));
}
function ShopSection() {
  const [cfg, setCfg] = useStateS(null);
  const [qty, setQty] = useStateS(1);
  const [step, setStep] = useStateS(1); // 1 cart · 2 email · 3 payment · 4 success
  const [email, setEmail] = useStateS('');
  const [card, setCard] = useStateS({
    number: '',
    exp: '',
    cvc: ''
  });
  const [pqrOpen, setPqrOpen] = useStateS(false);

  // bind to customizer state
  useEffectS(() => {
    const sync = () => setCfg({
      ...(window.__ailinkCustomizer || {})
    });
    sync();
    window.addEventListener('ailink:customizer-change', sync);
    return () => window.removeEventListener('ailink:customizer-change', sync);
  }, []);
  const subtotal = qty * PRICE_PER_UNIT;
  const freeShipping = qty >= FREE_SHIPPING_THRESHOLD;
  const shipping = freeShipping ? 0 : 8000;
  const total = subtotal + shipping;
  const etaMin = PRODUCTION_DAYS[0] + SHIPPING_DAYS_LOCAL;
  const etaMax = PRODUCTION_DAYS[1] + SHIPPING_DAYS_LOCAL;
  const handlePay = () => {
    // simulate payment success
    setStep(4);
    // fire-and-forget post-purchase email mock
  };
  return /*#__PURE__*/React.createElement("section", {
    className: "shop",
    id: "tienda"
  }, /*#__PURE__*/React.createElement("div", {
    className: "shop-head"
  }, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow"
  }, "PEDIDO EN 30 SEGUNDOS"), /*#__PURE__*/React.createElement("h2", {
    className: "h1"
  }, "Cierra tu pedido sin formularios eternos."), /*#__PURE__*/React.createElement("p", {
    className: "lead"
  }, "Ya elegiste color, frente y QR. Solo necesitas decir cu\xE1ntos quieres y d\xF3nde recibirlos. Te cobramos por correo, sin abrir cuenta.")), /*#__PURE__*/React.createElement("div", {
    className: "shop-grid"
  }, /*#__PURE__*/React.createElement("div", {
    className: "shop-preview"
  }, /*#__PURE__*/React.createElement("div", {
    className: "shop-preview__title"
  }, "Tu llavero"), /*#__PURE__*/React.createElement(ConfigSummary, {
    cfg: cfg
  }), /*#__PURE__*/React.createElement("div", {
    className: "shop-incentive"
  }, freeShipping ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    className: "dot dot--ok"
  }), " Env\xEDo gratis aplicado") : /*#__PURE__*/React.createElement(React.Fragment, null, "Llega a ", FREE_SHIPPING_THRESHOLD, " unidades para env\xEDo gratis \xB7 faltan ", FREE_SHIPPING_THRESHOLD - qty)), /*#__PURE__*/React.createElement("div", {
    className: "shop-eta"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.7",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("polyline", {
    points: "3 17 9 11 13 15 21 7"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "14 7 21 7 21 14"
  })), "Entrega estimada: ", etaMin, "\u2013", etaMax, " d\xEDas h\xE1biles")), /*#__PURE__*/React.createElement("div", {
    className: "shop-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "shop-steps"
  }, ['Cantidad', 'Correo', 'Pago', 'Listo'].map((label, i) => /*#__PURE__*/React.createElement("div", {
    key: label,
    className: `shop-step ${step >= i + 1 ? 'is-done' : ''} ${step === i + 1 ? 'is-active' : ''}`
  }, /*#__PURE__*/React.createElement("span", null, i + 1), " ", label))), step === 1 && /*#__PURE__*/React.createElement("div", {
    className: "shop-stage"
  }, /*#__PURE__*/React.createElement("div", {
    className: "qty"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setQty(Math.max(1, qty - 1)),
    "aria-label": "menos"
  }, "\u2212"), /*#__PURE__*/React.createElement("div", {
    className: "qty-num"
  }, qty), /*#__PURE__*/React.createElement("button", {
    onClick: () => setQty(qty + 1),
    "aria-label": "m\xE1s"
  }, "+"), /*#__PURE__*/React.createElement("span", {
    className: "qty-each"
  }, "\xD7 ", formatCOP(PRICE_PER_UNIT), " c/u")), /*#__PURE__*/React.createElement("div", {
    className: "qty-presets"
  }, [1, 5, 10, 25, 50].map(n => /*#__PURE__*/React.createElement("button", {
    key: n,
    className: qty === n ? 'is-on' : '',
    onClick: () => setQty(n)
  }, n))), /*#__PURE__*/React.createElement("div", {
    className: "shop-totals"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", null, "Subtotal"), /*#__PURE__*/React.createElement("span", null, formatCOP(subtotal))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", null, "Env\xEDo"), /*#__PURE__*/React.createElement("span", null, freeShipping ? /*#__PURE__*/React.createElement("em", null, "Gratis") : formatCOP(shipping))), /*#__PURE__*/React.createElement("div", {
    className: "shop-totals__total"
  }, /*#__PURE__*/React.createElement("span", null, "Total"), /*#__PURE__*/React.createElement("span", null, formatCOP(total)))), /*#__PURE__*/React.createElement("button", {
    className: "btn btn--primary shop-cta",
    onClick: () => setStep(2)
  }, "Continuar al pago", /*#__PURE__*/React.createElement("svg", {
    width: "14",
    height: "14",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("polyline", {
    points: "9 18 15 12 9 6"
  })))), step === 2 && /*#__PURE__*/React.createElement("div", {
    className: "shop-stage"
  }, /*#__PURE__*/React.createElement("label", {
    className: "field"
  }, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow eyebrow--dim"
  }, "Correo electr\xF3nico"), /*#__PURE__*/React.createElement("input", {
    type: "email",
    placeholder: "tu@empresa.com",
    autoFocus: true,
    value: email,
    onChange: e => setEmail(e.target.value)
  })), /*#__PURE__*/React.createElement("p", {
    className: "field-help"
  }, "No creamos cuenta. Solo te enviamos confirmaci\xF3n, factura y seguimiento."), /*#__PURE__*/React.createElement("div", {
    className: "shop-row"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn--ghost",
    onClick: () => setStep(1)
  }, "Atr\xE1s"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn--primary",
    disabled: !/\S+@\S+\.\S+/.test(email),
    onClick: () => setStep(3)
  }, "Continuar"))), step === 3 && /*#__PURE__*/React.createElement("div", {
    className: "shop-stage"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "card-icon"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "20",
    height: "20",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.7"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "2",
    y: "5",
    width: "20",
    height: "14",
    rx: "3"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "2",
    y1: "10",
    x2: "22",
    y2: "10"
  }))), /*#__PURE__*/React.createElement("input", {
    className: "card-input card-input--num",
    placeholder: "N\xFAmero de tarjeta",
    value: card.number,
    onChange: e => setCard({
      ...card,
      number: e.target.value.replace(/[^\d ]/g, '').slice(0, 19)
    }),
    inputMode: "numeric"
  })), /*#__PURE__*/React.createElement("div", {
    className: "card-row card-row--split"
  }, /*#__PURE__*/React.createElement("input", {
    className: "card-input",
    placeholder: "MM / YY",
    value: card.exp,
    onChange: e => setCard({
      ...card,
      exp: e.target.value.slice(0, 7)
    }),
    inputMode: "numeric"
  }), /*#__PURE__*/React.createElement("input", {
    className: "card-input",
    placeholder: "CVC",
    value: card.cvc,
    onChange: e => setCard({
      ...card,
      cvc: e.target.value.replace(/\D/g, '').slice(0, 4)
    }),
    inputMode: "numeric"
  })), /*#__PURE__*/React.createElement("div", {
    className: "shop-totals",
    style: {
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "shop-totals__total"
  }, /*#__PURE__*/React.createElement("span", null, "Total a cobrar"), /*#__PURE__*/React.createElement("span", null, formatCOP(total)))), /*#__PURE__*/React.createElement("div", {
    className: "shop-row"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn--ghost",
    onClick: () => setStep(2)
  }, "Atr\xE1s"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn--primary",
    onClick: handlePay,
    disabled: card.number.replace(/\s/g, '').length < 12 || !card.exp || card.cvc.length < 3
  }, "Pagar ", formatCOP(total))), /*#__PURE__*/React.createElement("div", {
    className: "shop-trust"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "14",
    height: "14",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.7"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
  })), "Pago seguro \xB7 cifrado de extremo a extremo")), step === 4 && /*#__PURE__*/React.createElement("div", {
    className: "shop-stage shop-success"
  }, /*#__PURE__*/React.createElement("div", {
    className: "check-burst"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "48",
    height: "48",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M20 6L9 17l-5-5"
  }))), /*#__PURE__*/React.createElement("h3", {
    className: "h3"
  }, "\xA1Pedido confirmado!"), /*#__PURE__*/React.createElement("p", null, "Te enviamos confirmaci\xF3n y seguimiento a ", /*#__PURE__*/React.createElement("strong", null, email || 'tu correo'), ". Llega entre ", etaMin, " y ", etaMax, " d\xEDas h\xE1biles."), /*#__PURE__*/React.createElement("p", {
    className: "field-help"
  }, "\xBFAlgo que mejorar? Calificanos y d\xE9janos un comentario \u2014 leemos todos los PQR."), /*#__PURE__*/React.createElement("div", {
    className: "shop-row"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn--outline",
    onClick: () => setPqrOpen(true)
  }, "Reclamos o sugerencias"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn--primary",
    onClick: () => {
      setStep(1);
      setEmail('');
      setCard({
        number: '',
        exp: '',
        cvc: ''
      });
    }
  }, "Otro pedido"))))), /*#__PURE__*/React.createElement("button", {
    className: "pqr-fab",
    onClick: () => setPqrOpen(true),
    "aria-label": "Reclamos o sugerencias"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "20",
    height: "20",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
  })), "PQR"), /*#__PURE__*/React.createElement(PQRModal, {
    open: pqrOpen,
    onClose: () => setPqrOpen(false)
  }));
}
window.ShopSection = ShopSection;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing-site/ShopSection.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing-site/SimpleQR.jsx
try { (() => {
// SimpleQR.jsx — visually authentic QR. When `circular` is set, the area
// outside the QR's inscribed circle is filled with decorative random modules
// of the same color so the whole keychain face reads as a circular QR.

function hashString(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function SimpleQR({
  value = 'https://ailink.com.co/',
  size = 29,
  color = '#0a0a0a',
  bg = '#ffffff',
  circular = true,
  // fill corners with decorative modules
  decoExtent = 16 // how many modules of decorative grid extend on each side
}) {
  const N = size;
  // 0 light · 1 dark · 2 reserved-light (separator)
  const grid = Array.from({
    length: N
  }, () => Array(N).fill(0));
  const drawFinder = (cx, cy) => {
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < 7; x++) {
        const xx = cx + x,
          yy = cy + y;
        if (xx < 0 || yy < 0 || xx >= N || yy >= N) continue;
        const onEdge = x === 0 || y === 0 || x === 6 || y === 6;
        const innerSquare = x >= 2 && x <= 4 && y >= 2 && y <= 4;
        grid[yy][xx] = onEdge || innerSquare ? 1 : 2;
      }
    }
  };
  const drawSeparator = (cx, cy) => {
    for (let y = -1; y < 8; y++) {
      for (let x = -1; x < 8; x++) {
        const xx = cx + x,
          yy = cy + y;
        if (xx < 0 || yy < 0 || xx >= N || yy >= N) continue;
        if (grid[yy][xx] === 0) grid[yy][xx] = 2;
      }
    }
  };
  drawSeparator(0, 0);
  drawFinder(0, 0);
  drawSeparator(N - 7, 0);
  drawFinder(N - 7, 0);
  drawSeparator(0, N - 7);
  drawFinder(0, N - 7);

  // alignment pattern
  const drawAlign = (cx, cy) => {
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        const xx = cx + x,
          yy = cy + y;
        if (xx < 0 || yy < 0 || xx >= N || yy >= N) continue;
        const onEdge = x === 0 || y === 0 || x === 4 || y === 4;
        const center = x === 2 && y === 2;
        grid[yy][xx] = onEdge || center ? 1 : 2;
      }
    }
  };
  if (N >= 21) drawAlign(N - 9, N - 9);

  // timing lines
  for (let i = 8; i < N - 8; i++) {
    grid[6][i] = i % 2 === 0 ? 1 : 2;
    grid[i][6] = i % 2 === 0 ? 1 : 2;
  }
  const rng = mulberry32(hashString(String(value) || 'ailink'));
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (grid[y][x] !== 0) continue;
      if (rng() < 0.55) grid[y][x] = 1;
    }
  }

  // Coordinate system:
  //  - The real QR occupies a centered NxN block.
  //  - When `circular`, we extend the rendered viewBox by `decoExtent` modules
  //    on every side, filling those rings with decorative random modules.
  //  - The final SVG is then clipped to a perfect circle by a CSS mask
  //    (in HeroCustomizer's keychain-qr container) — but here we draw the
  //    full square so the circle has plenty of pattern around the corners.

  const D = circular ? decoExtent : 0;
  const TOTAL = N + D * 2;
  const cell = 100 / TOTAL;
  const rects = [];

  // decorative outer ring — random modules at the same density
  if (D > 0) {
    const dRng = mulberry32(hashString('deco:' + value));
    for (let y = 0; y < TOTAL; y++) {
      for (let x = 0; x < TOTAL; x++) {
        const insideX = x >= D && x < D + N;
        const insideY = y >= D && y < D + N;
        if (insideX && insideY) continue; // skip the real QR area, drawn below
        // density falls off slightly toward the very edge so corners aren't too busy
        const dx = Math.min(Math.abs(x - TOTAL / 2), Math.abs(y - TOTAL / 2));
        const t = Math.max(0, 1 - Math.max(0, dx - N / 2) / D);
        if (dRng() < 0.50 * t) {
          rects.push(`<rect x="${(x * cell).toFixed(3)}" y="${(y * cell).toFixed(3)}" width="${cell.toFixed(3)}" height="${cell.toFixed(3)}"/>`);
        }
      }
    }
  }

  // real QR modules
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (grid[y][x] === 1) {
        const px = (D + x) * cell;
        const py = (D + y) * cell;
        rects.push(`<rect x="${px.toFixed(3)}" y="${py.toFixed(3)}" width="${cell.toFixed(3)}" height="${cell.toFixed(3)}"/>`);
      }
    }
  }
  return /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 100 100",
    width: "100%",
    height: "100%",
    xmlns: "http://www.w3.org/2000/svg",
    shapeRendering: "crispEdges"
  }, /*#__PURE__*/React.createElement("rect", {
    width: "100",
    height: "100",
    fill: bg
  }), /*#__PURE__*/React.createElement("g", {
    fill: color,
    dangerouslySetInnerHTML: {
      __html: rects.join('')
    }
  }));
}
window.SimpleQR = SimpleQR;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing-site/SimpleQR.jsx", error: String((e && e.message) || e) }); }

})();
