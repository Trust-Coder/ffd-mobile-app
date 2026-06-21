import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from '@/App'
import ErrorBoundary from '@/components/ErrorBoundary'
import { initNative } from '@/lib/native'
import '@/styles/tokens.css'
import '@/styles/global.css'
import '@/styles/components.css'

// The inline <head> script already set data-theme for first paint; mirror it to
// the native status bar / splash. ThemeContext takes over on later changes.
const initialResolved = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
void initNative(initialResolved)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
