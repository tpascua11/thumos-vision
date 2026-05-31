'use client'
import styles from './Docs.module.css'

const sections = [
  {
    id:    'overview',
    tag:   '00',
    title: 'Overview',
    content: [
      {
        type: 'text',
        body: `THUMOS VISION is a structured particle animation system built on Pixi.js 7. It is designed to be consumed by AI systems that need to generate, modify, or extend attack animations without visual ambiguity. Every parameter has a named role. Every phase has a clear boundary.`
      },
      {
        type: 'text',
        body: `The core design principle: an attack animation is not a visual effect. It is a description of energy transfer. Particles are the evidence of that transfer — before, during, and after contact.`
      },
    ]
  },
  {
    id:    'anatomy',
    tag:   '01',
    title: 'Anatomy of an Attack',
    content: [
      {
        type: 'text',
        body: `Every attack has three phases. The impact always occurs at t=0.5 (midpoint), not at the end. This is intentional — a blade cuts on contact, not on follow-through. The animation continues past impact as residual energy.`
      },
      {
        type: 'diagram',
        rows: [
          { label: 'PHASE 1',    range: 't=0.0 → t=0.5', desc: 'Approach / buildup. Particles tight, fast, high opacity. Energy converging.',      color: '#4af0c8' },
          { label: 'IMPACT',     range: 't=0.5',           desc: 'Flash burst at exact contact point. Screen flash. Target reacts.',                  color: '#ff5f7b' },
          { label: 'PHASE 2',    range: 't=0.5 → t=1.0', desc: 'Follow-through / bleed. Particles loose, dim, decaying. Energy dissipating.',       color: '#7b5fff' },
          { label: 'DRIFT',      range: 't=0.5 → t=∞',   desc: 'Long-lived sparks that float after impact. Afterfeel. Optional but recommended.',   color: '#aaddff' },
        ]
      },
    ]
  },
  {
    id:    'arc',
    tag:   '02',
    title: 'Arc Geometry',
    content: [
      {
        type: 'text',
        body: `The emitter is not stationary. It moves along a circular arc. The arc is defined so that its midpoint lands exactly on the impact point (cx, cy). This is the key geometric constraint.`
      },
      {
        type: 'code',
        lang: 'js',
        body:
`// Step 1: define slash direction
const slashAngle = Math.PI / 2;  // downward (vertical slice)
                                  // Math.PI * 0.25 = diagonal
                                  // 0 = rightward (thrust)

// Step 2: define arc dimensions
const arcRadius   = 130;   // size of the arc circle
const arcHalfSpan = 0.38;  // radians either side of midpoint

// Step 3: compute arc center so midpoint hits (cx, cy)
const midAngle   = slashAngle + Math.PI;
const arcCenterX = cx - Math.cos(midAngle) * arcRadius;
const arcCenterY = cy - Math.sin(midAngle) * arcRadius;

// Step 4: start and end angles
const arcStartAngle = midAngle - arcHalfSpan;
const arcEndAngle   = midAngle + arcHalfSpan;`
      },
      {
        type: 'text',
        body: `The arc center offset is perpendicular to the slash direction. The midpoint angle always points from the arc center back toward (cx, cy). This math guarantees the impact point is exact.`
      },
    ]
  },
  {
    id:    'particles',
    tag:   '03',
    title: 'Particle Parameters',
    content: [
      {
        type: 'text',
        body: `Each particle has a type that determines its update behavior. There are three types: trail, flash, and drift. They differ in drag, alpha curve, and lifetime.`
      },
      {
        type: 'table',
        headers: ['Type', 'Lifetime', 'Drag', 'Alpha Curve', 'Role'],
        rows: [
          ['trail (before)', '75–130ms',  '0.81/frame', 'Linear fadeout',        'Blade approach — tight, fast'],
          ['trail (after)',  '160–280ms', '0.91/frame', 'Dimmer linear fadeout', 'Follow-through bleed'],
          ['flash',         '130–240ms', '0.91/frame', 'Quadratic fadeout',     'Impact burst — biased radial'],
          ['drift',         '700–1100ms','none',        'Ease in/out',           'Lingering sparks — float up'],
        ]
      },
      {
        type: 'code',
        lang: 'js',
        body:
`// Trail particle update (per tick)
if (p._type === 'trail') {
  const drag = p._phase === 'before' ? 0.81 : 0.91;
  p._vx *= drag;
  p._vy *= drag;
  // before: bright and snappy, after: dim and trailing
  p.alpha = (1 - t) * (p._phase === 'before' ? 0.88 : 0.40);
}

// Flash particle update
if (p._type === 'flash') {
  p._vx *= 0.91;
  p._vy *= 0.91;
  p.alpha = (1 - t) * (1 - t) * 0.95; // quadratic — fast initial fade
  p.scale.x *= 0.976;
  p.scale.y *= 0.976;
}

// Drift particle update
if (p._type === 'drift') {
  p._vy -= 0.007 * delta; // float upward
  // ease in then ease out
  p.alpha = t < 0.2 ? (t / 0.2) * 0.65 : (1 - t) * 0.65;
}`
      },
    ]
  },
  {
    id:    'textures',
    tag:   '04',
    title: 'Particle Textures',
    content: [
      {
        type: 'text',
        body: `Textures are generated at runtime from PIXI.Graphics primitives. Three texture shapes cover all attack types: an elongated ellipse (slash streaks), a small circle (sparks), and a large soft circle (glow).`
      },
      {
        type: 'code',
        lang: 'js',
        body:
`function makeTex(PIXI, app, w, h) {
  const g = new PIXI.Graphics();
  g.beginFill(0xffffff, 1);
  g.drawEllipse(0, 0, w, h);
  g.endFill();
  return app.renderer.generateTexture(g);
}

// Three standard textures
const slashTex = makeTex(PIXI, app, 14, 2);   // elongated — for trail streaks
const sparkTex = makeTex(PIXI, app, 3,  3);   // small circle — for drift sparks
const glowTex  = makeTex(PIXI, app, 20, 20);  // large circle — for impact glow

// Tint controls color (textures are white, tint multiplies)
p.tint = 0xddeeff;  // cool blue-white for blade
p.tint = 0x88ccff;  // softer blue for drift
p.tint = 0xffaa44;  // warm orange for fire/thrust`
      },
    ]
  },
  {
    id:    'attacks',
    tag:   '05',
    title: 'Attack Archetypes',
    content: [
      {
        type: 'text',
        body: `Different attack philosophies produce different emitter shapes and velocity profiles. The key variable is the relationship between origin, direction, and impact point.`
      },
      {
        type: 'table',
        headers: ['Archetype', 'Emitter Shape', 'slashAngle', 'arcHalfSpan', 'Character'],
        rows: [
          ['Vertical Slice',   'Moving arc (top→bottom)', 'Math.PI / 2',    '0.38', 'Clean, downward, precise'],
          ['Diagonal Slash',   'Moving arc (TL→BR)',      'Math.PI * 0.25', '0.42', 'Wider sweep, aggressive'],
          ['Thrust',           'Linear point (L→center)', 'n/a',            'n/a',  'Directional, penetrating'],
          ['Horizontal Sweep', 'Moving arc (L→R)',        '0',              '0.45', 'Wide, clearing'],
          ['Upward Slash',     'Moving arc (bottom→top)', 'Math.PI * 1.5',  '0.38', 'Rising, anti-air'],
        ]
      },
      {
        type: 'text',
        body: `To create a new archetype: set slashAngle to the direction of travel, set arcHalfSpan to control sweep width, and adjust arcRadius for reach. The geometry auto-computes the arc center.`
      },
    ]
  },
  {
    id:    'colors',
    tag:   '06',
    title: 'Color Language',
    content: [
      {
        type: 'text',
        body: `Color carries element and intent. The particle system uses tinting — textures are white, and tint values multiply. These are the established palette conventions:`
      },
      {
        type: 'table',
        headers: ['Element', 'Trail tint', 'Drift tint', 'Flash bias', 'Feel'],
        rows: [
          ['Blade / Physical', '0xddeeff', '0x88ccff', 'neutral',  'Cold, precise, clean'],
          ['Fire',             '0xff6622', '0xffaa44', 'warm',     'Hot, chaotic, trailing embers'],
          ['Lightning',        '0xeeeeff', '0xaaaaff', 'white',    'Instant, sharp, no drift'],
          ['Void / Dark',      '0x9944ff', '0x6622cc', 'none',     'Silent, absorbing, no flash'],
          ['Ice',              '0xaaffee', '0xffffff', 'cold',     'Crystalline, sharp edges'],
          ['Earth',            '0xcc8844', '0x886633', 'neutral',  'Slow, heavy, settling'],
        ]
      },
    ]
  },
  {
    id:    'ai-guide',
    tag:   '07',
    title: 'Guide for AI Systems',
    content: [
      {
        type: 'text',
        body: `This section explains how to use THUMOS VISION as an AI agent generating or modifying animations. Every animation is fully described by a small parameter set. Modify parameters, not code structure.`
      },
      {
        type: 'code',
        lang: 'js',
        body:
`// Minimal attack descriptor object
// AI: change ONLY these values to produce a new attack
const attackConfig = {
  slashAngle:   Math.PI / 2,   // direction of travel (radians)
  arcHalfSpan:  0.38,          // sweep width (radians, 0.2–0.6)
  arcRadius:    130,           // reach of arc (pixels, 80–200)
  arcDuration:  180,           // total animation time (ms, 100–400)
  IMPACT_T:     0.5,           // impact moment (always 0.5)
  trailColor:   0xddeeff,      // blade/trail tint
  driftColor:   0x88ccff,      // lingering spark tint
  beforeDrag:   0.81,          // decel before impact (0.7=fast stop, 0.95=slow stop)
  afterDrag:    0.91,          // decel after impact (looser)
  flashCount:   30,            // particles in impact burst
  driftCount:   7,             // lingering sparks after impact
};`
      },
      {
        type: 'text',
        body: `To describe a new attack to this system, use natural language mapped to the parameters above. For example: "a wide horizontal fire sweep with slow deceleration" translates to slashAngle=0, arcHalfSpan=0.55, trailColor=0xff6622, beforeDrag=0.90.`
      },
      {
        type: 'text',
        body: `The impact point is always (cx, cy) — screen center. The arc geometry is derived from slashAngle and arcRadius. You never need to compute arc center manually; the system derives it.`
      },
    ]
  },
]

export default function Docs() {
  return (
    <div className={styles.docs}>
      {/* TOC */}
      <aside className={styles.toc}>
        <div className={styles.tocLabel}>CONTENTS</div>
        {sections.map(s => (
          <a key={s.id} href={`#${s.id}`} className={styles.tocItem}>
            <span className={styles.tocTag}>{s.tag}</span>
            <span className={styles.tocTitle}>{s.title}</span>
          </a>
        ))}
      </aside>

      {/* Content */}
      <div className={styles.content}>
        <div className={styles.contentHeader}>
          <div className={styles.contentTitle}>
            <span className={styles.contentTag}>PIXIFORGE</span>
            <h1 className={styles.contentH1}>Animation System Docs</h1>
            <p className={styles.contentSub}>Particle attack animation reference — designed for AI consumption</p>
          </div>
        </div>

        {sections.map(s => (
          <section key={s.id} id={s.id} className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionTag}>{s.tag}</span>
              <h2 className={styles.sectionTitle}>{s.title}</h2>
            </div>

            {s.content.map((block, i) => {
              if (block.type === 'text') return (
                <p key={i} className={styles.text}>{block.body}</p>
              )
              if (block.type === 'code') return (
                <div key={i} className={styles.codeBlock}>
                  <div className={styles.codeLang}>{block.lang}</div>
                  <pre className={styles.code}><code>{block.body}</code></pre>
                </div>
              )
              if (block.type === 'diagram') return (
                <div key={i} className={styles.diagram}>
                  {block.rows.map((row, j) => (
                    <div key={j} className={styles.diagRow}>
                      <div className={styles.diagLabel} style={{ color: row.color }}>{row.label}</div>
                      <div className={styles.diagRange}>{row.range}</div>
                      <div className={styles.diagDesc}>{row.desc}</div>
                    </div>
                  ))}
                </div>
              )
              if (block.type === 'table') return (
                <div key={i} className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        {block.headers.map(h => <th key={h}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {block.rows.map((row, j) => (
                        <tr key={j}>
                          {row.map((cell, k) => <td key={k}>{cell}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
              return null
            })}
          </section>
        ))}
      </div>
    </div>
  )
}
