import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter'
import '@fontsource-variable/source-serif-4'
import './index.css'
import App from './App.tsx'
import { applyTheme, getStoredTheme } from './app/theme.ts'
import { auth } from './auth/index.ts'
import { db } from './db/schema.ts'
import { seedStarterDecks } from './db/seed.ts'
import { requestPersistentStorage } from './storage.ts'

applyTheme(getStoredTheme())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

void auth.init()
void requestPersistentStorage()
void seedStarterDecks(db, new Date())
