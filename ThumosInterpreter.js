import * as PIXI from 'pixi.js';

function lerp(a, b, t) { return a + (b - a) * t; }

function lerpColor(c1, c2, t) {
  const r1=(c1>>16)&0xff, g1=(c1>>8)&0xff, b1=c1&0xff;
  const r2=(c2>>16)&0xff, g2=(c2>>8)&0xff, b2=c2&0xff;
  return (Math.round(lerp(r1,r2,t))<<16)|(Math.round(lerp(g1,g2,t))<<8)|Math.round(lerp(b1,b2,t));
}

function getColor(stops, t) {
  if (stops.length === 1) return stops[0];
  const seg = (stops.length - 1) * t;
  const i = Math.min(Math.floor(seg), stops.length - 2);
  return lerpColor(stops[i], stops[i+1], seg - i);
}

function parseStops(colorStops) {
  return (colorStops ?? ['#ffffff']).map(c =>
    typeof c === 'string' ? parseInt(c.replace('#', ''), 16) : c
  );
}

export class ThumosInterpreter {
  constructor(app) {
    this._app = app;
    this._active = null;
  }

  // JSON shape:
  // {
  //   speed, angle,         — particle launch velocity
  //   rate, sizeMin, sizeMax, lifetime, spread, gravity,
  //   additive, rotation,
  //   colorStops,            — ["#rrggbb", ...]
  //   emitDuration,          — ms to spawn (default: motion.duration if present, else 100)
  //   duration,              — ms total cleanup (default: emitDuration + lifetime*2000)
  //   motion: {              — optional: moves the spawn point over time
  //     fromX, fromY,        — start offset from (x, y)
  //     dx, dy,              — displacement from start
  //     duration             — ms to complete the move
  //   }
  // }
  play(json, x, y) {
    this.stop();

    const motion   = json.motion ?? null;
    const motionMs = motion ? motion.duration : 0;
    const emitMs   = json.emitDuration ?? (motion ? motionMs : 100);
    const totalMs  = json.duration ?? emitMs + (json.lifetime ?? 0.8) * 2000;

    // When motion is present the container sits at (0,0) so particle positions
    // are in world space — already-born particles don't move with the spawn point.
    const container = new PIXI.Container();
    if (!motion) { container.x = x; container.y = y; }
    this._app.stage.addChild(container);

    const particles = [];
    const stops    = parseStops(json.colorStops);
    const angleRad = (json.angle    ?? 0)   * Math.PI / 180;
    const speed    = json.speed     ?? 0;
    const spread   = json.spread    ?? 50;
    const rate     = json.rate      ?? 8;
    const lifetime = json.lifetime  ?? 0.8;
    const gravity  = json.gravity   ?? 40;
    const additive = json.additive  ?? false;
    const rotation = json.rotation  ?? false;
    const shape    = json.shape     ?? 'square';
    const drawFns = {
      square:   (g, sz, c) => g.rect(-sz/2, -sz/2, sz, sz).fill(c),
      circle:   (g, sz, c) => g.circle(0, 0, sz/2).fill(c),
      spark:    (g, sz, c) => g.rect(-sz, -sz*0.15, sz*2, sz*0.3).fill(c),
    };
    const drawParticle = drawFns[shape] ?? drawFns.square;

    const getSpawnPos = (elapsedSec) => {
      if (!motion) return { sx: 0, sy: 0 };
      const t = Math.min(elapsedSec / (motionMs / 1000), 1);
      return {
        sx: x + (motion.fromX ?? 0) + (motion.dx ?? 0) * t,
        sy: y + (motion.fromY ?? 0) + (motion.dy ?? 0) * t,
      };
    };

    // Comet head — visible white square that leads the motion
    let head = null;
    if (motion && json.showHead !== false) {
      head = new PIXI.Graphics();
      head.blendMode = additive ? 'add' : 'normal';
      container.addChild(head);
    }

    const interval = 1 / (rate * 10);
    let emitTimer  = 0;
    let elapsed    = 0;
    let last       = performance.now();

    const spawnParticle = (sx, sy) => {
      const sz     = lerp(json.sizeMin ?? 3, json.sizeMax ?? 11, Math.random());
      const vx     = Math.cos(angleRad) * speed + (Math.random() - 0.5) * spread;
      const vy     = Math.sin(angleRad) * speed + (Math.random() - 0.5) * spread;
      const life    = lifetime * (0.6 + Math.random() * 0.8);
      const rotSpd  = (rotation && shape !== 'spark') ? (Math.random() - 0.5) * 4 : 0;
      const initRot = shape === 'spark' ? Math.atan2(vy, vx) : (rotation ? Math.random() * Math.PI * 2 : 0);

      const g = new PIXI.Graphics();
      g.x         = sx + (Math.random() - 0.5) * 6;
      g.y         = sy + (Math.random() - 0.5) * 6;
      g.rotation  = initRot;
      g.blendMode = additive ? 'add' : 'normal';
      container.addChild(g);

      particles.push({ g, vx, vy, life, age: 0, sz, rotSpd });
    };

    const tickerFn = () => {
      const now = performance.now();
      const dt  = (now - last) * 0.001;
      last = now;
      elapsed += dt;

      const emitSec = emitMs / 1000;
      const { sx, sy } = getSpawnPos(elapsed);

      // Move and draw comet head
      if (head) {
        const headSz = (json.sizeMax ?? 11) * 1.5;
        head.visible = elapsed < motionMs / 1000;
        if (head.visible) {
          head.x = sx; head.y = sy;
          head.clear();
          head.rect(-headSz/2, -headSz/2, headSz, headSz).fill(0xffffff);
        }
      }

      // Spawn particles
      if (elapsed < emitSec) {
        emitTimer += dt;
        while (emitTimer >= interval) {
          spawnParticle(sx, sy);
          emitTimer -= interval;
        }
      }

      // Update particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.age += dt;
        const t = p.age / p.life;
        if (t >= 1) {
          container.removeChild(p.g);
          p.g.destroy();
          particles.splice(i, 1);
          continue;
        }
        p.vy += gravity * dt;
        p.g.x += p.vx * dt;
        p.g.y += p.vy * dt;
        p.g.rotation += p.rotSpd * dt;
        p.g.alpha = lerp(1, 0, t);
        p.g.scale.set(lerp(1, 0, t));

        const color = getColor(stops, t);
        p.g.clear();
        drawParticle(p.g, p.sz, color);
      }
    };

    this._app.ticker.add(tickerFn);
    const timer = setTimeout(() => this.stop(), totalMs);
    this._active = { container, tickerFn, timer };
  }

  stop() {
    if (!this._active) return;
    const { container, tickerFn, timer } = this._active;
    clearTimeout(timer);
    this._app.ticker.remove(tickerFn);
    this._app.stage.removeChild(container);
    container.destroy({ children: true });
    this._active = null;
  }
}
