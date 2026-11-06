import type { ReactNode } from 'react'
import { Link, useRoute } from 'wouter'

const icons: Record<string, ReactNode> = {
  today: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M4 10h16M9 3v4M15 3v4" />
    </>
  ),
  cards: (
    <>
      <rect x="3" y="7" width="14" height="12" rx="2" />
      <path d="M7 7V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
    </>
  ),
  log: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  journal: (
    <>
      <path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4z" />
      <path d="M9 9h6M9 13h6" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
    </>
  ),
}

const items = [
  { path: '/', label: 'Today', icon: 'today' },
  { path: '/cards', label: 'Cards', icon: 'cards' },
  { path: '/log', label: 'Log', icon: 'log' },
  { path: '/journal', label: 'Journal', icon: 'journal' },
  { path: '/settings', label: 'Settings', icon: 'settings' },
]

function NavItem({ path, label, icon }: (typeof items)[number]) {
  const [active] = useRoute(path)
  return (
    <Link href={path} aria-current={active ? 'page' : undefined}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        {icons[icon]}
      </svg>
      {label}
    </Link>
  )
}

export default function Nav() {
  return (
    <nav className="nav" aria-label="Main">
      {items.map((i) => (
        <NavItem key={i.path} {...i} />
      ))}
    </nav>
  )
}
