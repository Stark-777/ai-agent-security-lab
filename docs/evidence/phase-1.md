# Phase 1 foundation evidence

Date: 2026-11-01 (America/Denver). Historical Phase 1 record: no Git repository existed at the time. See [publication verification](publication.md) for subsequent checks.

## Runtime and installation

System Node remains 25.8.0. Verification uses the official Node **24.22.2** macOS x64 archive extracted into the workspace `work/` directory, outside the project deliverable. SHA-256 matched the official checksum list:

```text
d5e336d588c45be0c37dbd52cc29895593009ca4997a77a1fd02815131ed0e52
```

Official sources: [Node archive](https://nodejs.org/dist/v24.22.2/) and [checksums](https://nodejs.org/dist/v24.22.2/SHASUMS256.txt). System software and shell startup files were not modified.

With Node 24.22.2 already selected, the verification commands were:

```sh
node --version
npm ci --ignore-scripts
npm run check
npm start
```

Expected runtime output: `v24.22.2`. Other machines should provision the version in `.nvmrc` through their normal Node installation/version manager; the workspace runtime is not part of the repository.

The repository does not bundle a Node runtime. Use the pinned version through your normal installation or version manager.

## Verification results

All commands below used Node 24.22.2 and its bundled npm 11.19.1.

| Check                                                               | Observed result                                                                                                                     |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `npm ci --ignore-scripts --offline --cache <local-cache-directory>` | Exit 0; clean lockfile installation, 184 packages added from the populated local cache                                              |
| `npm run check`                                                     | Exit 0: Prettier, ESLint, TypeScript, Vitest, OpenAPI freshness, and compilation passed                                             |
| Vitest                                                              | 2 files passed; 21 tests passed; no Fastify deprecation warning after migration to `LogController`                                  |
| `npm run smoke`                                                     | Exit 0 with local socket permission; compiled server returned health 200 and invalid-query 400, omitted canary, exited 0 on SIGTERM |
| Invalid configuration in smoke test                                 | Child process exited 1 with generic `startup_failed`, without the supplied canary                                                   |
| Online `npm audit --json`                                           | Exit 1; 11 moderate dependency entries from one underlying minimatch advisory; captured in [full audit](npm-audit.json)             |
| Online `npm audit --omit=dev --json`                                | Exit 0; zero reported runtime dependency advisories; captured in [production audit](npm-audit-production.json)                      |

The first `npm ci` attempt preceded lockfile creation and correctly failed; `npm install --ignore-scripts` generated the lockfile, followed by the successful clean install above. The first type check caught a logger option incorrectly set to `undefined`; it was corrected to the supported `null` value. An initial ESLint 9 deprecation prompted selection of supported ESLint 10.14.0. The loopback smoke test was initially prevented from opening a socket by the execution environment; it passed when rerun with that permission. None of these initial failures is counted as a passing check.

The offline install's summary printed zero vulnerabilities without a fresh online audit. That summary is not used as security evidence; the separately captured online reports above are authoritative for this run. See D12 for the development-only advisory exception and follow-up condition. No forced dependency downgrade was applied.

Observed smoke output:

```text
PASS: compiled server binds loopback; health 200; invalid query 400; no canary leak; SIGTERM exits 0.
PASS: invalid configuration exits 1 without exposing the supplied value.
```

## Changed files

- Application: `src/app.ts`, `src/server.ts`, `src/config.ts`, `src/contracts.ts`, `src/validation.ts`, `src/logger.ts`.
- Verification: `tests/app.test.ts`, `tests/config.test.ts`, `vitest.config.ts`, `scripts/smoke.ts`, `scripts/openapi.ts`, generated `docs/openapi.json`.
- Tooling: `package.json`, generated `package-lock.json`, `tsconfig.json`, `tsconfig.build.json`, `eslint.config.js`, `.prettierrc.json`, `.prettierignore`, `.npmrc`, `.nvmrc`, `.node-version`, `.gitignore`, `.env.example`.
- Container/CI: `Dockerfile`, `.dockerignore`, `compose.yaml`, `.github/workflows/ci.yml`.
- Documentation/evidence: updated README, roadmap, decisions, architecture, threat model, evidence index; added this record and two audit reports. Prettier also aligned the existing authorization matrix table without changing its policy.

## Boundaries and limitations

- No Docker executable is available on the command path. Docker build, Compose networking, non-root/read-only execution, and container health checks have not run locally.
- A GitHub Actions workflow is authored, not executed. No repository was initialized, committed, pushed, or published.
- OpenAPI freshness is checked against shared schemas; no independent conformance validator is installed.
- No dedicated security scanner, SAST, SBOM, or container scan was run as part of this phase unless separately recorded above. These remain later roadmap items.
- The tests use synthetic canaries. Redaction is not a universal secret detector; logging unreviewed free text would bypass the intended policy.

## Review checkpoint

Explain why valid JSON is not necessarily a valid request; why validation is not authorization; why redacting `authorization` alone would miss secrets in query strings or error messages; and why a health response says nothing about tenant isolation. Next exact implementation task, after Phase 1 review: Phase 2 identity fixtures and server-derived actor context, followed by scoped repository and conversation ownership tests.
