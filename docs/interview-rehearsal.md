# Interview rehearsal: evidence and defensible answers

This is a practice aid, not evidence that the project author has personally rehearsed or understood each answer. Read the linked code, run the replays, and explain the result without this page.

## Reproduced on 2026-11-16

`npm run check` passed: formatting, lint, types, 107 tests in nine files, OpenAPI freshness, and build. Each CLI replay was run once in both modes. Hardened exit was 0; vulnerable exit was 1 with `SECURITY INVARIANT FAILED` in every comparison.

| Replay       | Hardened observation                                                         | Vulnerable observation                                                      | Defensible impact                                                                                                                            |
| ------------ | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `lab:refund` | Pending requests 0 → 0                                                       | Pending requests 0 → 1                                                      | A support agent created an unauthorized request, not a payment.                                                                              |
| `lab:rag`    | Pending requests 0 → 0                                                       | Pending requests 0 → 1 after one poisoned document was retrieved            | Retrieved instructions reached the scripted model; application authorization determined whether state changed.                               |
| `lab:bola`   | Foreign read and write denied; one original message; foreign source excluded | Foreign read and write allowed; message count 1 → 2; Harbor source included | A known foreign object was exposed and modified, and foreign text entered retrieval context. Final-answer exfiltration was not demonstrated. |
| `lab:agency` | Synthetic balance 20,000 → 20,000 cents                                      | Synthetic balance 20,000 → 19,900 cents                                     | A deliberately unsafe local controller self-confirmed; no real payment occurred.                                                             |

Commands from the project root:

```sh
npm run check
npm run lab:refund
LAB_REFUND_MODE=vulnerable npm run lab:refund
npm run lab:rag
LAB_REFUND_MODE=vulnerable npm run lab:rag
npm run lab:bola
LAB_OBJECT_MODE=vulnerable npm run lab:bola
npm run lab:agency
LAB_AGENCY_MODE=vulnerable npm run lab:agency
```

The nonzero vulnerable exit is the shared assertion detecting the intentional defect. The vulnerable modes are CLI-only; the HTTP app constructs hardened repositories and services by default.

## Questions to answer aloud

**1. Where does identity come from, and what does it authorize?** The HTTP route resolves a server-owned actor from a synthetic bearer-token map. It ignores client identity claims. Authentication alone does not grant access to another conversation. [Identity](../src/identity.ts), [route hook](../src/conversation-routes.ts), and [owner predicate](../src/conversations.ts) are separate steps. The tokens are public fixtures and cannot authenticate real users.

**2. Why test tenant and owner separately?** A record can fail either predicate. If both differ, a passing denial cannot show which check worked. Repository tests hold one dimension constant to prove both. The hardened `#owned` predicate checks tenant **and** owner on each read/write; inaccessible and missing IDs both return `NOT_FOUND`.

**3. Why is model-output validation insufficient?** Zod validates the structure of an unknown proposal; it does not grant permission. [ToolRegistry.execute](../src/agent.ts) checks the actor's role and data scope before a state change. Removing only the role check reproduces F001 even with a schema-valid proposal.

**4. What does the poisoned-document replay show?** A trusted fixture setup places hostile text in a tenant-allowed document. The deterministic adapter proposes the forbidden refund tool. The hardened role check keeps the queue unchanged. This demonstrates containment of that scripted path, not a measured real-model jailbreak rate or an ingestion exploit.

**5. What does the refund confirmation token guarantee?** The manager-only service issues a random, one-use token whose digest is stored for 60 seconds. Confirmation binds actor, tenant, proposal, invoice, amount, and currency, then checks balance and a per-actor execution cap. It proves possession of a token in this process, not that a human knowingly approved the action. The agent tool registry cannot call this service.

**6. Where does atomicity stop?** The final check and ledger update have no `await` in one JavaScript process. Multiple workers or restarts would need durable transactional storage and idempotency. The same manager can propose and confirm; this is not two-person approval.

**7. What is the scanner result actually worth?** [Hosted security checks](https://github.com/Stark-777/ai-agent-security-lab/actions/runs/44007909922) passed on the final Phase 9 commit. The image had zero high/critical entries under the pinned Trivy gate. This is a dated package scan, not proof of no vulnerabilities. Semgrep's two rule tests establish narrow detector behavior, not authorization coverage. A CodeQL rate-limit alert was [dismissed with a public false-positive rationale](https://github.com/Stark-777/ai-agent-security-lab/security/code-scanning/1) after the runtime test showed the 101st unauthenticated request returns 429.

**8. What would you change for production?** Replace public fixture tokens with real authentication and lifecycle controls; use shared rate-limit state; persist conversations and confirmation state with tenant-scoped database queries; add transactional, durable idempotency for money movement; decide whether independent approval is required; evaluate a real model with measured trials; and perform a broader security review. The present lab supports none of those production claims.

## Self-check

Without reading this page, draw the request path from token to repository predicate, point to the exact F001 role check, explain why the vulnerable F003 balance changes, and state one thing each replay does **not** prove. If any part needs a script, practice that part before using the project in an interview.
