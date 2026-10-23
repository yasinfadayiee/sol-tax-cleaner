import { StrictMode, createElement } from 'react'
import { renderToString } from 'react-dom/server'
import App from './App.tsx'

/** Landing page HTML for scripts/prerender.mjs, so the page has content before JavaScript runs. */
export function render(): string {
  return renderToString(createElement(StrictMode, null, createElement(App)))
}

export { FAQ } from './faq'
export { APP_NAME, PRICE_SOL, PRICE_USDC } from './config'
