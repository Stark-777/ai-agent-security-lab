# Case study: authorization before agency

## Problem

An AI-enabled support assistant will eventually retrieve tenant data and propose tool actions. Adding a model before establishing object authorization would make it difficult to distinguish model behavior from an application enforcement failure. This milestone builds and tests the boundary that future agent code must use.

The implemented application has two fictional tenants, five fixture identities, two roles, and private conversations. Support agents and billing managers may create, read, and append to their own conversations. A manager has no special right to another user's history.

## Design decisions

- Resolve identity from a server-owned opaque-token lookup. Never derive actor, role, or tenant from request body fields, custom headers, or future model output. The published tokens are synthetic fixtures, not a secure credential system.
- Enforce tenant AND owner in the repository, rather than only in route handlers. This keeps object authorization in the path when future tools call data access directly.
- Keep repository state private and return copies. An authorized read must not provide a mutable reference that bypasses write checks.
- Make inaccessible and missing conversation UUIDs share the same 404 code/message. Do not claim timing equivalence.
- Use one in-memory process for reproducibility. Durable storage, distributed consistency, and database-level controls require separate work and evidence.
- Exclude raw user content from routine logs and test synthetic canaries. Field redaction alone would miss secrets embedded in query strings or exception messages.

Alternatives and tradeoffs are recorded in [DECISIONS.md](../DECISIONS.md).

## Adversarial verification

The API suite checks every caller/owner combination across the five identities. This includes same-tenant non-owners, same-tenant managers, and managers from the other tenant. Rejected append requests must leave stored history unchanged.

Direct repository tests hold owner ID constant while changing tenant. This is necessary because tests using only different users could pass on the ownership predicate even if the tenant check were removed. Other tests attempt to mutate returned objects, forge message roles, submit unknown fields, and exceed capacity limits.

Authentication tests cover absent, unknown, malformed, duplicate, and disabled fixture credentials. Header claims cannot change the identity resolved from a token. A live HTTP smoke script verifies the compiled application's owner workflow, foreign-manager denial, log exclusions, startup failure, and clean shutdown.

See [API tests](../tests/authorization.test.ts), [repository tests](../tests/conversations.test.ts), and the [publication verification](evidence/publication.md).

## What the evidence supports

This milestone demonstrates application-level authorization design, abuse-case reasoning, regression testing, input validation, and logging controls in a small multi-tenant API. It connects senior test-engineering skills to concrete AppSec enforcement requirements.

It does not yet demonstrate successful prompt injection, RAG attacks, model robustness, tool authorization, production identity security, or a vulnerable-to-hardened remediation narrative. Those claims must wait for implemented scenarios and recorded evidence. Current negative tests exercise a secure baseline; they are not reports of reproduced vulnerabilities.

## Implementation transparency

Implementation and documentation were developed with AI-assisted pair programming. The repository exposes the code, design decisions, tests, and verification limits for independent review. Test results establish the behaviors checked, not who understands the design or whether every relevant attack has been covered.

## Interview discussion

Be prepared to explain the trust assigned to actor context, why two predicates are necessary for object access, how a test could accidentally miss tenant enforcement, and what changes when a model becomes another caller of the repository. The next milestone adds that model boundary while retaining application-owned authorization.
