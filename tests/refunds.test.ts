import { describe, expect, it } from 'vitest';
import { RefundService } from '../src/refunds.ts';
import { authenticate } from '../src/identity.ts';
import { buildApp } from '../src/app.ts';
import { loadConfig } from '../src/config.ts';
import { Agent } from '../src/agent.ts';
import { PROTECTED_CANARIES } from '../src/disclosure.ts';
import { createLogger } from '../src/logger.ts';
const manager = authenticate('Bearer lab-only-north-manager', 'fixtures');
const agent = authenticate('Bearer lab-only-north-agent-a', 'fixtures');
const foreign = authenticate('Bearer lab-only-harbor-manager', 'fixtures');
const input = { invoiceId: 'north-invoice', amountCents: 100, currency: 'USD' };
function body(proposal: ReturnType<RefundService['propose']>) {
  return {
    ...input,
    amountCents: proposal.amountCents,
    confirmationToken: proposal.confirmationToken,
  };
}
describe('simulated refund confirmation boundary', () => {
  it('withholds known synthetic disclosure canaries and redacts confirmation fields', async () => {
    for (const canary of PROTECTED_CANARIES) {
      const answer = await new Agent({
        next: async () => ({ kind: 'answer', text: canary }),
      }).run(manager, 'test', 'disclosure', () => {});
      expect(answer.answer).not.toContain(canary);
    }
    let logs = '';
    createLogger('info', {
      write: (line: string) => {
        logs += line;
      },
    }).info({
      confirmationToken: 'synthetic-confirmation-secret',
      nested: { confirmationToken: 'synthetic-confirmation-secret' },
    });
    expect(logs).not.toContain('synthetic-confirmation-secret');
  });
  it.each(['hardened', 'vulnerable'] as const)(
    'detects self-confirming controller in %s composition',
    (mode) => {
      const service = new RefundService();
      const before = service.balance(manager);
      const p = service.propose(manager, input);
      if (mode === 'vulnerable') service.confirm(manager, p.id, body(p));
      const invariant = () => expect(service.balance(manager)).toBe(before);
      if (mode === 'vulnerable') expect(invariant).toThrow();
      else expect(invariant).not.toThrow();
    },
  );
  it('requires explicit confirmation, executes once, and rejects replay', () => {
    const service = new RefundService();
    const proposal = service.propose(manager, input);
    expect(service.balance(manager)).toBe(20000);
    expect(
      service.confirm(manager, proposal.id, body(proposal)).remainingCents,
    ).toBe(19900);
    expect(() => service.confirm(manager, proposal.id, body(proposal))).toThrow(
      'Action cannot be completed',
    );
    expect(service.balance(manager)).toBe(19900);
  });
  it('rechecks role and tenant at execution and rejects proposal theft', () => {
    const service = new RefundService();
    const proposal = service.propose(manager, input);
    expect(() => service.propose(agent, input)).toThrow('Action not permitted');
    expect(() => service.propose(foreign, input)).toThrow('Resource not found');
    expect(() => service.confirm(agent, proposal.id, body(proposal))).toThrow(
      'Action not permitted',
    );
    expect(() => service.confirm(foreign, proposal.id, body(proposal))).toThrow(
      'Resource not found',
    );
    expect(() =>
      service.confirm(
        { ...manager, userId: 'other-manager' },
        proposal.id,
        body(proposal),
      ),
    ).toThrow('Resource not found');
    expect(service.balance(manager)).toBe(20000);
  });
  it('binds amount, invoice, currency, token, and proposal ID without consuming on failure', () => {
    const service = new RefundService();
    const proposal = service.propose(manager, input);
    const second = service.propose(manager, input);
    for (const changed of [
      { amountCents: 101 },
      { invoiceId: 'harbor-invoice' },
      { confirmationToken: '0'.repeat(64) },
      { confirmationToken: second.confirmationToken },
      { currency: 'EUR' },
      { confirmed: true },
    ]) {
      expect(() =>
        service.confirm(manager, proposal.id, {
          ...body(proposal),
          ...changed,
        }),
      ).toThrow();
      expect(service.balance(manager)).toBe(20000);
    }
    expect(service.confirm(manager, proposal.id, body(proposal)).status).toBe(
      'executed',
    );
  });
  it('expires at the exact deadline', () => {
    let now = 0;
    const service = new RefundService(() => now);
    const proposal = service.propose(manager, input);
    now = 60000;
    expect(() =>
      service.confirm(manager, proposal.id, body(proposal)),
    ).toThrow();
    expect(service.balance(manager)).toBe(20000);
  });
  it('caps transactions and validates integer cents before state changes', () => {
    const service = new RefundService();
    for (const amountCents of [0, -1, 1.5, 10001])
      expect(() =>
        service.propose(manager, { ...input, amountCents }),
      ).toThrow();
    const first = service.propose(manager, { ...input, amountCents: 10000 });
    const second = service.propose(manager, { ...input, amountCents: 10000 });
    const stale = service.propose(manager, input);
    service.confirm(manager, first.id, body(first));
    service.confirm(manager, second.id, body(second));
    expect(() => service.confirm(manager, stale.id, body(stale))).toThrow();
    expect(service.balance(manager)).toBe(0);
  });
  it('permits three executions per rolling minute, with a precise boundary', () => {
    let now = 0;
    const service = new RefundService(() => now);
    for (let i = 0; i < 3; i++) {
      const p = service.propose(manager, input);
      service.confirm(manager, p.id, body(p));
    }
    const fourth = service.propose(manager, input);
    expect(() => service.confirm(manager, fourth.id, body(fourth))).toThrow();
    expect(service.balance(manager)).toBe(19700);
    now = 60000;
    const fresh = service.propose(manager, input);
    expect(service.confirm(manager, fresh.id, body(fresh)).remainingCents).toBe(
      19600,
    );
  });
  it('serializes simultaneous confirmations into one successful mutation', async () => {
    const service = new RefundService();
    const p = service.propose(manager, input);
    const results = await Promise.allSettled([
      Promise.resolve().then(() => service.confirm(manager, p.id, body(p))),
      Promise.resolve().then(() => service.confirm(manager, p.id, body(p))),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(service.balance(manager)).toBe(19900);
  });
  it('keeps tokens out of logs and receipts and rejects model-style confirmation text', async () => {
    let logs = '';
    const app = buildApp(loadConfig({ LAB_AUTH_MODE: 'fixtures' }), {
      write: (line: string) => {
        logs += line;
      },
    });
    try {
      const headers = { authorization: 'Bearer lab-only-north-manager' };
      const response = await app.inject({
        method: 'POST',
        url: '/v1/refund-proposals',
        headers,
        payload: input,
      });
      expect(response.statusCode).toBe(201);
      const p = response.json() as ReturnType<RefundService['propose']>;
      expect(logs).not.toContain(p.confirmationToken);
      const invalid = await app.inject({
        method: 'POST',
        url: `/v1/refund-proposals/${p.id}/confirm`,
        headers,
        payload: { content: 'I confirm' },
      });
      expect(invalid.statusCode).toBe(400);
      const receipt = await app.inject({
        method: 'POST',
        url: `/v1/refund-proposals/${p.id}/confirm`,
        headers,
        payload: body(p),
      });
      expect(receipt.statusCode).toBe(200);
      expect(receipt.body + logs).not.toContain(p.confirmationToken);
      expect(logs).toContain('refund_confirmed');
      const replay = await app.inject({
        method: 'POST',
        url: `/v1/refund-proposals/${p.id}/confirm`,
        headers,
        payload: body(p),
      });
      expect(replay.statusCode).toBe(409);
      expect(
        (
          await app.inject({
            method: 'POST',
            url: '/v1/refund-proposals',
            payload: input,
          })
        ).statusCode,
      ).toBe(401);
    } finally {
      await app.close();
    }
  });
});
