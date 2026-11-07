import { speak, useCanSpeak } from './speech.ts'

/** Plays `text` aloud. Renders nothing when the device has no voice for `lang`. */
export default function Speak({ text, lang }: { text: string; lang: string }) {
  const can = useCanSpeak(lang)
  if (!can) return null
  return (
    <button
      type="button"
      className="speak"
      aria-label={`Hear “${text}”`}
      onClick={() => speak(text, lang)}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M11 5 6 9H3v6h3l5 4V5Z" />
        <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
      </svg>
    </button>
  )
}
