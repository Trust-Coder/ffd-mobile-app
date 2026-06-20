import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from '@/App'
import { initNative } from '@/lib/native'
import '@/styles/tokens.css'
import '@/styles/global.css'
import '@/styles/components.css'

void initNative()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
