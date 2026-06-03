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
    this._layers = [];
    this._delayTimers = [];
  }

  // Accepts a single config object or an array of config objects.
  // Each config in an array can have a `delay` field (ms) to fire after the others.
  play(json, x, y) {
    this.stop();
    const configs = Array.isArray(json) ? json : [json];
    for (const config of configs) {
      const delay = config.delay ?? 0;
      if (delay > 0) {
        const t = setTimeout(() => this._playLayer(config, x, y), delay);
        this._delayTimers.push(t);
      } else {
        this._playLayer(config, x, y);
      }
    }
  }

  _playLayer(json, x, y) {
    const motion   = json.motion ?? null;
    const motionMs = motion ? motion.duration : 0;
    const emitMs   = json.emitDuration ?? (motion ? motionMs : 100);
    const totalMs  = json.duration ?? emitMs + (json.lifetime ?? 0.8) * 2000;

    const container = new PIXI.Container();
    if (!motion) { container.x = x; container.y = y; }
    this._app.stage.addChild(container);

    const particles = [];
    const stops    = parseStops(json.colorStops);
    const autoAngle = (motion && json.emitAngle === 'auto')
      ? Math.atan2(-(motion.dy ?? 0), -(motion.dx ?? 0))
      : (json.angle ?? 0) * Math.PI / 180;
    const angleRad = autoAngle;
    const speed    = json.speed     ?? 0;
    const spread   = json.spread    ?? 50;
    const spreadX  = json.spreadX   ?? spread;
    const spreadY  = json.spreadY   ?? spread;
    const rate     = json.rate      ?? 8;
    const lifetime = json.lifetime  ?? 0.8;
    const gravity  = json.gravity   ?? 40;
    const additive = json.additive  ?? false;
    const rotation = json.rotation  ?? false;
    const shape    = json.shape     ?? 'square';
    const drawFns = {
      square: (g, sz, c) => g.rect(-sz/2, -sz/2, sz, sz).fill(c),
      circle: (g, sz, c) => g.circle(0, 0, sz/2).fill(c),
      spark:  (g, sz, c) => g.rect(-sz, -sz*0.15, sz*2, sz*0.3).fill(c),
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
      const sz      = lerp(json.sizeMin ?? 3, json.sizeMax ?? 11, Math.random());
      const vx      = Math.cos(angleRad) * speed + (Math.random() - 0.5) * spreadX;
      const vy      = Math.sin(angleRad) * speed + (Math.random() - 0.5) * spreadY;
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

      if (head) {
        const headSz = (json.sizeMax ?? 11) * 1.5;
        head.visible = elapsed < motionMs / 1000;
        if (head.visible) {
          head.x = sx; head.y = sy;
          head.clear();
          head.rect(-headSz/2, -headSz/2, headSz, headSz).fill(0xffffff);
        }
      }

      if (elapsed < emitSec) {
        emitTimer += dt;
        while (emitTimer >= interval) {
          spawnParticle(sx, sy);
          emitTimer -= interval;
        }
      }

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

    const layer = { container, tickerFn, timer: null };
    layer.timer = setTimeout(() => this._removeLayer(layer), totalMs);
    this._layers.push(layer);
  }

  _removeLayer(layer) {
    clearTimeout(layer.timer);
    this._app.ticker.remove(layer.tickerFn);
    this._app.stage.removeChild(layer.container);
    layer.container.destroy({ children: true });
    this._layers = this._layers.filter(l => l !== layer);
  }

  stop() {
    for (const t of this._delayTimers) clearTimeout(t);
    this._delayTimers = [];
    for (const layer of [...this._layers]) this._removeLayer(layer);
  }
}
