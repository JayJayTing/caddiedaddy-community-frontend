# design-sync notes — Forely (caddiedaddy-community-frontend)

## This repo is a Next.js app, not a packaged design system
- No `dist/`, no `main`/`module`/`exports`, no `.d.ts` component contracts → the converter runs in **synth-entry mode** (`[NO_DIST]` is expected, not an error).
- Scope (chosen by the user): **tokens + CSS + UI primitives**. `cfg.srcDir` is pinned to `src/components/ui` so synth-entry only bundles the 8 primitives, not the whole app (screens/overlays/sheets are deeply coupled to UI/Lang/Auth contexts + the backend API and are NOT syncable as standalone design components).
- Primitives: Pressable, Skeleton, Spinner, WeekDatePicker (standalone); Avatar, CancelledBadge, DateField (need `useLang`); Toaster (needs `useUI` — floor-carded, may throw at render → fallback typographic card, that's fine).

## CSS idiom ships via a generated flat stylesheet
- All styling lives in `src/styles/*.css`, imported by `src/app/globals.css`. The converter **copies** `cfg.cssEntry` verbatim (it does NOT follow `@import`), so a flat file is required.
- `.design-sync/forely.css` is **generated** by concatenating the partials in `globals.css` import order. Regenerate it before every build/re-sync:
  ```sh
  node -e 'const fs=require("fs"),p=require("path");const g=fs.readFileSync("src/app/globals.css","utf8");const o=[...g.matchAll(/@import\s+["\x27]([^"\x27]+)["\x27]/g)].map(m=>m[1]);let out="/* Forely DS flat bundle — generated from src/app/globals.css */\n";for(const r of o){out+=`\n/* === ${r} === */\n`+fs.readFileSync(p.resolve("src/app",r),"utf8")+"\n"}fs.writeFileSync(".design-sync/forely.css",out)'
  ```
- Partials verified clean: no internal `@import`, no asset `url()`, no `@font-face`.

## Fonts
- Typography is the **Apple San Francisco system stack** (`-apple-system`/`BlinkMacSystemFont`/`SF Pro`/`PingFang TC`), referenced only via `var(--sans)`/`var(--serif)`. No `@font-face`, nothing to ship. If `[FONT_MISSING]` ever fires for SF/PingFang/Helvetica, suppress with `cfg.runtimeFontPrefixes` — never substitute.

## Provider
- `cfg.provider = LanguageProvider` (added to the bundle via `cfg.extraEntries: ["./src/contexts/LanguageContext.tsx"]`) so `useLang()` components don't throw in preview. LanguageProvider defaults to `zh`, uses localStorage (fine in headless chromium).

## Re-sync setup (this is a self-package app — extra steps per fresh clone)
- **Self-symlink**: the converter expects the package at `node_modules/<pkg>`. Create it before building:
  `ln -sfn "$PWD" node_modules/caddiedaddy-community-frontend` (gitignored, recreate per clone).
- **Playwright**: the repo's `playwright` install is empty (phantom). The render check uses a Playwright installed inside `.ds-sync` (`cd .ds-sync && npm i playwright && node_modules/.bin/playwright install chromium`). macOS browser cache is `~/Library/Caches/ms-playwright/`.
- Build is synth-entry (no `--entry`): `node .ds-sync/package-build.mjs --config .design-sync/config.json --node-modules ./node_modules --out ./ds-bundle`.

## Re-sync risks (watch-list)
- `.design-sync/forely.css` is a generated input — **regenerate it** (command above) before each build or the CSS goes stale vs `src/styles/`.
- Synth-entry component discovery is content-scan based; if new PascalCase exports land in `src/components/ui/`, they auto-appear as floor cards. Prune unwanted ones with `cfg.componentSrcMap: {"Name": null}`.
- `.d.ts` contracts are synthesized from src props (weaker than a real build) — if a primitive's props look wrong, add `cfg.dtsPropsFor.<Name>`.
- This is an app: do NOT widen `srcDir` beyond `src/components/ui` or the synth entry will try to bundle the whole app.
