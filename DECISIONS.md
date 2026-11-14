# Architectural and security decisions

D01–D08 were proposed on 2026-10-29. Phase 1 was explicitly authorized on 2026-11-01; foundation decisions are now implemented as described in D09–D11. Later-phase designs remain proposals.

Phase 2 was subsequently authorized on 2026-11-01; D13–D15 record its implemented choices.

## D01 — Single API with explicit boundaries

Choose TypeScript and Fastify in one process. Fastify request injection provides an API test seam without listening on a network socket. Express with Supertest is viable, but adds no clear benefit for this lab. Avoid microservices: process separation would add operations work without improving the initial authorization evidence. Trusted modules still require negative tests; being in one process does not make input trustworthy.

Reference: [Fastify injection API](https://fastify.dev/docs/latest/Reference/Server/#inject).

## D02 — In-memory state behind scoped repositories

Use deterministic fixture data and reset state for every test. Services must supply server-derived actor context to repository operations; unscoped lookup helpers must not be available to hardened orchestration. Persistence currently adds little value. Introduce PostgreSQL only when durable audit records, concurrent refund execution, or database enforcement become a deliberate learning objective. In-memory results cannot establish SQL security, distributed atomicity, or restart-safe replay protection.

## D03 — Deterministic model first

The model adapter receives a bounded context and returns a proposed answer or typed tool proposal. Runtime validation is required even if TypeScript declares the output type. Scripted adversarial responses exercise the enforcement boundary reliably. They do not measure real model jailbreak rates. Optional local-model evaluations must report model/version, prompts, seeds where supported, trial counts, and variability separately.

## D04 — Identity and authority are server-owned

Phase 2 will use documented local-only opaque test tokens mapped to identities on the server. Tokens identify the caller; policy determines what the caller may do. Client tenant headers, message content, retrieved text, and model arguments cannot set actor, tenant, or role. These test identities are not a production authentication design; OAuth, account recovery, and production credential management are deferred.

## D05 — One codebase, explicit vulnerable composition

Use a shared application with replaceable boundary implementations, chosen only at startup. Hardened is default; an explicit local-lab switch selects a labeled vulnerable composition. Each scenario disables only its target control, keeps isolated fixtures, and records the active mode. Do not scatter request-controlled bypass flags throughout the application. Separate applications were rejected because they would drift and weaken comparisons.

One shared invariant assertion must fail against vulnerable behavior and pass against hardened behavior. Normal CI should verify that expected vulnerable failure occurred and that the hardened assertion passed; a separate manual command may deliberately exit nonzero to show the violation. Avoid permanently red CI and avoid treating an exploit-only test as remediation evidence.

## D06 — Consequential actions require independent enforcement

The model can propose a refund, never grant permission or confirm it. The application checks role, tenant, invoice ownership, amount, remaining balance, and confirmation. Phase 7 adds a one-use, expiring confirmation bound to actor, tenant, invoice, amount, and proposal, submitted through a separate authenticated endpoint. A sentence saying "confirmed" is not confirmation. A manager confirming their own proposal is user confirmation, not independent two-person approval; separation of duties is deferred.

Proposed lab limits: USD only, integer cents, at most 10,000 cents per refund, no more than the remaining refundable invoice balance, and at most three executed refunds per actor per minute. These are teaching fixtures, not researched business thresholds. Atomic ledger updates and replay tests are required when these controls are implemented. Refund tools receive only a scoped ledger capability, never payment credentials or unrestricted storage access.

## D07 — Keep privileged data out of model context

Classify fixture data and filter before retrieval results enter context. Keep credentials out of prompts and logs. Treat system prompt disclosure separately from confidential data disclosure: a prompt is not a safe secret store. Output filtering is supplementary and cannot undo a tool side effect or replace authorization. Use allowlisted audit fields and synthetic canaries to verify redaction.

## D08 — Supported runtime and incremental tooling

The inspected machine has Node 25.8.0; Node 25 is end-of-life according to the [official release information](https://nodejs.org/en/about/previous-releases). Prefer Node 24 LTS for the initial implementation, verify its support and dependency compatibility, and pin an exact available patch during Phase 1. No runtime change was made. Docker CLI was not found, so container verification remains unavailable until tooling is provisioned. Begin CI with lint, formatting, type checks, and tests; introduce security scanners with documented signal and limitations later.

## D09 — Phase 1 runtime and dependencies

Pin Node 24.22.2 from the official Node release index. Verification uses a workspace-local official macOS x64 archive whose SHA-256 matches the downloaded official checksum list; this is a transport/checksum check, not independent signature verification. System Node and shell configuration are unchanged. Pin direct dependencies and retain the generated npm lockfile in version control. Use `npm ci --ignore-scripts` for reproducible installation without package lifecycle scripts. Pin TypeScript 5.9.3 because the selected typescript-eslint peer range excludes TypeScript 7; do not install the latest major blindly.

## D10 — Minimize logs before redaction

Disable automatic request logs and supply completion events with a server-generated correlation ID, registered route template, response status, and duration. Never log raw paths, queries, headers, request bodies, or exception messages/stacks. Serializers omit raw request/response/error objects; Pino redaction masks selected credential fields as supplementary protection. This intentionally trades some debugging detail for lower disclosure risk. Future diagnostics should add stable error categories, not raw user text. Free-form log messages and arbitrary nested keys are not automatically secret-safe.

References: [Fastify logging](https://fastify.dev/docs/latest/Reference/Logging/) and [validation/error behavior](https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/). Generic errors contain no Zod issues, parser details, or supplied values. Test-only routes exercise body validation and exception paths without exposing a public echo/debug endpoint.

## D11 — Host and container boundaries

Native default binding is fixed to `127.0.0.1`; arbitrary `HOST` environment variables do not change it. `LAB_BIND_MODE=container` explicitly switches to `0.0.0.0` for container networking. This flag is an operator choice, not a container-detection guarantee. Compose publishes to host loopback, uses an internal network, drops capabilities, restricts resources, and enables a read-only filesystem. Validate these definitions in Docker before claiming isolation. The Docker image is pinned by version tag, not immutable digest; CI actions currently use major tags. Digest/SHA pinning and automated maintenance remain Phase 8 supply-chain work.

## D12 — Record the development dependency advisory without forced downgrades

The online audit on 2026-11-01 reports one underlying moderate advisory, [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249), propagated across 11 development dependency entries. The installed ESLint and typescript-eslint trees depend on `minimatch@10.2.6`; the advisory identifies attacker-controlled glob amplification and names 11.0.1 as patched. A separate production-only audit reports zero advisories. This does not prove the application is vulnerability-free.

Keep the supported lint versions and record a temporary development-tooling exception. The current application does not accept glob patterns or import these tools at runtime; lint patterns are repository-controlled. Do not run tooling against untrusted configurations. The automated audit fix proposes old major versions; neither that downgrade nor a forced transitive major override has been justified as compatible. Recheck supported upstream releases before enabling CI on external contributions and again in Phase 8; remove this exception when compatible dependency trees include the patched library. Raw audit reports are in `docs/evidence/`.

Publication follow-up (2026-11-13): the fresh full audit reports nine moderate dependency entries for the same underlying minimatch advisory; the production-only audit reports zero advisories. The dependency lockfile is unchanged. See the [publication record](docs/evidence/publication.md). The D12 exception remains open.

## D13 — Explicitly enabled fixture identity

`LAB_AUTH_MODE` defaults to `disabled`; only `fixtures` enables the five public synthetic bearer tokens. This prevents silently accepting known tokens on a default run. Prefer a small server-owned lookup over JWT parsing or a pretend password service: there are no real users or external identity dependencies yet. The authentication hook runs before body parsing, rejects missing, unknown, malformed, or duplicate credentials, and ignores identity claims in custom headers. `/v1/me` makes the resulting identity observable without returning credentials. This is a deterministic identity fixture, not a production authentication control; a caller can select any published token. Loopback and synthetic data remain mandatory operational constraints.

## D14 — Enforce object scope in the repository

Create, read, and append require explicit actor context. Creation derives owner/tenant from that context; reads and appends require both to match stored state. There is no unscoped lookup export. A private map per application avoids shared mutable test state; defensive copies prevent consumers from mutating stored ownership or history. Reject unknown roles at the repository boundary. The repository trusts the application to supply an authentic actor; shape validation does not make a forged in-process actor authentic. This boundary contains HTTP/model inputs, not malicious code executing inside the trusted process.

Both existing roles can manage only their own conversations. Do not add a manager-only endpoint simply to manufacture a 403 example; function-level role differences will be meaningful when tools arrive. Missing and inaccessible UUIDs share 404 error semantics; invalid UUID syntax is 400. Response timing is not normalized. Direct tests hold owner ID constant while changing tenant to ensure a missing tenant check cannot hide behind a successful ownership check.

## D15 — Store user messages without simulating an assistant

Phase 2 accepts only `{title}` on creation and `{content}` on append, rejects unknown fields, and fixes stored message role to `user`. No assistant text, tools, or agent trace exists yet. Add local caps of 50 conversations per actor and 100 messages per conversation; title/message lengths are bounded by Zod and bodies by Fastify. These limits reduce accidental in-memory growth without claiming a complete abuse/rate-limit policy. Restarting resets state. No new dependencies or persistence layer were introduced.
