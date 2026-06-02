'use client'
import { useEffect, useRef, useState } from 'react'
import styles from './AnimationStage.module.css'

import sliceJson       from '../reference/slice-base.json'
import hslashJson      from '../reference/h-slash.json'
import diagonalJson    from '../reference/diagonal.json'
import hammerJson      from '../reference/side-hammer.json'
import flameStrikeJson  from '../reference/flame_strike.json'
import flameStrike2Json from '../reference/flame_strike_2.json'
import flameStrike3Json from '../reference/flame_strike_3.json'
import flameStrike5Json from '../reference/flame_strike_5.json'
import flameStrike6Json from '../reference/flame_strike_6.json'
import flameStrike7Json from '../reference/flame_strike_7.json'
import sliceTrueJson    from '../reference/slice-true.json'

const FILES: Record<string, any> = {
  'slice-base':     sliceJson,
  'slice-true':     sliceTrueJson,
  'h-slash':        hslashJson,
  'diagonal':       diagonalJson,
  'side-hammer':    hammerJson,
  'flame_strike':   flameStrikeJson,
  'flame_strike_2': flameStrike2Json,
  'flame_strike_3': flameStrike3Json,
  'flame_strike_5': flameStrike5Json,
  'flame_strike_6': flameStrike6Json,
  'flame_strike_7': flameStrike7Json,
}

export default function AnimationStage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const appRef    = useRef<any>(null)
  const interpRef = useRef<any>(null)
  const [ready,      setReady]      = useState(false)
  const [file,       setFile]       = useState('slice-base')
  const [json,       setJson]       = useState(() => JSON.stringify(sliceJson, null, 2))
  const [parseError, setParseError] = useState<string | null>(null)

  useEffect(() => {
    setJson(JSON.stringify(FILES[file], null, 2))
    setParseError(null)
  }, [file])

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
      interpRef.current.stop()
      interpRef.current.playAttack(parsed, cx, cy)
    } catch (e: any) {
      setParseError(e.message)
    }
  }

  function stop() {
    interpRef.current?.stop()
  }

  function download() {
    const blob = new Blob([json], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `${file}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className={styles.stage}>
      <aside className={styles.sidebar}>

        <div className={styles.sideSection}>
          <div className={styles.sideLabel}>File</div>
          <select
            className={styles.select}
            value={file}
            onChange={e => setFile(e.target.value)}
          >
            {Object.keys(FILES).map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>

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
          <button className={styles.playAllBtn}  onClick={play}     disabled={!ready}>▶ PLAY</button>
          <button className={styles.stopBtn}     onClick={stop}     disabled={!ready}>■ STOP</button>
          <button className={styles.downloadBtn} onClick={download}>↓ DOWNLOAD JSON</button>
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
