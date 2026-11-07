export type Theme = 'system' | 'light' | 'dark'

const KEY = 'wordwork.theme'
const BAR = { light: '#ffffff', dark: '#000000' }

export function getStoredTheme(): Theme {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system'
  }
}

// The two theme-color metas are media-scoped, so a forced theme has to rewrite both.
function syncThemeColor(theme: Theme): void {
  const metas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
  metas.forEach((m) => {
    const scheme = /prefers-color-scheme:\s*(light|dark)/.exec(m.media)?.[1] as
      'light' | 'dark' | undefined
    if (scheme) m.content = BAR[theme === 'system' ? scheme : theme]
  })
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement
  if (theme === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', theme)
  syncThemeColor(theme)
  try {
    if (theme === 'system') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, theme)
  } catch {
    // storage unavailable; the theme still applies for this session
  }
}
