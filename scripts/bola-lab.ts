import assert from 'node:assert/strict';
import { ConversationRepository } from '../src/conversations.ts';
import { DocumentRepository } from '../src/retrieval.ts';
import { authenticate } from '../src/identity.ts';

const mode = process.env.LAB_OBJECT_MODE ?? 'hardened';
assert(mode === 'hardened' || mode === 'vulnerable');
const owner = authenticate('Bearer lab-only-harbor-agent', 'fixtures');
const attacker = authenticate('Bearer lab-only-north-agent-a', 'fixtures');
const repository = new ConversationRepository(mode);
const conversation = repository.create(owner, {
  title: 'Synthetic Harbor case',
});
repository.append(owner, conversation.id, {
  content: 'synthetic-private-harbor-message',
});
let readDenied = false;
let writeDenied = false;
let exposed: unknown;
try {
  exposed = repository.read(attacker, conversation.id);
} catch {
  readDenied = true;
}
try {
  repository.append(attacker, conversation.id, {
    content: 'unauthorized-modification',
  });
} catch {
  writeDenied = true;
}
const sources = new DocumentRepository(false, mode).retrieve(
  attacker,
  'subscription',
);
const after = repository.read(owner, conversation.id);
console.log(
  JSON.stringify(
    {
      mode,
      attacker: attacker.userId,
      targetId: conversation.id,
      readDenied,
      writeDenied,
      exposed,
      sources,
      after,
    },
    null,
    2,
  ),
);
assert(
  readDenied &&
    writeDenied &&
    after.messages.length === 1 &&
    !sources.some((source) => source.sourceId === 'harbor-guide'),
  'SECURITY INVARIANT FAILED: foreign conversation or document crossed tenant/owner boundary',
);
console.log('PASS: foreign objects remain inaccessible and unchanged.');
