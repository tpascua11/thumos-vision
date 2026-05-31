// ─── Attack Config ────────────────────────────────────────────────────────────
// The minimal descriptor object for any attack animation.
// AI systems should read/write this interface only — never raw Pixi internals.

export interface AttackConfig {
  slashAngle:  number   // direction of travel in radians
  arcHalfSpan: number   // sweep width in radians (0.2–0.6)
  arcRadius:   number   // reach of arc in pixels (80–200)
  arcDuration: number   // total animation time in ms (100–400)
  IMPACT_T:    number   // impact moment — always 0.5
  trailColor:  number   // blade/trail tint (hex number e.g. 0xddeeff)
  driftColor:  number   // lingering spark tint
  beforeDrag:  number   // deceleration before impact (0.7–0.95)
  afterDrag:   number   // deceleration after impact
  flashCount:  number   // particles in impact burst
  driftCount:  number   // lingering sparks after impact
}

// ─── Attack Archetype ─────────────────────────────────────────────────────────

export type AttackPhase = 'before' | 'after'

export type ParticleType = 'trail' | 'flash' | 'drift'

export interface AttackDefinition {
  id:     string
  label:  string
  tag:    string
  config: Partial<AttackConfig>
}

// ─── Particle ─────────────────────────────────────────────────────────────────
// Extended Pixi sprite with animation state

export interface ParticleData {
  _vx:      number
  _vy:      number
  _life:    number
  _maxLife: number
  _type:    ParticleType
  _phase?:  AttackPhase
}

// ─── Arc Position ─────────────────────────────────────────────────────────────

export interface ArcPosition {
  x:     number
  y:     number
  angle: number
  t:     number
}
