import { useState } from 'react'
import LanguagePicker from '../../app/LanguagePicker.tsx'
import { useActiveLanguage } from '../../app/language.ts'
import { applyTheme, getStoredTheme, type Theme } from '../../app/theme.ts'
import Account from './Account.tsx'
import DailyLimits from './DailyLimits.tsx'
import DataTransfer from './DataTransfer.tsx'

const options: Theme[] = ['system', 'light', 'dark']

function LanguageSetting() {
  const { available } = useActiveLanguage()
  if (available.length < 2) return null
  return (
    <>
      <h2>Language</h2>
      <LanguagePicker />
    </>
  )
}

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
      <LanguageSetting />
      <DailyLimits />
      <Account />
      <DataTransfer />
    </>
  )
}
