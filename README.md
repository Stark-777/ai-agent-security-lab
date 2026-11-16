# AI Agent Security Lab

**Phase 7 local update (2026-11-15):** manager-only simulated refund proposal/confirmation endpoints now enforce exact transaction binding, one-use expiring tokens, replay/balance/cap/rate checks, and token-safe logs. `npm run lab:agency` passes; `LAB_AGENCY_MODE=vulnerable npm run lab:agency` intentionally fails for controller self-confirmation. See [Phase 7 commands and limits](docs/evidence/phase-7.md) and [F003](docs/findings/F003-excessive-agency.md). Phase 6 is published as `d928e1d`; Phase 7 is uncommitted. Earlier status sections are historical.

**Phase 6 local update (2026-11-15):** conversation BOLA and cross-tenant retrieval comparisons are implemented. `npm run lab:bola` passes hardened invariants; `LAB_OBJECT_MODE=vulnerable npm run lab:bola` intentionally exits 1 after exposing/tampering with synthetic foreign state. All 95 tests pass. See [F002](docs/findings/F002-broken-object-authorization.md) and [Phase 6 evidence](docs/evidence/phase-6.md). Phase 5 is published as `de33114`; Phase 6 remains uncommitted. Earlier milestone descriptions below are historical.

**Phase 5 local update (2026-11-15):** tenant/classification-filtered lexical retrieval and a poisoned-document replay are implemented. Run `npm run lab:rag` for hardened containment; `LAB_REFUND_MODE=vulnerable npm run lab:rag` intentionally exits 1 after detecting unauthorized queue creation. See [Phase 5](docs/evidence/phase-5.md). All 90 tests pass locally. Phase 4 is published as `9e68c23`; Phase 5 is uncommitted. Earlier milestone descriptions below are historical.

**Phase 4 local update (2026-11-15):** a CLI-only vulnerable/hardened refund-request authorization lab is implemented. Run `npm run lab:refund` for the hardened pass; `LAB_REFUND_MODE=vulnerable npm run lab:refund` deliberately exits 1 after detecting an unauthorized synthetic queue entry. See [F001](docs/findings/F001-broken-tool-authorization.md) and [Phase 4 evidence](docs/evidence/phase-4.md). Phase 3 is pushed as `06c392d`; Phase 4 is not yet committed. Historical milestone descriptions below retain their earlier scope.

**Local Phase 3 update (2026-11-14):** a deterministic model adapter, three schema-constrained tools, tenant/role enforcement, bounded execution, and sanitized audit events are now implemented. See [Phase 3 behavior and verification](docs/evidence/phase-3.md) for commands and limits. The published badge and historical Phase 2 sections below describe the earlier milestone until this update is committed and pushed.

[![Foundation checks](https://github.com/Stark-777/ai-agent-security-lab/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/Stark-777/ai-agent-security-lab/actions/workflows/ci.yml)

**Application Security portfolio project: tenant isolation, object authorization, and deterministic security regression testing for a future AI-enabled support API.**

The current milestone implements the security foundation before adding a model. Five synthetic identities across two tenants can create conversations, append user messages, and read only their own history. Authorization is enforced in the repository so future agent tools must obey the same rules.

**Implemented:** Phases 0–2. **Not implemented yet:** model integration, tool execution, RAG, prompt-injection scenarios, or vulnerable/hardened comparisons. This is a local learning lab, not a production service.

## Review in five minutes

1. Read the [case study](docs/case-study.md) for the problem, design decisions, evidence, and limitations.
2. Inspect the [authorization matrix](docs/authorization-matrix.md) and [threat model](docs/threat-model.md).
3. Follow the enforcement path: [identity resolution](src/identity.ts) → [API routes](src/conversation-routes.ts) → [scoped repository](src/conversations.ts).
4. Review the [25 caller/owner combinations](tests/authorization.test.ts) and [direct repository tests](tests/conversations.test.ts).
5. Run the checks below. Historical results and the publication verification are in the [evidence register](docs/evidence/README.md).

## Security behavior demonstrated

| Risk                             | Implemented control                                                              | Evidence                                                   |
| -------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Cross-tenant conversation access | Every repository read/append checks tenant AND owner                             | API identity matrix and independent tenant-predicate tests |
| Same-tenant privilege overreach  | Managers have no override for another user's private history                     | Same-tenant manager denial tests                           |
| Client-supplied identity claims  | Actor derives from a server-owned token map; unexpected body fields are rejected | Header/body spoofing and invalid-credential tests          |
| Unauthorized modification        | Check access before mutation; return defensive copies                            | Unchanged-state and reference-mutation tests               |
| Sensitive data in logs           | Omit raw request/error objects and redact selected credential fields             | Synthetic token, message, query, and error canary tests    |
| Unbounded local state            | Input-size and per-actor/per-conversation capacity limits                        | Boundary tests; not a complete rate-limit policy           |

A valid token identifies the caller. It does not authorize access to every object in their tenant. A Northstar manager requesting a Northstar agent's conversation receives the same 404 error semantics as a request for a missing conversation.

## Architecture

```mermaid
flowchart LR
  Client[Untrusted HTTP input] --> Auth[Server-owned identity lookup]
  Auth --> Validation[Runtime input validation]
  Validation --> Repository[Tenant AND owner enforcement]
  Repository --> Store[Private in-memory conversations]
  Store --> Response[Defensive response copies]
  Auth --> Logs[Minimized structured logs]
  Repository --> Logs
```

One TypeScript/Fastify service; Zod validation; Pino JSON logging; Vitest with Fastify request injection; generated OpenAPI; Docker Compose and GitHub Actions definitions. No paid model, database service, frontend, or cloud account is required.

See [architecture and target data flow](docs/architecture.md) and [decision records](DECISIONS.md).

## Run locally

Select **Node 24.22.2**, pinned in `.nvmrc` and `.node-version`. If you already use nvm, run `nvm install && nvm use` after cloning.

```sh
git clone https://github.com/Stark-777/ai-agent-security-lab.git
cd ai-agent-security-lab
npm ci --ignore-scripts
npm run check
npm run smoke
LAB_AUTH_MODE=fixtures npm start
```

`check` runs formatting, lint, TypeScript, deterministic tests, OpenAPI freshness, and the build. `smoke` starts the compiled server on a temporary loopback port, verifies HTTP behavior and shutdown, and stops it. The Phase 2 suite contains **70 tests**; see [verification evidence](docs/evidence/publication.md) for the latest recorded run.

The app listens on `127.0.0.1:3000`. In another terminal:

```sh
curl -i http://127.0.0.1:3000/health
curl -i http://127.0.0.1:3000/v1/me
curl -i http://127.0.0.1:3000/v1/me \
  -H 'Authorization: Bearer lab-only-north-agent-a'
```

Expect health **200**, anonymous identity **401**, and fixture identity **200**. Follow the [complete local walkthrough](docs/local-demo.md) to create a conversation and reproduce same-tenant and cross-tenant denials. Stop the server with Ctrl+C. Restarting clears all data.

Fixture tokens are **public synthetic test data**. Anyone can select any listed fixture identity; this is not production authentication. Without `LAB_AUTH_MODE=fixtures`, protected routes reject even known tokens.

For development, use `npm run dev` and run type checking separately. Configuration is documented in `.env.example`; the server does not automatically load that file.

### Docker and CI

```sh
LAB_AUTH_MODE=fixtures docker compose up --build --wait
docker compose down
```

Compose publishes only host loopback and defines a non-root, read-only container with restricted capabilities and resources. The [CI workflow](.github/workflows/ci.yml) runs code checks, live HTTP smoke tests, and a container health check. The [publication record](docs/evidence/publication.md) distinguishes actual runs from definitions; a workflow file alone is not passing CI evidence.

The bridge network permits outbound traffic. Loopback publication limits incoming host access; it is not an outbound firewall. There are no external model or tool integrations in this milestone.

## Scope and limitations

- The current evidence concerns conversation authorization, validation, and logging. No prompt-injection exploit or model evaluation has been performed.
- In-memory storage provides no durable or distributed guarantees. Matching 404 semantics does not establish timing indistinguishability.
- Synthetic fixture authentication has no production identity lifecycle, token expiry, or revocation.
- Log redaction is supplementary, not a universal secret detector.
- Dependency audit results are dated snapshots. The documented development-tool advisory exception is tracked in [D12](DECISIONS.md); do not interpret an audit result as proof of security.
- All scenarios are local and synthetic. Do not expose this lab as a public service.

## Next milestone

Phase 3 adds a deterministic model adapter, constrained tools, independent tool authorization, and audit events. Later phases will introduce reproducible vulnerable/hardened comparisons, RAG poisoning, excessive agency, and CI security scanners.

See the [roadmap](ROADMAP.md), [finding-record format](docs/findings/README.md), and [security scope](SECURITY.md). Future work is intentionally separated from completed evidence.
