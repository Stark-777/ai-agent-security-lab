# Roadmap and current status

Phases 0–8 are implemented and published through `ef03551`. Phase 9 portfolio reconciliation and local remediation are in progress. The previous security image gate failed and a CodeQL request-rate-limiting alert was open; changed controls await hosted verification. See [Phase 9 evidence](docs/evidence/phase-9.md).

## Implemented milestones

| Phase | Deliverable                                                                          |
| ----- | ------------------------------------------------------------------------------------ |
| 0–2   | Charter, HTTP foundation, identity and conversation authorization                    |
| 3     | Deterministic agent, schemas, constrained tools, audit trace                         |
| 4–5   | Tool-authorization comparison and indirect-injection retrieval path                  |
| 6     | Conversation BOLA and tenant retrieval comparison                                    |
| 7     | Explicit simulated refund confirmation, replay/transaction limits, disclosure checks |
| 8     | Scanner workflows, rule tests, dependency policy, SBOMs, actual hosted results       |
| 9     | Current README/case study, control matrix, interview and career material             |

## Required follow-up

Run the security workflow against the smaller image and request throttle, then review any remaining image findings and CodeQL alerts. No severity threshold bypass or broad suppression is authorized as a substitute for remediation.

## Deliberately deferred

Real LLM evaluations, production authentication, external ingestion, durable/distributed storage and idempotency, independent two-person approval, paid services, cloud deployment, and UI. Add these only when their evidence value justifies the scope.
