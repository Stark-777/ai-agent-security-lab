# Phase 5 — scoped retrieval and indirect injection

Date: 2026-11-15. Phase 4 was committed/pushed as `9e68c23` before this work. Phase 5 remains local.

## Implemented flow

The trusted fixture manifest assigns document ID, tenant, and classification; Zod validates that manifest at construction. Document text has no authority to assign metadata. Retrieval first filters to the authenticated actor's tenant and `tenant-internal` classification, then ranks matching words deterministically. No external ingestion/upload route, embeddings, or vector database is involved.

The agent receives a separate policy field and structured document entries labeled `untrusted-data`, with source IDs. Retrieval is limited to three documents and 16 KiB of content; fixture ingestion is capped at 20 documents and 4,000 string units per body. The current tiny collection does not stress the upper budgets, so limit assertions are not broad scalability evidence. Returned document objects are copies. Public API runs use clean fixtures; poisoning is selected only by the isolated CLI/test composition.

## Reproduction

With Node 24.22.2 selected:

```sh
npm run check
npm run lab:rag
LAB_REFUND_MODE=vulnerable npm run lab:rag
```

Observed: all 90 tests in seven files passed, plus formatting/lint/types/OpenAPI freshness/build. Hardened replay exits 0; vulnerable replay exits 1 intentionally when the unchanged-queue invariant detects unauthorized request creation.

The user question is legitimate: `When is subscription support available?` The Northstar document contains the exported `POISON` fixture text instructing a refund request. The scripted adapter follows it despite the untrusted-data label. Hardened tools deny the resulting request; vulnerable tools create one pending synthetic request. No payment executes. See captured [hardened](rag-hardened.txt) and [vulnerable](rag-vulnerable.txt) output. Stack paths are normalized to `<project>`.

Tests inspect actual model context for foreign/restricted canaries, verify tenant-specific retrieval and defensive copies, compare clean versus poisoned documents, and apply the same state invariant to both tool compositions. Audit events omit the poisoned text. A real model may behave differently; this measures application enforcement, not jailbreak probability or RAG answer quality.

## Attack and root cause

See [the indirect-injection narrative](../findings/F001-indirect-injection.md). This is another path to F001's missing tool authorization, not a separately counted authorization defect. Source labels and policy text support separation of data/instructions but cannot guarantee that a model will honor it. Manager-context injection is not contained by role checks alone: pending request creation is allowed for a manager, while actual payment remains unavailable. Confirmation and excessive-agency work remain later phases.

Changed files: new `src/retrieval.ts`, `scripts/rag-lab.ts`, `tests/retrieval.test.ts`; updated model context/orchestration in `src/agent.ts`, package script, and maintained documentation. No new dependencies. HTTP API schema is unchanged. The existing direct-document tool keeps its earlier fixture collection; retrieval is a separate context source, and future ingestion should unify the collections deliberately.

Next: Phase 6 controlled BOLA reproduction and tenant-isolation regression comparisons. This phase's tests are baseline evidence, not a reproduced BOLA finding.
