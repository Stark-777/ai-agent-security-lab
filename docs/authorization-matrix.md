# Authorization matrix

Phase 6 comparison tests all five identities against all five owners under hardened and vulnerable CLI compositions. Hardened policy remains tenant AND owner for conversation reads/appends, tenant AND classification for retrieval. Neither role gains cross-tenant scope. Vulnerable constructors are never selected by HTTP request inputs.

Phase 5: context retrieval enforces actor tenant and `tenant-internal` classification before ranking. There is no client-selectable tenant/classification filter. Retrieved text cannot grant a tool permission. Both roles receive only their tenant's allowed retrieval sources; restricted sources remain excluded.

Phase 4 refinement: hardened billing-manager refund proposals create a pending synthetic queue entry and return `confirmation_required`; support agents remain denied. No payment executes. The intentionally vulnerable CLI allows support-agent queue creation for comparison; the HTTP composition has no vulnerable startup/request option.

Phase 3 update: owner-only agent preview is implemented. Both roles may read same-tenant synthetic customer records and tenant-internal documents. Restricted and cross-tenant objects yield `not_found` tool outcomes. Support-agent refunds yield `denied`; managers receive `confirmation_required` only for their tenant's invoice. No role can execute a refund yet. These tool outcomes appear inside a successful agent response; they are not HTTP authorization status codes. History/ownership checks retain their prior HTTP semantics.

Phase 2 implements health, identity inspection, conversation creation, history reads, and user-message append. Tool actions, restricted document access, and ingestion policies below remain design requirements. Both tenants use the same conversation rules. No role has cross-tenant authority. Appending a message stores user text only; agent execution starts in Phase 3.

| Operation                            | Unauthenticated | Support agent | Billing manager | Additional condition                                                                                                                           |
| ------------------------------------ | --------------- | ------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Health                               | Allow           | Allow         | Allow           | Minimal status only                                                                                                                            |
| Start conversation                   | Deny            | Allow         | Allow           | Server sets tenant and owner                                                                                                                   |
| Send message / read history          | Deny            | Own only      | Own only        | Same tenant AND same owner; manager role grants no history override                                                                            |
| `getCustomerRecord`                  | Deny            | Allow         | Allow           | Customer belongs to actor tenant; return minimized fields                                                                                      |
| `retrieveInternalDocument`           | Deny            | Allow         | Allow           | Same tenant, classification `tenant-internal` only                                                                                             |
| `issueRefund`                        | Deny            | Deny          | Conditional     | Same-tenant invoice/customer; amount within refundable balance; Phase 7 adds bound confirmation, per-refund cap, rate limit, replay protection |
| Read restricted fixture/canary       | Deny            | Deny          | Deny            | Reserved for disclosure tests; excluded from model context                                                                                     |
| Ingest/change documents through HTTP | Deny            | Deny          | Deny            | No upload endpoint in initial scope                                                                                                            |

The final refund policy requires all Phase 7 controls. Earlier milestones must explicitly label their narrower guarantees and must not be described as a complete sensitive-action design.

## Implemented identity fixtures

These identities are now implemented. To use them, explicitly start with `LAB_AUTH_MODE=fixtures`. Each token is public synthetic data. Anyone who possesses the fixture list can assume any fixture identity; this tests authorization behavior, not real credential security. No login, JWT, expiry, revocation, or production identity provider is implemented.

| Identity       | Synthetic bearer token    |
| -------------- | ------------------------- |
| north-agent-a  | `lab-only-north-agent-a`  |
| north-agent-b  | `lab-only-north-agent-b`  |
| north-manager  | `lab-only-north-manager`  |
| harbor-agent   | `lab-only-harbor-agent`   |
| harbor-manager | `lab-only-harbor-manager` |

`GET /v1/me` requires a valid token and returns only that token's server-resolved user ID, tenant ID, and role. Headers such as `X-Tenant-Id` and `X-Role` have no authority. Unknown body fields are rejected rather than copied into stored objects.

| Identity       | Tenant    | Role            | Reason                                          |
| -------------- | --------- | --------------- | ----------------------------------------------- |
| north-agent-a  | Northstar | support agent   | Normal caller and malicious low-privilege actor |
| north-agent-b  | Northstar | support agent   | Same-tenant non-owner checks                    |
| north-manager  | Northstar | billing manager | Authorized refund path                          |
| harbor-agent   | Harbor    | support agent   | Cross-tenant denial checks                      |
| harbor-manager | Harbor    | billing manager | Prove elevated role still has tenant scope      |

Use fictional IDs and data only. Authentication answers "which identity is calling?" Authorization answers "may that identity perform this action on this object now?" Possessing a valid token satisfies neither object ownership nor action permission by itself.

## Enforcement rules

1. Authentication resolves actor ID, tenant ID, and role from server-owned identity state.
2. Tool policy checks role and requested action independently of model reasoning.
3. Repository operations check tenant and ownership for every object read/write, including related invoice/customer objects.
4. Confirmation and business limits apply at the mutation boundary.
5. Unknown roles, tools, classifications, and malformed proposals fail closed.

Use 401 for absent/invalid identity, 403 for a denied action, and an indistinguishable 404 for missing or inaccessible objects. Test responses and state changes; hiding identifiers or returning an error after mutation is not authorization.

The current five-by-five API test matrix covers reads and writes for every fixture pair. Only the owner succeeds, including when the caller is a billing manager. Repository tests independently vary tenant while holding owner ID constant, reject unknown roles, and verify returned objects cannot mutate stored data. The 404 error code/message are equal for missing and inaccessible UUIDs; correlation IDs differ, and timing indistinguishability is not claimed. Invalid UUID syntax is 400 after authentication. Unknown server-side actor roles fail closed with 403; clients cannot select arbitrary roles through this fixture API.
