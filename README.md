# sueldo.ai

Compare the real economic value of any two job offers for someone who lives and pays taxes in Mexico.

Either offer can be payroll or independent contractor, paid in MXN or USD. The current prototype keeps monthly cash, taxes, costs, reimbursements, bonuses, protection benefits, and RSUs separate instead of collapsing everything into one misleading compensation number.

## Current scope

- MXN and USD base pay
- Mexican payroll and contractor tax assumptions
- Accounting, foreign-exchange, insurance, and payroll costs
- Bonuses, reimbursements, wellness, internet, and protection benefits
- Twelve-month and three-year comparisons
- RSU allocations, cliffs, monthly or quarterly vesting, and actual vesting events
- Privacy-safe result cards with native sharing, text copy, and local PNG export

The calculation is an editable comparison, not tax, accounting, legal, or investment advice.

## Run locally

The runnable package is a React/Vite application in `app/`. It uses Node's built-in test runner. Install the lockfile versions on a fresh checkout:

```bash
cd app
npm ci
npm run dev
```

On a loaded Mac, inspect `memory_pressure`, `vm_stat`, and `sysctl vm.swapusage` before installing, building, or starting the app. Run heavy checks one at a time; focused tests below do not require a local server. If local resources are constrained and a release is authorized, use the deployed site for browser verification after checks pass.

## Implementation map

| Path | Responsibility |
| --- | --- |
| `app/src/compensation.js` | Versioned tax rules, offer calculations, validation, and vesting events |
| `app/src/capture-state.js` | Capture reducer and base-pay/FX validation |
| `app/src/App.jsx` | Offer capture, editing, results, and sharing flows |
| `app/src/OfferComparison.jsx`, `app/src/VestingChart.jsx` | Comparison and vesting presentation |
| `app/src/share-link.js`, `app/src/share-summary.js` | Versioned URL state and optional share-card export |
| `app/server/banxico-fix.js` | Shared Banxico FIX fetch/parser |
| `app/src/fx-reference.js` | Bounded, validated browser FX request |
| `app/api/fx.js`, `app/worker/index.js` | Vercel API and Sites worker adapters |
| `app/public/` | Crawlable information pages and discovery assets |

[`DOMAIN_CONTEXT.md`](./DOMAIN_CONTEXT.md) records market, calculation, and privacy boundaries. [`COMPENSATION_CASES.md`](./COMPENSATION_CASES.md) is the broader case catalog, including planned features and open questions. [`AGENTS.md`](./AGENTS.md) records the repository workflow for coding agents.

## Verify

Run focused tests while iterating, from `app/`:

```bash
node --test tests/compensation.test.mjs
node --test tests/capture-state.test.mjs tests/share-link.test.mjs tests/share-summary.test.mjs
node --test tests/banxico-fix.test.mjs tests/fx-reference.test.mjs tests/seo.test.mjs
```

Before releasing code, run the complete source test suite, build, then check the generated hosting package. These checks run sequentially and do not require a local app server. `npm test` and `npm run test:sites` are build-independent; `npm run test:build` checks the emitted files in `dist/`.

```bash
cd app
npm test
npm run build
npm run test:build
```

`npm run build` emits browser assets in `app/dist/client/` and packages the Sites worker in `app/dist/server/`. Vercel serves `dist/client` with the API function in `app/api/fx.js`; Sites uses the worker and `app/.openai/hosting.json`. Keep shared FX behavior consistent across both adapters. `npm run preview` serves the built frontend but does not run Vercel functions or the Sites worker; the development FX middleware only runs with `npm run dev`.

For an authorized production release, match the ready deployment to the merged commit, then exercise the affected flow at `https://sueldo.ai` with synthetic offer values. Verify `/api/fx` for FX changes and raw HTTP status codes for route changes. Record the exact commit and observed behavior; a build or merge alone is not live verification.

## Search discovery

The production build publishes first-class crawler and reference surfaces:

- `/robots.txt` and `/sitemap.xml` for search engines
- canonical, Open Graph, Twitter, and structured-data metadata on the homepage
- crawlable methodology, usage, comparison, about, privacy, and terms pages
- `/llms.txt` plus `/uso.md` for AI search and answer engines that choose to read them
- a real `404.html`; unknown paths are not rewritten to the calculator with a false `200`

Google Search Console should use a Domain property for `sueldo.ai`, verified with the DNS TXT value Google supplies. After verification, submit `https://sueldo.ai/sitemap.xml` and inspect the homepage plus the methodology page. The verification token is intentionally not committed because Google generates it for the property owner.

The same sitemap can be submitted to Bing Webmaster Tools. `robots.txt` permits public search and citation crawlers while excluding the same-origin API route.

## License

Copyright (C) 2026 jsuarezgg.

sueldo.ai is free software licensed under the [GNU Affero General Public License, version 3 only](./LICENSE) (`AGPL-3.0-only`). You may use, modify, and redistribute it under those terms. Modified versions made available over a network must offer their users the corresponding source code as required by the license.

The software is provided without warranty. Third-party dependencies retain their own licenses. The bundled Archivo font is licensed separately under the [SIL Open Font License 1.1](./app/public/fonts/LICENSE-Archivo.txt).
