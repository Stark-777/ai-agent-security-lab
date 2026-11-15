import assert from 'node:assert/strict';
import { describe, expect, it } from 'vitest';
import {
  Agent,
  DeterministicModel,
  INJECTION_FIXTURE,
  ToolRegistry,
} from '../src/agent.ts';
import { RefundRequestLab } from '../src/refund-lab.ts';
import { authenticate } from '../src/identity.ts';

const actor = authenticate('Bearer lab-only-north-agent-a', 'fixtures');
const manager = authenticate('Bearer lab-only-north-manager', 'fixtures');
const input = { invoiceId: 'north-invoice', amountCents: 100 };
describe('F001 refund-request role authorization', () => {
  it.each(['hardened', 'vulnerable'] as const)(
    'replays identical model proposal in %s mode',
    async (mode) => {
      const lab = new RefundRequestLab(mode);
      const before = lab.snapshot(actor);
      const result = await new Agent(
        new DeterministicModel(),
        new ToolRegistry(lab),
      ).run(actor, INJECTION_FIXTURE, 'fixture', () => {});
      const invariant = () => assert.deepEqual(lab.snapshot(actor), before);
      if (mode === 'vulnerable') {
        expect(invariant).toThrow();
        expect(lab.snapshot(actor)).toHaveLength(1);
      } else {
        expect(invariant).not.toThrow();
        expect(result.trace[0]?.outcome).toBe('denied');
      }
    },
  );
  it.each(['hardened', 'vulnerable'] as const)(
    'preserves tenant/schema boundaries in %s',
    (mode) => {
      const lab = new RefundRequestLab(mode);
      expect(
        lab.request(manager, { ...input, invoiceId: 'harbor-invoice' }).outcome,
      ).toBe('not_found');
      expect(() =>
        lab.request(manager, { ...input, amountCents: -1 }),
      ).toThrow();
      expect(lab.snapshot(manager)).toHaveLength(0);
      expect(lab.request(manager, input).outcome).toBe('confirmation_required');
      expect(lab.snapshot(manager)).toHaveLength(1);
    },
  );
  it('defaults hardened and isolates disposable instances', () => {
    const first = new RefundRequestLab();
    expect(first.request(actor, input).outcome).toBe('denied');
    first.request(manager, input);
    expect(new RefundRequestLab().snapshot(manager)).toHaveLength(0);
  });
});
