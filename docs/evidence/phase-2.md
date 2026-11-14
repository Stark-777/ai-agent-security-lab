# Phase 2 identity and conversation authorization

Date: 2026-11-01 (America/Denver). Historical Phase 2 implementation record. See [publication verification](publication.md) for subsequent checks.

## Implemented

Five opt-in synthetic identities, immutable server-resolved actor context, `/v1/me`, conversation creation, owner-only history, and owner-only user-message append. A per-application in-memory repository enforces tenant and owner independently of the HTTP layer. Both roles have the same conversation permissions; managers cannot read another user's history. No model, tools, document/customer data access, or deliberately vulnerable mode was added.

## Verification

| Command/check                     | Observed result                                                                                                                                                                                     |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run check` with Node 24.22.2 | Exit 0: formatting, lint, type check, all 70 tests in 4 files, OpenAPI freshness, and compilation passed                                                                                            |
| Five-by-five API identity matrix  | All 25 caller/owner pairs checked for read and append; only owner succeeds                                                                                                                          |
| Direct repository checks          | Independent tenant/owner enforcement, invalid actor/role denial, defensive copies, validation, capacity boundaries, and no denied-write mutation passed                                             |
| Auth and disclosure checks        | Disabled fixture mode, missing/unknown/malformed/duplicate tokens, header/body spoofing, query-token rejection, and token/message log exclusion passed                                              |
| `npm run smoke`                   | Exit 0 with loopback socket permission: anonymous 401; owner create/append/read succeeds; foreign manager 404; no token/message log leak; graceful shutdown and invalid-configuration handling pass |

The first type check rejected the deliberately duplicated Authorization header's array representation in the injection test. The test now explicitly marks that malformed wire input as outside the typed API; production types were not weakened. No dependency versions changed, and no fresh dependency audit was run; Phase 1's development-tool advisory exception remains open.

Observed live smoke output:

```text
PASS: anonymous 401; owner creates, appends and reads; foreign manager 404; tokens and message excluded from logs.
PASS: compiled server binds loopback; health 200; invalid query 400; no canary leak; SIGTERM exits 0.
PASS: invalid configuration exits 1 without exposing the supplied value.
```

## Reproduce

With Node 24.22.2 selected, from the project root:

```sh
npm run check
npm run smoke
LAB_AUTH_MODE=fixtures npm start
```

Use the README's curl sequence for actual requests. Expect unauthenticated 401, authenticated `/v1/me` 200, conversation/message creation 201, owner history 200, and same-tenant or foreign-manager history 404. Omit fixture mode to confirm even known fixture tokens receive 401. Stop the server with Ctrl+C. The smoke script uses a separate ephemeral port and stops itself.

## Changed files

- Added `src/identity.ts`, `src/errors.ts`, `src/conversations.ts`, and `src/conversation-routes.ts`.
- Updated `src/app.ts`, `src/config.ts`, and `src/contracts.ts` for protected routes, opt-in mode, and safe errors.
- Added `tests/authorization.test.ts` and `tests/conversations.test.ts`; adjusted existing foundation tests for the new configuration/route scope.
- Updated `scripts/openapi.ts`, generated `docs/openapi.json`, `scripts/smoke.ts`, `.env.example`, and `compose.yaml`.
- Updated README, roadmap, decisions, architecture, threat model, authorization matrix, evidence index; added this record.

## Limits and review checkpoint

Fixture tokens are intentionally public and do not authenticate real people. State is process-local and ephemeral. Conversation isolation tests do not prove isolation for future tools or retrieval. Error semantics match for missing/inaccessible objects, but no timing side-channel assurance is claimed. Docker and hosted CI remain unverified. No commits, publishing, cloud resources, or paid services were used.

Interview checkpoint: a Northstar manager presents a valid token and requests a Northstar agent's conversation. Authentication succeeds; repository authorization fails because tenant membership and elevated role do not establish ownership. Explain why the same check must remain in the repository when a future tool calls it directly.

Next exact task after review: Phase 3 deterministic model adapter and constrained tool execution, with role policy outside model output. Do not implement a vulnerable bypass until its designated later phase.
