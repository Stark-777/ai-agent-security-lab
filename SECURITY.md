# Security scope

This is a local AppSec learning lab using synthetic data. It is not a production service. The current milestone implements a secure conversation-authorization baseline; deliberately vulnerable scenarios are planned but not present yet.

`lab-only-*` tokens are intentionally public fixture values, enabled only by `LAB_AUTH_MODE=fixtures`. They must never be used for real identities. Never add real credentials, customer data, or payment integrations to the lab.

## Reporting issues

For a reproducible defect in this synthetic lab, open a GitHub issue with the affected revision, local reproduction steps, expected behavior, and observed behavior. Use synthetic inputs and redact incidental personal information. Do not post actual tokens or credentials from unrelated systems.

Known limitations and dated dependency-audit results are documented in the [README](README.md), [decisions](DECISIONS.md), and [evidence register](docs/evidence/README.md). A planned vulnerability is not an excuse for an undocumented bypass in the hardened baseline.

No security response SLA or production-support commitment is offered. Do not test this code against third-party systems without authorization.
