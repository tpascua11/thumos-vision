# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # start dev server at localhost:3000
npm run build    # production build
npm run lint     # Next.js ESLint
npm run start    # serve production build
```

No test suite is configured.

## Architecture

**Thumos Vision** is a Next.js 14 (App Router) + TypeScript app that renders RPG combat particle animations using PixiJS 7. It is explicitly designed for AI consumption — the animation system is fully described by a small parameter object, not visual intuition.

### Page structure

`app/page.tsx` is the root client component. It owns a `Tab` state (`'stage' | 'docs'`) and renders either `<AnimationStage />` or `<Docs />` based on the active tab. `<Nav />` handles tab switching.

### AnimationStage.tsx — the core

This is where all animation logic lives. Key pieces:

- **`ATTACKS` registry** — an array of `AttackDefinition` objects with a partial `AttackConfig`. Each entry overrides only the fields that differ from `DEFAULT_CONFIG`.
- **`triggerAttack(app, id, animRef)`** — entry point. Clears previous effect containers (identified by `_isEffect = true`), builds the merged config, then dispatches to a runner via a `switch`. Falls through to `runSlice` for arc-based attacks; `runThrust` handles the linear thrust pattern.
- **`runSlice` / `runThrust`** — self-contained animation runners. Each registers a ticker function on `app.ticker` that drives the full animation lifecycle. The ticker removes itself when all particles have expired.
- **`buildArc`** — pure geometry helper. Computes `ArcPosition[]` along a circular arc so its midpoint lands exactly on `(cx, cy)`. The arc center is offset perpendicular to the slash direction.
- **`makeTex`** — generates a white ellipse texture at runtime from a `PIXI.Graphics` primitive; color is applied via `p.tint`.
- **PixiJS is dynamically imported** (`await import('pixi.js')`) inside effects and runners to avoid SSR crashes. Never import it at the module top level.

### Attack anatomy (always t=0 to t=1)

- **Phase 1 (t=0 → 0.5)**: trail particles, tight and fast (`beforeDrag ≈ 0.81`)
- **Impact (t=0.5)**: flash burst + screen flash + drift sparks spawned at `(cx, cy)`
- **Phase 2 (t=0.5 → 1.0)**: looser trail bleed (`afterDrag ≈ 0.91`)
- **Drift (t=0.5 → ∞)**: long-lived sparks that float and fade

`IMPACT_T` is always `0.5` — impact is at the midpoint, not the end.

### Types (`types/attack.ts`)

`AttackConfig` is the single source of truth for animation parameters. `AttackDefinition` pairs an id/label with a `Partial<AttackConfig>`. Particle runtime state (`_vx`, `_vy`, `_life`, `_maxLife`, `_type`, `_phase`) is typed in `ParticleData` but attached directly to PixiJS sprites as dynamic properties (PixiJS v7 allows this).

### Adding a new attack

1. Add an entry to the `ATTACKS` array in `AnimationStage.tsx` with a partial config.
2. If the attack uses arc geometry (most melee attacks), it will automatically use `runSlice` — just set `slashAngle` and `arcHalfSpan`.
3. If it needs a fundamentally different emitter shape (like `thrust`), add a new runner function and a `case` in `triggerAttack`.

### Styling

Global CSS variables are in `app/globals.css`. Fonts are IBM Plex Mono (body/mono) and Syne (display/headings), loaded from Google Fonts in `layout.tsx`. All components use CSS Modules.
