'use client'

/* ── Wallet background presets (identical to V2) ── */
export const WALLET_BG_PRESETS: { id: string; label: string; dark: boolean; css: string }[] = [
  { id: 'noche', label: 'Noche', dark: true, css: 'linear-gradient(155deg,#1c1708 0%,#141414 55%,#0d0d0d 100%)' },
  { id: 'ambar', label: 'Ámbar', dark: true, css: 'linear-gradient(135deg,#4a3a08 0%,#1a1712 60%,#0d0d0d 100%)' },
  { id: 'humo', label: 'Humo', dark: true, css: 'linear-gradient(160deg,#2b2b2b 0%,#161616 55%,#0d0d0d 100%)' },
  { id: 'destello', label: 'Destello', dark: true, css: 'radial-gradient(120% 90% at 15% 0%,#3a2f08 0%,#141414 45%,#0b0b0b 100%)' },
  { id: 'nitro', label: 'Nitro', dark: true, css: 'linear-gradient(135deg,#04212b 0%,#0d1418 55%,#0a0a0a 100%)' },
  { id: 'nfc', label: 'NFC', dark: true, css: 'linear-gradient(155deg,#3d3008 0%,#1a1712 45%,#141414 100%)' },
  { id: 'blanco', label: 'Blanco', dark: false, css: 'linear-gradient(155deg,#ffffff 0%,#f3f1ea 60%,#e7e3d6 100%)' },
  { id: 'papel', label: 'Marfil', dark: false, css: 'linear-gradient(135deg,#fbf7ec 0%,#f1ead6 100%)' },
  { id: 'nieve', label: 'Nieve', dark: false, css: 'radial-gradient(120% 90% at 85% 0%,#fff7db 0%,#ffffff 45%,#eef0f2 100%)' },
]

/* ── Shared background resolver ── */
export function getWalletBackground(vehicle: { wallet_bg_preset_id?: string | null; wallet_bg_custom_url?: string | null } | null | undefined, theme: 'light' | 'dark'): string {
  if (!vehicle) {
    return theme === 'dark' ? WALLET_BG_PRESETS[0].css : WALLET_BG_PRESETS[6].css
  }
  const presetId = vehicle.wallet_bg_preset_id
  const customUrl = vehicle.wallet_bg_custom_url

  if (customUrl) return `url("${customUrl}")`
  if (presetId) {
    const preset = WALLET_BG_PRESETS.find(p => p.id === presetId)
    if (preset) return preset.css
  }
  return theme === 'dark' ? WALLET_BG_PRESETS[0].css : WALLET_BG_PRESETS[6].css
}

export function getPresetsByTheme(theme: 'light' | 'dark') {
  return WALLET_BG_PRESETS.filter(p => p.dark === (theme === 'dark'))
}

export function getDefaultPresetId(theme: 'light' | 'dark') {
  return theme === 'dark' ? 'noche' : 'blanco'
}