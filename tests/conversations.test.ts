import { describe, expect, it } from 'vitest';
import {
  ConversationRepository,
  MAX_CONVERSATIONS_PER_ACTOR,
  MAX_MESSAGES_PER_CONVERSATION,
} from '../src/conversations.ts';
import { authenticate } from '../src/identity.ts';
import type { Actor } from '../src/identity.ts';

const owner = authenticate('Bearer lab-only-north-agent-a', 'fixtures');
describe('repository enforcement independent of HTTP', () => {
  it('checks tenant independently of owner ID and denies a same-tenant non-owner', () => {
    const repository = new ConversationRepository();
    const conversation = repository.create(owner, { title: 'private' });
    for (const caller of [
      { ...owner, tenantId: 'harbor' as const },
      { ...owner, userId: 'north-agent-b' },
    ]) {
      expect(() => repository.read(caller, conversation.id)).toThrow(
        'Resource not found',
      );
      expect(() =>
        repository.append(caller, conversation.id, { content: 'injected' }),
      ).toThrow('Resource not found');
    }
    expect(repository.read(owner, conversation.id).messages).toHaveLength(0);
  });
  it('fails closed for an unknown role, missing actor, or unknown tenant', () => {
    const repository = new ConversationRepository();
    const conversation = repository.create(owner, { title: 'private' });
    for (const invalid of [
      { ...owner, role: 'admin' },
      { ...owner, tenantId: 'unknown' },
      undefined,
    ]) {
      const caller = invalid as unknown as Actor; // Deliberately bypass compile-time types at the boundary.
      expect(() => repository.create(caller, { title: 'bad' })).toThrow(
        'Action not permitted',
      );
      expect(() => repository.read(caller, conversation.id)).toThrow(
        'Action not permitted',
      );
      expect(() =>
        repository.append(caller, conversation.id, { content: 'bad' }),
      ).toThrow('Action not permitted');
    }
    expect(repository.read(owner, conversation.id).messages).toHaveLength(0);
  });
  it('returns copies so consumers cannot change ownership or stored messages', () => {
    const repository = new ConversationRepository();
    const created = repository.create(owner, { title: 'private' });
    created.ownerId = 'north-agent-b';
    const message = repository.append(owner, created.id, {
      content: 'original',
    });
    message.content = 'mutated';
    const read = repository.read(owner, created.id);
    read.messages.length = 0;
    const actual = repository.read(owner, created.id);
    expect(actual.ownerId).toBe(owner.userId);
    expect(actual.messages[0]?.content).toBe('original');
  });
  it('validates direct writes and never accepts caller-supplied message roles', () => {
    const repository = new ConversationRepository();
    expect(() =>
      repository.create(owner, { title: 'test', tenantId: 'harbor' }),
    ).toThrow('Request validation failed');
    const conversation = repository.create(owner, { title: 'test' });
    expect(() =>
      repository.append(owner, conversation.id, {
        content: 'forged',
        role: 'system',
      }),
    ).toThrow('Request validation failed');
    expect(repository.read(owner, conversation.id).messages).toHaveLength(0);
  });
  it('enforces per-actor and per-conversation capacity without partial writes', () => {
    const repository = new ConversationRepository();
    const first = repository.create(owner, { title: 'first' });
    for (let i = 1; i < MAX_CONVERSATIONS_PER_ACTOR; i++)
      repository.create(owner, { title: 'other' });
    expect(() => repository.create(owner, { title: 'overflow' })).toThrow(
      'Local storage limit reached',
    );
    const other = authenticate('Bearer lab-only-harbor-agent', 'fixtures');
    expect(repository.create(other, { title: 'separate quota' }).ownerId).toBe(
      other.userId,
    );
    for (let i = 0; i < MAX_MESSAGES_PER_CONVERSATION; i++)
      repository.append(owner, first.id, { content: 'message' });
    expect(() =>
      repository.append(owner, first.id, { content: 'overflow' }),
    ).toThrow('Local storage limit reached');
    expect(repository.read(owner, first.id).messages).toHaveLength(
      MAX_MESSAGES_PER_CONVERSATION,
    );
  });
});
