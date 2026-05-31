'use client'
import { useState } from 'react'
import Nav from '../components/Nav'
import AnimationStage from '../components/AnimationStage'
import Docs from '../components/Docs'
import styles from './page.module.css'

type Tab = 'stage' | 'docs'

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('stage')

  return (
    <div className={styles.root}>
      <Nav activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className={styles.main}>
        {activeTab === 'stage' && <AnimationStage />}
        {activeTab === 'docs'  && <Docs />}
      </main>
      <footer className={styles.footer}>
        <span className={styles.footerTag}>THUMOS VISION</span>
        <span className={styles.footerSub}>rpg animation engine // built for AI consumption</span>
        <span className={styles.footerTag}>v0.1.0</span>
      </footer>
    </div>
  )
}
