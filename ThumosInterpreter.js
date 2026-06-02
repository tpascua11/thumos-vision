import { Emitter } from '@pixi/particle-emitter';
import * as PIXI from 'pixi.js';

export class ThumosInterpreter {
  constructor(app) {
    this._app = app;
    this._textures = {};
    this._active = null;
    this._buildTextures();
  }

  _buildTextures() {
    const g = new PIXI.Graphics();

    g.beginFill(0xffffff); g.drawCircle(0, 0, 16); g.endFill();
    this._textures['circle'] = this._app.renderer.generateTexture(g);

    g.clear(); g.beginFill(0xffffff); g.drawRect(-12, -12, 24, 24); g.endFill();
    this._textures['square'] = this._app.renderer.generateTexture(g);

    g.clear(); g.beginFill(0xffffff); g.drawEllipse(0, 0, 7, 1); g.endFill();
    this._textures['slash'] = this._app.renderer.generateTexture(g);

    g.clear(); g.beginFill(0xffffff); g.drawCircle(0, 0, 1.5); g.endFill();
    this._textures['spark'] = this._app.renderer.generateTexture(g);

    g.clear(); g.beginFill(0xffffff); g.drawCircle(0, 0, 64); g.endFill();
    this._textures['glow'] = this._app.renderer.generateTexture(g);

    g.destroy();
  }

  _resolveConfig(config) {
    const resolved = JSON.parse(JSON.stringify(config));
    resolved.behaviors = resolved.behaviors.map(b => {
      if (b.type === 'textureSingle' && typeof b.config.texture === 'string') {
        const tex = this._textures[b.config.texture];
        if (tex) b.config.texture = tex;
      }
      return b;
    });
    return resolved;
  }

  // json shape: { duration, emitDuration, emitter: { ...pixi emitter config } }
  // emitDuration — how long to spawn particles (ms). defaults to 100.
  // duration     — total lifetime before cleanup (ms). should be >= emitDuration + max particle lifetime.
  play(json, x, y) {
    this.stop();

    const container = new PIXI.Container();
    container.x = x;
    container.y = y;
    this._app.stage.addChild(container);

    const emitter = new Emitter(container, this._resolveConfig(json.emitter));
    emitter.emit = true;

    let last = performance.now();
    const tickerFn = () => {
      const now = performance.now();
      emitter.update((now - last) * 0.001);
      last = now;
    };
    this._app.ticker.add(tickerFn);

    const emitDuration = json.emitDuration ?? 100;
    const stopEmit = setTimeout(() => { emitter.emit = false; }, emitDuration);
    const cleanup  = setTimeout(() => this.stop(), json.duration);

    this._active = { container, emitter, tickerFn, timers: [stopEmit, cleanup] };
  }

  stop() {
    if (!this._active) return;
    const { container, emitter, tickerFn, timers } = this._active;
    timers.forEach(clearTimeout);
    this._app.ticker.remove(tickerFn);
    emitter.destroy();
    this._app.stage.removeChild(container);
    container.destroy({ children: true });
    this._active = null;
  }
}
