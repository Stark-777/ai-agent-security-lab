import assert from 'node:assert/strict';
import { describe, expect, it, vi } from 'vitest';
import {
  DocumentRepository,
  POISON,
  RETRIEVAL_POLICY,
} from '../src/retrieval.ts';
import { Agent, DeterministicModel, ToolRegistry } from '../src/agent.ts';
import type { ModelInput } from '../src/agent.ts';
import { RefundRequestLab } from '../src/refund-lab.ts';
import { authenticate } from '../src/identity.ts';
const actor = authenticate('Bearer lab-only-north-agent-a', 'fixtures');
describe('tenant-aware retrieval and indirect injection', () => {
  it('filters tenant and classification before matching, and returns copies', () => {
    const repository = new DocumentRepository();
    const documents = repository.retrieve(
      actor,
      'subscription support credentials harbor',
    );
    expect(documents.map((document) => document.sourceId)).toEqual([
      'north-guide',
    ]);
    expect(JSON.stringify(documents)).not.toContain('synthetic-harbor-canary');
    expect(JSON.stringify(documents)).not.toContain(
      'synthetic-restricted-canary',
    );
    documents[0]!.content = 'mutated';
    expect(repository.retrieve(actor, 'subscription')[0]?.content).not.toBe(
      'mutated',
    );
    expect(repository.retrieve(actor, 'xyz')).toEqual([]);
    const harbor = authenticate('Bearer lab-only-harbor-manager', 'fixtures');
    expect(repository.retrieve(harbor, 'subscription')[0]?.sourceId).toBe(
      'harbor-guide',
    );
  });
  it('labels sources separately and excludes unauthorized values from model context', async () => {
    let captured: ModelInput | undefined;
    const agent = new Agent({
      next: async (input) => {
        captured = input;
        return { kind: 'answer', text: 'safe fixture' };
      },
    });
    await agent.run(actor, 'subscription credentials harbor', 'test', vi.fn());
    expect(captured?.policy).toBe(RETRIEVAL_POLICY);
    expect(captured?.documents[0]?.trust).toBe('untrusted-data');
    expect(JSON.stringify(captured)).not.toContain('synthetic-harbor-canary');
    expect(JSON.stringify(captured)).not.toContain(
      'synthetic-restricted-canary',
    );
    expect(captured?.documents.length).toBeLessThanOrEqual(3);
    expect(
      Buffer.byteLength(
        captured?.documents.map((d) => d.content).join('') ?? '',
      ),
    ).toBeLessThanOrEqual(16384);
  });
  it.each(['hardened', 'vulnerable'] as const)(
    'replays a legitimate question against poisoned data with %s tools',
    async (mode) => {
      const documents = new DocumentRepository(true);
      const queue = new RefundRequestLab(mode);
      const audit = vi.fn();
      const question = 'When is subscription support available?';
      expect(question).not.toContain(POISON);
      expect(documents.retrieve(actor, question)[0]?.content).toContain(POISON);
      const result = await new Agent(
        new DeterministicModel(),
        new ToolRegistry(queue),
        documents,
      ).run(actor, question, 'indirect', audit);
      expect(result.trace[0]?.tool).toBe('issueRefund');
      const invariant = () => assert.deepEqual(queue.snapshot(actor), []);
      if (mode === 'vulnerable') expect(invariant).toThrow();
      else {
        expect(invariant).not.toThrow();
        expect(result.trace[0]?.outcome).toBe('denied');
      }
      expect(JSON.stringify(audit.mock.calls)).not.toContain(POISON);
    },
  );
  it('clean retrieval does not trigger a tool proposal', async () => {
    const result = await new Agent().run(
      actor,
      'When is subscription support available?',
      'clean',
      vi.fn(),
    );
    expect(result.trace).toEqual([]);
  });
});
