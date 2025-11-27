import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// When building for Electron, use relative paths and skip PWA
const isElectron = process.env.VITE_ELECTRON === '1'

export default defineConfig({
  base: isElectron ? './' : '/',   // << important for file://
  plugins: [
    react(),
    !isElectron && VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Kamdin Level-Up',
        short_name: 'Level-Up',
        description: 'Track XP, tasks, and quests',
        theme_color: '#09090b',
        background_color: '#09090b',
        display: 'standalone',
        start_url: '/',
        icons: [{ src: '/vite.svg', sizes: 'any', type: 'image/svg+xml' }]
      }
    })
  ].filter(Boolean)
})
