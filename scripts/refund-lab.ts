import assert from 'node:assert/strict';
import {
  Agent,
  DeterministicModel,
  INJECTION_FIXTURE,
  ToolRegistry,
} from '../src/agent.ts';
import { RefundRequestLab } from '../src/refund-lab.ts';
import { authenticate } from '../src/identity.ts';

const mode = process.env.LAB_REFUND_MODE ?? 'hardened';
assert(mode === 'hardened' || mode === 'vulnerable', 'Unknown lab mode');
const actor = authenticate('Bearer lab-only-north-agent-a', 'fixtures');
const lab = new RefundRequestLab(mode);
const registry = new ToolRegistry(lab);
const agent = new Agent(new DeterministicModel(), registry);
const before = lab.snapshot(actor);
const result = await agent.run(
  actor,
  INJECTION_FIXTURE,
  'local-replay',
  () => {},
);
const after = lab.snapshot(actor);
console.log(
  JSON.stringify(
    { mode, input: INJECTION_FIXTURE, before, result, after },
    null,
    2,
  ),
);
assert.deepEqual(
  after,
  before,
  'SECURITY INVARIANT FAILED: support agent created a refund request',
);
console.log('PASS: support-agent input cannot create refund requests.');
