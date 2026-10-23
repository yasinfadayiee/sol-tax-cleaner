import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const root = document.getElementById('root')!
const app = (
  <StrictMode>
    <App />
  </StrictMode>
)
// The build prerenders the landing page into #root (scripts/prerender.mjs); hydrate it when it's there.
if (root.hasChildNodes()) hydrateRoot(root, app)
else createRoot(root).render(app)
