# Publication verification

Date: 2026-11-13. Scope: publish the completed Phases 0–2 as a public portfolio milestone, without adding later-phase features or implying that they exist.

## Review

The README now leads with the implemented authorization behavior, links claims to tests, and distinguishes the future AI-agent work. A case study describes the design rationale and evidence limits. The API walkthrough remains available separately. Machine-specific workspace paths were removed from public-facing documentation.

## Verification results

| Check                           | Observed result                                                                                                                                                        |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run check` on Node 24.22.2 | Exit 0: formatting, lint, type check, 70 tests in four files, OpenAPI freshness, and build passed                                                                      |
| `npm run smoke`                 | Exit 0: owner workflow succeeds, anonymous access is 401, foreign-manager access is 404, log canaries are excluded, and startup/shutdown checks pass                   |
| Online dependency audit         | Exit 1: nine moderate dependency entries, from the existing minimatch advisory; no high or critical entries. See [full report](npm-audit-publication.json)             |
| Online production-only audit    | Exit 0: zero reported advisories. See [runtime report](npm-audit-publication-production.json)                                                                          |
| Pre-publication content review  | No matching personal machine paths, common GitHub/AWS credential patterns, or private-key markers in publishable project files; documented synthetic fixtures retained |
| Local Docker                    | Unavailable; container execution not claimed verified locally                                                                                                          |
| Hosted GitHub Actions           | Not run at initial commit; check the repository Actions tab for subsequent runs                                                                                        |

The content review was a targeted pattern and file review, not a dedicated secret-scanning product or a guarantee that no secret exists. Dependency results are point-in-time package advisory checks, not application penetration tests. The development-only advisory exception remains documented in D12. Dependency versions were not changed during publication preparation.

The initial commit captures the existing milestone and its documentation together. It does not reconstruct a fictional earlier commit history. The repository-local commit identity uses the account's GitHub no-reply address.

## Interpretation

Local checks, dependency-advisory queries, and GitHub-hosted CI are different evidence. Docker is not available in the local environment. CI must actually run before claiming its container checks passed. Historical Phase 1 and Phase 2 records retain their original dates and scope.
