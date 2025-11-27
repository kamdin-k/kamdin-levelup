import { startTrophiesEngine } from './trophies-engine'
import { startAutoPenaltyEngine } from './auto-penalty'
import './manual-xp'

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

startTrophiesEngine()


startAutoPenaltyEngine()


const isElectron = (import.meta?.env?.VITE_ELECTRON === '1')

// Only register PWA when NOT in Electron and in production.
// Use @vite-ignore + a non-literal to stop Rollup from resolving it in Electron builds.
if (!isElectron && import.meta.env.PROD) {
  const pwa = 'virtual:pwa-register'
  // @vite-ignore
  import(pwa).then(({ registerSW }) => registerSW({ immediate: true })).catch(()=>{})
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
