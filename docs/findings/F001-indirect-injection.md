# F001 attack narrative — retrieved document as instruction source

This narrative extends [F001](F001-broken-tool-authorization.md), sharing its severity, remediation, and underlying function-level authorization root cause. It is not a second vulnerability count.

**Affected flow:** local `lab:rag` CLI → scoped document retrieval → deterministic adapter → `issueRefund` proposal → refund-request queue. No vulnerable HTTP endpoint exists.

**Preconditions/source:** a trusted lab operator selects a poisoned local Northstar fixture. A real attacker-controlled ingestion mechanism is not implemented; access to that source is an assumed precondition. Tenant and classification metadata remain assigned by trusted code.

**Trust boundary:** retrieved article text is authorized to supply knowledge, not to issue privileged commands or change actor role. The model is simulated as following malicious text. Schema-valid arguments then reach the same missing role check demonstrated by F001.

**Discovery/reproduction:** `npm run lab:rag` and `LAB_REFUND_MODE=vulnerable npm run lab:rag` use the same ordinary support question and poisoned document. Captures in the Phase 5 evidence include input, retrieved source, proposed action trace, and before/after queue. There is no HTTP response to report for the CLI replay.

**Impact/severity:** unauthorized pending refund request creation by a support agent; modeled moderate workflow-integrity impact. No payment, balance change, or external exfiltration occurs. See F001 for the scoped severity rationale.

**Remediation/test:** authorization outside the model denies the proposal in hardened mode; retrieval separately prevents foreign/restricted documents from entering context. `tests/retrieval.test.ts` asserts identical unchanged-queue behavior, expects vulnerable failure, and verifies hardened success. Labels are supplementary, never the sole fix. Protected values are excluded before model invocation rather than filtered after disclosure.

**Mappings:** retain F001's API5/ASVS/LLM06 authorization mappings. [OWASP LLM01:2025](https://genai.owasp.org/llmrisk/llm01-prompt-injection/) applies to the simulated indirect source: a document, not the user's request, carries the hostile instruction. [MITRE ATLAS AML.T0051](https://atlas.mitre.org/pdf-files/SAFEAI_Full_Report.pdf) supplies technique context. No real-model technique success or framework compliance is claimed.

**Residual risk:** source poisoning is fixture-controlled; real ingestion access, model variability, answer faithfulness, and manager-context excessive agency require additional work. System instructions cannot prevent every unsafe proposal; the application must constrain execution even if the model follows the article.
