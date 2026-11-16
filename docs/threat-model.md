# Initial threat model

Phase 5: H3 now has a controlled poisoned-document replay with a legitimate user question. The simulated model proposes a forbidden action; hardened role policy contains the state transition. This shares F001's root cause. Poisoning access is assumed through a fixture, not demonstrated via an ingestion exploit. Tenant/classification exclusion is tested on actual adapter context. Real-model behavior and manager-context excessive agency remain outside this evidence.

Phase 4: H1 now has a deliberately vulnerable CLI reproduction with unauthorized refund-request state creation. The simulated direct-injection text reaches a scripted forbidden-tool proposal. Hardened policy blocks that state change; no real-model jailbreak or payment impact is claimed. Tenant/schema controls remain active in both modes.

Phase 3 update: model output is runtime-validated before tool execution; actor scope remains application-owned. Synthetic customer/document reads enforce tenant and classification, and refund proposals enforce role with no mutation capability. Tests inject malformed and repeated model proposals directly. H1–H3 exploit reproductions remain unimplemented; deterministic proposal tests do not establish real-model susceptibility.

Status: hypotheses, not discovered vulnerabilities. Reconcile this document with code at every phase.

Phase 1 update (2026-11-01): schema rejection, payload size enforcement, generic error handling, server-generated request IDs, and log canary tests now cover the HTTP foundation. H1–H3 remain untested because no agent, tools, or tenant data exist. These foundation tests are deterministic security regressions, not model evaluations or proof of tenant isolation.

Phase 2 update (2026-11-01): baseline conversation isolation is now tested across five identities, both roles, and both tenants; direct repository tests isolate the tenant predicate from the owner predicate. Header/body identity spoofing, unknown credentials, and unauthorized writes are rejected. H2's vulnerable reproduction is still deferred to Phase 6; passing baseline tests are not an exploit finding. H1/H3 remain unimplemented. Public fixture tokens deliberately offer no protection against someone choosing another listed identity; only synthetic local data is permitted. Rate limiting, durable storage, real identity lifecycle, and action audit events remain out of scope here.

## Actors, assets, and entry points

Legitimate actors are tenant support agents and billing managers. Adversaries include an authenticated low-privilege agent, a user attempting cross-tenant access, and an attacker whose text reaches a retrieved article. The poisoned article is introduced through a controlled fixture, not an implemented external upload exploit.

Protect customer data, documents, private conversation histories, refund balances, identity material, and trustworthy audit records. Entry points are HTTP messages and object identifiers, fixture ingestion, model outputs, and later confirmation requests. The primary boundaries are client-to-identity, retrieved-content-to-context, model-to-tool, and tool-to-tenant-scoped-data.

## First three security hypotheses

| ID                               | Hypothesis and exploit precondition                                                                                                                         | Intended invariant                                                                                    | Evidence and acceptance                                                                                                                                                                                                                      |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| H1 — Broken tool authorization   | A valid support-agent message induces the scripted adapter to propose `issueRefund`; the vulnerable dispatcher trusts the proposal and skips the role check | A support agent cannot mutate the refund ledger, even with a syntactically valid same-tenant proposal | Vulnerable replay changes a synthetic balance; identical hardened proposal is denied before mutation; allowed manager path remains functional; audit records the denial                                                                      |
| H2 — Broken object authorization | A caller supplies or induces a foreign customer/document/conversation ID; a vulnerable repository looks up globally                                         | Every read/write is scoped to actor tenant; conversation access also requires ownership               | Seed unique canaries per tenant; vulnerable access reveals the foreign fixture; hardened access yields indistinguishable missing/inaccessible response, no foreign context/log content, and no mutation; also test same-tenant non-owner     |
| H3 — Indirect prompt injection   | A Northstar article contains a command to invoke `issueRefund` during a legitimate support question; scripted adapter follows it                            | Retrieved content cannot grant action authority or bypass required confirmation                       | Preserve document, request, proposed tool trace, denial, and ledger state; vulnerable dispatch executes, hardened dispatch blocks; this may share H1's control failure and must not be counted as an independent root cause without evidence |

H1 isolates role enforcement using an otherwise valid same-tenant request. H2 isolates object scope using a permitted action. H3 isolates the instruction source and agent flow; merely dropping known attack keywords is not the expected fix. Later manager-context injection tests must demonstrate confirmation controls, since role checks alone do not contain an authorized manager's unintended refund.

## Initial STRIDE review

| Concern                | Example                                   | Proposed control / phase                                                                            |
| ---------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Spoofing               | Client sets tenant or role                | Server-owned identity mapping / 2                                                                   |
| Tampering              | Model changes invoice or refund amount    | Runtime schema, scoped lookup, bound confirmation / 3 and 7                                         |
| Repudiation            | Refund has no attributable decision       | Actor/action/object/outcome audit fields and correlation ID / 3; durable tamper resistance deferred |
| Information disclosure | Foreign document reaches context or logs  | Data-access authorization, context filtering, log minimization / 2, 5–7                             |
| Denial of service      | Oversized messages or repeated tool calls | Input/context budgets and execution step cap / 1 and 3                                              |
| Elevation of privilege | Model-selected tool bypasses role checks  | Application policy independent of model / 3–4                                                       |

## Framework mapping policy

Map implemented findings to versioned OWASP LLM Top 10, OWASP API Security Top 10, applicable ASVS requirements, and meaningful MITRE ATLAS techniques. Consult OWASP Agentic AI guidance where it adds a specific control or attack explanation. Exact editions, IDs, official source links, and rationale will be verified when the finding is implemented; none are claimed verified in Phase 0.

Candidate concepts: H1 is function-level authorization and model-driven excessive agency; H2 is object-level authorization; H3 is indirect prompt injection. Do not equate an attack technique with a control standard, map every finding to every framework, or inflate counts because one defect has multiple attack paths.

## Evidence boundaries and residual risk

- Functional tests show expected workflows. Deterministic security tests assert invariants under adversarial inputs and inspect side effects. Probabilistic model evaluations measure variable behavior across trials; they are separate evidence.
- A scripted model proves the application handles a supplied malicious proposal, not that a real model can be persuaded to produce it or that prompt formatting prevents injection.
- Prompt instructions, source labels, and output filters are defense in depth. Enforcement lives in policy, constrained tools, and repositories.
- No external attacker, real customer data, payment provider, or cloud system is involved. Host compromise, production identity management, distributed persistence, and real-model robustness are outside initial assurance.
