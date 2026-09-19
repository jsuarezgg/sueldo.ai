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
| `app/server/compare.js` | Public GET schema, input normalization, engine reuse, and machine-readable comparison |
| `app/server/banxico-fix.js` | Shared Banxico FIX fetch/parser |
| `app/src/fx-reference.js` | Bounded, validated browser FX request |
| `app/api/fx.js`, `app/api/compare.js`, `app/worker/index.js` | Vercel API and Sites worker adapters |
| `app/public/` | Crawlable information pages and discovery assets |

[`DOMAIN_CONTEXT.md`](./DOMAIN_CONTEXT.md) records market, calculation, and privacy boundaries. [`COMPENSATION_CASES.md`](./COMPENSATION_CASES.md) is the broader case catalog, including planned features and open questions. [`AGENTS.md`](./AGENTS.md) records the repository workflow for coding agents.

## Verify

Run focused tests while iterating, from `app/`:

```bash
node --test tests/compensation.test.mjs
node --test tests/capture-state.test.mjs tests/share-link.test.mjs tests/share-summary.test.mjs
node --test tests/banxico-fix.test.mjs tests/fx-reference.test.mjs tests/seo.test.mjs
node --test tests/compare-api.test.mjs
```

Before releasing code, run the complete source test suite, build, then check the generated hosting package. These checks run sequentially and do not require a local app server. `npm test` and `npm run test:sites` are build-independent; `npm run test:build` checks the emitted files in `dist/`.

```bash
cd app
npm test
npm run build
npm run test:build
```

`npm run build` emits browser assets in `app/dist/client/` and packages the Sites worker in `app/dist/server/`. Vercel serves `dist/client` with API functions in `app/api/`; Sites uses the worker and `app/.openai/hosting.json`. Keep shared FX and comparison behavior consistent across both adapters. `npm run preview` serves the built frontend but does not run Vercel functions or the Sites worker; the development FX middleware only runs with `npm run dev`.

For an authorized production release, match the ready deployment to the merged commit, then exercise the affected flow at `https://sueldo.ai` with synthetic offer values. Verify `/api/fx` for FX changes and raw HTTP status codes for route changes. Record the exact commit and observed behavior; a build or merge alone is not live verification.

## Web Analytics

The calculator and the six information pages load `app/public/analytics.js`, using Vercel's [plain HTML integration](https://vercel.com/docs/analytics/quickstart) and [beforeSend hook](https://vercel.com/docs/analytics/package#beforesend). The script loads only on `https://sueldo.ai` and `https://www.sueldo.ai`, so local development and preview deployments do not report page views or request Vercel's analytics endpoint. Query strings and URL fragments are removed before sending page URLs, and custom events are discarded. No offer inputs are collected by analytics. The optional comparison API receives inputs to calculate and does not load analytics.

These pages also use a `strict-origin` referrer policy so outgoing request headers do not include the page's path or query string. This preserves referring domains while intentionally omitting internal referral paths.

At release, enable Web Analytics for the `sueldo-ai` project in the [Vercel dashboard](https://vercel.com/jsuarezggs-projects/sueldo-ai/analytics) **before deploying**. Vercel adds `/_vercel/insights/*` routes on the next deployment. After deployment, use a synthetic comparison to confirm that `/_vercel/insights/script.js` loads and the page-view request contains no query string or `#c=` fragment, then confirm that visits appear in the dashboard. A PR or successful build alone does not activate analytics.

## Public comparison API

`GET /compare` is the recommended public calculation surface for generic AI assistants with web access. Its initial server-rendered HTML includes the complete response in both a visible `<pre id="sueldo-result-text">` and a machine-readable `<script id="sueldo-result" type="application/json">`. The script element contains inert data; no JavaScript execution, hydration, or browser fetch is needed. `GET /api/compare` remains the JSON endpoint for clients that can reliably consume APIs. Both routes and the interactive calculator call the existing compensation engine; the adapter only validates, normalizes, and presents results.

The routes accept the same versioned numeric/structural query parameters without an account, session, document upload, or comparison persistence. `/ai` is the HTML guide generated from the [Markdown contract](./app/public/ai.md), which documents units, enums, required/default/optional fields, synthetic end-to-end examples, privacy limits, and the structured missing-input protocol. `summary` adds normalized inputs, cash, economic/contingent value, taxes, benefits, and equity alongside the unchanged complete engine results. Contingent value specifically means modeled vested equity net, already included in economic value; it is not a probability-weighted total of conditional compensation. Deltas are B minus A. Missing and invalid fields include a direct question, public field path, reason, code, and expected type or values.

Query parameters reach the server and may appear in infrastructure and assistant logs. Calculation responses must use no-store, noindex, and no-referrer, and must not load analytics, external resources, or log input payloads. Application code avoiding logs does not prove hosting/CDN logs are disabled; any external monitoring must discard full query strings and response bodies. Send only calculation inputs, never raw PDF text, names, employers, or personal identifiers. The interactive calculator and its `#c=` share URLs retain browser-side calculation behavior; anyone with that link can read its encoded values.

Manual release verification: attach two synthetic offer PDFs in an ordinary AI assistant conversation with public web access, ask it to read `https://sueldo.ai/ai`, extract and confirm essential terms, and retrieve its constructed `https://sueldo.ai/compare?...` URL. Verify the complete response is readable without JavaScript and includes the embedded JSON, then open `view_url` and compare cash, economic value, contingent equity, FX, and horizon with the calculator. Repeat the guide's missing-RESICO example: the assistant must ask the returned question and only retry after the user answers. Separately verify JSON parity at `/api/compare` with identical inputs and fixed FX, and privacy headers on success and errors. Direct HTTP and browser checks establish endpoint correctness; they do not prove retrieval by every AI assistant. Record the ordinary-conversation test as unverified unless it was actually run.

## Search discovery

The production build publishes first-class crawler and reference surfaces:

- `/robots.txt` and `/sitemap.xml` for search engines
- canonical, Open Graph, Twitter, and structured-data metadata on the homepage
- crawlable methodology, usage, comparison, about, privacy, and terms pages
- `/llms.txt`, `/uso.md`, and `/ai.md` for AI search and answer engines that choose to read them
- a real `404.html`; unknown paths are not rewritten to the calculator with a false `200`

Google Search Console should use a Domain property for `sueldo.ai`, verified with the DNS TXT value Google supplies. After verification, submit `https://sueldo.ai/sitemap.xml` and inspect the homepage plus the methodology page. The verification token is intentionally not committed because Google generates it for the property owner.

The same sitemap can be submitted to Bing Webmaster Tools. `robots.txt` permits discovery of the public guides and retrieval of `/api/compare`, while other API paths remain excluded. Calculation responses separately prohibit indexing through their response headers.

## License

Copyright (C) 2026 jsuarezgg.

sueldo.ai is free software licensed under the [GNU Affero General Public License, version 3 only](./LICENSE) (`AGPL-3.0-only`). You may use, modify, and redistribute it under those terms. Modified versions made available over a network must offer their users the corresponding source code as required by the license.

The software is provided without warranty. Third-party dependencies retain their own licenses. The bundled Archivo font is licensed separately under the [SIL Open Font License 1.1](./app/public/fonts/LICENSE-Archivo.txt).
