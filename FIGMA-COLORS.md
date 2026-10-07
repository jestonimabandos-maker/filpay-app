# FilPay — Figma color variable spec

Paste-ready replacement for the old teal palette in
**FilPay - Android App (8 Screens)** (file key `CEZTLAzKxhQ1Z80K4r9I9E`).

The app code already uses exactly these values, so once the file is recolored the
two will match. **Do not move, resize or rename any layer** — only swap fills,
strokes and gradient stops for the variable bindings below.

## Variables

Create a collection named `FilPay Palette` (mode: `Default`).

| Variable name | Value | Type | Use for |
|---|---|---|---|
| `background` | `#F7F3F9` | Color | screen backgrounds |
| `surface` | `#FFFFFF` | Color | cards, sheets, inputs, bottom nav |
| `primary` | `#8B639B` | Color | headers, buttons, balance card, virtual card, active nav icons, chart line |
| `primaryDark` | `#5E3F6E` | Color | splash ellipses, gradient end |
| `primarySoft` | `#E9DDEE` | Color | icon circles, action buttons, progress track |
| `accent` | `#F4B740` | Color | growth chips, badges, notification dot, card chip **only** |
| `text` | `#2A1F30` | Color | headings, primary text, dark icons |
| `textMuted` | `#7A6B82` | Color | labels, subtitles, placeholders |
| `success` | `#2E9E6B` | Color | positive amounts, money in |
| `error` | `#D64550` | Color | Log Out, error text, destructive actions |

Derived helpers (optional but keeps every stop bound):

| Variable name | Value | Use for |
|---|---|---|
| `border` | `#E7DFEA` | card borders, dividers, input borders |
| `divider` | `#F0E9F3` | inner list dividers |
| `navInactive` | `#C8BDD0` | inactive bottom-nav icon |
| `scanBg` | `#241B29` | Scan & Pay screen background |
| `scanCard` | `#332540` | Scan & Pay viewfinder panel |
| `scanCorner` | `#C9AEDA` | viewfinder corner brackets |
| `errorSoft` | `#F9E7E8` | Log Out icon circle |
| `glow` | `rgba(255,255,255,0.12)` | card glow ellipse |
| `cardBorder` | `rgba(255,255,255,0.15)` | virtual card border |
| `pillBg` | `rgba(255,255,255,0.18)` | growth pill on balance card |

## Old → new replacement map

| Old | New |
|---|---|
| `#2D7495` | `primary` `#8B639B` |
| `#1F566F` | `primaryDark` `#5E3F6E` |
| `#E3EEF3` | `primarySoft` `#E9DDEE` |
| `#F2A93B` | `accent` `#F4B740` |
| `#F4F8FA` | `background` `#F7F3F9` |
| `#1B2A33` | `text` `#2A1F30` |
| `#6B7C86` | `textMuted` `#7A6B82` |
| `#2DC937`, `#3F8F5B` | `success` `#2E9E6B` |
| `#D64545` | `error` `#D64550` |
| `#DCE6EB`, `#E8EFF3` | `border` `#E7DFEA` |
| `#C5D3DA` | `navInactive` `#C8BDD0` |
| `#0E1C24` | `scanBg` `#241B29` |
| `#16303C` | `scanCard` `#332540` |
| `#9ED3E8` | `scanCorner` `#C9AEDA` |
| `#FBE9E9` | `errorSoft` `#F9E7E8` |
| `#FFFFFF` | `surface` / `text` stays `#FFFFFF` on primary |

Leave alone: pure white used as text on primary backgrounds, the Mastercard logo
(gold + white), the red Log Out, and the modal backdrops.

## Gradients

Exactly one gradient exists in the file — **7. FilPay Card / Rectangle**.

| Stop | Old | New |
|---|---|---|
| top | `#2D7495` | `#8B639B` |
| bottom | `#1F566F` | `#5E3F6E` |

Bind both stops to the gradient variables (or to `primary` / `primaryDark`).

## Per-screen checklist

| # | Screen | What to rebind |
|---|---|---|
| 1:2 | Splash | frame bg → `primary`; both ellipses → `primaryDark`; keep white icon, F and gold dot |
| 1:19 | Login | logo → `primary`; field bg → `background`; button → `primary`; keep text `text`/`textMuted` |
| 1:55 | Home | header → `primary`; balance card → `primaryDark`; icon circles → `primarySoft`; growth pill bg `pillBg`, arrow `accent`; nav active `primary` |
| 1:125 | Send Money | screen bg → `primary`; sheet → `surface`; inputs → `background`; badge → `accent` |
| 1:161 | Scan & Pay | bg → `scanBg`; panel → `scanCard`; corners → `scanCorner`; sheet → `surface` |
| 1:229 | Savings | header → `primary`; balance card → `primaryDark`; chart line → `primary`, last dot → `accent`; progress track `primarySoft`, fill `accent` |
| 1:290 | FilPay Card | header → `primary`; card gradient `primary`→`primaryDark`; glow `glow`; **keep Mastercard logo colors** |
| 1:357 | Profile | header → `primary`; icon circles → `primarySoft`; **Log Out stays `error`** |

## Verify after recoloring

Screenshot each of the 8 frames and confirm:

- [ ] No teal/cyan remains anywhere (`#2D7495`, `#1F566F`, `#E3EEF3`, `#9ED3E8`)
- [ ] Text on primary backgrounds is white and readable
- [ ] Gold appears only on: growth chip, badges, notification dot, card chip
- [ ] Log Out is still red, Mastercard logo unchanged
- [ ] Card gradient runs light purple (top) → dark purple (bottom)
