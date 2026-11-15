import { z } from 'zod';
import { requireConversationActor } from './identity.ts';
import type { Actor } from './identity.ts';

const requestSchema = z.strictObject({
  invoiceId: z.enum(['north-invoice', 'harbor-invoice']),
  amountCents: z.number().int().min(1).max(10000),
});
export type LabMode = 'hardened' | 'vulnerable';

// Local synthetic queue only. No payment credentials, network, or execution capability.
export class RefundRequestLab {
  #requests: {
    tenantId: string;
    requestedBy: string;
    invoiceId: string;
    amountCents: number;
  }[] = [];
  readonly mode: LabMode;
  constructor(mode: LabMode = 'hardened') {
    this.mode = mode;
  }
  request(actor: Actor, raw: unknown) {
    const trusted = requireConversationActor(actor);
    const input = requestSchema.parse(raw);
    // INTENTIONALLY VULNERABLE: this composition omits only the function-level role check.
    if (this.mode === 'hardened' && trusted.role !== 'billing_manager')
      return { outcome: 'denied' as const };
    const expected =
      trusted.tenantId === 'northstar' ? 'north-invoice' : 'harbor-invoice';
    if (input.invoiceId !== expected) return { outcome: 'not_found' as const };
    if (this.#requests.length >= 20) return { outcome: 'denied' as const };
    this.#requests.push({
      tenantId: trusted.tenantId,
      requestedBy: trusted.userId,
      ...input,
    });
    return { outcome: 'confirmation_required' as const };
  }
  snapshot(actor: Actor) {
    const trusted = requireConversationActor(actor);
    return structuredClone(
      this.#requests.filter((request) => request.tenantId === trusted.tenantId),
    );
  }
}
