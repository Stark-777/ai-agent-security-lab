# Phase 6 — object authorization comparison

Date: 2026-11-15. Phase 5 committed/pushed as `de33114` before these changes. Phase 6 remains local for review.

## Reproduce and observed results

With Node 24.22.2 selected:

```sh
npm run check
npm run lab:bola
LAB_OBJECT_MODE=vulnerable npm run lab:bola
```

Observed: 95 tests passed in eight files, with formatting, lint, type checking, OpenAPI freshness, and build passing. Hardened replay exits 0. Vulnerable replay intentionally exits 1 after demonstrating foreign conversation read, unauthorized append, and foreign document retrieval. Captures: [hardened](bola-hardened.txt), [vulnerable](bola-vulnerable.txt). Only machine paths in exception stacks are normalized to `<project>`; random UUIDs/timestamps are observed fixture values, not stable expected constants.

## Isolation and scope

Mode is chosen through CLI startup only. The HTTP application supplies no vulnerable constructor option, environment switch, or request-controlled bypass. Both modes validate actor shape; retrieval retains classification filtering and bounds. There is no network listener, external target, real customer data, or cloud resource in the replay.

The same conversation class supplies both implementations; only the scope predicate is bypassed. Retrieval uses the same manifest and ranking logic; only tenant filtering differs. Tests inspect adapter input to prove that a foreign document crosses the model boundary in the vulnerable composition. They do not claim the current scripted adapter returns it to the caller. Full positive/negative HTTP tests continue verifying hardened behavior.

See [F002](../findings/F002-broken-object-authorization.md) for root causes, business impact, mappings, remediation, and limitations. No deliberately vulnerable customer-record tool is added: the conversation and retrieval paths provide concrete evidence without another redundant bypass.

Changed files: `src/conversations.ts`, `src/retrieval.ts`, `package.json`; added `scripts/bola-lab.ts`, `tests/bola.test.ts`, F002, this evidence record and captured outputs; updated maintained architecture/threat/policy/roadmap documents. No dependency changes and no HTTP contract changes.

Interview checkpoint: why must tests hold owner ID constant while changing tenant? Otherwise a correct ownership predicate could mask a missing tenant predicate. Also explain why model-context exposure matters even when the final answer does not currently echo the document.

Next exact task after review: Phase 7 sensitive-action confirmation, scoped execution, transaction/replay limits, and sensitive-data handling. Phase 6 has not been committed or pushed.
