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

## Run locally (authorized development only)

These instructions are for the copyright holder and developers with separate written permission. They do not grant permission to reuse or self-host the software.

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
| `app/server/compare-offers.js`, `app/server/mcp.js` | Bounded MCP inputs, shared-engine calculation and stateless protocol handler |
| `app/src/fx-reference.js` | Bounded, validated browser FX request |
| `app/api/fx.js`, `app/api/mcp.js`, `app/worker/index.js` | Vercel API and Sites worker adapters |
| `app/public/` | Crawlable information pages and discovery assets |

[`DOMAIN_CONTEXT.md`](./DOMAIN_CONTEXT.md) records market, calculation, and privacy boundaries. [`COMPENSATION_CASES.md`](./COMPENSATION_CASES.md) is the broader case catalog, including planned features and open questions. [`AGENTS.md`](./AGENTS.md) records the repository workflow for coding agents.

## Verify

Run focused tests while iterating, from `app/`:

```bash
node --test tests/compensation.test.mjs
node --test tests/capture-state.test.mjs tests/share-link.test.mjs tests/share-summary.test.mjs
node --test tests/banxico-fix.test.mjs tests/fx-reference.test.mjs tests/seo.test.mjs
node --test tests/mcp.test.mjs
node --test tests/editor.test.mjs
```

Before releasing code, run the complete source test suite, build, then check the generated hosting package. These checks run sequentially and do not require a local app server. `npm test` and `npm run test:sites` are build-independent; `npm run test:build` checks the emitted files in `dist/`.

```bash
cd app
npm test
npm run build
npm run test:build
```

`npm run build` emits browser assets in `app/dist/client/` and bundles the Sites worker and its dependencies in `app/dist/server/`. Vercel serves `dist/client` with the functions in `app/api/`; Sites uses the worker and `app/.openai/hosting.json`. Keep shared FX and MCP behavior consistent across both adapters. `npm run preview` serves the built frontend but does not run the APIs; the development FX and MCP middleware run with `npm run dev`.

For an authorized production release, match the ready deployment to the merged commit, then exercise the affected flow at `https://sueldo.ai` with synthetic offer values. Verify `/api/fx` for FX changes and raw HTTP status codes for route changes. Record the exact commit and observed behavior; a build or merge alone is not live verification.

## MCP comparison tool

The endpoint is `/api/mcp`, using the official MCP SDK's stateless Streamable HTTP handler. It exposes one read-only tool, `compare_offers`, backed by the exact browser calculation engine and share-link encoder. No AI model, API key, account, database, saved session, or separate server is required. Vercel runs it as a Node.js function in the existing project; invocation and compute charges still depend on the hosting plan and traffic.

The [client guide](./app/public/mcp.md), published as `/mcp.md` and linked from `/llms.txt`, documents inputs, output interpretation, privacy and a synthetic example. A client must connect the remote MCP URL before calling it; web discovery alone does not install tools. This implementation does not submit a ChatGPT directory listing or configure any user's assistant.

- Local development: `npm run dev`, then connect an MCP client to `http://localhost:5173/api/mcp` (or the port Vite prints).
- Vercel: production hostnames and the exact `VERCEL_URL` preview hostname are allowed. The function uses Web Standard `Request`/`Response`, with a 10-second duration ceiling. The project uses Node 24.
- Sites: the bundled worker has no storage bindings. Set `MCP_HOSTNAME` to the exact additional hostname if the deployment is not served at `sueldo.ai` or `www.sueldo.ai`. This is a hostname, not a URL or wildcard.
- The endpoint allows requests without Origin (ordinary server-to-server clients), and validates Host and any supplied Origin. Browser cross-origin access is not enabled. POST only; no persistent SSE stream, sessions, subscription streams or OAuth.
- Inputs are explicit and bounded; requests are limited to 64 KiB. The engine blocks unconfirmed/ineligible RESICO, excess income and invalid benefits/vesting. Generated links must fit the existing share format. The tool rejects combinations whose charges the current editor cannot expose.
- Results and share URLs exist in memory for the response only. Never log request bodies, tool arguments, outputs or full shared URLs; keep tracing/body capture disabled for this route. `no-store` covers successes and failures. Clients and hosting providers have their own retention policies.

Before an authorized public release, verify the deployed MCP handshake, discovery, valid and invalid tool calls with synthetic data, then open and edit the returned link in a real client/browser. Check that the deployment matches the merged commit. The SDK tests verify protocol behavior, arithmetic parity and link restoration; they do not establish a ChatGPT or another assistant's end-to-end experience.

The code bounds each invocation, not total traffic. Configure hosting-layer rate limits and spending controls before promoting the public endpoint; do not use an in-memory IP map as a global serverless limit. Do not enable request-body or result logging. No paid service or limit is configured by this code change.

The [plugin preparation package](./plugins/README.md) contains a portable remote-MCP manifest, listing assets, synthetic review cases and a reproducible draft ZIP command. It has not been submitted or published. The preparation guide separates automated calculation checks from the native ChatGPT desktop/mobile testing and publisher verification still required before submission.

To exercise the bundled worker with dynamic code generation disabled, run `node --disallow-code-generation-from-strings --test tests/build.mjs` after building. This catches a class of Worker-incompatible dependencies; a deployed Sites smoke test remains separate.

## Web Analytics

The calculator and the six information pages load `app/public/analytics.js`, using Vercel's [plain HTML integration](https://vercel.com/docs/analytics/quickstart) and [beforeSend hook](https://vercel.com/docs/analytics/package#beforesend). The script loads only on `https://sueldo.ai` and `https://www.sueldo.ai`, so local development and preview deployments do not report page views or request Vercel's analytics endpoint. Query strings and URL fragments are removed before sending page URLs, and custom events are discarded. No offer inputs are collected.

These pages also use a `strict-origin` referrer policy so outgoing request headers do not include the page's path or query string. This preserves referring domains while intentionally omitting internal referral paths.

At release, enable Web Analytics for the `sueldo-ai` project in the [Vercel dashboard](https://vercel.com/jsuarezggs-projects/sueldo-ai/analytics) **before deploying**. Vercel adds `/_vercel/insights/*` routes on the next deployment. After deployment, use a synthetic comparison to confirm that `/_vercel/insights/script.js` loads and the page-view request contains no query string or `#c=` fragment, then confirm that visits appear in the dashboard. A PR or successful build alone does not activate analytics.

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

sueldo.ai is proprietary software. All rights reserved. The [license](./LICENSE) permits viewing the source and using the official hosted service, including sharing your comparison results. It grants no permission to reuse, modify, redistribute, or self-host the software without separate written permission, subject to the exceptions stated in the license. Public repository access is not an open-source license.

Previously granted rights to code released under AGPL-3.0-only remain valid under that license; this change does not revoke them.

The software is provided without warranty. Third-party dependencies retain their own licenses. The bundled Archivo font is licensed separately under the [SIL Open Font License 1.1](./app/public/fonts/LICENSE-Archivo.txt).
