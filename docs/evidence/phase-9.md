# Phase 9 — portfolio reconciliation and hosted verification

Date: 2026-11-16 (America/Denver). Phase 8 was published as `ef03551`; Phase 9 and its corrective follow-up were published as `f508942` and `c74bcc9`.

## Actual hosted results

- [Foundation CI](https://github.com/Stark-777/ai-agent-security-lab/actions/runs/44004126332): passed on `ef03551`, including 106 tests and container health.
- [Security workflow](https://github.com/Stark-777/ai-agent-security-lab/actions/runs/44004126221): failed at the image high/critical gate. Source job passed npm gates, Semgrep rule tests/source scan, and runtime SBOM generation. Filesystem secret scan passed. Image build and image SBOM succeeded. CodeQL analysis/upload succeeded.
- CodeQL alert 1, `js/missing-rate-limiting`, originally identified authentication in `src/conversation-routes.ts` without general request throttling. Transaction limits did not address that path.
- Downloaded image report contains 44 vulnerability entries: Debian base packages include high/critical entries without listed fixes; bundled tooling includes brace-expansion and undici entries with listed fixed versions. These are scanner package findings, not verified exploitability. Do not suppress them merely to obtain green CI. Review base/runtime options and remove unnecessary bundled package-manager tooling deliberately, then rebuild and rescan.

The precise failing scan report and image SBOM are available in the security run's `container-security-reports` artifact (14-day retention). Source reports are in the corresponding source artifact. Downloaded originals were inspected locally. The workflow gate is functioning: it preserves a non-green status when its policy finds high/critical packages.

## Reconciled deliverables

Remediation adds a 100-request-per-minute, per-IP limiter before fixture identity lookup. A test confirms the 101st unauthenticated request returns 429 with `Retry-After` and without echoing its credential. `npm run check` passed locally with 107 tests; `npm run smoke` passed. [Hosted run on f508942](https://github.com/Stark-777/ai-agent-security-lab/actions/runs/44007072158) passed source and CodeQL jobs, but the Debian Trixie runtime still failed the image gate: 47 high entries in operating-system packages, 46 without listed fixes. Removing npm eliminated the bundled Node package findings.

A follow-up image change uses Alpine 3.23 and a Node binary copied from the matching official Alpine build stage. This removes unnecessary Debian packages while preserving the Node version and non-root runtime. [Security controls](https://github.com/Stark-777/ai-agent-security-lab/actions/runs/44007431408) passed all three jobs, including the image build, filesystem secret scan, high/critical image gate, SBOMs, npm gates, Semgrep tests/source scan, and CodeQL upload. The downloaded Trivy image report had zero high/critical vulnerability entries. [Foundation CI](https://github.com/Stark-777/ai-agent-security-lab/actions/runs/44007431555) passed, including its container health check.

CodeQL alert 1 persisted on `c74bcc9` even though `app.rateLimit()` runs as an `onRequest` hook immediately before authentication. The runtime test demonstrates the throttle. The alert was [dismissed with reason "false positive" and a public explanation](https://github.com/Stark-777/ai-agent-security-lab/security/code-scanning/1); it was not suppressed in source or excluded from analysis. This judgment applies to that hook and test only. The per-process store is not a distributed rate limit.

README now describes the current implemented system instead of accumulating dated banners. Case study, control/evidence matrix, interview notes, and career summaries link claims to enforcement code and tests. The implementation distinguishes three findings from the additional indirect-injection path to F001. The pending agent queue and separate confirmed ledger remain explicitly separate.

Documents describe actual scope: synthetic fixture identities, deterministic model behavior, CLI-only vulnerable composition, no production payments, in-memory state, same-user confirmation, limited canary output checks, and no real-model jailbreak measurement. AI-assisted implementation is acknowledged.

No screenshots are fabricated; captured terminal replays and CI run links provide direct evidence. Mermaid diagrams are source-reviewed, not visually rendered in this phase. Existing phase evidence files retain their original dates and guarantees.

## Outstanding work

1. Independently rehearse interview explanations and reproduce each invariant. Optional real-model evaluations must be separately labeled and measured.
2. Review future dependency/base-image advisories; a zero-entry report is specific to Trivy 0.76.2, this image, and this scan date.

The portfolio documentation milestone is implemented and the hosted checks pass. No claim of comprehensive assessment, ASVS compliance, or production readiness is supported.
