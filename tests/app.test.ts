import { afterEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { buildApp, BODY_LIMIT_BYTES } from '../src/app.ts';
import { loadConfig } from '../src/config.ts';
import { errorSchema } from '../src/contracts.ts';
import { createLogger } from '../src/logger.ts';
import { parseInput } from '../src/validation.ts';

const apps: ReturnType<typeof buildApp>[] = [];
function setup() {
  let logs = '';
  const destination = {
    write: (line: string) => {
      logs += line;
    },
  };
  const app = buildApp(loadConfig({}), destination);
  apps.push(app);
  return { app, destination, logs: () => logs };
}
afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe('functional API', () => {
  it('throttles repeated unauthenticated requests without reflecting credentials', async () => {
    const { app, logs } = setup();
    const authorization = 'Bearer synthetic-guess-secret';
    for (let count = 0; count < 100; count++) {
      const response = await app.inject({
        url: '/v1/me',
        headers: { authorization },
      });
      expect(response.statusCode).toBe(401);
    }
    const limited = await app.inject({
      url: '/v1/me',
      headers: { authorization },
    });
    expect(limited.statusCode).toBe(429);
    expect(errorSchema.parse(limited.json()).error.code).toBe('RATE_LIMITED');
    expect(limited.headers['retry-after']).toBeDefined();
    expect(limited.body + logs()).not.toContain(authorization);
  });
  it('returns minimal health and server-owned request IDs', async () => {
    const { app, logs } = setup();
    const response = await app.inject({
      url: '/health',
      headers: { 'x-request-id': 'client-controlled' },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(z.uuid().safeParse(response.headers['x-request-id']).success).toBe(
      true,
    );
    const events = logs()
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line) as Record<string, unknown>);
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event: 'request_completed',
          statusCode: 200,
          reqId: response.headers['x-request-id'],
        }),
      ]),
    );
  });
  it('returns structured 404 for unimplemented application features', async () => {
    const { app } = setup();
    const response = await app.inject('/v1/tools');
    expect(response.statusCode).toBe(404);
    expect(errorSchema.parse(response.json()).error.code).toBe('NOT_FOUND');
  });
});

describe('deterministic foundation security regressions', () => {
  it('rejects unexpected query fields without reflecting input', async () => {
    const { app, logs } = setup();
    const response = await app.inject('/health?token=synthetic-query-secret');
    expect(response.statusCode).toBe(400);
    expect(errorSchema.parse(response.json()).error.requestId).toBe(
      response.headers['x-request-id'],
    );
    expect(response.body + logs()).not.toContain('synthetic-query-secret');
  });

  it('excludes raw path, query, headers, cookies, and client request IDs from logs and errors', async () => {
    const { app, logs } = setup();
    const canaries = [
      'synthetic-path-secret',
      'synthetic-query-secret',
      'synthetic-auth-secret',
      'synthetic-cookie-secret',
      'synthetic-request-id',
    ];
    const response = await app.inject({
      url: `/${canaries[0]}?token=${canaries[1]}`,
      headers: {
        authorization: `Bearer ${canaries[2]}`,
        cookie: `session=${canaries[3]}`,
        'x-request-id': canaries[4]!,
      },
    });
    expect(response.statusCode).toBe(404);
    for (const canary of canaries)
      expect(response.body + logs()).not.toContain(canary);
  });

  it('validates body shape before executing a test-only handler', async () => {
    const { app, logs } = setup();
    let calls = 0;
    const schema = z.strictObject({ message: z.string().min(1).max(32) });
    app.post(
      '/test-input',
      {
        preValidation: async (request) => {
          parseInput(schema, request.body);
        },
      },
      async () => {
        calls++;
        return { accepted: true };
      },
    );
    const valid = await app.inject({
      method: 'POST',
      url: '/test-input',
      payload: { message: 'hello' },
    });
    expect(valid.statusCode).toBe(200);
    for (const payload of [
      { message: 42 },
      { message: '' },
      { message: 'hello', role: 'admin' },
      { message: 'synthetic-body-secret'.repeat(3) },
    ]) {
      const response = await app.inject({
        method: 'POST',
        url: '/test-input',
        payload,
      });
      expect(response.statusCode).toBe(400);
      expect(errorSchema.safeParse(response.json()).success).toBe(true);
      expect(response.body).not.toContain('synthetic-body-secret');
    }
    expect(calls).toBe(1);
    expect(logs()).not.toContain('synthetic-body-secret');
  });

  it.each([
    {
      name: 'malformed JSON',
      payload: '{"token":"synthetic-parser-secret",',
      contentType: 'application/json',
      status: 400,
    },
    {
      name: 'oversized body',
      payload: JSON.stringify({ message: 'x'.repeat(BODY_LIMIT_BYTES) }),
      contentType: 'application/json',
      status: 413,
    },
    {
      name: 'unsupported content type',
      payload: 'synthetic-parser-secret',
      contentType: 'application/octet-stream',
      status: 415,
    },
  ])(
    'rejects $name before handler execution',
    async ({ payload, contentType, status }) => {
      const { app, logs } = setup();
      let calls = 0;
      app.post('/test-parser', async () => {
        calls++;
        return {};
      });
      const response = await app.inject({
        method: 'POST',
        url: '/test-parser',
        headers: { 'content-type': contentType },
        payload,
      });
      expect(response.statusCode).toBe(status);
      expect(errorSchema.safeParse(response.json()).success).toBe(true);
      expect(calls).toBe(0);
      expect(response.body + logs()).not.toContain('synthetic-parser-secret');
    },
  );

  it('does not expose internal error messages or stack traces in responses or logs', async () => {
    const { app, logs } = setup();
    app.get('/test-failure', async () => {
      throw new Error('synthetic-internal-secret');
    });
    const response = await app.inject('/test-failure');
    expect(response.statusCode).toBe(500);
    expect(errorSchema.parse(response.json()).error.code).toBe(
      'INTERNAL_ERROR',
    );
    expect(response.body + logs()).not.toContain('synthetic-internal-secret');
    expect(response.body + logs()).not.toContain('app.test.ts');
    expect(logs()).toContain('request_failed');
  });

  it('redacts known credential fields and omits raw request/error objects', () => {
    const { destination, logs } = setup();
    const logger = createLogger('info', destination);
    logger.info(
      {
        token: 'synthetic-token',
        credentials: { password: 'synthetic-password' },
        req: { headers: { authorization: 'synthetic-auth' } },
        err: new Error('synthetic-error'),
      },
      'redaction_check',
    );
    for (const value of [
      'synthetic-token',
      'synthetic-password',
      'synthetic-auth',
      'synthetic-error',
    ])
      expect(logs()).not.toContain(value);
    expect(logs()).toContain('[REDACTED]');
  });
});
