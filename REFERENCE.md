# Thumos Vision — Animation Reference

This document is the authoritative reference for generating and modifying particle animation configs for `ThumosInterpreter.js`. It is designed for AI consumption.

## API

```js
interpreter.play(json, x, y)  // fire effect at screen position (x, y)
interpreter.stop()             // cancel current effect immediately
```

`x, y` is the spawn point in screen pixels. Canvas center is the stage origin (the crosshair).  
All effects share the same JSON parameter model. No code changes are needed to create new effects.

---

## Parameter Reference

| param | type | default | range | description |
|-------|------|---------|-------|-------------|
| `speed` | number | `0` | 0–600 | Launch velocity in px/sec along `angle` direction. Set to `0` for spread-only scatter. |
| `angle` | number | `0` | 0–360 | Launch direction in degrees. 0=right, 90=down, 180=left, 270=up. **Has no effect if speed=0.** |
| `emitAngle` | string | — | `"auto"` | When `"auto"` and `motion` is present: auto-sets emit direction to reverse of motion direction. Overrides `angle`. Requires `motion` block. |
| `rate` | number | `8` | 1–50 | `rate × 10` = particles per second. `rate:10` = 100/sec. |
| `sizeMin` | number | `3` | 1–30 | Min particle size in pixels. |
| `sizeMax` | number | `11` | 1–30 | Max particle size in pixels. Must be ≥ `sizeMin`. |
| `lifetime` | number | `0.8` | 0.1–3.0 | Base particle lifetime in seconds. Actual = `lifetime × rand(0.6–1.4)` per particle. |
| `spread` | number | `50` | 0–500 | Random velocity noise applied equally to both X and Y axes. Higher = more chaotic scatter. |
| `spreadX` | number | `spread` | 0–500 | X-axis scatter only. Overrides `spread` for X when set. |
| `spreadY` | number | `spread` | 0–500 | Y-axis scatter only. Overrides `spread` for Y when set. |
| `gravity` | number | `40` | 0–400 | Downward acceleration in px/sec². `0` = particles float. `200+` = heavy fall. |
| `additive` | bool | `false` | — | `true` = additive blend (particles glow and stack brightly). `false` = normal blend. |
| `rotation` | bool | `false` | — | `true` = particles spin randomly. Auto-disabled for `shape:"spark"`. |
| `shape` | string | `"square"` | — | `"square"` · `"circle"` · `"spark"` (thin shard, aligns to velocity on spawn, no spin). |
| `emitDuration` | number | `100` | 10–2000 | Ms to keep spawning particles. Default is `motion.duration` when motion is present. |
| `duration` | number | auto | — | Total ms before full cleanup. Default: `emitDuration + lifetime × 2000`. Override only if cleanup fires too early or late. |
| `colorStops` | string[] | `["#ffffff"]` | — | Hex colors interpolated across particle lifetime `t=0→1`. Index 0 = birth color, last = death color. 2–4 stops recommended. |
| `showHead` | bool | `true` | — | Renders a bright white square leading the motion path. Only visible when `motion` block is present. |
| `motion` | object | `null` | — | Moves the spawn point over time. See Motion Block below. |

---

## Motion Block

When present, the spawn point moves from `(x + fromX, y + fromY)` to `(x + fromX + dx, y + fromY + dy)` over `duration` ms.

Particles already born stay fixed in world space — they do not follow the emitter. This produces correct trail behavior.

| param | description |
|-------|-------------|
| `fromX / fromY` | Start offset in pixels from `play(x, y)`. Negative `fromX` = start left of center. |
| `dx / dy` | Displacement from the start position. `dx:500` = move 500px right. |
| `duration` | Ms to complete the move. Controls perceived slash speed. |

---

## Interaction Rules

These are the non-obvious behaviors that will produce wrong results if ignored:

1. **`speed: 0` makes `angle` irrelevant.** Spread takes over entirely as the only velocity source.
2. **`emitAngle: "auto"` requires a `motion` block.** Without motion it has no reference direction and falls back to 0°.
3. **`spreadX` / `spreadY` override per-axis only.** Setting just `spreadY` leaves X controlled by `spread`.
4. **`shape: "spark"` disables rotation automatically.** Sparks align to their velocity vector on spawn and don't spin.
5. **`showHead` only renders when `motion` is present.** No motion = no head, regardless of the flag value.
6. **`colorStops[0]` is birth color, last stop is death color.** A single stop means constant color throughout lifetime.
7. **World-space trails.** When motion is present, the container sits at `(0,0)` and particle positions are absolute. Already-born particles stay fixed in space as the emitter moves — this is intentional.
8. **`emitDuration` defaults to `motion.duration`** when a motion block is present, not the usual 100ms fallback.

---

## Shapes

| shape | description |
|-------|-------------|
| `"square"` | Default. Square particle, scales down to 0 over lifetime. |
| `"circle"` | Circular particle, same lifecycle as square. |
| `"spark"` | Thin elongated rectangle. Rotation locked to velocity direction on spawn. Good for blade trails and debris. |

---

## Examples

### Static explosion burst
No motion, high spread, short emitDuration = instantaneous burst at (x, y).

```json
{
  "speed": 400, "angle": 0, "rate": 20,
  "sizeMin": 4, "sizeMax": 14, "lifetime": 0.6,
  "spread": 300, "gravity": 120,
  "additive": true, "rotation": true, "emitDuration": 80,
  "colorStops": ["#ffffff", "#ff3366", "#ff6a00", "#ffdd00"]
}
```

### Horizontal samurai slash (left → right)
`emitAngle: "auto"` points trail backward. `spreadX < spreadY` = thin horizontal stream with vertical fan.

```json
{
  "speed": 120, "emitAngle": "auto", "rate": 25,
  "sizeMin": 1, "sizeMax": 11, "lifetime": 0.6,
  "spreadX": 20, "spreadY": 80, "gravity": 30,
  "additive": true, "shape": "spark",
  "colorStops": ["#ffffff", "#ffe066", "#ff6a00"],
  "motion": { "fromX": -250, "fromY": 0, "dx": 500, "dy": 0, "duration": 300 }
}
```

### Diagonal slash (top-left → bottom-right)
Only `motion` changes vs horizontal slash. `emitAngle: "auto"` handles the angle automatically — no manual calculation needed.

```json
{
  "speed": 120, "emitAngle": "auto", "rate": 25,
  "sizeMin": 1, "sizeMax": 11, "lifetime": 0.6,
  "spreadX": 20, "spreadY": 80, "gravity": 30,
  "additive": true, "shape": "spark",
  "colorStops": ["#ffffff", "#ffe066", "#ff6a00"],
  "motion": { "fromX": -200, "fromY": -200, "dx": 400, "dy": 400, "duration": 300 }
}
```

### Comet trail
`speed: 0` = symmetric scatter around spawn. `showHead: true` = visible white square leading the path.

```json
{
  "speed": 0, "rate": 8,
  "sizeMin": 3, "sizeMax": 11, "lifetime": 0.8,
  "spread": 50, "gravity": 40,
  "additive": true, "rotation": true, "showHead": true,
  "colorStops": ["#ffffff", "#ffe066", "#ff6a00", "#cc00ff"],
  "motion": { "fromX": -250, "fromY": 0, "dx": 500, "dy": 0, "duration": 300 }
}
```

---

## Adding New Parameters

When adding a new param to `ThumosInterpreter.js`:
1. Read it from `json` with a sensible default: `const foo = json.foo ?? defaultValue`
2. Add it to this table with type, default, range, and description
3. Add an interaction rule if it has non-obvious behavior with other params
4. Update the modal in `app/page.tsx` to match
