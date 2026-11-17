# Roadmap and current status

Phases 0–9 are implemented and published through `c74bcc9`. The current Foundation and Security workflows pass. The earlier image-gate failures and the reviewed CodeQL rate-limit alert are recorded in [Phase 9 evidence](docs/evidence/phase-9.md).

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

Reproduce the local replays and interview explanations independently. Review future dependency and base-image advisories as they change; the hosted passing result is a dated scan, not a durable security guarantee.

## Deliberately deferred

Real LLM evaluations, production authentication, external ingestion, durable/distributed storage and idempotency, independent two-person approval, paid services, cloud deployment, and UI. Add these only when their evidence value justifies the scope.
