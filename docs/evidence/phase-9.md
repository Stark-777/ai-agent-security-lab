# Phase 9 — portfolio reconciliation and open findings

Date: 2026-11-16 (America/Denver). Phase 8 published as `ef03551`. This evidence records the Phase 9 local changes before hosted verification.

## Actual hosted results

- [Foundation CI](https://github.com/Stark-777/ai-agent-security-lab/actions/runs/44004126332): passed on `ef03551`, including 106 tests and container health.
- [Security workflow](https://github.com/Stark-777/ai-agent-security-lab/actions/runs/44004126221): failed at the image high/critical gate. Source job passed npm gates, Semgrep rule tests/source scan, and runtime SBOM generation. Filesystem secret scan passed. Image build and image SBOM succeeded. CodeQL analysis/upload succeeded.
- CodeQL alert 1, `js/missing-rate-limiting`, is open at authentication in `src/conversation-routes.ts`. Transaction limits do not provide general request throttling. No dismissal or suppression was applied.
- Downloaded image report contains 44 vulnerability entries: Debian base packages include high/critical entries without listed fixes; bundled tooling includes brace-expansion and undici entries with listed fixed versions. These are scanner package findings, not verified exploitability. Do not suppress them merely to obtain green CI. Review base/runtime options and remove unnecessary bundled package-manager tooling deliberately, then rebuild and rescan.

The precise failing scan report and image SBOM are available in the security run's `container-security-reports` artifact (14-day retention). Source reports are in the corresponding source artifact. Downloaded originals were inspected locally. The workflow gate is functioning: it preserves a non-green status when its policy finds high/critical packages.

## Reconciled deliverables

Local remediation adds a 100-request-per-minute, per-IP limiter before fixture identity lookup. A test confirms the 101st unauthenticated request returns 429 without echoing its credential. `npm run check` passed locally with 107 tests. [Hosted run on f508942](https://github.com/Stark-777/ai-agent-security-lab/actions/runs/44007072158) passed source and CodeQL jobs, but the Debian Trixie runtime still failed the image gate: 47 high entries in operating-system packages, 46 without listed fixes. Removing npm eliminated the bundled Node package findings. CodeQL alert 1 remains open on the authentication hook despite the passing runtime throttle test; the analyzer has not recognized that hook ordering, so the alert is being investigated rather than silently dismissed.

A follow-up image change uses Alpine 3.23 and a Node binary copied from the matching official Alpine build stage. This removes unnecessary Debian packages while preserving the Node version and non-root runtime. Its build, health, and vulnerability result require a new hosted run before any claim of remediation.

README now describes the current implemented system instead of accumulating dated banners. Case study, control/evidence matrix, interview notes, and career summaries link claims to enforcement code and tests. The implementation distinguishes three findings from the additional indirect-injection path to F001. The pending agent queue and separate confirmed ledger remain explicitly separate.

Documents describe actual scope: synthetic fixture identities, deterministic model behavior, CLI-only vulnerable composition, no production payments, in-memory state, same-user confirmation, limited canary output checks, and no real-model jailbreak measurement. AI-assisted implementation is acknowledged.

No screenshots are fabricated; captured terminal replays and CI run links provide direct evidence. Mermaid diagrams are source-reviewed, not visually rendered in this phase. Existing phase evidence files retain their original dates and guarantees.

## Outstanding work

1. Build and scan the Alpine image in hosted CI; triage any remaining findings without bypassing the severity gate.
2. Rerun CodeQL and inspect the alert result for the new request limiter.
3. Preserve scanner failures and corrective history.
4. Independently rehearse interview explanations and reproduce each invariant. Optional real-model evaluations must be separately labeled and measured.

The portfolio documentation milestone is implemented, but the project is not security-clean and Phase 8 remediation remains open. No claim of comprehensive assessment, ASVS compliance, or production readiness is supported.
