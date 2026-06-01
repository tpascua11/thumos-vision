// ============================================================
//  ThumosInterpreter
//  Reads a Thumos animation JSON config and plays particle
//  effects using @pixi/particle-emitter + PixiJS.
//
//  Designed to be shared between daq-game and Thumos Vision.
//  No app-specific imports — safe to extract as a standalone
//  npm package (thumos-interpreter) with zero code changes.
//
//  JSON shape:
//  {
//    name: string,
//    duration: number,          // total animation length in ms
//    motion?: {                 // optional — moves the entire effect over time
//      dx: number,              // x offset from spawn point
//      dy: number,              // y offset from spawn point
//      duration: number         // ms to travel from origin to (dx, dy)
//    },
//    emitters: [
//      {
//        id: string,
//        start: number,         // ms from play() call
//        end: number,           // ms — emitter stops emitting
//        config: { ... }        // @pixi/particle-emitter config
//      }
//    ]
//  }
// ============================================================

import { Emitter } from '@pixi/particle-emitter';
import * as PIXI from 'pixi.js';

export class ThumosInterpreter {
  constructor(app) {
    this._app = app;
    this._textureMap = {};
    this._buildDefaultTextures();
    // Each entry: { container, emitters, timers, tickerFn }
    this._activePlays = [];
  }

  // Generates built-in PIXI.Texture objects keyed by name.
  // JSON configs reference these by name in textureSingle behavior.
  // Bypasses Pixi's global texture cache to avoid string-lookup issues.
  _buildDefaultTextures() {
    const g = new PIXI.Graphics();

    g.beginFill(0xffffff);
    g.drawCircle(0, 0, 16);
    g.endFill();
    this._textureMap['circle'] = this._app.renderer.generateTexture(g);

    g.clear();
    g.beginFill(0xffffff);
    g.drawRect(-12, -12, 24, 24);
    g.endFill();
    this._textureMap['square'] = this._app.renderer.generateTexture(g);

    g.clear();
    g.beginFill(0xffffff);
    g.drawEllipse(0, 0, 7, 1);
    g.endFill();
    this._textureMap['slash'] = this._app.renderer.generateTexture(g);

    g.clear();
    g.beginFill(0xffffff);
    g.drawCircle(0, 0, 1.5);
    g.endFill();
    this._textureMap['spark'] = this._app.renderer.generateTexture(g);

    g.clear();
    g.beginFill(0xffffff);
    g.drawCircle(0, 0, 10);
    g.endFill();
    this._textureMap['glow'] = this._app.renderer.generateTexture(g);

    g.destroy();
  }

  // Replaces texture string references in a behavior config with actual
  // PIXI.Texture objects so @pixi/particle-emitter doesn't do a URL lookup.
  _resolveConfig(config) {
    const resolved = JSON.parse(JSON.stringify(config));
    resolved.behaviors = resolved.behaviors.map(b => {
      if (b.type === 'textureSingle' && typeof b.config.texture === 'string') {
        const tex = this._textureMap[b.config.texture];
        if (tex) b.config.texture = tex;
      }
      if (b.type === 'textureRandom' && Array.isArray(b.config.textures)) {
        b.config.textures = b.config.textures.map(t =>
          typeof t === 'string' ? (this._textureMap[t] ?? t) : t
        );
      }
      return b;
    });
    return resolved;
  }

  // ── play ──────────────────────────────────────────────────
  // Starts a new independent play — does NOT cancel any currently
  // running animations. Each call gets its own container and lifecycle.
  // Optional json.motion: { dx, dy, duration } moves the container
  // from (x, y) to (x+dx, y+dy) over `duration` ms — comet/projectile effects.
  play(json, x, y) {
    const play = { container: null, worldContainer: null, emitters: [], worldEmitters: [], timers: [], tickerFn: null };

    // World-space container stays fixed at origin; trail emitters live here so
    // already-born particles don't move when the comet container translates.
    const worldContainer = new PIXI.Container();
    this._app.stage.addChild(worldContainer);
    play.worldContainer = worldContainer;

    const container = new PIXI.Container();
    container.x = x;
    container.y = y;
    this._app.stage.addChild(container);
    play.container = container;
    this._activePlays.push(play);

    const cleanup = () => this._cleanupPlay(play);
    const motionStart = performance.now();
    const motion = json.motion ?? null;

    const getCometPos = (now) => {
      if (!motion) return { cx: x, cy: y };
      const t = Math.min((now - motionStart) / motion.duration, 1);
      if (motion.type === 'arc') {
        const angle = motion.startAngle + (motion.endAngle - motion.startAngle) * t;
        return { cx: x + motion.cx + Math.cos(angle) * motion.radius,
                 cy: y + motion.cy + Math.sin(angle) * motion.radius };
      }
      return { cx: x + motion.dx * t, cy: y + motion.dy * t };
    };

    // Start each emitter at its scheduled start time.
    json.emitters.forEach(emitterDef => {
      const startTimer = setTimeout(() => {
        const resolvedConfig = this._resolveConfig(emitterDef.config);
        const isWorld = !!emitterDef.worldSpace;
        const parent  = isWorld ? worldContainer : container;
        const emitter = new Emitter(parent, resolvedConfig);
        emitter.emit = true;
        play.emitters.push(emitter);

        if (isWorld) {
          const { cx, cy } = getCometPos(performance.now());
          emitter.spawnPos.set(cx, cy);
          play.worldEmitters.push(emitter);
        }

        const stopTimer = setTimeout(() => {
          emitter.emit = false;
        }, emitterDef.end - emitterDef.start);

        play.timers.push(stopTimer);
      }, emitterDef.start);

      play.timers.push(startTimer);
    });

    // Tick this play's emitters every frame, and handle motion.
    let last = motionStart;
    play.tickerFn = () => {
      const now = performance.now();
      const elapsed = (now - last) * 0.001;
      last = now;
      play.emitters.forEach(e => { try { e.update(elapsed); } catch {} });

      if (motion && play.container) {
        const { cx, cy } = getCometPos(now);
        play.container.x = cx;
        play.container.y = cy;

        play.worldEmitters.forEach(e => {
          if (e.emit) e.spawnPos.set(cx, cy);
        });
      }
    };
    this._app.ticker.add(play.tickerFn);

    // Auto-cleanup this play after total duration.
    play.timers.push(setTimeout(cleanup, json.duration));
  }

  // ── playAttack ────────────────────────────────────────────
  // Fires all plays in an attack JSON simultaneously.
  // Each play uses its own offsetX/offsetY relative to (x, y).
  playAttack(json, x, y) {
    if (json.plays) {
      json.plays.forEach(p => {
        this.play(p, x + (p.offsetX ?? 0), y + (p.offsetY ?? 0));
      });
    } else {
      this.play(json, x, y);
    }
  }

  // ── stop ──────────────────────────────────────────────────
  // Stops ALL active plays immediately.
  stop() {
    [...this._activePlays].forEach(play => this._cleanupPlay(play));
  }

  // ── _cleanupPlay ──────────────────────────────────────────
  // Cleans up a single play instance and removes it from the active list.
  _cleanupPlay(play) {
    play.timers.forEach(clearTimeout);
    play.timers = [];

    if (play.tickerFn) {
      this._app.ticker.remove(play.tickerFn);
      play.tickerFn = null;
    }

    play.emitters.forEach(e => e.destroy());
    play.emitters = [];

    if (play.worldContainer) {
      this._app.stage.removeChild(play.worldContainer);
      play.worldContainer.destroy({ children: true });
      play.worldContainer = null;
    }

    if (play.container) {
      this._app.stage.removeChild(play.container);
      play.container.destroy({ children: true });
      play.container = null;
    }

    this._activePlays = this._activePlays.filter(p => p !== play);
  }
}
