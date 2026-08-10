/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Ailink Design System Colors
        ai: {
          // Neutrals - Light
          white: '#ffffff',
          paper: '#f8f9fa',
          ink: '#1a1a1a',
          'ink-soft': '#6c757d',
          'ink-true': '#000000',
          
          // Neutrals - Dark (Futuristic)
          void: '#07070d',
          night: '#0c0c16',
          graphite: '#14141f',
          steel: '#1f1f2e',
          fog: '#6a6a85',
          mist: '#b8b8cf',
          
          // Brand - Neon
          violet: '#b14fff',
          'violet-bright': '#c878ff',
          'violet-deep': '#542aad',
          electric: '#2e2eff',
          'electric-pure': '#0000ee',
          cyan: '#4cf5ff',
          magenta: '#ff3df0',
          
          // Metallic
          'metal-1': '#d9d9e3',
          'metal-2': '#9da0b3',
          'metal-3': '#5a5d72',
          
          // Semantic
          success: '#2ecc71',
          warn: '#ffb020',
          danger: '#ff4d6a',
          info: '#4cf5ff',
        },
        
        // Semantic aliases
        bg: 'var(--bg)',
        'bg-elev': 'var(--bg-elev)',
        'bg-elev-2': 'var(--bg-elev-2)',
        fg: 'var(--fg)',
        'fg-muted': 'var(--fg-muted)',
        'fg-dim': 'var(--fg-dim)',
        border: 'var(--border)',
        'border-strong': 'var(--border-strong)',
        accent: 'var(--accent)',
        'accent-2': 'var(--accent-2)',
      },
      
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      
      fontSize: {
        'display': ['clamp(48px, 7vw, 96px)', { lineHeight: '1.05', letterSpacing: '-0.03em', fontWeight: '800' }],
        'h1': ['clamp(40px, 5vw, 64px)', { lineHeight: '1.05', letterSpacing: '-0.03em', fontWeight: '700' }],
        'h2': ['clamp(28px, 3.2vw, 40px)', { lineHeight: '1.2', letterSpacing: '-0.015em', fontWeight: '700' }],
        'h3': ['24px', { lineHeight: '1.3', letterSpacing: '-0.015em', fontWeight: '600' }],
        'h4': ['20px', { lineHeight: '1.2', fontWeight: '600' }],
        'body-lg': ['18px', { lineHeight: '1.55' }],
        'body': ['16px', { lineHeight: '1.55' }],
        'body-sm': ['14px', { lineHeight: '1.55' }],
        'caption': ['12px', { lineHeight: '1.55' }],
        'micro': ['11px', { lineHeight: '1.55' }],
      },
      
      spacing: {
        '0': '0',
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '8': '32px',
        '10': '40px',
        '12': '48px',
        '16': '64px',
        '20': '80px',
        '24': '96px',
        '32': '128px',
      },
      
      borderRadius: {
        'xs': '6px',
        'sm': '10px',
        'md': '14px',
        'lg': '20px',
        'xl': '28px',
        '2xl': '40px',
        'pill': '999px',
      },
      
      boxShadow: {
        'sm': '0 1px 2px rgba(0,0,0,0.4)',
        'md': '0 4px 16px rgba(0,0,0,0.45)',
        'lg': '0 16px 48px rgba(0,0,0,0.55)',
        'glow': '0 0 32px rgba(177,79,255,0.45)',
        'glow-soft': '0 0 60px rgba(177,79,255,0.25)',
        'electric': '0 0 28px rgba(46,46,255,0.55)',
        'inset': 'inset 0 1px 0 rgba(255,255,255,0.06)',
        'ring': '0 0 0 1px rgba(177,79,255,0.6), 0 0 24px rgba(177,79,255,0.35)',
      },
      
      transitionTimingFunction: {
        'out': 'cubic-bezier(0.22, 1, 0.36, 1)',
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'in-out': 'cubic-bezier(0.65, 0, 0.35, 1)',
      },
      
      transitionDuration: {
        'fast': '120ms',
        'base': '220ms',
        'slow': '420ms',
        'luxe': '800ms',
      },
      
      maxWidth: {
        'content': '1280px',
      },
      
      backgroundImage: {
        'grad-aurora': 'linear-gradient(135deg,#542aad 0%,#b14fff 45%,#2e2eff 100%)',
        'grad-pulse': 'radial-gradient(circle at 30% 30%,#b14fff 0%,#542aad 40%,#07070d 80%)',
        'grad-edge': 'linear-gradient(180deg,rgba(177,79,255,0.0) 0%,rgba(177,79,255,0.35) 100%)',
        'grad-glass': 'linear-gradient(180deg,rgba(255,255,255,0.06) 0%,rgba(255,255,255,0.02) 100%)',
        'metal-shine': 'linear-gradient(135deg,#f4f5fa 0%,#bcc0d2 22%,#7d8094 50%,#bcc0d2 78%,#f4f5fa 100%)',
      },
    },
  },
  plugins: [],
}