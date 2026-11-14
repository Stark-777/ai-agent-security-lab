import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';

// Choose an unused loopback port. A competing process could claim it between
// closing this socket and starting the app; readiness checks fail in that case.
const reservation = createServer();
reservation.listen(0, '127.0.0.1');
await once(reservation, 'listening');
const address = reservation.address();
assert(address && typeof address !== 'string');
const port = address.port;
await new Promise<void>((resolve, reject) =>
  reservation.close((error) => (error ? reject(error) : resolve())),
);

const child = spawn(process.execPath, ['dist/server.js'], {
  env: {
    ...process.env,
    PORT: String(port),
    LAB_BIND_MODE: 'loopback',
    LOG_LEVEL: 'info',
    LAB_AUTH_MODE: 'fixtures',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let output = '';
child.stdout.on('data', (chunk: Buffer) => {
  output += chunk.toString();
});
child.stderr.on('data', (chunk: Buffer) => {
  output += chunk.toString();
});
const closed = once(child, 'close');
try {
  for (
    let attempt = 0;
    attempt < 100 && !output.includes('Server listening');
    attempt++
  ) {
    assert.equal(child.exitCode, null, 'server exited before listening');
    await delay(50);
  }
  assert(
    output.includes(`127.0.0.1:${port}`),
    'server did not report loopback binding',
  );
  const health = await fetch(`http://127.0.0.1:${port}/health`, {
    signal: AbortSignal.timeout(2000),
  });
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { status: 'ok' });
  const invalid = await fetch(
    `http://127.0.0.1:${port}/health?token=synthetic-smoke-secret`,
    { signal: AbortSignal.timeout(2000) },
  );
  assert.equal(invalid.status, 400);
  assert(!(await invalid.text()).includes('synthetic-smoke-secret'));
  const base = `http://127.0.0.1:${port}`;
  const headers = {
    authorization: 'Bearer lab-only-north-agent-a',
    'content-type': 'application/json',
  };
  const anonymous = await fetch(`${base}/v1/me`, {
    signal: AbortSignal.timeout(2000),
  });
  assert.equal(anonymous.status, 401);
  const created = await fetch(`${base}/v1/conversations`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ title: 'Smoke conversation' }),
    signal: AbortSignal.timeout(2000),
  });
  assert.equal(created.status, 201);
  const conversation = (await created.json()) as {
    id: string;
    ownerId: string;
    tenantId: string;
  };
  assert.equal(conversation.ownerId, 'north-agent-a');
  assert.equal(conversation.tenantId, 'northstar');
  const message = await fetch(
    `${base}/v1/conversations/${conversation.id}/messages`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({ content: 'synthetic-smoke-message' }),
      signal: AbortSignal.timeout(2000),
    },
  );
  assert.equal(message.status, 201);
  const foreign = await fetch(`${base}/v1/conversations/${conversation.id}`, {
    headers: { authorization: 'Bearer lab-only-harbor-manager' },
    signal: AbortSignal.timeout(2000),
  });
  assert.equal(foreign.status, 404);
  const history = await fetch(`${base}/v1/conversations/${conversation.id}`, {
    headers,
    signal: AbortSignal.timeout(2000),
  });
  assert.equal(history.status, 200);
  assert.equal(
    ((await history.json()) as { messages: unknown[] }).messages.length,
    1,
  );
} finally {
  if (child.exitCode === null) child.kill('SIGTERM');
  const killTimer = setTimeout(() => child.kill('SIGKILL'), 3000);
  const [code, signal] = await closed;
  clearTimeout(killTimer);
  assert.equal(code, 0, `server shutdown failed: ${String(signal)}`);
}
assert(!output.includes('synthetic-smoke-secret'));
assert(!output.includes('synthetic-smoke-message'));
assert(!output.includes('lab-only-north-agent-a'));
assert(!output.includes('lab-only-harbor-manager'));
console.log(
  'PASS: anonymous 401; owner creates, appends and reads; foreign manager 404; tokens and message excluded from logs.',
);
console.log(
  'PASS: compiled server binds loopback; health 200; invalid query 400; no canary leak; SIGTERM exits 0.',
);

const invalidConfig = spawnSync(process.execPath, ['dist/server.js'], {
  env: { ...process.env, PORT: 'synthetic-config-secret' },
  encoding: 'utf8',
  timeout: 3000,
});
assert.equal(invalidConfig.status, 1);
assert(invalidConfig.stderr.includes('startup_failed'));
assert(
  !(invalidConfig.stdout + invalidConfig.stderr).includes(
    'synthetic-config-secret',
  ),
);
console.log(
  'PASS: invalid configuration exits 1 without exposing the supplied value.',
);
