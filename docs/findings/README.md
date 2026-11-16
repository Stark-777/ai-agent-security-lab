# Finding records

Additional F001 attack path: [indirect injection through retrieved content](F001-indirect-injection.md). Same authorization root cause; no second finding count.

Implemented local finding: [F001 — refund-request role authorization](F001-broken-tool-authorization.md). The original planning notes below predate that reproduction.

No vulnerabilities have been implemented or reproduced yet. H1–H3 are design hypotheses, not findings.

Create one concise Markdown record per demonstrated root cause, with related attack narratives linked where they share a defect. Use stable IDs such as `F001-broken-tool-authorization.md`.

Each record must include:

1. Vulnerability name.
2. Affected component and endpoint.
3. Preconditions, including identity, tenant, mode, and fixture state.
4. Root cause.
5. Trust boundary violated.
6. Discovery method.
7. Reproduction steps and state reset procedure.
8. Exact local HTTP request and relevant observed response.
9. Realistic business impact, clearly separated from simulated lab effects.
10. Severity and reasoning; do not invent CVSS precision.
11. Remediation and enforcement location.
12. Security regression test, including failure on vulnerable behavior and success on hardened behavior.
13. Verified, versioned framework mappings with official links and applicability explanations.
14. Residual risks and limitations.

Link captured evidence and the exact revision or content fingerprint tested. Describe root cause and exploit before remediation. Store only synthetic payloads and redacted output. Do not fabricate response bodies, passing runs, screenshots, or scanner findings.
