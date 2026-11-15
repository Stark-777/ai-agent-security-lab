# Evidence register

Latest local work: [Phase 4 comparison](phase-4.md) and [F001](../findings/F001-broken-tool-authorization.md). Phase 3 is published as `06c392d`; Phase 4 is not yet pushed.

Latest local implementation: [Phase 3 deterministic agent](phase-3.md). Its changes are not covered by the earlier published CI run.

| Record                                     | Scope                                                              |
| ------------------------------------------ | ------------------------------------------------------------------ |
| [Publication verification](publication.md) | Latest local checks and GitHub publication status                  |
| [Phase 2](phase-2.md)                      | Identity, conversation ownership, and tenant isolation             |
| [Phase 1](phase-1.md)                      | HTTP foundation, logging, validation, and initial dependency audit |

## Phase 0 — 2026-10-29

The initial workspace had no application source or Git repository. The available runtime was Node 25.8.0 with npm 11.11.0 and Git 2.50.1; Docker commands were unavailable. Eight Markdown files established the scenario, architecture, authorization matrix, threat hypotheses, decisions, roadmap, and finding/evidence requirements.

Documentation validation checked nonempty files, relative links, code fences, fourteen finding-record requirements, and H1–H3. No application tests existed at that stage. Mermaid diagrams were source-reviewed but not rendered.

These are historical observations, not the current project file count or tool inventory.

## Evidence standard

For each implemented scenario, record the command, date, tested revision, tool versions, fixture/reset instructions, active mode, exit status, relevant HTTP output, assertions, and state observations. Separate expected vulnerable failure, hardened success, and unexecuted checks. Use synthetic inputs and never publish real tokens or personal data.

No implemented vulnerability finding is claimed yet. The current tests establish a secure baseline; later attack/remediation scenarios require their own reproduction evidence.
