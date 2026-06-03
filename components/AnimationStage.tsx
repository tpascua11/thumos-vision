'use client'
import { useEffect, useRef, useState } from 'react'
import styles from './AnimationStage.module.css'

const PRESETS: Record<string, object> = {
  EXPLOSION: {
    speed:        400,
    angle:        0,
    rate:         20,
    sizeMin:      4,
    sizeMax:      14,
    lifetime:     0.6,
    spread:       300,
    gravity:      120,
    additive:     true,
    rotation:     true,
    emitDuration: 80,
    colorStops:   ['#ffffff', '#ff3366', '#ff6a00', '#ffdd00'],
  },
  SPARKS: {
    speed:        300,
    angle:        -90,
    rate:         15,
    sizeMin:      3,
    sizeMax:      9,
    lifetime:     0.9,
    spread:       180,
    gravity:      200,
    additive:     true,
    rotation:     false,
    shape:        'spark',
    emitDuration: 120,
    colorStops:   ['#ffffff', '#ffdd00', '#ff6a00'],
  },
  COMET: {
    speed:        0,
    angle:        0,
    rate:         8,
    sizeMin:      3,
    sizeMax:      11,
    lifetime:     0.8,
    spread:       50,
    gravity:      40,
    additive:     true,
    rotation:     true,
    colorStops:   ['#ffffff', '#ffe066', '#ff6a00', '#cc00ff'],
    showHead:     true,
    motion: {
      fromX:    -250,
      fromY:    0,
      dx:       500,
      dy:       0,
      duration: 300,
    },
  },
}

export default function AnimationStage() {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const appRef     = useRef<any>(null)
  const interpRef  = useRef<any>(null)
  const [ready,      setReady]      = useState(false)
  const [preset,     setPreset]     = useState('EXPLOSION')
  const [json,       setJson]       = useState(() => JSON.stringify(PRESETS['EXPLOSION'], null, 2))
  const [parseError, setParseError] = useState<string | null>(null)

  function selectPreset(name: string) {
    setPreset(name)
    setJson(JSON.stringify(PRESETS[name], null, 2))
    setParseError(null)
  }

  useEffect(() => {
    let app: any
    const init = async () => {
      if (!canvasRef.current) return
      const PIXI = await import('pixi.js')
      const { ThumosInterpreter } = await import('../ThumosInterpreter') as any

      app = new PIXI.Application()
      await app.init({
        canvas:      canvasRef.current,
        width:       canvasRef.current.offsetWidth,
        height:      canvasRef.current.offsetHeight,
        background:  0x06060a,
        antialias:   true,
        resolution:  window.devicePixelRatio || 1,
        autoDensity: true,
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

        <div className={styles.sideSection}>
          <div className={styles.sideLabel}>Preset</div>
          <div className={styles.presetRow}>
            {Object.keys(PRESETS).map(name => (
              <button
                key={name}
                className={`${styles.presetBtn} ${preset === name ? styles.presetBtnActive : ''}`}
                onClick={() => selectPreset(name)}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        <div className={`${styles.sideSection} ${styles.editorSection}`}>
          <div className={styles.sideLabel}>JSON</div>
          <textarea
            className={styles.jsonEditor}
            value={json}
            onChange={e => { setJson(e.target.value); setParseError(null); setPreset('') }}
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
  for (let x = 0; x < W; x += 40) { grid.moveTo(x, 0); grid.lineTo(x, H) }
  for (let y = 0; y < H; y += 40) { grid.moveTo(0, y); grid.lineTo(W, y) }
  grid.stroke({ color: 0x1a1a2e, alpha: 0.6, width: 1 })
  app.stage.addChild(grid)

  const cross = new PIXI.Graphics()
  cross.moveTo(W/2 - 12, H/2); cross.lineTo(W/2 + 12, H/2)
  cross.moveTo(W/2, H/2 - 12); cross.lineTo(W/2, H/2 + 12)
  cross.stroke({ color: 0x2a2a44, alpha: 0.8, width: 1 })
  app.stage.addChild(cross)
}
