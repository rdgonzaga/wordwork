import { setActiveLanguage, useActiveLanguage } from './language.ts'
import { getLanguage } from '../languages/index.ts'

/** Switches the language the study screens show. Hidden until a second language has a deck. */
export default function LanguagePicker() {
  const { active, available } = useActiveLanguage()
  if (available.length < 2) return null

  return (
    <div className="segmented" role="group" aria-label="Language">
      {available.map((code) => (
        <button
          key={code}
          type="button"
          aria-pressed={active === code}
          onClick={() => setActiveLanguage(code)}
        >
          {getLanguage(code).name}
        </button>
      ))}
    </div>
  )
}
