'use client'
import styles from './Nav.module.css'

type Tab = 'stage' | 'docs'

interface NavProps {
  activeTab:    Tab
  setActiveTab: (tab: Tab) => void
}

const TABS: { id: Tab; label: string; tag: string }[] = [
  { id: 'stage', label: 'Stage', tag: '01' },
  { id: 'docs',  label: 'Docs',  tag: '02' },
]

export default function Nav({ activeTab, setActiveTab }: NavProps) {
  return (
    <nav className={styles.nav}>
      <div className={styles.brand}>
        <span className={styles.brandMark}>⬡</span>
        <span className={styles.brandName}>THUMOS VISION</span>
        <span className={styles.brandSub}>// rpg animation engine</span>
      </div>

      <div className={styles.tabs}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className={styles.tabTag}>{tab.tag}</span>
            <span className={styles.tabLabel}>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className={styles.meta}>
        <span className={styles.metaItem}>PIXI.JS 7</span>
        <span className={styles.metaDot}>·</span>
        <span className={styles.metaItem}>NEXT 14</span>
        <span className={styles.metaDot}>·</span>
        <span className={styles.metaItem}>TS</span>
      </div>
    </nav>
  )
}
