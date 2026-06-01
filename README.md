# Thumos Vision

A visual studio for designing and previewing RPG combat particle effects. Built to author attack animations as JSON configs that can be played back in a game engine via the shared `ThumosInterpreter`.

## What this is

Thumos Vision is a browser-based sandbox where you write JSON, hit play, and watch particle effects fire on a canvas. The goal is to build a library of reusable attack animations — sword swings, projectiles, impact bursts — that are fully described by data, not code.

Each attack is a JSON file in `reference/`. Once it looks right here, the same JSON drops straight into the game.

## How it works

The core is `ThumosInterpreter` — a standalone class that takes an attack JSON and plays it using `@pixi/particle-emitter` on a PixiJS canvas. It handles:

- **Emitter scheduling** — each emitter has a `start` and `end` time in ms
- **Motion** — moves the emitter along a straight path (`dx/dy`) or an arc (`type: "arc"`) over a given duration
- **World-space trails** — emitters with `"worldSpace": true` stay fixed in world space while the comet moves, so particles left behind don't slide with the projectile

`ThumosInterpreter` is shared with the game (`daq-game`). Its public API (`play`, `stop`, `playAttack`) and the flat JSON format must stay stable.

## Attack JSON format

```json
{
  "name": "my_attack",
  "duration": 2000,
  "motion": { "dx": 0, "dy": -220, "duration": 300 },
  "emitters": [
    {
      "id": "fire_trail",
      "start": 0,
      "end": 300,
      "worldSpace": true,
      "config": { }
    }
  ]
}
```

For multi-part attacks, wrap in a `plays` array with per-play `offsetX`/`offsetY`:

```json
{
  "name": "my_attack",
  "plays": [
    { "offsetX": 0, "offsetY": 100, "duration": 2000, "motion": { ... }, "emitters": [ ... ] }
  ]
}
```

### Motion types

**Linear** (default): moves from spawn point by `(dx, dy)` over `duration` ms.

```json
{ "dx": 0, "dy": -220, "duration": 300 }
```

**Arc**: sweeps along a circle — good for sword swings.

```json
{ "type": "arc", "cx": 0, "cy": 0, "radius": 180, "startAngle": -2.2, "endAngle": 0.6, "duration": 90 }
```

Angles are in radians. `cx/cy` offsets the arc center from the spawn point.

### Built-in textures

| Name | Shape |
|------|-------|
| `square` | 24×24 square |
| `circle` | 16px radius circle |
| `spark` | 1.5px dot |
| `slash` | thin horizontal ellipse |
| `glow` | 10px soft circle |

## Studio

The studio (`localhost:3000`) has a file picker, a live JSON editor, and a canvas. Click the canvas or hit **Play** to fire the selected attack. Edit the JSON directly and play again to iterate — no save step needed.

## Running locally

```bash
npm install
npm run dev
```

Opens at `http://localhost:3000`.

## Stack

- Next.js 14 (App Router)
- PixiJS 7
- @pixi/particle-emitter v5
- TypeScript
