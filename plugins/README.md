# sueldo.ai plugin preparation

This is a **draft public-directory package**, not a submitted or installed plugin. It connects the existing `https://sueldo.ai/api/mcp` service to clients through the portable Agent Plugins format. It contains one remote MCP connection, listing metadata, the existing brand icon and the proprietary license. It ships no calculation code, skills, hooks, authentication, embedded UI, database or AI model dependency.

The initial product scope and proposed directory availability are Mexico. Other MCP clients can still connect directly to the same endpoint. A directory listing does not guarantee discovery or automatic tool access in an unconfigured assistant.

## Files and commands

- `sueldo-ai/plugin.json`: English base listing, Spanish translation, three starter prompts, five positive and three negative review cases, release notes.
- `sueldo-ai/mcp.json`: authless Streamable HTTP endpoint.
- `sueldo-ai/assets/icon.svg`: the existing 64×64 site icon, unchanged.
- `sueldo-ai/LICENSE`: the repository's proprietary license, unchanged.
- `package.py`: local field/path checks and an allowlisted, reproducible ZIP. It is not OpenAI's automated review or a complete JSON Schema validator.
- `../app/tests/helpers/plugin-review.mjs`: synthetic inputs and the corresponding review prompts. No private offers, emails, attachments or external research are included.
- `../app/tests/plugin.test.mjs`: pinned cash examples, reusable follow-up inputs, RSU/reimbursement behavior, share-link restoration and fixture/listing consistency.

From the repository root:

```bash
python3 plugins/package.py
```

The archive is written to ignored `app/output/sueldo-ai-1.0.0-draft.zip`. Its root contains exactly `plugin.json`, `mcp.json`, `assets/icon.svg` and `LICENSE`; no enclosing directory or repository files are uploaded. Rebuild the archive after changing any package file. Preserve the license when updating it.

From `app/`, run the focused checks:

```bash
node --test tests/mcp.test.mjs tests/plugin.test.mjs
```

Before releasing the accompanying MCP schema change, run `npm test`, `npm run build`, then `npm run test:build`. The change removes the unused `location` input from MCP only; old callers supplying it must omit it. The browser retains its display field and existing links. Deploy and verify this change before submission: the ZIP connects to production, not to this branch.

## Listing decisions

| Field | Prepared value |
| --- | --- |
| Name | sueldo.ai |
| Subtitle | Compare job offers in Mexico |
| Category | Productivity; confirm that the portal offers this title |
| Publisher | jsuarezgg, the current repository copyright holder; replace with the actual verified identity before submission if different |
| Support | [GitHub issues](https://github.com/jsuarezgg/sueldo.ai/issues), the project's existing public support destination |
| Website / privacy / terms | [sueldo.ai](https://sueldo.ai), [privacy](https://sueldo.ai/privacidad), [terms](https://sueldo.ai/terminos) |
| Availability | MX |
| Authentication | None; reviewers need no credentials |
| Optional UI | None; the returned URL opens the existing website |

Do not put personal compensation or full comparison links into public support issues. Use a synthetic reproduction. Do not invent a support email, verified publisher identity or video URL. The directory currently requires English base text; the package also includes `es-MX` text. The current importer retains translations but does not yet display them in the directory.

## Review cases

All amounts below are MXN **recurring monthly cash**, rounded to two decimals. They are regression expectations from the existing engine, not independent certification of tax rules. Average monthly cash, period economic value, protection and vested equity are distinct output fields.

| Case | Expected A | Expected B | Behavior to inspect |
| --- | ---: | ---: | --- |
| Payroll vs confirmed RESICO | 53,267.89 | 84,750.00 | Explicit fixed FX 18; B's average monthly cash is 81,375.00 after time off |
| Two payroll offers | 46,559.07 | 53,252.18 | B's vouchers remain separate from cash; both use payroll rules |
| Two contractors | 67,560.00 | 76,380.00 | Both use confirmed RESICO, stated costs and time off |
| Three years with RSUs | 53,265.17 | 59,973.59 | A vests 388,800 gross over the horizon; 5,000 of utilized equipment value is not cash |
| FX follow-up, 18 → 16 | 53,267.89 → 53,267.89 | 84,750.00 → 75,400.00 | Only FX changes; generate a new editable link |

Negative cases: a single offer with ambiguous `$`, unconfirmed RESICO, and a Colombian tax resident. The assistant should clarify or explain the unsupported scope without inventing results. The endpoint rejects incomplete inputs and unconfirmed RESICO; foreign tax residence is currently a conversational scope gate, not a schema field. Automated engine tests do not establish that the assistant will follow that gate.

## Native walkthrough to record

Use a fresh conversation for each of the eight prompts in `plugin.json`, with only this plugin connected. Use synthetic data throughout. Test both ChatGPT desktop and mobile and record the date, client, connected tool version, actual tool calls, outputs, clarifications and any failures.

1. Connect `https://sueldo.ai/api/mcp` using developer mode, with authentication set to none. Confirm that `compare_offers` is discovered.
2. Run the five positive cases. For the FX case, send the initial offer prompt, wait for its result, then send “¿Y si el dólar baja a 16? Mantén los demás datos.” Confirm a second tool call and unchanged offer inputs.
3. Open a returned link. Confirm the amounts, costs, benefits and FX agree with the chat. Change one value in the website and reload a newly shared link to verify restoration. In the RSU case inspect allocations, cliff, cadence and utilization.
4. Run all three negative prompts. Confirm missing details are requested in stages, no more than three concrete questions per turn, and unsupported tax situations produce no Mexican calculation.
5. Capture the privacy explanation: numbers go to the server for that calculation, and anyone receiving the returned link can read the comparison. Do not describe the link as encrypted or private.

Record actual behavior, including any failures. A manual HTTP relay, arithmetic test or browser-only calculator demo is not evidence that the native plugin works. When a real, reviewer-accessible video exists, add its URL at `extensions.com.openai.review.demo_recording_url`; it is deliberately absent from this draft.

## Before submitting

- [ ] Resolve the public publisher name against the selected verified individual/business identity. Select the intended organization and project; do not create a new one just for packaging.
- [ ] Confirm the support destination, category and Mexico availability in the portal.
- [ ] Verify hosting/analytics retention settings and disclose their actual timelines and user controls in the public privacy policy. The current policy describes in-memory offer processing and separate provider policies but does not establish those infrastructure timelines. Do not invent retention guarantees.
- [ ] Verify hosting-layer abuse/rate limits and spending controls for the public endpoint without enabling request/response-body logging.
- [ ] Review, merge and deploy the accompanying location-removal change, then match the ready deployment to its commit and rerun the MCP smoke checks. Do not claim this branch is live.
- [ ] Run and document the eight native desktop/mobile scenarios above; attach the real walkthrough URL.
- [ ] Rebuild the ZIP, upload a **draft** at [OpenAI Plugins](https://platform.openai.com/plugins), and resolve the platform's metadata/tool findings. Local validation is not approval.
- [ ] Complete domain verification using the exact token from the portal at `https://sueldo.ai/.well-known/openai-apps-challenge`, served as plain text. No token has been created or committed. Check for another plugin's challenge before adding it; do not overwrite it.
- [ ] Connect the MCP server and inspect the scanned tool/schema/annotations. No reviewer credentials are needed for this service.
- [ ] Review the imported five positive/three negative cases, release notes and accessible video. Complete the owner's attestations and submit when authorized. After approval, the owner chooses when to publish.

## Sources checked on 2026-10-03

- [Package your plugin](https://developers.openai.com/plugins/build/plugins): portable `plugin.json` / `mcp.json`, OpenAI extensions and supported assets.
- [Upload and submit](https://developers.openai.com/plugins/deploy/submission): universal ChatGPT/Codex directory, field limits, exact review-case counts, verification, video, review and publication steps.
- [Plugin guidelines](https://developers.openai.com/plugins/plugin-guidelines): data minimization, truthful descriptions, privacy, annotations and native desktop/mobile testing.

Public submission uses the remote URL declaration, not `.app.json` registered-app references or lifecycle hooks. The public listing is separate from installing a local marketplace. No personal marketplace or client configuration is changed by these files.
