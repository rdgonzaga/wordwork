import { useSyncExternalStore } from 'react'

const normalize = (tag: string) => tag.replace('_', '-').toLowerCase()

/** Whether any voice speaks the language. `de-DE` is satisfied by a `de-AT` voice too. */
export function hasVoice(voices: { lang: string }[], lang: string): boolean {
  const want = normalize(lang)
  const base = want.split('-')[0]
  return voices.some((v) => {
    const have = normalize(v.lang)
    return have === want || have.split('-')[0] === base
  })
}

function synth(): SpeechSynthesis | undefined {
  return typeof speechSynthesis === 'undefined' ? undefined : speechSynthesis
}

// Chrome fills the voice list after load and announces it with `voiceschanged`.
function subscribe(onChange: () => void): () => void {
  const s = synth()
  s?.addEventListener('voiceschanged', onChange)
  return () => s?.removeEventListener('voiceschanged', onChange)
}

export function useCanSpeak(lang: string): boolean {
  return useSyncExternalStore(
    subscribe,
    () => {
      const s = synth()
      return s ? hasVoice(s.getVoices(), lang) : false
    },
    () => false,
  )
}

export function speak(text: string, lang: string): void {
  const s = synth()
  if (!s) return
  s.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = lang
  s.speak(utterance)
}
