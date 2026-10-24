# Project status — read this first

This file is the hand-off between chat sessions. Read it (plus `AGENTS.md` and `docs/SPEC.md` only if the task
needs them) instead of re-reading the whole codebase. **Update it at the end of every session.**

Last updated: 2026-10-24

## The product
SolTax Cleaner: a static, browser-only site. A Solana user pastes wallet address(es); the browser reads their full
history from a Solana RPC, rebuilds each transaction (one swap = one row, rent/WSOL netted out, DCA/limit-order
fills that touch only token accounts recovered) and exports a Koinly Universal CSV + a review report.
Free analysis and preview; download unlocks after paying SOL to the owner's wallet (on-chain memo check, no server).

- Repo: https://github.com/yasinfadayiee/sol-tax-cleaner (branch `main`)
- Site (once Pages is enabled): https://yasinfadayiee.github.io/sol-tax-cleaner/
- Owner: Yasin (lives in Iran; talk to him in Persian, simply). Paid in SOL to his own self-custody wallet.

## Owner decisions (do not re-ask)
- No backend ever; user data stays in the browser. Never calculate tax ("not tax advice").
- Don't rely on Wise for revenue (bars Iran residents). Exclude US customers in the Terms.
  No borrowed identities; avoid OFAC-sanctioned Iranian exchanges (Nobitex, Wallex, Bitpin, Ramzinex).
- Claude builds everything itself (owner said Codex is weaker); owner just approves.
- Work autonomously through the roadmap without waiting for Yasin between steps; only message him for results
  or blockers (Yasin, 2026-10-22).
- Claude may merge its own PRs into `main` and ship without asking (Yasin, 2026-10-22).
- To save Claude usage, owner opens a new chat for each part of the project. Keep this file current.
- Goal (2026-10-24): steady income above $1000/month as fast as possible, running on autopilot. Owner knows
  nothing about crypto tax, so Claude decides product changes itself. Keep Claude usage low (Pro plan limits):
  routine work runs in GitHub Actions with no AI; Claude runs only when a check fails (owner chose this,
  not a weekly Claude run). Told the owner honestly: real income likely in tax season Jan-Apr 2027, no guarantee.

## Done
- Engine (`src/engine`): estate accounting, classify (swap/deposit/withdrawal/fee/complex), fee folding.
- RPC (`src/rpc`): rate-limited client with retries, IndexedDB cache, full-history discovery incl. token accounts,
  token names via Token-2022 metadata → Metaplex → fallback, user ticker overrides.
- Export (`src/export`): Koinly CSV + Markdown report. License (`src/license`): Solana Pay URL + memo `STC-YYYY`.
- UI (`src/ui`, `src/App.tsx`): landing page, analyser, results preview, token editor, payment with QR.
- SEO/legal pages: `content/*.md` → `scripts/build-pages.mjs` (also sitemap/robots).
- Tests: 86 unit tests pass (`npm test`). Browser smoke test with mocked RPC passed (desktop/mobile, light/dark).
- CI: `.github/workflows/deploy.yml` (lint+test+build, deploy to Pages) and `mainnet.yml`
  (`tests/mainnet.test.ts`: full history of 3 real Jupiter users, rows must reconcile to on-chain balances).
- GitHub Pages is enabled: the Deploy workflow deployed successfully on 2026-10-22 (run 39779981052).
- Payments configured: `MERCHANT_ADDRESS` = C6fwRzwGVLBhBnLmiWqKgR25qBz4U3ysNuEKse519G6V (Yasin's public wallet).
  Price 0.25 SOL or 29 USDC (#12; USDC cut from 39 on 2026-10-24 to match SOL at ~$100), 365 days, up to 5 wallets; Yasin let Claude choose (below Koinly's $49 entry plan).
- Mainnet check is green: all 3 real wallets reconcile exactly to on-chain balances (run 39780634996).
- Design overhaul (2026-10-22): logo, gradient hero with a 3D 'rows merge into one' visual, trust strip, feature
  cards, pricing card, FAQ cards, guide cards, self-hosted Inter, og.png + apple-touch-icon (`scripts/brand/`).
  Analysis of next steps (Persian): https://claude.ai/artifact/SgNWp4qj7eZ4BffkYKqnX1
- Sample wallet demo (`src/demo/sample.ts`): made-up txs run through the real engine; hero + analyser buttons
  (`#sample`), free sample CSV/report download, no payment. Tested in `tests/demo.test.ts`.
- Jupiter DCA / limit orders (v1, v2): order accounts and their token vaults created in a user-paid tx that calls the
  Jupiter programs join the estate (`discoverEscrowAccounts`), and token accounts owned by them count too. Placing or
  cancelling an order is fee-only; each keeper fill is a swap. Tested in `tests/escrow.test.ts` (shaped after a real
  limit v2 order found by the probe, `tests/probe.test.ts` + `.github/workflows/probe.yml`, run manually).
- Native staking: stake accounts the user controls join the estate; rewards per epoch come from
  `getInflationReward` and export as staking income (Koinly tag `reward`). If reading rewards fails, the analysis
  continues and the results/report warn. Tested in `tests/staking.test.ts`; not yet checked on a real staker.
- Export formats (`src/export/formats.ts`): Koinly, Awaken, CoinTracker (exact 8-column template, MM/DD/YYYY UTC) and
  CoinLedger (universal template, Type blank for trades). Picker in the download box, remembered per browser; the
  report's import steps follow the chosen tool. Tested in `tests/formats.test.ts`.
- Awaken export (simple template, max 8 decimals) added (#10). USD price next to SOL from CoinGecko, cached per
  session and hidden if it can't load (#9).
- Mainnet check green after staking + escrow support (run 39797075653).
- 13 guide pages in `content/` (Awaken and staking rewards added in #10) (added CoinTracker, CoinLedger, pump.fun, Phantom, WSOL on 2026-10-22).
- SEO (2026-10-23): `/guides/` index page, "Related guides" block on every guide (closest by slug words), TechArticle +
  BreadcrumbList JSON-LD, Guides link in the guide header. 3 more guides: Solscan CSV export, Raydium/Orca/Meteora
  swaps (LP adds flagged for review), spam tokens and airdrops. 14 guides total.
- Pro polish (2026-10-23, #17 #18): landing page prerendered to static HTML and hydrated (`src/entry-server.ts`,
  `scripts/prerender.mjs`), WebApplication + FAQPage JSON-LD (FAQ lives in `src/faq.ts`), canonical, 404.html,
  full footer, Guides nav link, tool chips in hero, CTA card on guides, payment auto-watches after QR (10 min),
  grouped digits in preview, ETA in progress bar, axe-core WCAG AA clean, qrcode lazy-loaded.
- **RPC finding (2026-10-23):** `api.mainnet-beta.solana.com` returns 403 "Access forbidden" to any request with a
  browser Origin header, so real analysis on the live site needs a keyed RPC. Keyless alternatives tested (PublicNode,
  dRPC, Ankr, OnFinality, BlockEden, Blast, Omnia) don't work: blocked `getTokenAccountsByOwner` or no full history.
  Now: on refusal the analyser shows an "add a free RPC URL" step + guide `content/free-solana-rpc-url.md`.
  `SITE_RPC_URL` (build var `VITE_RPC_URL` from repo variable `RPC_URL`) embeds a site key; visitor URL wins.
  Browser tests from this sandbox go through a proxy that also 403s; check RPC from curl with an Origin header.
- Results + landing polish (2026-10-23, #21 #22 #23): preview has type filter chips with counts and pages through
  every row ("Show 100 more"), coloured type badges, rows become cards on phones; the report downloads as a
  printable standalone `report.html` (`src/export/reportHtml.ts` converts the Markdown report); new landing section
  "What it handles" (`#coverage`, `COVERAGE` in `src/App.tsx`) linking each item to its guide.
  Guides show a visible breadcrumb and "Updated <date>" (from git history of the content file; Deploy checks out
  with fetch-depth 0), with datePublished/dateModified in JSON-LD and lastmod in sitemap.xml.
- Stake-account payouts (2026-10-23): the first real-staker Mainnet check (run 39990683402) found 0.042 SOL missing:
  validators (e.g. program RouterBmuRBk…) pay MEV tips / reward sharing straight into stake accounts in txs the
  wallet isn't in. `fetchHistory` now scans stake accounts too, and a SOL-only inflow into a stake account paid by
  someone else is a `staking`-tagged deposit (`Deltas.stakePayout`). Re-run reconciles exactly (run 39995075195, #25).
- Balance check in results (2026-10-23): after analysis the site reads current balances of the wallets + estate
  (`src/rpc/holdings.ts`) and compares them per asset with the rows (`reconcile` in `src/engine/reconcile.ts`);
  results show "Balance check passed" or the differing assets, and the report has a Balance check section. The
  Mainnet check uses the same code and always adds the staker wallet FtSe… on scheduled runs.
- Polish round (2026-10-23, #27): guides index grouped by `category` front matter (tools / trades / accounts; build
  fails without one), guide pages get self-hosted Inter, sticky header and the landing page's footer; Guides link
  kept in the phone header. Sample wallet stakes 2 SOL and gets 2 epoch rewards; results count staking rewards
  apart. Report adds "Period covered" and an "Assets in this export" totals table. FAQ +3 (tax year, big wallets,
  what paying unlocks). Lighthouse (gzip): landing perf 98, a11y/SEO 100; guides 100.
  Each guide has its own social preview `public/og/<slug>.jpg` (template `scripts/brand/og-guide.html`, rendered by
  `scripts/brand/render.mjs`; re-run after adding or retitling a guide).
- Support + landing polish (2026-10-23, #29 and next PR): "Report a problem" (GitHub issues, `SUPPORT_URL`) in
  footers and the payment-not-found message; "Source code" link (`REPO_URL`, the repo is public) in footers;
  landing guides list cut to 6 + "Browse all guides" button; closing CTA band before the footer; before/after
  labels top-aligned; hero buttons full width on phones.
- Review round (2026-10-24, #31): analyser buttons use the site button style and go full width on phones; phone
  before/after puts the tax tool's reading under the amount; footer rule lines up with content (landing + guides);
  four guides lost a CTA line that sat right above the CTA box. USDC price 39 -> 29 (Yasin's choice) so it matches
  0.25 SOL at ~$100; payments of the old amount still qualify (check is ">= price").
- Autopilot (2026-10-24): `.github/workflows/monitor.yml` + `scripts/monitor.mjs` (plain Node, no AI) run daily:
  site/guides/sitemap up, site RPC key answers with the site Origin, last Mainnet check not failed, sales to the
  merchant wallet (memo `STC-`, >= 0.2 SOL or >= 20 USDC, incl. its USDC token accounts). Opens a `sale` issue per
  new sale, one `alert` issue while broken (auto-closed when fixed), `weekly-report` issue on Mondays; issues
  @-mention Yasin so GitHub emails him. A new alert runs `anthropics/claude-code-action` once, only if the
  secret `CLAUDE_CODE_OAUTH_TOKEN` exists (Yasin set it 2026-10-24 via `claude setup-token`; untested until the first alert).
- Search/AI discovery (2026-10-24): Yasin finds Reddit too slow/restricted; focus is Google + AI search
  (ChatGPT/Perplexity/Gemini). Added `llms.txt` and named AI crawlers in robots.txt (both from build-pages.mjs; note
  crawlers read robots.txt at the host root, which we don't control on github.io), IndexNow ping after each deploy
  (`scripts/indexnow.mjs`, key file `public/52a3f4cdf5b63aacb02b00a49c4ab214.txt`; Deploy's `indexnow_all` input
  sends every page), real README (was the Vite template), 4 buyer-intent guides (Solana taxes pillar, Koinly wrong
  balance, Phantom CSV export, Jupiter swap history). 18 guides. Next: more buyer-intent guides, custom domain later if Yasin can pay for one.
- Telegram reports (2026-10-24): the daily check also messages Yasin in Persian on Telegram (sale, new alert,
  recovery, weekly report, Claude fix done) when secrets `TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHAT_ID` exist (Yasin saved them as `SOLTAXBOT`/`CHATID`; both names work).
  Test with the Daily check's `telegram_test` input.
- Daily improvement (2026-10-24, Yasin wants the site to improve itself daily without him): `.github/workflows/improve.yml`
  runs 3x a day (20:00, 01:00, 11:00 UTC; separate 5-hour usage windows) on Sonnet, max 30 turns, via `CLAUDE_CODE_OAUTH_TOKEN`. Claude does the first
  unchecked item of `docs/ROADMAP.md` (guides, FAQ, links, copy), adds new items when <5 remain. The workflow then
  rejects changes to .github/, src/license/, src/config.ts, package files, monitor/indexnow scripts; reruns
  lint/test/build; commits to main as github-actions; dispatches Deploy; Telegram summary in Persian. New guides
  made by it use the default og.png (no Playwright in that job). Steer it by editing ROADMAP.md.
  Weekly planning (`plan.yml`, Sundays 18:00 UTC, Opus, Yasin's choice): reviews last week's auto commits, does a
  little web research, rewrites the ROADMAP backlog (~20 items); may only change docs/ROADMAP.md. If Yasin hits
  Pro limits, drop the 11:00 UTC run first.
- Launch kit with ready-to-post texts (Reddit, Koinly board, X): `docs/launch-posts.md`. Yasin posts them himself.
- Bugs found by the mainnet check and fixed: transaction version 1 support (auto-upgrades
  `maxSupportedTransactionVersion`); mistyped Token-2022 program ID.

## In progress / next
0. Done 2026-10-23: Yasin's free Helius key (domain-restricted to yasinfadayiee.github.io) is in the repo variable
   `RPC_URL`; the live site analyses a real wallet end to end. The key is never committed. Free plan = 10 req/s
   shared by all visitors, so the site client paces at 8/s; watch Helius usage as traffic grows.
   Gasless/relayed swaps that also leave <= 0.01 SOL now export as swap + SOL deposit (was 'needs review').
1. Watch the scheduled "Mainnet check"; fix any mismatches it reports.
2. **Waiting on Yasin:**
   - Done 2026-10-23: Google Search Console verified (HTML tag in index.html) and sitemap.xml submitted.
   - Posting the Reddit / Koinly board texts in `docs/launch-posts.md` (Yasin 2026-10-24: Reddit too restrictive/slow; low priority).
   - Done 2026-10-24: Bing Webmaster Tools verified and sitemap submitted.
3. Next product ideas, in order: privacy-friendly analytics
   (needs Yasin's signup), a real staker wallet in the mainnet check (candidates found 2026-10-23 from recent Stake
   program txs: FtSeRqHLd8PrDTMoaic4c9iQKBYb83s6YJewBxXo5wz1, 5z1vv82XM9mNqrQhttKnEf7ajGBN9s9NPGs4ajcxbA3J; run the
   Mainnet check manually with them as `wallets`).
4. After launch: distribution (Reddit r/CryptoTax, r/solana, Koinly community; SEO guides), check real exports in
   Koinly.

## Environment notes for Claude
- 2026-10-23: the sandbox reaches `api.mainnet-beta.solana.com` directly with curl/node (no Origin header), but it
  is slow; long real-data runs still go through the Mainnet check workflow. Don't `pkill -f` a pattern that also
  appears in your own command line (it kills the shell).
- Until 2026-10-22 the sandbox could not reach Solana RPC (proxy 403), so real-data testing runs in GitHub Actions.
  Yasin then set a cloud environment with wider network access; new threads should check whether RPC works directly.
  Read CI logs with the GitHub MCP `get_job_logs` (gh log download is blocked); `gh run list/watch` works.
- Pages settings API is blocked through the proxy.
- Commit trailer lines are required (see session instructions).
