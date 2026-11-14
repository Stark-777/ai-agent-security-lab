import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { Actor } from './identity.ts';
import { requireConversationActor } from './identity.ts';
import { ApplicationError } from './errors.ts';
import { parseInput } from './validation.ts';

export const createConversationSchema = z.strictObject({
  title: z.string().trim().min(1).max(120),
});
export const addMessageSchema = z.strictObject({
  content: z.string().trim().min(1).max(2000),
});
export const conversationParamsSchema = z.strictObject({ id: z.uuid() });
export const messageSchema = z.strictObject({
  id: z.uuid(),
  role: z.literal('user'),
  content: z.string(),
  createdAt: z.iso.datetime(),
});
export const conversationSchema = z.strictObject({
  id: z.uuid(),
  tenantId: z.enum(['northstar', 'harbor']),
  ownerId: z.string(),
  title: z.string(),
  createdAt: z.iso.datetime(),
  messages: z.array(messageSchema),
});
export type Conversation = z.infer<typeof conversationSchema>;
export const MAX_CONVERSATIONS_PER_ACTOR = 50;
export const MAX_MESSAGES_PER_CONVERSATION = 100;

export class ConversationRepository {
  #records = new Map<string, Conversation>();

  create(actor: Actor, input: unknown): Conversation {
    const trusted = requireConversationActor(actor);
    const { title } = parseInput(createConversationSchema, input);
    const count = [...this.#records.values()].filter(
      (record) =>
        record.ownerId === trusted.userId &&
        record.tenantId === trusted.tenantId,
    ).length;
    if (count >= MAX_CONVERSATIONS_PER_ACTOR)
      throw new ApplicationError('LIMIT_REACHED');
    const record: Conversation = {
      id: randomUUID(),
      tenantId: trusted.tenantId,
      ownerId: trusted.userId,
      title,
      createdAt: new Date().toISOString(),
      messages: [],
    };
    this.#records.set(record.id, record);
    return structuredClone(record);
  }

  #owned(actor: Actor, id: string): Conversation {
    const trusted = requireConversationActor(actor);
    const record = this.#records.get(id);
    if (
      !record ||
      record.tenantId !== trusted.tenantId ||
      record.ownerId !== trusted.userId
    )
      throw new ApplicationError('NOT_FOUND');
    return record;
  }

  read(actor: Actor, id: string): Conversation {
    return structuredClone(this.#owned(actor, id));
  }

  append(actor: Actor, id: string, input: unknown) {
    const record = this.#owned(actor, id);
    const { content } = parseInput(addMessageSchema, input);
    if (record.messages.length >= MAX_MESSAGES_PER_CONVERSATION)
      throw new ApplicationError('LIMIT_REACHED');
    const message = {
      id: randomUUID(),
      role: 'user' as const,
      content,
      createdAt: new Date().toISOString(),
    };
    record.messages.push(message);
    return structuredClone(message);
  }
}
