# Security control policy

Phase 8 adds `.github/workflows/security.yml`, separate from the functional/security regression workflow. It triggers on push, pull request, and manual dispatch; no scheduled recurring job is enabled. These are workflow definitions until published and run.

| Control              | Policy                                                                                                             | What it cannot establish                                                                                |
| -------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| npm audit            | Runtime and full-tree gates fail at high/critical; moderate entries remain reported                                | Application reachability, exploitability, or absence of unpublished vulnerabilities                     |
| Semgrep 1.136.0      | Two local rules gate dynamic eval and direct request body/header/query logging; strict scan errors fail            | BOLA, authorization completeness, obfuscated logging, or universal secret detection                     |
| CodeQL v4            | JavaScript/TypeScript analysis uploads SARIF to code scanning; job failure blocks successful workflow              | Alert-free status merely from a successful upload; alert triage and repository merge rules are separate |
| Trivy 0.76.2 secrets | Scan working tree excluding generated dependencies/build and Git internals; any detected secret fails              | Full Git history, arbitrary unknown secret formats, or proof no secret exists                           |
| Trivy image          | Build image from current SHA; high/critical vulnerability or secret findings fail; no `ignore-unfixed` suppression | Exploitability or runtime authorization guarantees                                                      |
| SBOM                 | npm CycloneDX runtime inventory and Trivy image CycloneDX artifacts                                                | Security certification, complete provenance, or future advisory status                                  |
| Dependabot           | Weekly npm and Actions update proposals; five open PRs per ecosystem                                               | Automatic correctness of proposed upgrades                                                              |

## Intentional vulnerable code and false positives

Do not blanket-exclude `src/`, vulnerable repository compositions, or CLI replay code. Semgrep scans `src` and `scripts`; CodeQL sees the repository. The Semgrep detector unit-test file is outside application scan targets and is excluded from ESLint because it intentionally invokes eval; it is run by Semgrep's own test runner.

The two focused Semgrep rules are not expected to detect F001–F003. Those defects are captured by shared failing/passing behavioral invariants, not mislabeled as SAST detections. Synthetic `lab-only-*` identity tokens are documented public fixtures, not production credentials. No broad secret allowlist is configured. Any scanner flag on a synthetic value must be reviewed and, if needed, suppressed only with exact rule/path/value scope and a documented rationale.

For a new finding, record scanner/version, rule/advisory ID, affected revision, data/control flow, real or synthetic exposure, remediation or narrow exception, owner, and review date. Preserve the raw report. Never add `continue-on-error`, `|| true`, or broad source exclusions simply to obtain green CI.

The existing D12 development dependency exception remains: nine moderate dependency entries in the 2026-11-16 full audit, with no high/critical entries. This threshold does not mean moderate findings are safe. Review before external contributions and in the final portfolio review; upgrade when compatible dependencies include the fix. No npm audit forced downgrade was applied.

## Reports and supply chain

Reports are uploaded for 14 days even on failed jobs; inspect the Actions artifacts. CodeQL findings appear separately in the Security tab. Generated `reports/` is ignored locally. GitHub Actions are pinned to official commit hashes; Trivy archives are checked against the checksum list from the same official release. This is integrity checking over the release transport, not independent signature/provenance verification. Semgrep's top-level version is pinned but its Python transitive tree is not hash-locked. Container base images remain version-tag pinned, not digest pinned.

No branch protection, required checks, secret-scanning account settings, or GitHub security policy was silently enabled. A failing workflow is visible, but merge prevention requires explicit repository rules. Fork token restrictions may prevent CodeQL uploads; do not grant untrusted workflows privileged secrets to work around that.

## Local execution

Use Python 3.11 and a dedicated virtual environment for Semgrep, and the official checksum-verified Trivy 0.76.2 binary. Example commands from the project root:

```sh
semgrep --test --config security/semgrep.yml security/semgrep.test.js
semgrep scan --config security/semgrep.yml --metrics=off --error --strict src scripts
npm audit --omit=dev --audit-level=high
npm audit --audit-level=high
npm sbom --sbom-format cyclonedx --omit=dev > runtime.cdx.json
trivy fs --scanners secret --skip-dirs node_modules,dist,.git --exit-code 1 .
```

Docker-dependent commands and exact artifact outputs are in the workflow. Secret scan reports may contain match details: review before sharing any report from a real repository. This lab uses synthetic data.
