# Phase 7 — confirmation and sensitive-data boundaries

Date: 2026-11-15. Phase 6 published as `d928e1d`; Phase 7 remains local.

Verification: `npm run check` exited 0 on Node 24.22.2, with 106 tests in nine files passing, plus formatting, lint, types, OpenAPI freshness, and build. Hardened agency replay exited 0; vulnerable replay exited 1 as expected. HTTP proposal/confirmation paths were exercised through Fastify injection, not a new live-network smoke test. Phase 6 hosted CI passed at https://github.com/Stark-777/ai-agent-security-lab/actions/runs/43798752929. Phase 7 has not been tested in hosted CI.

Captured local controller replays: [hardened](agency-hardened.txt) and [vulnerable](agency-vulnerable.txt). Exception stack machine paths are normalized to `<project>`.

## Run

With Node 24.22.2 selected, run `npm run check`, `npm run lab:agency`, and `LAB_AGENCY_MODE=vulnerable npm run lab:agency`. The last command intentionally exits 1 if an unsafe controller self-confirms without explicit user action. The normal tests expect the vulnerable invariant failure and hardened success.

For HTTP, start `LAB_AUTH_MODE=fixtures npm start`. As `lab-only-north-manager`, POST `/v1/refund-proposals` with JSON `{"invoiceId":"north-invoice","amountCents":100,"currency":"USD"}`. Expected 201: proposal ID, exact transaction, expiry, and one-use confirmation token. Review those transaction details before confirming. POST `/v1/refund-proposals/RETURNED_ID/confirm` with the same invoice/amount/currency plus `confirmationToken` from that response. Expected 200 with simulated receipt and remaining balance 19900. Repeating it returns 409. Tokens are intentionally returned only to the authenticated proposer; never paste them into chat prompts, model input, or logs. All values here are disposable lab data.

## Enforced controls

- Support agents cannot propose or confirm; foreign and other-user proposals are inaccessible.
- Server state binds token digest to actor, tenant, proposal, invoice, integer amount and USD currency. Confirmation rechecks all of them.
- Tokens expire after 60 seconds, are consumed once, and are stored as SHA-256 digests. No token is supplied to the model or ToolRegistry by this service.
- Amount is capped at 10,000 cents and remaining invoice balance. No more than three executions per actor in a rolling minute. Initial per-tenant invoice balance is 20,000 cents.
- Check-and-update is synchronous without an await seam. Competing confirmations result in one mutation in this JS process. This is not distributed atomicity or durable replay protection.
- Pending proposals are capped at 100 with expired-entry cleanup. State resets on restart.
- Audit logs record actor/tenant, event, and outcome; they exclude confirmation tokens, raw bodies, and exceptions. Responses are no-store through the existing hook.
- Restricted context filtering and minimized tool results remain in place. Output filtering catches only two known synthetic canaries. It cannot detect arbitrary secrets, encodings, paraphrases, or PII, and cannot undo a side effect.

## Design limits

This is explicit user confirmation, not independent two-person approval. A compromised authorized client can confirm; a token is not proof of human cognition. No production identity provider or real payment integration exists. The API agent still creates only the earlier pending queue entries; the new authenticated proposal/confirmation workflow is deliberately separate and is not automatically connected to model proposals. That avoids giving the agent confirmation authority. A future UI or integration must show exact details and bind its interaction deliberately.

Tests cover expiry boundary, altered amount/invoice/currency/token, stolen proposal, role/tenant denial, replay, insufficient funds, rate boundaries, competing confirmations, HTTP error/response behavior, known-canary output withholding, and log exclusion. The agency CLI compares controller behavior, not a defect in the hardened confirmation endpoint. See [F003](../findings/F003-excessive-agency.md).

Changed files: new `src/refunds.ts`, `src/disclosure.ts`, `tests/refunds.test.ts`, `scripts/agency-lab.ts`; updated routes, errors/contracts, logger, agent output, OpenAPI generator/artifact, package script, and maintained documentation. No dependencies changed. No Phase 7 hosted CI run is claimed before publication.

Next phase: DevSecOps scanners, dependency controls, SBOM, and documented CI security gates. Existing development dependency advisory exception remains open.
