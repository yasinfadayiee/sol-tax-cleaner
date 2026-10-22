// Small stroke icons (24×24 grid), drawn inline so the site makes no extra requests.
const PATHS = {
  lock: 'M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3',
  browser: 'M3 5h18v14H3zM3 9h18M6 7h.01M8.5 7h.01',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  check: 'M4 12.5l5 5L20 6.5',
  scale: 'M12 4v16M5 20h14M6 8h12M6 8l-3 6a3 3 0 0 0 6 0zM18 8l-3 6a3 3 0 0 0 6 0z',
  split: 'M4 6h6l4 6-4 6H4M14 12h6',
  coins: 'M8 8a5 3 0 1 0 0-.01zM3 8v4c0 1.7 2.2 3 5 3M13 11c2.8 0 5 1.3 5 3s-2.2 3-5 3-5-1.3-5-3M8 14v3c0 1.7 2.2 3 5 3s5-1.3 5-3v-3',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  layers: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  doc: 'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6',
} as const

export type IconName = keyof typeof PATHS

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  )
}

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="logo-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#19D3A2" />
          <stop offset="1" stopColor="#7C5CFF" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#logo-g)" />
      <g fill="none" stroke="#fff" strokeLinecap="round">
        <path d="M13 19c10 0 12 13 22 13M13 32h22M13 45c10 0 12-13 22-13" strokeWidth="4" strokeOpacity=".85" />
        <path d="M35 32h15" strokeWidth="7" />
      </g>
    </svg>
  )
}
