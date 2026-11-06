import type { ReactNode } from 'react'
import Nav from './Nav.tsx'

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="shell">
      <Nav />
      <main className="shell-main">{children}</main>
    </div>
  )
}
