import { useState } from 'react'
import { applyTheme, getStoredTheme, type Theme } from '../../app/theme.ts'

const options: Theme[] = ['system', 'light', 'dark']

export default function Settings() {
  const [theme, setTheme] = useState<Theme>(getStoredTheme)

  function choose(next: Theme) {
    setTheme(next)
    applyTheme(next)
  }

  return (
    <>
      <h1>Settings</h1>
      <h2>Theme</h2>
      <div className="segmented" role="group" aria-label="Theme">
        {options.map((o) => (
          <button key={o} type="button" aria-pressed={theme === o} onClick={() => choose(o)}>
            {o[0].toUpperCase() + o.slice(1)}
          </button>
        ))}
      </div>
    </>
  )
}
