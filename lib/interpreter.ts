// Data-driven attack animator. Feed it a JSON matching AttackJSON and it renders
// the attack via PixiJS. Never import pixi.js at the module top level.

export interface PhaseConfig {
  count:       number
  spread:      number
  speedMin:    number
  speedMax:    number
  drag:        number
  alphaMax:    number
  lifetimeMin: number
  lifetimeMax: number
}

export interface AttackJSON {
  id:      string
  type:    string
  element: string
  arc: {
    slashAngle:  number
    arcHalfSpan: number
    arcRadius:   number
    duration:    number
    steps:       number
  }
  colors: {
    trail: number
    drift: number
    flash: number
  }
  textures: {
    slash: { w: number; h: number }
    spark: { w: number; h: number }
    glow:  { w: number; h: number }
  }
  phases: {
    before: PhaseConfig
    after:  PhaseConfig
  }
  impact: {
    at:          number
    screenFlash: { alpha: number; fadeSpeed: number }
    burst:       { count: number; biased: boolean; drag: number; scaleDecay: number; lifetimeMin: number; lifetimeMax: number }
    drift:       { count: number; gravityY: number; alphaMax: number; lifetimeMin: number; lifetimeMax: number }
  }
}

export async function runAttack(app: any, json: AttackJSON): Promise<void> {
  const PIXI = await import('pixi.js')

  const W  = app.screen.width
  const H  = app.screen.height
  const cx = W / 2
  const cy = H / 2

  // Clear any previous effect containers
  app.stage.children
    .filter((c: any) => c._isEffect)
    .forEach((c: any) => app.stage.removeChild(c))

  const container = new PIXI.Container() as any
  container._isEffect = true
  app.stage.addChild(container)

  const { arc, colors, textures, phases, impact } = json
  const IMPACT_T = impact.at

  // ── Arc geometry ──────────────────────────────────────────────────────────────
  // The midpoint of the arc lands exactly on (cx, cy).
  const midAngle   = arc.slashAngle + Math.PI
  const arcCenterX = cx - Math.cos(midAngle) * arc.arcRadius
  const arcCenterY = cy - Math.sin(midAngle) * arc.arcRadius
  const spanStart  = midAngle - arc.arcHalfSpan
  const spanEnd    = midAngle + arc.arcHalfSpan

  const arcPositions = Array.from({ length: arc.steps + 1 }, (_, i) => {
    const t     = i / arc.steps
    const angle = spanStart + (spanEnd - spanStart) * t
    return {
      x: arcCenterX + Math.cos(angle) * arc.arcRadius,
      y: arcCenterY + Math.sin(angle) * arc.arcRadius,
      angle,
      t,
    }
  })

  // ── Textures ──────────────────────────────────────────────────────────────────
  const makeTex = (w: number, h: number) => {
    const g = new PIXI.Graphics()
    g.beginFill(0xffffff, 1)
    g.drawEllipse(0, 0, w, h)
    g.endFill()
    return app.renderer.generateTexture(g)
  }

  const slashTex = makeTex(textures.slash.w, textures.slash.h)
  const sparkTex = makeTex(textures.spark.w, textures.spark.h)
  const glowTex  = makeTex(textures.glow.w,  textures.glow.h)

  // ── State ─────────────────────────────────────────────────────────────────────
  const particles: any[] = []
  let startTime:   number | null = null
  let impactFired  = false
  let arcDone      = false
  let lastStep     = -1

  // ── Spawners ──────────────────────────────────────────────────────────────────

  function spawnTrail(pos: any, nextPos: any, phase: 'before' | 'after') {
    const cfg      = phase === 'before' ? phases.before : phases.after
    const isBefore = phase === 'before'
    const dx       = nextPos ? nextPos.x - pos.x : 0
    const dy       = nextPos ? nextPos.y - pos.y : 0
    const perp     = Math.atan2(dy, dx) + Math.PI / 2

    for (let i = 0; i < cfg.count; i++) {
      const lateralOffset = (Math.random() - 0.5) * cfg.spread
      const p: any        = new PIXI.Sprite(slashTex)
      p.anchor.set(0.5)
      p.x        = pos.x + Math.cos(perp) * lateralOffset
      p.y        = pos.y + Math.sin(perp) * lateralOffset
      p.tint     = colors.trail
      p.alpha    = cfg.alphaMax * (0.9 + Math.random() * 0.1)
      p.rotation = pos.angle + Math.PI / 2 + (Math.random() - 0.5) * cfg.spread * 0.05
      p.scale.set(
        isBefore ? 0.9 + Math.random() * 1.4 : 0.4 + Math.random() * 0.7,
        isBefore ? 0.2 + Math.random() * 0.3 : 0.3 + Math.random() * 0.5,
      )
      const speed    = cfg.speedMin + Math.random() * (cfg.speedMax - cfg.speedMin)
      const outAngle = pos.angle + (Math.random() - 0.5) * cfg.spread * 0.05
      p._vx       = Math.cos(outAngle) * speed
      p._vy       = Math.sin(outAngle) * speed
      p._life     = 0
      p._maxLife  = cfg.lifetimeMin + Math.random() * (cfg.lifetimeMax - cfg.lifetimeMin)
      p._type     = 'trail'
      p._drag     = cfg.drag
      p._alphaMax = cfg.alphaMax
      container.addChild(p)
      particles.push(p)
    }
  }

  function spawnBurst(px: number, py: number) {
    const cfg = impact.burst
    for (let i = 0; i < cfg.count; i++) {
      const angle  = (Math.PI * 2 / cfg.count) * i + (Math.random() - 0.5) * 0.4
      const bias   = cfg.biased ? Math.cos(angle - arc.slashAngle) * 0.5 + 0.5 : 1.0
      const speed  = (1.2 + Math.random() * 3.5) * (0.4 + bias)
      const p: any = new PIXI.Sprite(i % 4 === 0 ? glowTex : slashTex)
      p.anchor.set(0.5)
      p.x        = px + (Math.random() - 0.5) * 8
      p.y        = py + (Math.random() - 0.5) * 8
      p.tint     = i % 5 === 0 ? colors.flash : colors.trail
      p.alpha    = 0.9 + Math.random() * 0.1
      p.scale.set(0.3 + Math.random() * 1.0)
      p.rotation = angle
      p._vx        = Math.cos(angle) * speed
      p._vy        = Math.sin(angle) * speed
      p._life      = 0
      p._maxLife   = cfg.lifetimeMin + Math.random() * (cfg.lifetimeMax - cfg.lifetimeMin)
      p._type      = 'burst'
      p._drag      = cfg.drag
      p._scaleDecay = cfg.scaleDecay
      container.addChild(p)
      particles.push(p)
    }
  }

  function spawnDrift(px: number, py: number) {
    const cfg = impact.drift
    for (let i = 0; i < cfg.count; i++) {
      const angle  = Math.random() * Math.PI * 2
      const p: any = new PIXI.Sprite(sparkTex)
      p.anchor.set(0.5)
      p.x     = px + (Math.random() - 0.5) * 30
      p.y     = py + (Math.random() - 0.5) * 30
      p.tint  = colors.drift
      p.alpha = cfg.alphaMax
      p.scale.set(0.5 + Math.random() * 0.8)
      // small upward bias on initial velocity; gravityY steers over time
      p._vx      = Math.cos(angle) * (0.2 + Math.random() * 0.7)
      p._vy      = Math.sin(angle) * (0.2 + Math.random() * 0.7) - 0.38
      p._life    = 0
      p._maxLife = cfg.lifetimeMin + Math.random() * (cfg.lifetimeMax - cfg.lifetimeMin)
      p._type    = 'drift'
      p._gravityY = cfg.gravityY
      p._alphaMax = cfg.alphaMax
      container.addChild(p)
      particles.push(p)
    }
  }

  // ── Tick ──────────────────────────────────────────────────────────────────────

  app.ticker.add(function tick(delta: number) {
    const now      = performance.now()
    if (!startTime) startTime = now
    const elapsed   = now - startTime
    const progress  = Math.min(elapsed / arc.duration, 1)
    const stepIndex = Math.min(Math.floor(progress * arc.steps), arc.steps - 1)

    // Emit trail for each newly reached arc step
    if (stepIndex > lastStep) {
      for (let s = lastStep + 1; s <= stepIndex; s++) {
        const pos     = arcPositions[s]
        const nextPos = arcPositions[s + 1]
        spawnTrail(pos, nextPos, pos.t < IMPACT_T ? 'before' : 'after')
      }
      lastStep = stepIndex
    }

    // Fire impact effects simultaneously at IMPACT_T
    if (!impactFired && progress >= IMPACT_T) {
      impactFired = true
      spawnBurst(cx, cy)
      spawnDrift(cx, cy)
    }

    if (progress >= 1) arcDone = true

    // Update all particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]
      p._life += app.ticker.deltaMS
      const t = p._life / p._maxLife
      if (t >= 1) { container.removeChild(p); particles.splice(i, 1); continue }

      p.x += p._vx * delta
      p.y += p._vy * delta

      if (p._type === 'trail') {
        p._vx *= p._drag
        p._vy *= p._drag
        p.alpha = (1 - t) * p._alphaMax
      } else if (p._type === 'burst') {
        p._vx *= p._drag
        p._vy *= p._drag
        p.alpha    = (1 - t) * (1 - t) * 0.95
        p.scale.x *= p._scaleDecay
        p.scale.y *= p._scaleDecay
      } else if (p._type === 'drift') {
        p._vy  += p._gravityY * delta   // negative gravityY → floats upward
        p.alpha = t < 0.2
          ? (t / 0.2) * p._alphaMax
          : (1 - t) * p._alphaMax
      }
    }

    if (arcDone && particles.length === 0) {
      app.ticker.remove(tick)
    }
  })
}
