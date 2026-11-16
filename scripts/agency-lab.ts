import assert from 'node:assert/strict';
import { RefundService } from '../src/refunds.ts';
import { authenticate } from '../src/identity.ts';
const mode = process.env.LAB_AGENCY_MODE ?? 'hardened';
assert(mode === 'hardened' || mode === 'vulnerable');
const actor = authenticate('Bearer lab-only-north-manager', 'fixtures');
const service = new RefundService();
const input = { invoiceId: 'north-invoice', amountCents: 100, currency: 'USD' };
const before = service.balance(actor);
const proposal = service.propose(actor, input);
// INTENTIONALLY UNSAFE controller: assumes its own proposal is user approval.
// Never wired to HTTP agent or ToolRegistry; no external payment effect.
if (mode === 'vulnerable')
  service.confirm(actor, proposal.id, {
    ...input,
    confirmationToken: proposal.confirmationToken,
  });
console.log(
  JSON.stringify({
    mode,
    before,
    after: service.balance(actor),
    explicitHumanConfirmation: false,
  }),
);
assert.equal(
  service.balance(actor),
  before,
  'SECURITY INVARIANT FAILED: controller self-confirmed without user action',
);
console.log('PASS: proposal alone cannot change the simulated balance.');
