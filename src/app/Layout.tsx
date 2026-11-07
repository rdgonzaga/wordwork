import type { ReactNode } from 'react'
import Nav from './Nav.tsx'
import SyncIndicator from './SyncIndicator.tsx'

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="shell">
      <Nav />
      <main className="shell-main">
        <SyncIndicator />
        {children}
      </main>
    </div>
  )
}
