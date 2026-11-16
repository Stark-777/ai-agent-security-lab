# F003 — Controller self-confirmation bypasses user intent

1. **Name:** excessive agency through automatic self-confirmation.
2. **Component/entry:** isolated `scripts/agency-lab.ts`; no vulnerable HTTP endpoint. Hardened API endpoints are `/v1/refund-proposals` and `/v1/refund-proposals/:id/confirm`.
3. **Preconditions:** local synthetic manager actor and explicit `LAB_AGENCY_MODE=vulnerable` startup. The unsafe controller has both proposal and confirmation capabilities.
4. **Root cause:** controller interprets its own proposed action as approval and immediately submits the returned token. Valid authorization and a cryptographic token alone do not establish user intent.
5. **Trust boundary:** model/controller intent crosses into a consequential mutation without a separate user decision.
6. **Discovery:** constructed controller comparison and balance invariant; not a production discovery.
7. **Reproduction:** `npm run lab:agency` exits 0 with balance unchanged. `LAB_AGENCY_MODE=vulnerable npm run lab:agency` exits 1 when balance drops by 100 cents without explicit confirmation. Every run starts fresh.
8. **Requests/results:** local calls are propose(manager, north-invoice, 100 USD cents), followed only in vulnerable mode by confirm with the returned token. Before 20000; hardened after 20000, vulnerable after 19900. No external payment moves. Actual HTTP positive/replay behavior is covered by `tests/refunds.test.ts`; no vulnerable HTTP response is invented.
9. **Impact:** modeled unintended authorized refund. Actual impact is 100 synthetic cents in a disposable process.
10. **Severity:** moderate modeled integrity impact, bounded by transaction limits and authorized manager scope. Actual local exposure is low. No deployment CVSS is asserted.
11. **Remediation:** separate user confirmation route, exact transaction binding, short expiry, one-use tokens, execution-time role/tenant checks, balance/cap/rate limits. Do not provide confirmation capability or tokens to the model. The hardened ToolRegistry has no reference to RefundService.
12. **Regression:** shared unchanged-balance invariant fails for unsafe controller and passes for hardened flow. Service tests prove allowed confirmation works and altered, expired, stolen, replayed, or over-limit requests cannot mutate state.
13. **Mappings:** OWASP LLM06:2025 Excessive Agency applies to automatic consequential execution (https://genai.owasp.org/llmrisk/llm062025-excessive-agency/). No API5 mapping is added because the manager has legitimate function permission; the defect concerns intent and autonomy. This synthetic controller is not evidence of an ATLAS model attack. Full ASVS/agentic conformance is not claimed.
14. **Residual risk:** same-user confirmation is not separation of duties; authorized compromised clients can confirm. In-memory replay state is neither restart-safe nor distributed. Synthetic canary checks are not a comprehensive disclosure remedy. Sensitive-data tests extend prior context/log controls rather than claim an independent reproduced secret-exfiltration vulnerability.
