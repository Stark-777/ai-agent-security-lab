import {
  randomUUID,
  randomBytes,
  createHash,
  timingSafeEqual,
} from 'node:crypto';
import { z } from 'zod';
import type { Actor } from './identity.ts';
import { requireConversationActor } from './identity.ts';
import { ApplicationError } from './errors.ts';
import { parseInput } from './validation.ts';

export const refundInputSchema = z.strictObject({
  invoiceId: z.enum(['north-invoice', 'harbor-invoice']),
  amountCents: z.number().int().min(1).max(10000),
  currency: z.literal('USD'),
});
export const confirmSchema = z.strictObject({
  confirmationToken: z.string().regex(/^[a-f0-9]{64}$/),
  ...refundInputSchema.shape,
});
export const proposalSchema = z.strictObject({
  id: z.uuid(),
  ...refundInputSchema.shape,
  expiresAt: z.number(),
  confirmationToken: z.string(),
});
export const receiptSchema = z.strictObject({
  proposalId: z.uuid(),
  status: z.literal('executed'),
  remainingCents: z.number().int(),
});
type Proposal = z.infer<typeof refundInputSchema> & {
  id: string;
  userId: string;
  tenantId: string;
  expiresAt: number;
  digest: Buffer;
  used: boolean;
};
const digest = (value: string) => createHash('sha256').update(value).digest();

// Process-local simulated USD ledger. No external credentials or payment provider.
export class RefundService {
  #proposals = new Map<string, Proposal>();
  #balances = new Map([
    ['north-invoice', 20000],
    ['harbor-invoice', 20000],
  ]);
  #executions = new Map<string, number[]>();
  #now: () => number;
  constructor(now: () => number = Date.now) {
    this.#now = now;
  }
  #manager(actor: Actor) {
    const trusted = requireConversationActor(actor);
    if (trusted.role !== 'billing_manager')
      throw new ApplicationError('FORBIDDEN');
    return trusted;
  }
  #invoice(actor: Actor, invoiceId: string) {
    if (
      invoiceId !==
      (actor.tenantId === 'northstar' ? 'north-invoice' : 'harbor-invoice')
    )
      throw new ApplicationError('NOT_FOUND');
  }
  propose(actor: Actor, raw: unknown) {
    const trusted = this.#manager(actor);
    const input = parseInput(refundInputSchema, raw);
    this.#invoice(trusted, input.invoiceId);
    const now = this.#now();
    for (const [id, item] of this.#proposals)
      if (item.expiresAt <= now) this.#proposals.delete(id);
    if (this.#proposals.size >= 100)
      throw new ApplicationError('LIMIT_REACHED');
    if (input.amountCents > this.#balances.get(input.invoiceId)!)
      throw new ApplicationError('ACTION_REJECTED');
    const token = randomBytes(32).toString('hex');
    const proposal: Proposal = {
      ...input,
      id: randomUUID(),
      userId: trusted.userId,
      tenantId: trusted.tenantId,
      expiresAt: now + 60000,
      digest: digest(token),
      used: false,
    };
    this.#proposals.set(proposal.id, proposal);
    return {
      id: proposal.id,
      ...input,
      expiresAt: proposal.expiresAt,
      confirmationToken: token,
    };
  }
  confirm(actor: Actor, id: string, raw: unknown) {
    const trusted = this.#manager(actor);
    const input = parseInput(confirmSchema, raw);
    const item = this.#proposals.get(id);
    if (
      !item ||
      item.userId !== trusted.userId ||
      item.tenantId !== trusted.tenantId
    )
      throw new ApplicationError('NOT_FOUND');
    this.#invoice(trusted, item.invoiceId);
    const now = this.#now();
    if (
      item.used ||
      now >= item.expiresAt ||
      input.invoiceId !== item.invoiceId ||
      input.amountCents !== item.amountCents ||
      input.currency !== item.currency ||
      !timingSafeEqual(item.digest, digest(input.confirmationToken))
    )
      throw new ApplicationError('ACTION_REJECTED');
    const key = `${trusted.tenantId}:${trusted.userId}`;
    const recent = (this.#executions.get(key) ?? []).filter(
      (time) => time > now - 60000,
    );
    const remaining = this.#balances.get(item.invoiceId)!;
    if (recent.length >= 3 || item.amountCents > remaining)
      throw new ApplicationError('ACTION_REJECTED');
    // Synchronous check-and-update has no await seam: atomic only within this JS process.
    item.used = true;
    this.#balances.set(item.invoiceId, remaining - item.amountCents);
    this.#executions.set(key, [...recent, now]);
    return {
      proposalId: id,
      status: 'executed' as const,
      remainingCents: remaining - item.amountCents,
    };
  }
  balance(actor: Actor) {
    const trusted = this.#manager(actor);
    return this.#balances.get(
      trusted.tenantId === 'northstar' ? 'north-invoice' : 'harbor-invoice',
    )!;
  }
}
