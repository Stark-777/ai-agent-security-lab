# Interview discussion notes

1. Trace a request from token to object access. Authentication identifies the fixture actor; tenant membership and manager role do not establish conversation ownership.
2. Explain why checking both tenant and owner matters. A test changing both at once may pass solely because of owner enforcement; hold one predicate constant to exercise the other.
3. Explain the model boundary. TypeScript types do not validate runtime output. Zod checks shape; role and object policies decide permission; neither is delegated to model text.
4. Explain indirect injection containment. Authorized retrieval can contain malicious instructions. Labels support context organization, while independent tool controls must hold even if the model ignores labels.
5. Explain impact accurately. F001 creates an unauthorized pending request; it does not transfer money. F002 reaches foreign model context but does not prove final-answer exfiltration. F003 mutates a synthetic ledger.
6. Explain confirmation. A random one-use token binds an exact transaction but cannot prove human cognition. Keep the model from obtaining or redeeming it; same-user confirmation differs from independent approval.
7. Explain atomicity. Synchronous check/update prevents an await race in one process. Multiple workers, restarts, and durable money movement need transactional storage and persistent idempotency.
8. Explain scanner evidence. A Semgrep rule positive test establishes narrow signal. Zero matches do not prove authorization. CodeQL upload success does not mean no alerts; SBOM generation is inventory.
9. Explain local isolation. Vulnerable CLI compositions open no listener. Native HTTP uses loopback; Compose publishes loopback but permits outbound traffic.
10. Explain AI assistance honestly. Be able to derive the policy and predict test outcomes without relying on generated explanations. Do not claim production discoveries or real-model attack rates.

Demonstration sequence: run `npm run check`, one hardened replay, then its vulnerable counterpart. Explain the nonzero exit as the shared security assertion detecting the intentional defect. Show the finding and code enforcement together.
