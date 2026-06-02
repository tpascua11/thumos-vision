'use client'
import { useEffect, useRef, useState } from 'react'
import styles from './AnimationStage.module.css'

const DEFAULT_JSON = JSON.stringify({
  duration: 800,
  emitDuration: 80,
  emitter: {
    lifetime: { min: 0.2, max: 0.5 },
    frequency: 0.001,
    maxParticles: 60,
    addAtBack: false,
    pos: { x: 0, y: 0 },
    behaviors: [
      { type: 'alpha',         config: { alpha: { list: [{ value: 1, time: 0 }, { value: 0, time: 1 }] } } },
      { type: 'scale',         config: { scale: { list: [{ value: 1, time: 0 }, { value: 0, time: 1 }] }, minMult: 0.3 } },
      { type: 'color',         config: { color: { list: [{ value: 'ffffff', time: 0 }, { value: 'ffaa00', time: 1 }] } } },
      { type: 'moveSpeed',     config: { speed: { list: [{ value: 200, time: 0 }, { value: 10, time: 1 }] }, minMult: 0.3 } },
      { type: 'rotationStatic', config: { min: 0, max: 360 } },
      { type: 'textureSingle', config: { texture: 'spark' } }
    ]
  }
}, null, 2)

export default function AnimationStage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const appRef    = useRef<any>(null)
  const interpRef = useRef<any>(null)
  const [ready,      setReady]      = useState(false)
  const [json,       setJson]       = useState(DEFAULT_JSON)
  const [parseError, setParseError] = useState<string | null>(null)

  useEffect(() => {
    let app: any
    const init = async () => {
      if (!canvasRef.current) return
      const PIXI = await import('pixi.js')
      const { ThumosInterpreter } = await import('../ThumosInterpreter') as any
      app = new PIXI.Application({
        width:           canvasRef.current.offsetWidth,
        height:          canvasRef.current.offsetHeight,
        backgroundColor: 0x06060a,
        antialias:       true,
        resolution:      window.devicePixelRatio || 1,
        autoDensity:     true,
        view:            canvasRef.current,
      })
      appRef.current    = app
      interpRef.current = new ThumosInterpreter(app)
      drawGrid(app, PIXI)
      setReady(true)
    }
    init()
    return () => { if (app) app.destroy(false) }
  }, [])

  function play() {
    if (!appRef.current || !interpRef.current) return
    try {
      const parsed = JSON.parse(json)
      setParseError(null)
      const cx = appRef.current.screen.width  / 2
      const cy = appRef.current.screen.height / 2
      interpRef.current.play(parsed, cx, cy)
    } catch (e: any) {
      setParseError(e.message)
    }
  }

  function stop() {
    interpRef.current?.stop()
  }

  return (
    <div className={styles.stage}>
      <aside className={styles.sidebar}>

        <div className={`${styles.sideSection} ${styles.editorSection}`}>
          <div className={styles.sideLabel}>JSON</div>
          <textarea
            className={styles.jsonEditor}
            value={json}
            onChange={e => { setJson(e.target.value); setParseError(null) }}
            spellCheck={false}
          />
          {parseError && <div className={styles.parseError}>{parseError}</div>}
        </div>

        <div className={styles.sideSection}>
          <button className={styles.playAllBtn} onClick={play} disabled={!ready}>▶ PLAY</button>
          <button className={styles.stopBtn}    onClick={stop} disabled={!ready}>■ STOP</button>
        </div>

      </aside>

      <div className={styles.canvasWrap} onClick={play}>
        <canvas ref={canvasRef} className={styles.canvas} />
        {!ready && <div className={styles.loading}><span>INITIALIZING ENGINE</span></div>}
        <div className={styles.canvasLabel}>CLICK TO PLAY</div>
      </div>
    </div>
  )
}

function drawGrid(app: any, PIXI: any) {
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
}
