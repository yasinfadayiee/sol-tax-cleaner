# AGENTS.md — SolTax Cleaner (working name)

Start with `docs/STATUS.md` (current state and next steps). `docs/ROADMAP.md` is the daily improvement backlog. Read `docs/SPEC.md` before changing product behaviour. It is the source of truth for product behaviour.

## What this project is
A static, browser-only web app. A Solana user enters their wallet address(es); the app pulls their full
transaction history straight from a Solana RPC endpoint inside the browser, rebuilds each transaction
correctly (one swap = one row, rent and wrapped-SOL noise removed, missed token-account transactions
recovered), and exports a clean CSV in Koinly's "Universal" import format.

## Hard rules
- **No backend, ever.** Everything runs in the browser. The site is deployed as static files to GitHub
  Pages. Do not add servers, serverless functions, databases or analytics that send user data anywhere.
- **User data never leaves the browser** except for JSON-RPC calls to the Solana RPC URL the user chose
  and token-metadata lookups described in SPEC.md.
- **We never calculate tax.** We only clean and reformat transaction data. Never add gain/loss or tax
  figures. UI copy must say "not tax advice".
- **No secrets in the repo.** The merchant wallet address and prices live in `src/config.ts`
  (public values only; `VITE_MERCHANT_ADDRESS` can override the address at build time). There are no
  private keys anywhere. A keyed RPC URL for CI goes in the `RPC_URL` repository secret, never in code.
- Keep dependencies minimal. Talk to Solana with plain `fetch` JSON-RPC calls, not an SDK, unless a task
  says otherwise.

## Stack
- TypeScript (strict), Vite 8, React 19, one global stylesheet (`src/index.css`) with light/dark tokens.
- Static guide and legal pages: Markdown in `content/`, rendered by `scripts/build-pages.mjs` after the Vite build.
- Tests: Vitest. Lint: oxlint.
- Package manager: npm.

## CI
- `.github/workflows/deploy.yml` — lint, test and build on every push and PR; deploys `dist` to GitHub Pages from `main`.
- `.github/workflows/mainnet.yml` — `tests/mainnet.test.ts` rebuilds the full history of a few real wallets
  and checks that the exported rows reconcile to today's on-chain balances. Runs weekly, on engine/RPC
  changes, and on demand (with optional wallet list). Locally it is skipped unless `MAINNET=1`.

## Code layout
- `src/engine/` — pure functions only (no fetch, no DOM). All classification logic lives here and is
  fully unit-tested with fixtures in `tests/fixtures/`.
- `src/rpc/` — JSON-RPC client, rate limiting, retries, caching.
- `src/export/` — CSV writers and the review report.
- `src/license/` — payment detection and unlock logic.
- `src/ui/` — React components.
- `content/` — guide and legal pages (Markdown with `title`/`description` front matter).
- `src/config.ts` — app name, merchant address, price, memo prefix, defaults.

## Working rules
- Every task ends with `npm run lint && npm test && npm run build` passing.
- Engine changes need a fixture-based test that fails before the change and passes after.
- Amounts are handled as integer base units (`bigint`) inside the engine and converted to decimal strings
  only at export time. Never use floating point for token amounts.
- Dates are exported in UTC.
- Keep each PR to one task. Describe what changed and how it was tested in the PR body.

## Code review rules
- Flag any network call that is not to the user-selected RPC URL or the token-metadata sources in SPEC.md.
- Flag any floating-point arithmetic on amounts.
- Flag any change to `src/engine/` without a matching test.
