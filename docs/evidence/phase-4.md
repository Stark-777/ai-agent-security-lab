# Phase 4 — refund-request authorization comparison

Date: 2026-11-15. Phase 3 was committed and pushed as `06c392d` before these changes. Phase 4 remains local for review.

## Scope adjustment

Use a synthetic refund-request queue rather than pretend to execute a payment before confirmation controls exist. The vulnerable and hardened versions differ in function-level role enforcement. Both retain tenant checks, argument validation, bounded queue state, and no payment execution. The vulnerable composition is CLI-only; no network isolation settings need weakening. This demonstrates unauthorized state creation, with explicitly narrower impact than an executed refund.

## Commands and observed results

`npm run check`: exit 0; formatting, lint, types, 85 tests in six files, OpenAPI freshness, and build passed.

`npm run lab:refund`: exit 0; support-agent proposal denied and queue unchanged.

`LAB_REFUND_MODE=vulnerable npm run lab:refund`: exit 1 by design; the same invariant detects one unauthorized queue entry. The normal test suite expects this vulnerable failure, so successful CI does not hide the defect or remain permanently red.

Captured output: [hardened replay](refund-hardened.txt), [vulnerable replay](refund-vulnerable.txt). Exception stack paths in the vulnerable capture are normalized to `<project>` for publication. No model API or external system is used.

Changed code: new `src/refund-lab.ts`, `scripts/refund-lab.ts`, and `tests/refund-lab.test.ts`; updated `src/agent.ts` and package script. Documentation adds [F001](../findings/F001-broken-tool-authorization.md) and updates the maintained project files. No dependency changes.

Interview checkpoint: why does `confirmation_required` still represent a vulnerability when an unauthorized actor created the request? Explain the unauthorized state transition without overstating it as money movement.

Next exact task after review: Phase 5 tenant-aware retrieval and poisoned-document simulation. Do not claim a real model jailbreak from this deterministic fixture.
