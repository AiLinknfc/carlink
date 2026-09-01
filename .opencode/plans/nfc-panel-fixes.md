# NFC Panel + Public Page Fixes — Execution Plan

## Task 1: Reorder NFC panel sections
**File:** `frontend/src/app/app/page.tsx`

Move the "Publicar mi perfil" block (currently lines 910-1033) to AFTER "Tus llaveros" (currently lines 1035-1132).

### Step 1a: Remove "Publicar miperfil" from its current position
Delete lines 910-1033 (the entire `{/* ── Publicar mi perfil ── */}` block).

### Step 1b: Insert it after "Tus llaveros"
After line 1132 (the closing `</div>` of "Tus llaveros"), insert the block with these background fixes:

- Master toggle container: `rgba(245,197,24,0.08)` → `var(--surface-2)` (both active/inactive states)
- Master toggle border: `rgba(245,197,24,0.3)` → `var(--section-border)` (both states)
- Sub-toggle inactive backgrounds: `rgba(255,255,255,0.03)` → `var(--surface-2)`
- Sub-toggle inactive borders: `rgba(255,255,255,0.06)` → `var(--border)`
- Active state tints (green/red/yellow when toggled ON) stay as-is (semantic indicators)
- WhatsApp input border: `rgba(255,255,255,0.06)` → `var(--border)`

---

## Task 2: Restore deactivated message
**File:** `frontend/src/app/nfc/[token]/page.tsx`

Lines 192-198, change from:
```
Ficha no disponible
El propietario aún no ha publicado la ficha de este vehículo. Si acabas de activar tu llavero, configurá la ficha desde la app de CarLink.
```
To original (commit 003de15):
```
Ficha desactivada
El propietario ha desactivado temporalmente la ficha pública. Intenta de nuevo más tarde.
```

---

## Task 3: Full light mode pass on NFC public page
**File:** `frontend/src/app/nfc/[token]/page.tsx`

### 3a: Add theme import and state
After line 6 (`import { getWalletBackground } from '@/lib/wallet-bg'`), add:
```tsx
import { useTheme } from '@/store/theme'
```

Inside the component (after line 58), add:
```tsx
const { theme } = useTheme()
const isDark = theme !== 'light'
```

### 3b: Color replacements (every instance in the file)

| Line(s) | Current | Replace with |
|---------|---------|-------------|
| 160 | `background: '#0a0a0a'` | `background: isDark ? '#0a0a0a' : '#f0efe8'` |
| 161 | `color: '#f5f3ec'` | `color: 'var(--text-1)'` |
| 171 | `color: '#7c786e'` | `color: 'var(--text-3)'` |
| 193-197 | error card colors | Keep `#F5C518` accent; change body `#b6b2a6` → `var(--text-2)` |
| 201-207 | paused card colors | Same as above |
| 211-220 | not_found card colors | Same as above |
| 227 | `background: 'rgba(10,10,10,0.85)'` | `background: isDark ? 'rgba(10,10,10,0.85)' : 'rgba(255,255,255,0.9)'` |
| 227 | `color: '#b6b2a6'` | `color: 'var(--text-2)'` |
| 229 | `borderColor: 'rgba(255,255,255,0.14)'` | `borderColor: 'var(--border-2)'` |
| 237 | `getWalletBackground(data, 'dark')` | `getWalletBackground(data, isDark ? 'dark' : 'light')` |
| 238 | `border: '1px solid rgba(245,197,24,0.35)'` | keep (accent) |
| 241 | `color: '#f5f3ec'` | `color: 'var(--text-1)'` |
| 246 | `color: '#111'` | keep (on-accent) |
| 252 | `color: '#f5f3ec'` | `color: 'var(--text-1)'` |
| 261 | `color: '#a8a496'` | `color: 'var(--text-2)'` |
| 262 | `color: '#F5C518'` | `color: 'var(--accent)'` |
| 270 | `color: '#a8a496'` | `color: 'var(--text-2)'` |
| 278-281 | `color: '#a8a496'` labels | `color: 'var(--text-2)'` |
| 278-281 | `color: '#f5f3ec'` values | `color: 'var(--text-1)'` |
| 283 | `background: 'rgba(245,197,24,0.08)'` | keep (accent dim) |
| 285-290 | labels `#a8a496` / values `#f5f3ec` | `var(--text-2)` / `var(--text-1)` |
| 292 | `color: '#c9c6ba'` | `color: 'var(--text-2)'` |
| 303 | `borderTop: '1px solid rgba(255,255,255,0.08)'` | `borderTop: '1px solid var(--border)'` |
| 304 | `color: '#a8a496'` | `color: 'var(--text-2)'` |
| 308 | `color: '#F5C518'` | `color: 'var(--accent)'` |
| 314 | `color: '#a8a496'` | `color: 'var(--text-2)'` |
| 315 | keep mileage number `#F5C518` | `color: 'var(--accent)'` |
| 322 | `color: '#c9c6ba'` | `color: 'var(--text-2)'` |
| 326 | `background: 'rgba(255,255,255,0.06)'` | `background: 'var(--surface-2)'` |
| 332 | `color: '#a8a496'` | `color: 'var(--text-2)'` |
| 335 | `background: 'rgba(245,197,24,0.3)'` | keep (accent active) |
| 340 | `color: '#a8a496'` | `color: 'var(--text-2)'` |
| 342 | `borderTop: '1px solid rgba(255,255,255,0.08)'` | `borderTop: '1px solid var(--border)'` |
| 344 | `color: '#a8a496'` | `color: 'var(--text-2)'` |
| 351 | `color: '#a8a496'` | `color: 'var(--text-2)'` |
| 352 | `color: '#c9c6ba'` | `color: 'var(--text-2)'` |
| 361 | `borderTop: '1px solid rgba(255,255,255,0.1)'` | `borderTop: '1px solid var(--border)'` |
| 362 | `color: '#a8a496'` | `color: 'var(--text-2)'` |
| 372 | gradient `rgba(20,20,20,0.9)` | `isDark ? 'rgba(20,20,20,0.9)' : 'rgba(255,255,255,0.95)'` |
| 382 | `color: '#a8a496'` | `color: 'var(--text-2)'` |
| 400-401 | gradient `rgba(20,20,20,0.9)` | `isDark ? 'rgba(20,20,20,0.9)' : 'rgba(255,255,255,0.95)'` |
| 427 | `color: '#a8a496'` | `color: 'var(--text-2)'` |
| 431 | keep stroke `#a8a496` | `stroke: 'var(--text-2)'` |
| 442 | `color: '#c9c6ba'` | `color: 'var(--text-2)'` |
| 445 | `color: '#111'` on yellow btn | keep (on-accent) |
| 448 | `borderTop: '1px solid rgba(255,255,255,0.08)'` | `borderTop: '1px solid var(--border)'` |
| 449 | `color: '#7c786e'` | `color: 'var(--text-3)'` |
| 451 | `border: '1px solid rgba(255,255,255,0.12)'` | `border: '1px solid var(--border-2)'` |
| 451 | `background: 'rgba(255,255,255,0.04)'` | `background: 'var(--input-bg)'` |
| 451 | `color: '#c9c6ba'` | `color: 'var(--text-2)'` |
| 469 | `color: '#a8a496'` | `color: 'var(--text-2)'` |
| 476 | `color: '#a8a496'` | `color: 'var(--text-2)'` |
| 478 | `border: '1px solid rgba(255,255,255,0.1)'` | `border: '1px solid var(--border)'` |
| 478 | `background: 'rgba(255,255,255,0.05)'` | `background: 'var(--input-bg)'` |
| 478 | `color: '#f5f3ec'` | `color: 'var(--text-1)'` |
| 481 | `color: '#a8a496'` | `color: 'var(--text-2)'` |
| 483 | same input style as 478 | same replacements |
| 486 | `color: '#a8a496'` | `color: 'var(--text-2)'` |
| 488 | same input style as 478 | same replacements |
| 490 | `color: '#7c786e'` | `color: 'var(--text-3)'` |
| 507 | `color: '#5c5c6a'` | `color: 'var(--text-4)'` |

### 3c: Summary of what stays hardcoded (semantic/brand colors)
- `#F5C518` / `var(--accent)` — brand accent
- `#ff6b6b` — error red (works on both dark/light)
- `#ff8a3d` — warning orange
- `#4ade80` — success green
- `#25d366` — WhatsApp brand green
- `#111` — text on yellow buttons
- All `rgba(245,197,24,...)` accent tints — work on both modes
- All `rgba(255,68,68,...)` / `rgba(255,55,55,...)` error tints — work on both
- All `rgba(37,211,102,...)` WhatsApp tints — work on both
- Shadows (`rgba(0,0,0,...)`) — keep as-is

---

## Task 4: "Ver ficha pública" button — always same label + gate modal
**Files:** `frontend/src/app/app/page.tsx`, `frontend/src/components/tabs/FichaTab.tsx`

### 4a: FichaTab.tsx — fix muted text contrast + button always says "Ver ficha pública"

**4a-i: Fix `sMuted` contrast (line 474)**

Current:
```tsx
const sMuted = tDark ? '#8f8a7a' : '#6f6a5f'
```

These hardcoded colors don't match the design system's `--text-3` (`#7c786e` dark / `#7a756a` light). The text "Al tocar tu llavero..." uses `sMuted` and looks bad in both modes.

**Fix:** Delete the `sMuted` constant (line 474) and replace all 3 usages with `'var(--text-3)'`:
- Line 643: `color: sMuted` → `color: 'var(--text-3)'`
- Line 982: `color: sMuted` → `color: 'var(--text-3)'`
- Line 1008: `color: sMuted` → `color: 'var(--text-3)'`

### 4a: FichaTab.tsx — button always says "Ver ficha pública"
At line 1010, the button currently shows:
- `nfc_active === true` → "Ver ficha pública" (green, external-link icon)
- `nfc_active === false` → "Publicar ficha pública" (yellow, share/nodes icon)

**Change:** Always show "Ver ficha pública" with the external-link icon. Keep the style conditional (green when active, yellow when inactive) so the user sees the state at a glance.

Current line 1010 (single long line):
```tsx
<button onClick={onOpenPublicar} style={{ ... border: vehicle?.nfc_active !== false ? '1px solid rgba(46,204,113,0.4)' : '1px solid rgba(245,197,24,0.4)', background: vehicle?.nfc_active !== false ? 'rgba(46,204,113,0.08)' : 'rgba(245,197,24,0.06)', color: vehicle?.nfc_active !== false ? '#2ecc71' : '#F5C518', ... }}>{vehicle?.nfc_active !== false ? <svg ...external-link.../> : <svg ...share-nodes.../>}{vehicle?.nfc_active !== false ? 'Ver ficha pública' : 'Publicar ficha pública'}</button>
```

Replace with:
```tsx
<button onClick={onOpenPublicar} style={{ ... border: vehicle?.nfc_active !== false ? '1px solid rgba(46,204,113,0.4)' : '1px solid rgba(245,197,24,0.4)', background: vehicle?.nfc_active !== false ? 'rgba(46,204,113,0.08)' : 'rgba(245,197,24,0.06)', color: vehicle?.nfc_active !== false ? '#2ecc71' : '#F5C518', ... }}>
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
  Ver ficha pública
</button>
```

### 4b: app/page.tsx — gate `openPublicar` with modal when nfc_active is false

Current `openPublicar` (lines 305-325) opens the NFC panel when there are no tokens. Add a new check at the top that shows a dedicated modal:

**New state** (near other modal states):
```tsx
const [showActivateWarning, setShowActivateWarning] = useState(false)
```

**Modified `openPublicar`:**
```tsx
const openPublicar = useCallback(async () => {
  // Gate: master toggle off → show warning modal
  if (vehicle?.nfc_active === false) {
    setShowActivateWarning(true)
    return
  }
  // ... existing logic unchanged
}, [nfcTokens, flashApp, vehicle?.nfc_active])
```

**New modal JSX** (near other modals, after the NFC panel):
```tsx
{showActivateWarning && (
  <div onClick={() => setShowActivateWarning(false)}
    style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(4,4,4,0.72)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
    <div onClick={e => e.stopPropagation()}
      style={{ width: 380, maxWidth: '94vw', background: 'var(--panel-bg)', border: '1px solid var(--panel-border)',
        borderRadius: 20, padding: 28, textAlign: 'center',
        boxShadow: tDark ? '0 40px 90px rgba(0,0,0,.6)' : '0 40px 90px rgba(0,0,0,.12)' }}>
      <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--accent-dim)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)', marginBottom: 8 }}>
        Publicá tu ficha primero
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5, marginBottom: 20 }}>
        Para ver la ficha pública, primero activá tu llavero NFC y encendé el toggle
        <b style={{ color: 'var(--text-1)' }}> "Publicar mi perfil" </b>
        en el panel de configuración.
      </div>
      <button onClick={() => { setShowActivateWarning(false); setShowNfc(true) }}
        style={{ width: '100%', padding: '11px 0', borderRadius: 12, border: 'none',
          background: 'var(--accent)', color: '#111', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>
        Ir al panel NFC
      </button>
      <button onClick={() => setShowActivateWarning(false)}
        style={{ width: '100%', marginTop: 8, padding: '10px 0', borderRadius: 12,
          border: '1px solid var(--border)', background: 'transparent',
          color: 'var(--text-2)', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
        Cerrar
      </button>
    </div>
  </div>
)}
```

This modal:
- Explains what's needed (activate keychain + toggle "Publicar mi perfil")
- "Ir al panel NFC" button closes the warning and opens the NFC panel directly
- "Cerrar" just dismisses
- Uses CSS variables throughout (theme-aware)

---

## Task 5: Verify
```bash
cd frontend && npx tsc --noEmit
```
