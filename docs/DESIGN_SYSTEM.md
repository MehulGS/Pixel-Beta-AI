# Pixel Beta AI — Design System Documentation

> Yeh document hai design system ka explanation — simple Hinglish mein. Beginner-friendly guide to understand karo ki colors, themes, animations sab kaise kaam karte hain.

---

## 1. Overview — Do Theme, Ek Layout

Pixel Beta AI mein **do visual themes** hain:

| Theme | Background | Accent | Feel |
|-------|-----------|--------|------|
| **Dark** | Pure Black `#000000` | Electric Cyan `#00D9FF` | JARVIS holographic command center |
| **Light** | Pure White `#FFFFFF` | Robotic Red `#FF1515` | White robotic HUD |

Dono themes mein **same layout, same components** hain — sirf colors aur glows change hote hain.

---

## 2. CSS Variables — Design ka "Brain"

Saari colors, spacings, glows ek jagah define hain: `frontend/src/App.css`.

```css
/* Yeh CSS variables hain — ek baar define karo, sab jagah use karo */
:root, [data-theme="dark"] {
  --bg-base:        #000000;   /* Main background */
  --accent-primary: #00D9FF;   /* Electric cyan */
  --text-primary:   #E8F4FF;   /* Near-white text */
  --glow-primary:   0 0 20px #00D9FF33, ...;
}

[data-theme="light"] {
  --bg-base:        #FFFFFF;   /* Pure white */
  --accent-primary: #FF1515;   /* Robotic red */
  --text-primary:   #0A0A0A;   /* Near-black text */
  --glow-primary:   0 0 16px #FF151520, ...;
}
```

Jab theme switch hoti hai, `<html data-theme="dark/light">` change hota hai aur saare variables automatically update ho jaate hain.

---

## 3. Dark Theme Palette (JARVIS)

```
Background layers:
  --bg-base:       #000000  ← Pure black
  --bg-sidebar:    #03060a  ← Near-black with blue hint
  --bg-elevated:   #080d14  ← Cards/dropdowns

Accent colors:
  --accent-primary:  #00D9FF  ← Electric cyan (main)
  --accent-secondary:#008CFF  ← Bright blue (secondary)

Text:
  --text-primary:   #E8F4FF  ← Cool white
  --text-secondary: #6B8FA8  ← Muted blue-grey
  --text-muted:     #2E4A5E  ← Barely visible

Glow effects:
  --glow-primary:  0 0 20px #00D9FF33, 0 0 40px #00D9FF11
  --glow-button:   0 0 16px #00D9FF44, 0 0 32px #00D9FF22
```

---

## 4. Light Theme Palette (Robotic Red)

```
Background layers:
  --bg-base:       #FFFFFF  ← Pure white
  --bg-sidebar:    #FAFAFA  ← Very slightly off-white
  --bg-elevated:   #F8F8F8  ← Cards

Accent colors:
  --accent-primary:  #FF1515  ← Robotic red (main)
  --accent-secondary:#C90000  ← Deep red

Text:
  --text-primary:   #0A0A0A  ← Near-black
  --text-secondary: #666666  ← Mid-grey
  --text-muted:     #AAAAAA  ← Light grey

Glow effects (restrained):
  --glow-primary:  0 0 16px #FF151520, 0 0 32px #FF151510
  --glow-button:   0 0 12px #FF151530, 0 0 24px #FF151518
```

---

## 5. Theme Switching Mechanism

**How it works:**

```
User clicks Dark/Light/System button
  → ThemeSelector calls setTheme(value)
  → useTheme hook (hooks/useTheme.ts) runs
  → Saves to localStorage ("pba_theme")
  → Sets document.documentElement.setAttribute("data-theme", "dark"/"light")
  → CSS variables update instantly
  → All components react automatically (no re-render needed!)
```

**System theme** follows `prefers-color-scheme` OS setting and listens for changes at runtime.

**Persistence** — theme survives page refresh via localStorage key `pba_theme`.

---

## 6. Animated AI Core

File: `frontend/src/components/AnimatedAICore.tsx`

```
Structure (SVG elements):
  1. Background radial glow fill
  2. Outer tick ring (36 ticks, slow CW rotation, 18s)
  3. Ring 1 — outer segmented arcs (slow CW, 18s)
  4. Ring 2 — medium arcs + 8 orbital nodes (CCW, 12s)
  5. Ring 3 — inner segmented arcs (fast CW, 7s)
  6. Ring 4 — fine dashed ring (slow CCW, 25s)
  7. Accent arcs — two layers in opposite directions (6s, 9s)
  8. Blinking particles — outer 8 + inner 6 (different blink timings)
  9. Center energy circle — dark fill + glowing pulse
  10. Center dot — bright white/cyan dot
  11. Circuit path decorations extending outward
```

**Color theming**: SVG uses `var(--core-primary)` and `var(--core-secondary)` which automatically become cyan (dark) or red (light).

**Glow filter**: `.ai-core-wrapper` has `filter: drop-shadow(...)` using CSS vars. Dark = cyan glow, Light = red glow.

**Reduced motion**: If `prefers-reduced-motion: reduce` is set, all animations stop (`animation: none`). The orb still displays statically.

---

## 7. Responsive Layout

```
Desktop (>1024px):
  - Full sidebar 330px
  - Side status panels visible around core
  - Top bar with Search/Voice/Profile buttons

Tablet (768px–1024px):
  - Sidebar narrows to 280px
  - Side panels hidden

Mobile (<768px):
  - Mobile header shown (hamburger + title)
  - Sidebar becomes a slide-in drawer
  - Side panels hidden
  - Composer adapts to narrow width
```

---

## 8. Component Structure

```
App.tsx
├── Sidebar.tsx
│   ├── PixelBetaLogo (SVG emblem)
│   ├── ConversationList.tsx
│   └── ThemeSelector.tsx
└── app-main
    ├── app-topbar (Search, Voice, Avatar buttons)
    └── ChatView.tsx
        ├── EmptyState.tsx (when no messages)
        │   ├── AnimatedAICore.tsx
        │   └── Status panels (AI ONLINE, SYSTEM STATUS)
        ├── MessageBubble.tsx (per message)
        └── MessageComposer.tsx
            └── AttachmentPreview.tsx
```

---

## 9. How to Customize Accent Colors

To change the dark theme accent from cyan to, say, green:

```css
/* In App.css — change only these variables */
[data-theme="dark"] {
  --accent-primary:   #00FF88;   /* New accent */
  --accent-secondary: #00BB66;   /* Darker shade */
  --text-accent:      #00FF88;
  --core-primary:     #00FF88;   /* Core SVG color */
  --core-secondary:   #00BB66;
  --core-glow-color:  #00FF88;   /* Filter drop-shadow */
}
```

That's it — the entire UI updates automatically.

---

## 10. How to Reduce Animation Intensity

**Option A** — OS setting (recommended):
Set "Reduce motion" in your OS accessibility settings. All animations stop automatically.

**Option B** — CSS override:
```css
/* Add to App.css to slow down animations globally */
.ring-spin-cw-slow  { animation-duration: 60s !important; }
.ring-spin-ccw-med  { animation-duration: 40s !important; }
.ring-spin-cw-fast  { animation-duration: 20s !important; }
.core-center-pulse  { animation-duration: 6s !important; }
.particle-a, .particle-b, .particle-c {
  animation-duration: 8s !important;
}
```

**Option C** — Disable only the ring rotations (keep particles):
```css
.ring-spin-cw-slow,
.ring-spin-ccw-med,
.ring-spin-cw-fast,
.ring-spin-ccw-slow,
.ring-spin-cw-med { animation: none !important; }
```

---

## 11. How to Add New Components

When creating a new component:

1. Use CSS variables — never hardcode colors:
```tsx
// ✅ Correct — uses design system
<div style={{ color: 'var(--text-accent)', background: 'var(--bg-elevated)' }}>

// ❌ Wrong — hardcoded, breaks themes
<div style={{ color: '#00D9FF', background: '#080d14' }}>
```

2. Add styles to `App.css` using existing variable names.

3. For glows, use the existing glow variables:
```css
.my-new-button {
  border: 1px solid var(--accent-primary);
  box-shadow: var(--glow-subtle);
}
.my-new-button:hover {
  box-shadow: var(--glow-button);
}
```

4. Test both dark AND light themes before finishing.
