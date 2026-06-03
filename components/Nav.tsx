'use client'
import styles from './Nav.module.css'

interface NavProps {
  onHelpOpen: () => void
}

export default function Nav({ onHelpOpen }: NavProps) {
  return (
    <nav className={styles.nav}>
      <div className={styles.brand}>
        <span className={styles.brandMark}>⬡</span>
        <span className={styles.brandName}>THUMOS VISION</span>
        <span className={styles.brandSub}>// rpg animation engine</span>
      </div>

      <div className={styles.meta}>
        <span className={styles.metaItem}>PIXI.JS 8</span>
        <span className={styles.metaDot}>·</span>
        <span className={styles.metaItem}>NEXT 14</span>
        <span className={styles.metaDot}>·</span>
        <span className={styles.metaItem}>TS</span>
      </div>

      <button className={styles.helpBtn} onClick={onHelpOpen}>? HELP</button>
    </nav>
  )
}
