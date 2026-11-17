# Phase 8 — DevSecOps controls

Date: 2026-11-16. Phase 7 was verified (106 tests) and published as `983c383` before this work. Phase 8 remains local, uncommitted.

Final local verification: `npm run check` exited 0 with 106 tests in nine files, formatting, lint, types, OpenAPI freshness and build passing. All three workflow/Dependabot YAML files plus the Semgrep configuration parsed with duplicate-key rejection enabled. Relative documentation links and `git diff --check` passed. Published Phase 7 CI succeeded: https://github.com/Stark-777/ai-agent-security-lab/actions/runs/43928694615.

## Observed checks

- Semgrep 1.136.0 installed in an external workspace-local Python 3.9 virtual environment. Local compatibility required a certificate-bundle environment override; initial certificate initialization failure was not counted as a scan pass. The environment emitted a LibreSSL warning. CI selects Python 3.11 explicitly.
- Rule tests: 2/2 passed. Both unsafe examples and safe nonmatch were checked. Application scan: 2 rules, 21 files, zero findings. [Raw report](semgrep-phase8.json). This is limited pattern coverage, not an authorization audit.
- Trivy 0.76.2 official macOS x64 archive SHA-256 matched its release checksum list. Filesystem secret scan exited 0 with no detected secrets. [Report](trivy-secrets-phase8.json). No deliberate detector-positive secret fixture was tested, and no history scan was performed.
- npm full audit: nine moderate entries, no high/critical. [Report](npm-audit-phase8.json). A separate fresh production-only query is not claimed; the workflow runs one independently when published.
- npm runtime CycloneDX SBOM generated successfully with 47 components. [Inventory](runtime-sbom.json).
- Local Docker is unavailable: image scan, image SBOM, and container security job are unexecuted. Local CodeQL is unavailable: analysis/upload is unexecuted. Phase 8 hosted workflow is unexecuted until publication.

The security workflow defines high/critical dependency and image gates, a secret gate, source pattern gates, rule tests, report artifact upload, and CodeQL analysis. Dependabot definitions propose weekly npm/Action updates. See [policy and limitations](../security-controls.md). These definitions do not themselves establish successful hosted execution or protected-branch enforcement.

Added `.github/workflows/security.yml`, `.github/dependabot.yml`, `security/semgrep.yml`, `security/semgrep.test.js`, control policy and evidence artifacts. Updated ignore/lint configuration for generated reports and detector fixtures. No application dependencies changed; application authorization regressions remain the primary checks for intentional lab vulnerabilities.

Next: publish and verify the Phase 8 workflow, investigate any actual findings, then Phase 9 final documentation/case-study reconciliation. Do not claim scanners verified code paths they cannot detect.
