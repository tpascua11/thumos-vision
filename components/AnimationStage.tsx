'use client'
import { useEffect, useRef, useState } from 'react'
import type { AttackDefinition, AttackConfig, ArcPosition, ParticleType, AttackPhase } from '../types/attack'
import { runAttack } from '../lib/interpreter'
import type { AttackJSON } from '../lib/interpreter'
import sliceJson  from '../reference/slice-base.json'
import hslashJson from '../reference/h-slash.json'
import styles from './AnimationStage.module.css'

// ─── Attack registry ──────────────────────────────────────────────────────────

const ATTACKS: AttackDefinition[] = [
  {
    id: 'slice', label: 'Vertical Slice', tag: 'MELEE',
    config: { slashAngle: Math.PI / 2, arcHalfSpan: 0.38 }
  },
  {
    id: 'diagonal', label: 'Diagonal Slash', tag: 'MELEE',
    config: { slashAngle: Math.PI * 0.25, arcHalfSpan: 0.42 }
  },
  {
    id: 'hslash', label: 'Horizontal Slash', tag: 'MELEE',
    config: {}
  },
  {
    id: 'side-hammer', label: 'Side Hammer', tag: 'MELEE',
    config: {}
  },
]

const DEFAULT_CONFIG: AttackConfig = {
  slashAngle:  Math.PI / 2,
  arcHalfSpan: 0.38,
  arcRadius:   130,
  arcDuration: 180,
  IMPACT_T:    0.5,
  trailColor:  0xddeeff,
  driftColor:  0x88ccff,
  beforeDrag:  0.81,
  afterDrag:   0.91,
  flashCount:  30,
  driftCount:  7,
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AnimationStage() {
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const appRef       = useRef<any>(null)
  const animRef      = useRef<boolean>(false)
  const [ready,      setReady]      = useState(false)
  const [attack,     setAttack]     = useState('slice')
  const [frameCount, setFrameCount] = useState(0)

  useEffect(() => {
    let app: any
    const init = async () => {
      if (!canvasRef.current) return
      const PIXI = await import('pixi.js')

      app = new PIXI.Application({
        width:           canvasRef.current.offsetWidth,
        height:          canvasRef.current.offsetHeight,
        backgroundColor: 0x06060a,
        antialias:       true,
        resolution:      window.devicePixelRatio || 1,
        autoDensity:     true,
        view:            canvasRef.current,
      })

      appRef.current = app

      const W = app.screen.width
      const H = app.screen.height

      const grid = new PIXI.Graphics()
      grid.lineStyle(1, 0x1a1a2e, 0.6)
      for (let x = 0; x < W; x += 40) { grid.moveTo(x, 0); grid.lineTo(x, H) }
      for (let y = 0; y < H; y += 40) { grid.moveTo(0, y); grid.lineTo(W, y) }
      app.stage.addChild(grid)

      const cross = new PIXI.Graphics()
      cross.lineStyle(1, 0x2a2a44, 0.8)
      cross.moveTo(W/2 - 12, H/2); cross.lineTo(W/2 + 12, H/2)
      cross.moveTo(W/2, H/2 - 12); cross.lineTo(W/2, H/2 + 12)
      app.stage.addChild(cross)

      app.ticker.add(() => setFrameCount((f: number) => f + 1))
      setReady(true)
    }
    init()
    return () => { if (app) app.destroy(false) }
  }, [])

  useEffect(() => {
    if (!ready) return
    setTimeout(() => triggerAttack(appRef.current, attack, animRef), 700)
  }, [ready])

  const currentAttack = ATTACKS.find(a => a.id === attack)

  return (
    <div className={styles.stage}>
      <aside className={styles.sidebar}>
        <div className={styles.sideSection}>
          <div className={styles.sideLabel}>ATTACK TYPE</div>
          {ATTACKS.map(a => (
            <button
              key={a.id}
              className={`${styles.attackBtn} ${attack === a.id ? styles.attackActive : ''}`}
              onClick={() => setAttack(a.id)}
            >
              <span className={styles.attackTag}>{a.tag}</span>
              <span className={styles.attackLabel}>{a.label}</span>
            </button>
          ))}
        </div>

        <div className={styles.sideSection}>
          <div className={styles.sideLabel}>CONTROLS</div>
          <button
            className={styles.strikeBtn}
            onClick={() => triggerAttack(appRef.current, attack, animRef)}
          >
            ▶ STRIKE
          </button>
        </div>

        <div className={styles.sideSection}>
          <div className={styles.sideLabel}>DIAGNOSTICS</div>
          <DiagRow k="frame"    v={String(frameCount)} />
          <DiagRow k="attack"   v={attack} />
          <DiagRow k="engine"   v="pixi.js@7" />
          <DiagRow k="impact"   v="t=0.50" />
          <DiagRow k="angle"    v={currentAttack?.config.slashAngle?.toFixed(2) ?? 'n/a'} />
        </div>
      </aside>

      <div
        className={styles.canvasWrap}
        onClick={() => triggerAttack(appRef.current, attack, animRef)}
      >
        <canvas ref={canvasRef} className={styles.canvas} />
        {!ready && <div className={styles.loading}><span>INITIALIZING ENGINE</span></div>}
        <div className={styles.canvasLabel}>CLICK TO STRIKE</div>
      </div>
    </div>
  )
}

function DiagRow({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', padding:'4px 0', borderBottom:'1px solid var(--line)' }}>
      <span style={{ color:'var(--text3)', fontSize:'10px', letterSpacing:'0.08em' }}>{k}</span>
      <span style={{ color:'var(--accent)', fontSize:'10px', fontWeight:500 }}>{v}</span>
    </div>
  )
}

// ─── Attack runner ────────────────────────────────────────────────────────────

async function triggerAttack(app: any, id: string, animRef: React.MutableRefObject<boolean>) {
  if (!app) return

  if (id === 'slice' || id === 'hslash') {
    runAttack(app, (id === 'slice' ? sliceJson : hslashJson) as unknown as AttackJSON)
    return
  }

  if (animRef.current) return
  const PIXI = await import('pixi.js')
  animRef.current = true

  // Clear previous effects
  app.stage.children
    .filter((c: any) => c._isEffect)
    .forEach((c: any) => app.stage.removeChild(c))

  const container = new PIXI.Container() as any
  container._isEffect = true
  app.stage.addChild(container)

  const def    = ATTACKS.find(a => a.id === id)
  const config: AttackConfig = { ...DEFAULT_CONFIG, ...(def?.config ?? {}) }

  switch (id) {
    case 'diagonal':    runSlice(app, PIXI, container, animRef, config);  break
    case 'side-hammer': runThrust(app, PIXI, container, animRef, config); break
  }
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function makeTex(PIXI: any, app: any, w: number, h: number) {
  const g = new PIXI.Graphics()
  g.beginFill(0xffffff, 1)
  g.drawEllipse(0, 0, w, h)
  g.endFill()
  return app.renderer.generateTexture(g)
}

function buildArc(
  cx: number, cy: number,
  slashAngle: number, arcHalfSpan: number, arcRadius: number,
  steps: number
): ArcPosition[] {
  const midAngle    = slashAngle + Math.PI
  const arcCenterX  = cx - Math.cos(midAngle) * arcRadius
  const arcCenterY  = cy - Math.sin(midAngle) * arcRadius
  const start       = midAngle - arcHalfSpan
  const end         = midAngle + arcHalfSpan
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t     = i / steps
    const angle = start + (end - start) * t
    return { x: arcCenterX + Math.cos(angle) * arcRadius, y: arcCenterY + Math.sin(angle) * arcRadius, angle, t }
  })
}

// ─── SLICE ────────────────────────────────────────────────────────────────────

function runSlice(
  app: any, PIXI: any, container: any,
  animRef: React.MutableRefObject<boolean>,
  config: AttackConfig
) {
  const W  = app.screen.width
  const H  = app.screen.height
  const cx = W / 2
  const cy = H / 2

  const { slashAngle, arcHalfSpan, arcRadius, arcDuration, IMPACT_T, trailColor, driftColor, beforeDrag, afterDrag, flashCount, driftCount } = config

  const ARC_STEPS   = 22
  const arcPositions = buildArc(cx, cy, slashAngle, arcHalfSpan, arcRadius, ARC_STEPS)

  const slashTex = makeTex(PIXI, app, 14, 2)
  const sparkTex = makeTex(PIXI, app, 3,  3)
  const glowTex  = makeTex(PIXI, app, 20, 20)

  const particles:   any[] = []
  let   startTime:   number | null = null
  let   impactFired  = false
  let   arcDone      = false
  let   lastStep     = -1

  const flash = new PIXI.Graphics()
  flash.beginFill(0xffffff, 1); flash.drawRect(0, 0, W, H); flash.endFill()
  flash.alpha = 0
  app.stage.addChild(flash)

  const spawnTrail = (pos: ArcPosition, nextPos: ArcPosition | undefined, phase: AttackPhase) => {
    const isBefore  = phase === 'before'
    const count     = isBefore ? 6 : 4
    const dx        = nextPos ? nextPos.x - pos.x : 0
    const dy        = nextPos ? nextPos.y - pos.y : 0
    const perpAngle = Math.atan2(dy, dx) + Math.PI / 2
    for (let i = 0; i < count; i++) {
      const spread = (Math.random() - 0.5) * (isBefore ? 10 : 28)
      const p: any = new PIXI.Sprite(slashTex)
      p.anchor.set(0.5)
      p.x = pos.x + Math.cos(perpAngle) * spread
      p.y = pos.y + Math.sin(perpAngle) * spread
      p.tint  = trailColor
      p.alpha = isBefore ? 0.85 + Math.random() * 0.15 : 0.3 + Math.random() * 0.25
      p.rotation = pos.angle + Math.PI / 2 + (Math.random() - 0.5) * (isBefore ? 0.2 : 0.7)
      p.scale.set(
        isBefore ? 0.9 + Math.random() * 1.4 : 0.4 + Math.random() * 0.7,
        isBefore ? 0.2 + Math.random() * 0.3 : 0.3 + Math.random() * 0.5
      )
      const speed    = isBefore ? 2.8 + Math.random() * 3.2 : 0.6 + Math.random() * 1.4
      const outAngle = isBefore ? pos.angle + (Math.random() - 0.5) * 0.35 : pos.angle + (Math.random() - 0.5) * 1.4
      p._vx = Math.cos(outAngle) * speed; p._vy = Math.sin(outAngle) * speed
      p._life = 0; p._maxLife = isBefore ? 75 + Math.random() * 55 : 160 + Math.random() * 120
      p._phase = phase; p._type = 'trail' as ParticleType
      container.addChild(p); particles.push(p)
    }
  }

  const spawnFlash = (px: number, py: number) => {
    for (let i = 0; i < flashCount; i++) {
      const angle = (Math.PI * 2 / flashCount) * i + (Math.random() - 0.5) * 0.4
      const bias  = Math.cos(angle - slashAngle) * 0.5 + 0.5
      const speed = (1.2 + Math.random() * 3.5) * (0.4 + bias)
      const p: any = new PIXI.Sprite(i % 4 === 0 ? glowTex : slashTex)
      p.anchor.set(0.5)
      p.x = px + (Math.random() - 0.5) * 8; p.y = py + (Math.random() - 0.5) * 8
      p.tint = i % 5 === 0 ? 0xffffff : trailColor; p.alpha = 0.9 + Math.random() * 0.1
      p.scale.set(0.3 + Math.random() * 1.0); p.rotation = angle
      p._vx = Math.cos(angle) * speed; p._vy = Math.sin(angle) * speed
      p._life = 0; p._maxLife = 130 + Math.random() * 110; p._type = 'flash' as ParticleType
      container.addChild(p); particles.push(p)
    }
  }

  const spawnDrift = (px: number, py: number) => {
    for (let i = 0; i < driftCount; i++) {
      const angle = Math.random() * Math.PI * 2
      const p: any = new PIXI.Sprite(sparkTex)
      p.anchor.set(0.5)
      p.x = px + (Math.random() - 0.5) * 30; p.y = py + (Math.random() - 0.5) * 30
      p.tint = driftColor; p.alpha = 0.8; p.scale.set(0.5 + Math.random() * 0.8)
      p._vx = Math.cos(angle) * (0.2 + Math.random() * 0.7)
      p._vy = Math.sin(angle) * (0.2 + Math.random() * 0.7) - 0.38
      p._life = 0; p._maxLife = 700 + Math.random() * 400; p._type = 'drift' as ParticleType
      container.addChild(p); particles.push(p)
    }
  }

  app.ticker.add(function tick(delta: number) {
    const now      = performance.now()
    if (!startTime) startTime = now
    const elapsed   = now - startTime
    const progress  = Math.min(elapsed / arcDuration, 1)
    const stepIndex = Math.min(Math.floor(progress * ARC_STEPS), ARC_STEPS - 1)

    if (stepIndex > lastStep) {
      for (let s = lastStep + 1; s <= stepIndex; s++) {
        const pos     = arcPositions[s]
        const nextPos = arcPositions[s + 1]
        spawnTrail(pos, nextPos, pos.t < IMPACT_T ? 'before' : 'after')
      }
      lastStep = stepIndex
    }

    if (!impactFired && progress >= IMPACT_T) {
      impactFired = true
      spawnFlash(cx, cy); spawnDrift(cx, cy)
      flash.alpha = 0.2
    }

    if (flash.alpha > 0) { flash.alpha -= 0.013 * delta; if (flash.alpha < 0) flash.alpha = 0 }
    if (progress >= 1) arcDone = true

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]
      p._life += app.ticker.deltaMS
      const t = p._life / p._maxLife
      if (t >= 1) { container.removeChild(p); particles.splice(i, 1); continue }
      p.x += p._vx * delta; p.y += p._vy * delta
      if (p._type === 'trail') {
        const drag = p._phase === 'before' ? beforeDrag : afterDrag
        p._vx *= drag; p._vy *= drag
        p.alpha = (1 - t) * (p._phase === 'before' ? 0.88 : 0.40)
      } else if (p._type === 'flash') {
        p._vx *= 0.91; p._vy *= 0.91
        p.alpha = (1 - t) * (1 - t) * 0.95
        p.scale.x *= 0.976; p.scale.y *= 0.976
      } else if (p._type === 'drift') {
        p._vy -= 0.007 * delta
        p.alpha = t < 0.2 ? (t / 0.2) * 0.65 : (1 - t) * 0.65
      }
    }

    if (arcDone && particles.length === 0 && flash.alpha <= 0) {
      app.ticker.remove(tick)
      app.stage.removeChild(flash)
      animRef.current = false
    }
  })
}

// ─── SIDE HAMMER ──────────────────────────────────────────────────────────────

function runThrust(
  app: any, PIXI: any, container: any,
  animRef: React.MutableRefObject<boolean>,
  config: AttackConfig
) {
  const W  = app.screen.width
  const H  = app.screen.height
  const cx = W / 2
  const cy = H / 2

  const { arcDuration, IMPACT_T, trailColor, driftColor } = config
  const thrustColor = trailColor
  const sparkColor  = 0xffaa44

  const longTex  = makeTex(PIXI, app, 20, 1.5)
  const sparkTex = makeTex(PIXI, app, 3,  3)
  const glowTex  = makeTex(PIXI, app, 24, 24)

  const startX    = cx - 160
  const particles: any[] = []
  let   startTime: number | null = null
  let   impactFired = false
  let   done = false

  const flash = new PIXI.Graphics()
  flash.beginFill(0xffffff, 1); flash.drawRect(0, 0, W, H); flash.endFill()
  flash.alpha = 0
  app.stage.addChild(flash)

  app.ticker.add(function tick(delta: number) {
    const now      = performance.now()
    if (!startTime) startTime = now
    const elapsed  = now - startTime
    const progress = Math.min(elapsed / arcDuration, 1)
    const tipX     = startX + (cx - startX) * Math.min(progress / IMPACT_T, 1)

    if (progress < IMPACT_T) {
      for (let i = 0; i < 3; i++) {
        const p: any = new PIXI.Sprite(longTex)
        p.anchor.set(0.5)
        p.x = tipX - Math.random() * 20; p.y = cy + (Math.random() - 0.5) * 6
        p.tint = thrustColor; p.alpha = 0.7 + Math.random() * 0.3
        p.scale.set(0.8 + Math.random() * 1.2, 0.5 + Math.random() * 0.5)
        p.rotation = (Math.random() - 0.5) * 0.15
        p._vx = -0.5 - Math.random() * 1.5; p._vy = (Math.random() - 0.5) * 0.3
        p._life = 0; p._maxLife = 80 + Math.random() * 60; p._type = 'trail' as ParticleType
        container.addChild(p); particles.push(p)
      }
    }

    if (!impactFired && progress >= IMPACT_T) {
      impactFired = true; flash.alpha = 0.18
      for (let i = 0; i < 24; i++) {
        const angle = (Math.PI * 2 / 24) * i + (Math.random() - 0.5) * 0.3
        const bias  = Math.cos(angle) * 0.5 + 0.5
        const speed = (1.5 + Math.random() * 3) * (0.5 + bias * 0.8)
        const p: any = new PIXI.Sprite(i % 5 === 0 ? glowTex : longTex)
        p.anchor.set(0.5)
        p.x = cx + (Math.random() - 0.5) * 6; p.y = cy + (Math.random() - 0.5) * 6
        p.tint = i % 4 === 0 ? 0xffffff : thrustColor; p.alpha = 0.9
        p.scale.set(0.4 + Math.random() * 0.9); p.rotation = angle
        p._vx = Math.cos(angle) * speed; p._vy = Math.sin(angle) * speed
        p._life = 0; p._maxLife = 120 + Math.random() * 100; p._type = 'flash' as ParticleType
        container.addChild(p); particles.push(p)
      }
      for (let i = 0; i < 6; i++) {
        const p: any = new PIXI.Sprite(sparkTex)
        p.anchor.set(0.5)
        p.x = cx + (Math.random() - 0.5) * 20; p.y = cy + (Math.random() - 0.5) * 20
        p.tint = sparkColor; p.alpha = 0.9; p.scale.set(0.6 + Math.random() * 0.8)
        p._vx = (Math.random() - 0.3) * 1.5; p._vy = -0.5 - Math.random() * 1.0
        p._life = 0; p._maxLife = 600 + Math.random() * 400; p._type = 'drift' as ParticleType
        container.addChild(p); particles.push(p)
      }
    }

    if (flash.alpha > 0) { flash.alpha -= 0.014 * delta; if (flash.alpha < 0) flash.alpha = 0 }
    if (progress >= 1) done = true

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]
      p._life += app.ticker.deltaMS
      const t = p._life / p._maxLife
      if (t >= 1) { container.removeChild(p); particles.splice(i, 1); continue }
      p.x += p._vx * delta; p.y += p._vy * delta
      if (p._type === 'trail') {
        p._vx *= 0.88; p._vy *= 0.88; p.alpha = (1 - t) * 0.8
      } else if (p._type === 'flash') {
        p._vx *= 0.90; p._vy *= 0.90
        p.alpha = (1 - t) * (1 - t) * 0.9
        p.scale.x *= 0.978; p.scale.y *= 0.978
      } else if (p._type === 'drift') {
        p._vy += 0.01 * delta
        p.alpha = t < 0.15 ? (t / 0.15) * 0.8 : (1 - t) * 0.7
      }
    }

    if (done && particles.length === 0 && flash.alpha <= 0) {
      app.ticker.remove(tick)
      app.stage.removeChild(flash)
      animRef.current = false
    }
  })
}

