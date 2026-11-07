import type { LookupLink } from '../languages/index.ts'

export default function LookupLinks({ links }: { links: LookupLink[] }) {
  return (
    <p className="lookup-links">
      {links.map((l) => (
        <a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer">
          {l.label}
        </a>
      ))}
    </p>
  )
}
