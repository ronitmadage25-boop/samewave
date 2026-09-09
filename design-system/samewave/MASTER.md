# SameWave — Design System (Master)

Source: generated via `ui-ux-pro-max` skill (`.claude/skills/ui-ux-pro-max`).
Base style match: **Minimalism & Swiss Style** (`minimalism-and-swiss-style`), selected
because the tool has no exact preset for "spatial social / proximity-of-thought"
products — the closest automatic match ("Vibrant & Block-based" social platform
preset) conflicts directly with the brief's anti-patterns (no bold consumer-app
energy, no card-grid-first). Swiss/Minimalism's grid discipline, restrained color,
and typographic hierarchy is the right foundation for an editorial, spatial product.
Typography and color below are a deliberate, documented override layered on that base.

## Foundation Style
Clean, spacious, functional, grid-based, essential — one primary accent only,
no unnecessary decoration, sharp/no shadows, clear type hierarchy.

## Color — "Low Static, One Signal"
Restrained neutral field, one warm accent standing in for "wavelength" energy.
No purple/AI gradient, no neon, no glass.

| Role | Hex | Var |
|---|---|---|
| Background | `#F7F5F1` (warm paper) | `--bg` |
| Background Dark | `#111014` | `--bg-dark` |
| Surface | `#FFFFFF` | `--surface` |
| Surface Dark | `#18171C` | `--surface-dark` |
| Foreground | `#151417` | `--fg` |
| Foreground Dark | `#F2F0EC` | `--fg-dark` |
| Muted | `#8A8680` | `--muted` |
| Border | `#E4E0D8` | `--border` |
| Border Dark | `#2A2830` | `--border-dark` |
| Signal (accent) | `#E8542A` (warm ember) | `--signal` |
| Signal Soft | `#FBD8C9` | `--signal-soft` |
| Resonance (secondary accent, cool) | `#2E5C4E` (deep pine) | `--resonance` |
| Danger | `#B3261E` | `--danger` |

Rule: **one accent per screen at full saturation**. Signal (ember) = intent/energy/CTA.
Resonance (pine) = calm/match/success states. They never both scream at once.

## Typography
Base pairing: **Inter** (UI, body, all weights) + **Fraunces** (editorial display,
headlines, pull statements) — swapped in from typography search for "bold editorial"
because Playfair Display read too close to luxury/spa; Fraunces has more spatial,
contemporary character while keeping the serif-as-voice idea.

- Display / Hero: Fraunces, 600–900, tight tracking, leading 0.95
- Section headings: Inter, 600–700
- Body: Inter, 400–500
- Labels / meta / counts: Inter, 500, uppercase, tracking-wide, small
- Scale: 12 / 14 / 16 / 20 / 28 / 40 / 64 / 88px

```css
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300..900&family=Inter:wght@400;500;600;700;800&display=swap');
```

## Motion Principles
- Springs, not eases, for anything that represents a "living" element (nodes,
  presence dots, thought cards entering).
- Durations: micro 120-180ms, standard 250-350ms, scene transitions 400-600ms.
- Stagger only for groups of <=6 (thought lists, map node clusters).
- Respect `prefers-reduced-motion`: cross-fade, no spring/parallax.
- Motion must always represent something real (a thought arriving, a signal
  broadcasting, resonance settling) -- never decorative bounce.

## Layout / Spatial Rules
- 12-col grid desktop, 4-col mobile. Generous negative space over density.
- No card-grid-first: content is composed editorially (asymmetric, layered),
  cards are used only where they represent literal discrete items (a thought).
- Border radius: sharp system (`--radius-sm: 2px`, `--radius-md: 6px`) -- never
  pill/blob everything. Radius signals "object" (thought card, avatar), not decoration.
- Depth via layering + subtle shadow (`0 1px 2px rgba(0,0,0,.06)`, `0 8px 24px rgba(0,0,0,.08)`
  on modals only), not blur/glass.

## Anti-Patterns (enforced)
No purple/pink AI gradients, no glassmorphism, no excessive rounded cards,
no repeated identical card grids as primary layout, no emoji-as-icon, no meaningless
glow, no random 3D, no dashboards for a social product, no follower/like counts.

## Pre-Delivery Checklist
- [ ] No emojis as icons (lucide-react only)
- [ ] cursor-pointer on all clickable elements
- [ ] Text contrast >= 4.5:1 in both light/dark
- [ ] Visible focus rings (--signal outline, 2px, offset)
- [ ] prefers-reduced-motion respected globally
- [ ] Responsive at 375 / 390 / 768 / 1024 / 1440 / 1920
- [ ] Touch targets >= 44px on mobile
