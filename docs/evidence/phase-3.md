# Phase 3: deterministic agent baseline

Date: 2026-11-14. Implementation is local and has not been committed or pushed as part of this phase.

## Behavior and reproduction

After `npm run check`, run `LAB_AUTH_MODE=fixtures npm start`. Create a conversation using the README walkthrough, then call its agent endpoint with the owner's fixture token:

```sh
curl -i "http://127.0.0.1:3000/v1/conversations/$conversation_id/agent" \
  -H 'Authorization: Bearer lab-only-north-agent-a' \
  -H 'Content-Type: application/json' \
  -d '{"content":"/customer north-customer"}'
```

Expected: 200 with a deterministic answer and trace containing `getCustomerRecord` / `allowed`. `/customer harbor-customer` yields `not_found`; `/document north-restricted` also yields `not_found`. `/refund north-invoice 100` yields `denied` for a support agent. A manager using their own conversation receives `confirmation_required`, with no ledger mutation. An inaccessible conversation returns 404 before model invocation.

The agent endpoint is an explicit preview operation: it does not persist the prompt, answer, trace, or tool result into conversation history. Existing message append behavior remains intact. Tool data is passed to the adapter but the scripted adapter returns a generic completion message; the public response contains no raw tool arguments or results. This provides an execution-boundary baseline rather than useful language understanding.

## Enforcement and limitations

`ModelAdapter.next` returns `unknown`. Zod validates answers and the three discriminated tool/argument schemas before execution. No model output can set actor, tenant, or role. The registry validates the actor and scopes customer/document lookups to its tenant; restricted documents remain excluded. Refund role policy is enforced outside the model. No refund mutation capability exists until confirmation controls are implemented.

The orchestrator permits three tool calls and at most four model invocations, with a two-second overall asynchronous deadline and an abort signal. A noncooperative adapter may continue work after timeout; CPU-bound synchronous code cannot be preempted by this timer. Future network adapters must honor cancellation and independently bound response sizes. Model answers are untrusted plain JSON text; no HTML rendering is provided.

Audit events contain request ID, actor ID, tenant, step, known tool name, and outcome. Prompts, tool arguments, results, tokens, and raw exceptions are omitted. Invalid model output produces generic 502 `AGENT_FAILED`; it cannot inject arbitrary audit tool names. Operational request/error events still provide correlation on failures. Audit output is not durable or tamper-resistant.

These are deterministic enforcement tests, not probabilistic model evaluations or proof of real-model prompt-injection susceptibility. No vulnerable bypass, poisoned retrieval, or real LLM was introduced.

## Verification and changed files

`npm run check` passed on Node 24.22.2: formatting, lint, type checking, 80 tests in five files, OpenAPI freshness, and build. Tests include the agent endpoint through Fastify injection; the existing live smoke script covers the compiled foundation and conversation workflow rather than the new agent endpoint. Added `src/agent.ts` and `tests/agent.test.ts`; updated protected conversation routes, error contracts, OpenAPI generation/output, and the maintained documentation. No dependencies changed. Historical hosted CI results apply to the published Phase 2 revision, not these unpushed changes.

Next: Phase 4 broken tool authorization laboratory, with a controlled vulnerable dispatcher, shared failing/passing invariant, attack narrative, and finding record. Explain why a syntactically valid tool proposal still requires authorization before starting that phase.
