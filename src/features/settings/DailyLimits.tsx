import { useState } from 'react'
import { useLive } from '../../app/useLive.ts'
import { db } from '../../db/schema.ts'
import { getSettings, updateSettings } from '../../db/settings.ts'

type Key = 'newPerDay' | 'maxReviewsPerDay'

const loadSettings = () => getSettings(db)

function LimitField({ label, name, saved }: { label: string; name: Key; saved: number }) {
  const [draft, setDraft] = useState<string>()

  function commit() {
    if (draft === undefined) return
    const value = Number(draft)
    if (draft.trim() !== '' && Number.isFinite(value) && value !== saved) {
      void updateSettings(db, { [name]: value }, new Date())
    }
    setDraft(undefined)
  }

  return (
    <label>
      {label}
      <input
        type="number"
        inputMode="numeric"
        min={0}
        step={1}
        value={draft ?? saved}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
        }}
      />
    </label>
  )
}

export default function DailyLimits() {
  const settings = useLive(loadSettings)
  if (!settings) return null
  return (
    <>
      <h2>Daily limits</h2>
      <p className="muted">
        Each new card comes back as reviews over the next few weeks, so a small bump here adds up.
      </p>
      <div className="limits">
        <LimitField label="New cards per day" name="newPerDay" saved={settings.newPerDay} />
        <LimitField
          label="Reviews per day"
          name="maxReviewsPerDay"
          saved={settings.maxReviewsPerDay}
        />
      </div>
    </>
  )
}
