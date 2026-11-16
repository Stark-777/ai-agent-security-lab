import assert from 'node:assert/strict';
import { describe, expect, it, vi } from 'vitest';
import { ConversationRepository } from '../src/conversations.ts';
import { DocumentRepository } from '../src/retrieval.ts';
import { authenticate, localIdentities } from '../src/identity.ts';
import { Agent } from '../src/agent.ts';
import type { ModelInput } from '../src/agent.ts';

const actors = localIdentities.map((identity) =>
  authenticate(`Bearer ${identity.token}`, 'fixtures'),
);
describe('F002 object-authorization comparison', () => {
  it.each(['hardened', 'vulnerable'] as const)(
    'checks every caller/owner pair in %s mode',
    (mode) => {
      for (const owner of actors)
        for (const caller of actors) {
          const repository = new ConversationRepository(mode);
          const record = repository.create(owner, {
            title: 'synthetic-private-case',
          });
          const permitted =
            mode === 'vulnerable' || owner.userId === caller.userId;
          if (permitted) {
            expect(repository.read(caller, record.id).ownerId).toBe(
              owner.userId,
            );
            repository.append(caller, record.id, { content: 'attempt' });
          } else {
            expect(() => repository.read(caller, record.id)).toThrow(
              'Resource not found',
            );
            expect(() =>
              repository.append(caller, record.id, { content: 'attempt' }),
            ).toThrow('Resource not found');
          }
          expect(repository.read(owner, record.id).messages).toHaveLength(
            permitted ? 1 : 0,
          );
        }
    },
  );
  it.each(['hardened', 'vulnerable'] as const)(
    'applies the identical cross-tenant invariant to %s',
    async (mode) => {
      const caller = actors[0]!;
      const repository = new ConversationRepository(mode);
      const record = repository.create(actors[3]!, { title: 'foreign' });
      const denied = () =>
        assert.throws(
          () => repository.read(caller, record.id),
          /Resource not found/,
        );
      if (mode === 'hardened') expect(denied).not.toThrow();
      else expect(denied).toThrow();
      let context: ModelInput | undefined;
      await new Agent(
        {
          next: async (input) => {
            context = input;
            return { kind: 'answer', text: 'fixture' };
          },
        },
        undefined,
        new DocumentRepository(false, mode),
      ).run(caller, 'subscription', 'test', vi.fn());
      const contextInvariant = () =>
        assert(!JSON.stringify(context).includes('synthetic-harbor-canary'));
      if (mode === 'hardened') expect(contextInvariant).not.toThrow();
      else expect(contextInvariant).toThrow();
      expect(JSON.stringify(context)).not.toContain(
        'synthetic-restricted-canary',
      );
    },
  );
  it('independently enforces tenant even when owner identifiers match', () => {
    const repository = new ConversationRepository();
    const actor = actors[0]!;
    const record = repository.create(actor, { title: 'private' });
    expect(() =>
      repository.read({ ...actor, tenantId: 'harbor' }, record.id),
    ).toThrow('Resource not found');
    expect(() =>
      repository.append({ ...actor, tenantId: 'harbor' }, record.id, {
        content: 'attempt',
      }),
    ).toThrow('Resource not found');
    expect(repository.read(actor, record.id).messages).toHaveLength(0);
  });
});
