import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.ts';
import { loadConfig } from '../src/config.ts';
import { actorSchema, localIdentities } from '../src/identity.ts';
import { conversationSchema, messageSchema } from '../src/conversations.ts';
import { errorSchema } from '../src/contracts.ts';

const apps: ReturnType<typeof buildApp>[] = [];
function setup(mode: 'disabled' | 'fixtures' = 'fixtures') {
  let logs = '';
  const app = buildApp(loadConfig({ LAB_AUTH_MODE: mode }), {
    write: (line: string) => {
      logs += line;
    },
  });
  apps.push(app);
  return { app, logs: () => logs };
}
afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});
const headersFor = (token: string) => ({ authorization: `Bearer ${token}` });
const north = localIdentities[0]!;
const paths = [
  '/v1/me',
  '/v1/conversations',
  `/v1/conversations/${randomUUID()}`,
  `/v1/conversations/${randomUUID()}/messages`,
];

describe('local authentication', () => {
  it.each(paths)('requires authentication on %s', async (url) => {
    const { app } = setup();
    const response = await app.inject({
      url,
      method:
        url.endsWith('messages') || url === '/v1/conversations'
          ? 'POST'
          : 'GET',
    });
    expect(response.statusCode).toBe(401);
    expect(errorSchema.parse(response.json()).error.code).toBe(
      'UNAUTHENTICATED',
    );
    expect(response.headers['www-authenticate']).toBe(
      'Bearer realm="local-lab"',
    );
  });
  it.each([
    'Bearer unknown',
    'Basic lab-only-north-agent-a',
    'Bearer',
    'Bearer  lab-only-north-agent-a',
    'Bearer lab-only-north-agent-a,lab-only-harbor-manager',
  ])('rejects malformed or unknown credentials: %s', async (authorization) => {
    const { app, logs } = setup();
    const response = await app.inject({
      url: '/v1/me',
      headers: { authorization },
    });
    expect(response.statusCode).toBe(401);
    expect(response.body + logs()).not.toContain(authorization);
  });
  it('rejects known tokens unless fixture mode is enabled, while health stays public', async () => {
    const { app } = setup('disabled');
    expect(
      (await app.inject({ url: '/v1/me', headers: headersFor(north.token) }))
        .statusCode,
    ).toBe(401);
    expect((await app.inject('/health')).statusCode).toBe(200);
  });
  it.each(localIdentities)(
    'resolves $userId only from the token, ignoring claimed identity headers',
    async ({ token, ...identity }) => {
      const { app, logs } = setup();
      const response = await app.inject({
        url: '/v1/me',
        headers: {
          ...headersFor(token),
          'x-tenant-id': 'foreign',
          'x-user-id': 'someone-else',
          'x-role': 'admin',
        },
      });
      expect(response.statusCode).toBe(200);
      expect(actorSchema.parse(response.json())).toEqual(identity);
      expect(response.body + logs()).not.toContain(token);
    },
  );
  it('does not authenticate through query parameters or parse bodies before authentication', async () => {
    const { app } = setup();
    expect((await app.inject(`/v1/me?token=${north.token}`)).statusCode).toBe(
      401,
    );
    const response = await app.inject({
      method: 'POST',
      url: '/v1/conversations',
      headers: { 'content-type': 'application/json' },
      payload: '{broken',
    });
    expect(response.statusCode).toBe(401);
  });
});

describe('tenant and conversation ownership matrix', () => {
  const pairs = localIdentities.flatMap((owner) =>
    localIdentities.map((caller) => ({
      owner,
      caller,
      label: `${caller.userId} accessing ${owner.userId}`,
    })),
  );
  it.each(pairs)('$label', async ({ owner, caller }) => {
    const { app, logs } = setup();
    const created = await app.inject({
      method: 'POST',
      url: '/v1/conversations',
      headers: headersFor(owner.token),
      payload: { title: `private-title-${owner.userId}` },
    });
    expect(created.statusCode).toBe(201);
    const conversation = conversationSchema.parse(created.json());
    expect(conversation.ownerId).toBe(owner.userId);
    expect(conversation.tenantId).toBe(owner.tenantId);
    expect(created.headers.location).toBe(
      `/v1/conversations/${conversation.id}`,
    );
    const url = `/v1/conversations/${conversation.id}`;
    const read = await app.inject({ url, headers: headersFor(caller.token) });
    const write = await app.inject({
      method: 'POST',
      url: `${url}/messages`,
      headers: headersFor(caller.token),
      payload: { content: 'synthetic-private-message' },
    });
    if (caller.userId === owner.userId) {
      expect(read.statusCode).toBe(200);
      expect(write.statusCode).toBe(201);
      expect(messageSchema.parse(write.json()).role).toBe('user');
    } else {
      expect(read.statusCode).toBe(404);
      expect(write.statusCode).toBe(404);
      const missing = await app.inject({
        url: `/v1/conversations/${randomUUID()}`,
        headers: headersFor(caller.token),
      });
      const missingError = errorSchema.parse(missing.json()).error;
      for (const denied of [read, write]) {
        const error = errorSchema.parse(denied.json()).error;
        expect({ code: error.code, message: error.message }).toEqual({
          code: missingError.code,
          message: missingError.message,
        });
        expect(denied.body).not.toContain(conversation.title);
      }
    }
    const after = await app.inject({ url, headers: headersFor(owner.token) });
    expect(conversationSchema.parse(after.json()).messages).toHaveLength(
      caller.userId === owner.userId ? 1 : 0,
    );
    expect(logs()).not.toContain('synthetic-private-message');
    expect(logs()).not.toContain(conversation.title);
    expect(logs()).not.toContain(owner.token);
    expect(logs()).not.toContain(caller.token);
  });

  it('rejects forged ownership, role, tenant and message-role fields without mutation', async () => {
    const { app } = setup();
    const headers = headersFor(north.token);
    for (const field of ['ownerId', 'tenantId', 'role', 'id']) {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/conversations',
        headers,
        payload: { title: 'test', [field]: 'forged' },
      });
      expect(response.statusCode).toBe(400);
    }
    const created = await app.inject({
      method: 'POST',
      url: '/v1/conversations',
      headers,
      payload: { title: 'test' },
    });
    const id = conversationSchema.parse(created.json()).id;
    for (const payload of [
      { content: 'hello', role: 'assistant' },
      { content: 'hello', tenantId: 'harbor' },
      { content: ' ' },
      { content: 'x'.repeat(2001) },
    ]) {
      const response = await app.inject({
        method: 'POST',
        url: `/v1/conversations/${id}/messages`,
        headers,
        payload,
      });
      expect(response.statusCode).toBe(400);
    }
    const after = await app.inject({ url: `/v1/conversations/${id}`, headers });
    expect(conversationSchema.parse(after.json()).messages).toHaveLength(0);
    expect(
      (
        await app.inject({
          url: `/v1/conversations/${id}?tenantId=harbor`,
          headers,
        })
      ).statusCode,
    ).toBe(400);
    expect(
      (await app.inject({ url: '/v1/conversations/not-a-uuid', headers }))
        .statusCode,
    ).toBe(400);
  });

  it('rejects duplicate credentials', async () => {
    const { app } = setup();
    const response = await app.inject({
      url: '/v1/me',
      headers: {
        authorization: [
          `Bearer ${north.token}`,
          'Bearer lab-only-harbor-manager',
        ] as unknown as string, // Deliberately exercise duplicate wire headers beyond the typed API.
      },
    });
    expect(response.statusCode).toBe(401);
  });
  it('does not share state between application instances', async () => {
    const first = setup().app;
    const second = setup().app;
    const headers = headersFor(north.token);
    const created = await first.inject({
      method: 'POST',
      url: '/v1/conversations',
      headers,
      payload: { title: 'instance one' },
    });
    const id = conversationSchema.parse(created.json()).id;
    expect(
      (await second.inject({ url: `/v1/conversations/${id}`, headers }))
        .statusCode,
    ).toBe(404);
  });
});
