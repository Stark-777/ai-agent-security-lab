# Case study: authorization before agency

## Problem and scenario

A support assistant for two fictional software vendors must keep customer conversations and knowledge private while proposing useful actions. Model-selected tool calls and retrieved text are untrusted. Five synthetic identities across Northstar and Harbor exercise support-agent and billing-manager roles.

The engineering question is whether application controls still hold when a model proposes an unsafe action. A deterministic adapter makes that proposal reproducible; it does not establish that a real model would produce it.

## Design

One TypeScript/Fastify process keeps the enforcement path inspectable. Server-owned token fixtures resolve actor context. Conversation repositories enforce tenant AND owner, including for managers, and return defensive copies. Retrieval filters tenant/classification before ranking and labels returned text as untrusted data.

The orchestrator validates unknown model output, limits tool calls, passes the authenticated actor separately, and emits allowlisted audit decisions. The model can request a pending refund workflow entry but cannot confirm a transaction.

A separate manager-only service issues short-lived, one-use confirmation tokens bound to exact transaction details. It rechecks role, tenant, balance, caps, and rate limits at a synchronous simulated ledger update. Tokens stay outside agent context and logs.

These choices intentionally prioritize inspectable enforcement over a UI, vector database, cloud deployment, or real payment provider. [Decision records](../DECISIONS.md) describe alternatives and limitations.

## Attack, remediation, and verification

### F001: model selection is not permission

The vulnerable tool composition accepts a support agent's schema-valid refund proposal and creates an unauthorized pending request. Hardened policy checks billing-manager role before state change. The same unchanged-queue assertion fails against the vulnerable version and passes against hardened behavior.

A second replay places hostile instructions inside a retrieved document while the user asks a legitimate support question. The scripted model follows the article even though it is labeled untrusted. Application authorization still denies the action. This is another attack path to the same role defect, not another finding count.

Evidence: [F001](findings/F001-broken-tool-authorization.md), [indirect narrative](findings/F001-indirect-injection.md), [refund tests](../tests/refund-lab.test.ts), [retrieval tests](../tests/retrieval.test.ts).

### F002: authentication is not object authorization

The deliberately unscoped repository reads and appends to a Harbor conversation as a Northstar actor. A retrieval variant allows a Harbor document into Northstar model context. Hardened checks enforce conversation tenant/owner and retrieval tenant/classification.

The suite tests every caller/owner pair, including same-tenant managers, and independently varies tenant while holding owner ID constant. That prevents a correct ownership check from masking a missing tenant predicate. Denied mutations must preserve state.

Evidence: [F002](findings/F002-broken-object-authorization.md), [comparison tests](../tests/bola.test.ts), [HTTP matrix](../tests/authorization.test.ts).

### F003: a valid token is not a user's decision

An unsafe CLI controller proposes and immediately confirms its own refund. The simulated balance changes without explicit user action. The hardened agent lacks confirmation capability; the separately authenticated user flow binds exact details and rejects replay, expiry, substitution, insufficient balance, and over-limit executions.

This is same-user confirmation, not two-person approval. A compromised authorized client can still confirm.

Evidence: [F003](findings/F003-excessive-agency.md), [confirmation tests](../tests/refunds.test.ts), [replay captures](evidence/phase-7.md).

## CI and evidence judgment

The application suite has 107 tests. Semgrep's two targeted rules have positive/negative detector tests; they are not advertised as BOLA detectors. npm/Trivy use severity gates and report artifacts. CodeQL uploads analysis separately from alert review. The runtime SBOM records package inventory, not security assurance.

The first foundation CI run exposed a real container networking issue: internal container health passed while the host port was unreachable. The corrective commit retained loopback publication, changed network configuration, and added a host-binding assertion. That failure and correction remain documented rather than hidden.

Current hosted results, corrective history, and the reviewed CodeQL alert are recorded in [Phase 9](evidence/phase-9.md), with policy in [security controls](security-controls.md).

## Supported claims and limits

The repository supports claims about designing and testing application-level boundaries, reproducing constructed authorization/agency failures, comparing remediations with deterministic assertions, and recording security-control evidence.

It does not support claims of discovering production vulnerabilities, achieving real-model jailbreaks, proving production authentication security, executing payments, completing a comprehensive penetration test, or obtaining ASVS compliance. Framework mappings are specific finding context.

Implementation and writing used AI-assisted pair programming. Independent review, explainable design choices, and reproducible tests are the assessable outputs. A passing test cannot establish the author's understanding; the [interview notes](interview.md) identify the reasoning to defend.
