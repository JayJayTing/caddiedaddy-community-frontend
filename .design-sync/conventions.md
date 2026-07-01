# Forely — how to build with this design system

Forely is a Traditional-Chinese-first golf social app. It styles with **global CSS custom-property tokens + shared CSS classes**, not styling props. Components take small, behavioural props; you do layout and theming with the token `var(--*)`s below.

## Setup (required)
1. Load `styles.css` once at the app root — it `@import`s the full token + component stylesheet (`_ds_bundle.css`). Without it everything renders unstyled.
2. **Wrap the tree in `LanguageProvider`** (exported from the bundle). `Avatar`, `CancelledBadge`, `DateField`, and `WeekDatePicker` call an i18n hook and **throw** if it's missing. The default language is Traditional Chinese (`zh`); strings like `CancelledBadge` render `已取消`.

```jsx
import { LanguageProvider, Pressable, Avatar } from '<pkg>'

function App() {
  return (
    <LanguageProvider>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16, background: 'var(--surface)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-sm)' }}>
        <Avatar name="Mike Chen" seed="mike" size={44} />
        <Pressable style={{ background: 'var(--primary)', color: '#fff', borderRadius: 'var(--r-lg)', padding: '14px 22px', fontWeight: 700, boxShadow: '0 4px 20px rgba(92,122,154,.35)' }}>
          Publish Round
        </Pressable>
      </div>
    </LanguageProvider>
  )
}
```

## The styling idiom: tokens, not props
Style your own layout/containers with these `var(--*)` tokens (defined in the shipped stylesheet's `:root`). **Use these names — do not invent hex values or new token names.**

- **Surfaces / text**: `--bg`, `--bg-alt`, `--surface`; `--ink` (primary text), `--ink-2` (secondary), `--ink-3` (muted); `--line`, `--line-soft` (borders).
- **Brand**: `--primary` (slate blue), `--primary-ink` (darker), `--primary-soft` (pale tint for chips/selected states).
- **Accent hues** — each a pale tint + a `-deep` companion for text/gradient ends: `--sage`/`--sage-deep`, `--peach`/`--peach-deep`, `--rose`/`--rose-deep`, `--butter`/`--butter-deep`, `--sky`/`--sky-deep`, `--lilac`/`--lilac-deep`.
- **Radii**: `--r-sm` 10px, `--r-md` 16px, `--r-lg` 22px, `--r-xl` 28px, `--r-pill` (full).
- **Shadows**: `--shadow-sm`, `--shadow-md`.
- **Type**: `--sans` (body) and `--serif` (headings) — both the Apple San-Francisco system stack; apply `font-family: var(--serif)` or the `.serif` class for headings. There are no web-fonts to load.

Useful shared classes already in the stylesheet (apply directly): `.pressable` (press feedback), `.avatar`, `.skeleton`, `.spinner`, `.search-bar`, `.filter-pill`, `.host-toggle-btn` / `.host-voption` (segmented selectors), `.label-xs` (uppercase micro-label), `.serif`.

## Where the truth lives
- The complete token `:root` and every class are in the bundled stylesheet reached from `styles.css` (→ `_ds_bundle.css`) — read it before styling.
- Per-component API + examples: `components/<group>/<Name>/<Name>.prompt.md` and `<Name>.d.ts`.

## Components
`Pressable` (the button primitive — supply your own look via tokens), `Avatar`, `CancelledBadge`, `Spinner`, `Skeleton` / `RoundCardSkeleton` / `PostCardSkeleton` (loading states), `DateField` (on-brand calendar field), `WeekDatePicker` (swipeable week strip), `Toaster` (toast host). Prefer these over hand-rolled equivalents so spacing, colour, and radii stay on-brand.
