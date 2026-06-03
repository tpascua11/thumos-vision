'use client'
import { useState } from 'react'
import Nav from '../components/Nav'
import AnimationStage from '../components/AnimationStage'
import styles from './page.module.css'

export default function Home() {
  const [showHelp, setShowHelp] = useState(false)

  return (
    <div className={styles.root}>
      <Nav onHelpOpen={() => setShowHelp(true)} />
      <main className={styles.main}>
        <AnimationStage />
      </main>
      <footer className={styles.footer}>
        <span className={styles.footerTag}>THUMOS VISION</span>
        <span className={styles.footerSub}>rpg animation engine // built for AI consumption</span>
        <span className={styles.footerTag}>v0.2.0</span>
      </footer>

      {showHelp && (
        <div className={styles.overlay} onClick={() => setShowHelp(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>REFERENCE</span>
              <button className={styles.modalClose} onClick={() => setShowHelp(false)}>✕</button>
            </div>

            <div className={styles.modalBody}>

              <section className={styles.helpSection}>
                <div className={styles.helpSectionTitle}>SYSTEM OVERVIEW</div>
                <p className={styles.helpText}>
                  <code>ThumosInterpreter.js</code> renders particle effects from a plain JSON config object.
                  No code changes needed to create new effects — describe the effect in JSON and call <code>play(json, x, y)</code>.
                  All effects share the same parameter model. <code>x, y</code> is the spawn point in screen pixels (canvas center = stage origin).
                </p>
              </section>

              <section className={styles.helpSection}>
                <div className={styles.helpSectionTitle}>PARAMETER REFERENCE</div>
                <table className={styles.paramTable}>
                  <thead>
                    <tr>
                      <th>param</th>
                      <th>type</th>
                      <th>default</th>
                      <th>range</th>
                      <th>description</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td className={styles.paramName}>speed</td><td>number</td><td>0</td><td>0–600</td><td>Launch velocity in px/sec along angle direction. Set to 0 for spread-only scatter.</td></tr>
                    <tr><td className={styles.paramName}>angle</td><td>number</td><td>0</td><td>0–360</td><td>Launch direction in degrees. 0=right, 90=down, 180=left, 270=up. Has no effect if speed=0.</td></tr>
                    <tr><td className={styles.paramName}>emitAngle</td><td>string</td><td>—</td><td>"auto"</td><td>When "auto" and motion is present: auto-sets emit direction to the reverse of motion direction. Overrides angle. Requires motion block.</td></tr>
                    <tr><td className={styles.paramName}>rate</td><td>number</td><td>8</td><td>1–50</td><td>rate × 10 = particles per second. rate:10 = 100/sec.</td></tr>
                    <tr><td className={styles.paramName}>sizeMin</td><td>number</td><td>3</td><td>1–30</td><td>Min particle size in pixels.</td></tr>
                    <tr><td className={styles.paramName}>sizeMax</td><td>number</td><td>11</td><td>1–30</td><td>Max particle size in pixels. Must be ≥ sizeMin.</td></tr>
                    <tr><td className={styles.paramName}>lifetime</td><td>number</td><td>0.8</td><td>0.1–3.0</td><td>Base particle lifetime in seconds. Actual lifetime = lifetime × rand(0.6–1.4) per particle.</td></tr>
                    <tr><td className={styles.paramName}>spread</td><td>number</td><td>50</td><td>0–500</td><td>Random velocity noise applied equally to both X and Y axes. Higher = more chaotic scatter.</td></tr>
                    <tr><td className={styles.paramName}>spreadX</td><td>number</td><td>spread</td><td>0–500</td><td>X-axis scatter only. Overrides spread for X when set.</td></tr>
                    <tr><td className={styles.paramName}>spreadY</td><td>number</td><td>spread</td><td>0–500</td><td>Y-axis scatter only. Overrides spread for Y when set.</td></tr>
                    <tr><td className={styles.paramName}>gravity</td><td>number</td><td>40</td><td>0–400</td><td>Downward acceleration in px/sec². 0 = particles float. 200+ = heavy fall.</td></tr>
                    <tr><td className={styles.paramName}>additive</td><td>bool</td><td>false</td><td>—</td><td>true = additive blend mode (particles glow and stack brightly). false = normal blend.</td></tr>
                    <tr><td className={styles.paramName}>rotation</td><td>bool</td><td>false</td><td>—</td><td>true = particles spin randomly. Auto-disabled for shape:"spark" (spark aligns to velocity instead).</td></tr>
                    <tr><td className={styles.paramName}>shape</td><td>string</td><td>"square"</td><td>—</td><td>"square" · "circle" · "spark" (thin shard, aligns to velocity direction on spawn, no spin).</td></tr>
                    <tr><td className={styles.paramName}>emitDuration</td><td>number</td><td>100</td><td>10–2000</td><td>Ms to keep spawning particles. Default is motion.duration when motion present, else 100.</td></tr>
                    <tr><td className={styles.paramName}>duration</td><td>number</td><td>auto</td><td>—</td><td>Total ms before full cleanup. Default: emitDuration + lifetime × 2000. Only override if cleanup fires too early or late.</td></tr>
                    <tr><td className={styles.paramName}>colorStops</td><td>string[]</td><td>["#fff"]</td><td>—</td><td>Hex colors interpolated across particle lifetime t=0→1. Index 0 = birth color, last = death color. 2–4 stops recommended.</td></tr>
                    <tr><td className={styles.paramName}>showHead</td><td>bool</td><td>true</td><td>—</td><td>Renders a bright white square that leads the motion path. Only visible when motion block is present.</td></tr>
                    <tr><td className={styles.paramName}>motion</td><td>object</td><td>null</td><td>—</td><td>Moves the spawn point over time. See Motion Block below.</td></tr>
                  </tbody>
                </table>
              </section>

              <section className={styles.helpSection}>
                <div className={styles.helpSectionTitle}>MOTION BLOCK</div>
                <p className={styles.helpText}>
                  When present, the spawn point moves from <code>(x + fromX, y + fromY)</code> to <code>(x + fromX + dx, y + fromY + dy)</code> over <code>duration</code> ms.
                  Particles already born stay fixed in world space — they do not follow the emitter. This produces correct trail behavior.
                </p>
                <table className={styles.paramTable}>
                  <tbody>
                    <tr><td className={styles.paramName}>fromX / fromY</td><td>Start offset in pixels from play (x, y). Use negative fromX to start left of center.</td></tr>
                    <tr><td className={styles.paramName}>dx / dy</td><td>Displacement from the start position. dx:500 = move 500px right.</td></tr>
                    <tr><td className={styles.paramName}>duration</td><td>Ms to complete the move. Controls perceived slash speed.</td></tr>
                  </tbody>
                </table>
              </section>

              <section className={styles.helpSection}>
                <div className={styles.helpSectionTitle}>INTERACTION RULES</div>
                <ul className={styles.helpList}>
                  <li><code>speed: 0</code> makes <code>angle</code> irrelevant — spread takes over entirely as the only velocity source.</li>
                  <li><code>emitAngle: "auto"</code> requires a <code>motion</code> block. Without motion, it has no reference direction and falls back to 0°.</li>
                  <li><code>spreadX</code> / <code>spreadY</code> only override their respective axis. Setting just <code>spreadY</code> leaves X controlled by <code>spread</code>.</li>
                  <li><code>shape: "spark"</code> disables rotation automatically — sparks align to their velocity vector on spawn and don't spin.</li>
                  <li><code>showHead</code> only renders when a <code>motion</code> block is present. No motion = no head regardless of the flag.</li>
                  <li><code>colorStops[0]</code> is the birth color (t=0). The last stop is the death color (t=1). A single stop means all particles are that color throughout.</li>
                  <li>World-space trails: when motion is present, the container sits at (0,0) and particle positions are absolute. Already-born particles do not slide when the emitter moves.</li>
                </ul>
              </section>

              <section className={styles.helpSection}>
                <div className={styles.helpSectionTitle}>EXAMPLES</div>

                <div className={styles.exampleBlock}>
                  <div className={styles.exampleLabel}>Static explosion burst — no motion, high spread, short emitDuration</div>
                  <pre className={styles.exampleCode}>{`{
  "speed": 400, "angle": 0, "rate": 20,
  "sizeMin": 4, "sizeMax": 14, "lifetime": 0.6,
  "spread": 300, "gravity": 120,
  "additive": true, "rotation": true, "emitDuration": 80,
  "colorStops": ["#ffffff", "#ff3366", "#ff6a00", "#ffdd00"]
}`}</pre>
                </div>

                <div className={styles.exampleBlock}>
                  <div className={styles.exampleLabel}>Horizontal samurai slash (left → right) — emitAngle auto, thin spreadX wide spreadY</div>
                  <pre className={styles.exampleCode}>{`{
  "speed": 120, "emitAngle": "auto", "rate": 25,
  "sizeMin": 1, "sizeMax": 11, "lifetime": 0.6,
  "spreadX": 20, "spreadY": 80, "gravity": 30,
  "additive": true, "shape": "spark",
  "colorStops": ["#ffffff", "#ffe066", "#ff6a00"],
  "motion": { "fromX": -250, "fromY": 0, "dx": 500, "dy": 0, "duration": 300 }
}`}</pre>
                </div>

                <div className={styles.exampleBlock}>
                  <div className={styles.exampleLabel}>Diagonal slash (top-left → bottom-right) — only motion changes, emitAngle auto handles the rest</div>
                  <pre className={styles.exampleCode}>{`{
  "speed": 120, "emitAngle": "auto", "rate": 25,
  "sizeMin": 1, "sizeMax": 11, "lifetime": 0.6,
  "spreadX": 20, "spreadY": 80, "gravity": 30,
  "additive": true, "shape": "spark",
  "colorStops": ["#ffffff", "#ffe066", "#ff6a00"],
  "motion": { "fromX": -200, "fromY": -200, "dx": 400, "dy": 400, "duration": 300 }
}`}</pre>
                </div>

                <div className={styles.exampleBlock}>
                  <div className={styles.exampleLabel}>Comet trail — speed:0 for symmetric scatter, showHead:true for leading square</div>
                  <pre className={styles.exampleCode}>{`{
  "speed": 0, "rate": 8,
  "sizeMin": 3, "sizeMax": 11, "lifetime": 0.8,
  "spread": 50, "gravity": 40,
  "additive": true, "rotation": true, "showHead": true,
  "colorStops": ["#ffffff", "#ffe066", "#ff6a00", "#cc00ff"],
  "motion": { "fromX": -250, "fromY": 0, "dx": 500, "dy": 0, "duration": 300 }
}`}</pre>
                </div>

              </section>

            </div>
          </div>
        </div>
      )}
    </div>
  )
}
