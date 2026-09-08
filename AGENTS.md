# Working in sueldo.ai

## Scope and instructions

- Follow the user's current request and authorization, including authorization already given in the session. These repository defaults and skill guidelines do not add a second approval step for an authorized merge or release.
- Complete routine implementation choices within scope. If an instruction actually blocks progress, identify the exact file and rule, explain the conflict, and continue independent work.
- Start from `git status` and inspect the relevant implementation before changing it. Preserve unrelated work. Use branch names without a prefix unless the user configures or requests one.
- Keep audits evidence-driven: prioritize incorrect results, broken flows, privacy regressions, and demonstrably unused code. Trace callers before removing an export or dependency. Avoid unrelated rewrites or dependency upgrades.
- Delegate bounded reviews with explicit file ownership when useful. Coordinate edits and let one agent own final validation and Git operations.

## Repository map and domain truth

Read [README.md](README.md) for the implementation map and runnable commands, and [DOMAIN_CONTEXT.md](DOMAIN_CONTEXT.md) before changing calculations or sharing. [COMPENSATION_CASES.md](COMPENSATION_CASES.md) includes planned cases and open questions; verify current support in code and tests.

- Keep spendable cash, economic value, restricted benefits, protection, and vested equity distinct. Preserve the RESICO eligibility gate, statutory benefit boundaries, dated FX provenance, and actual vesting events.
- A tax or statutory rule change needs a dated official source and a regression case. Do not update rules from memory or make uncertain assumptions silently.
- Use synthetic compensation data for tests and screenshots. A full shared URL exposes its encoded comparison to anyone who receives it; never put real packages in commits, logs, or third-party verification services.
- Keep this harness focused on engineering and evidence. Domain documents are not a visual design specification; apply the user's current UI instructions when UI work is in scope.

## Machine load

Before installing dependencies, building, starting a local server, or launching browser automation on macOS, inspect available resources with `memory_pressure`, `vm_stat`, and `sysctl vm.swapusage`. Consider current memory pressure and swap activity together; a low free-page count alone does not establish a shortage.

- Start with static inspection and focused Node tests. Run resource-intensive commands sequentially and reuse installed dependencies when suitable.
- Under pressure, avoid starting a local app or extra browser. Prefer an available hosted preview or, when release is authorized, verify the deployed change on `https://sueldo.ai` after the required checks.
- Stop processes started for this task when finished. Do not terminate the user's unrelated processes to make room.

## Validation

- Run commands from `app/`; this is a React/Vite JavaScript app, not Next.js. Check `package.json` before assuming a lint, typecheck, or test script exists.
- Add regression coverage for observable bugs and domain boundaries. Use the focused test files listed in README while iterating; documentation-only edits need link/path checks and `git diff --check`.
- Before releasing code, run the build and full test suite in the documented order. Re-run only checks affected by later edits, failures, or unresolved concerns.
- Follow the user's global UI skill and scanner requirements when UI source changes. Report any verification gap explicitly.
- Test changes at the boundary they affect: calculation results, capture/edit state, share-link round trips and malformed input, FX failures, or deployed routes. Check both hosting adapters when changing shared server behavior.

## Release evidence

When the user authorizes release, review the final diff, pass the relevant checks, merge the intended change to `main`, and verify the resulting production deployment. Match the deployment's commit to the merged commit and wait for readiness before attributing live behavior to the change.

Check `https://sueldo.ai` with synthetic inputs through the affected flow, plus `/api/fx` when relevant. For routing or discovery changes, also check a clean information-page URL and a nonexistent route's HTTP status. A successful build, HTTP 200, or merge alone does not prove that the new behavior is live. Report the commit, deployment evidence, meaningful checks, and any remaining limitation.

## Maintaining this harness

Keep commands and pitfalls specific to this repository, remove obsolete or conflicting guidance, and avoid pinning model names or copying large generic prompts. See OpenAI's [AGENTS.md guidance](https://learn.chatgpt.com/docs/agent-configuration/agents-md) and [model guidance](https://developers.openai.com/api/docs/guides/latest-model) when updating agent behavior.
