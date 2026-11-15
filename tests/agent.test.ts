import { describe, expect, it, vi } from 'vitest';
import { Agent, ToolRegistry, MAX_TOOL_CALLS } from '../src/agent.ts';
import { authenticate } from '../src/identity.ts';
import { buildApp } from '../src/app.ts';
import { loadConfig } from '../src/config.ts';
import { conversationSchema } from '../src/conversations.ts';

const actor = authenticate('Bearer lab-only-north-agent-a', 'fixtures');
const manager = authenticate('Bearer lab-only-north-manager', 'fixtures');
describe('application-owned tool enforcement', () => {
  it('allows scoped reads and excludes foreign and restricted data', () => {
    const tools = new ToolRegistry();
    expect(
      tools.execute(actor, {
        tool: 'getCustomerRecord',
        arguments: { customerId: 'north-customer' },
      }),
    ).toEqual({
      outcome: 'allowed',
      data: { id: 'north-customer', plan: 'standard' },
    });
    for (const documentId of ['harbor-guide', 'north-restricted', 'missing'])
      expect(
        tools.execute(actor, {
          tool: 'retrieveInternalDocument',
          arguments: { documentId },
        }),
      ).toEqual({ outcome: 'not_found' });
    expect(
      tools.execute(actor, {
        tool: 'getCustomerRecord',
        arguments: { customerId: 'harbor-customer' },
      }).outcome,
    ).toBe('not_found');
    expect(
      tools.execute(actor, {
        tool: 'retrieveInternalDocument',
        arguments: { documentId: 'north-guide' },
      }).outcome,
    ).toBe('allowed');
  });
  it('denies low-privilege refunds and requires confirmation for managers', () => {
    const tools = new ToolRegistry();
    const proposal = {
      tool: 'issueRefund',
      arguments: { invoiceId: 'north-invoice', amountCents: 100 },
    };
    expect(tools.execute(actor, proposal).outcome).toBe('denied');
    expect(tools.execute(manager, proposal).outcome).toBe(
      'confirmation_required',
    );
    expect(
      tools.execute(manager, {
        ...proposal,
        arguments: { invoiceId: 'harbor-invoice', amountCents: 100 },
      }).outcome,
    ).toBe('not_found');
    expect(() =>
      tools.execute(actor, {
        ...proposal,
        arguments: { ...proposal.arguments, tenantId: 'harbor' },
      }),
    ).toThrow();
  });
  it.each([
    {},
    { kind: 'tool', proposal: { tool: 'shell', arguments: {} } },
    { kind: 'answer', text: 42 },
    {
      kind: 'tool',
      proposal: {
        tool: 'issueRefund',
        arguments: { invoiceId: 'north-invoice', amountCents: -1 },
      },
    },
  ])('rejects invalid model output without execution', async (output) => {
    const audit = vi.fn();
    await expect(
      new Agent({ next: async () => output }).run(
        actor,
        'test',
        'request',
        audit,
      ),
    ).rejects.toThrow('Agent execution failed');
    expect(audit).not.toHaveBeenCalled();
  });
  it('caps repeated proposals and logs allowlisted decisions only', async () => {
    const audit = vi.fn();
    const agent = new Agent({
      next: async () => ({
        kind: 'tool',
        proposal: {
          tool: 'getCustomerRecord',
          arguments: { customerId: 'north-customer' },
        },
      }),
    });
    await expect(
      agent.run(actor, 'synthetic-prompt-secret', 'request', audit),
    ).rejects.toThrow('Agent execution failed');
    expect(audit).toHaveBeenCalledTimes(MAX_TOOL_CALLS);
    expect(JSON.stringify(audit.mock.calls)).not.toContain(
      'synthetic-prompt-secret',
    );
    expect(JSON.stringify(audit.mock.calls)).not.toContain('north-customer');
  });
  it('times out an unresponsive adapter', async () => {
    vi.useFakeTimers();
    try {
      const result = new Agent({ next: async () => new Promise(() => {}) }).run(
        actor,
        'test',
        'request',
        vi.fn(),
      );
      const assertion = expect(result).rejects.toThrow(
        'Agent execution failed',
      );
      await vi.advanceTimersByTimeAsync(2001);
      await assertion;
    } finally {
      vi.useRealTimers();
    }
  });
  it('produces deterministic answers and safe traces', async () => {
    const agent = new Agent();
    expect(
      (await agent.run(actor, '/customer north-customer', 'request', vi.fn()))
        .trace,
    ).toEqual([{ step: 0, tool: 'getCustomerRecord', outcome: 'allowed' }]);
    expect(
      (await agent.run(actor, '/refund north-invoice 100', 'request', vi.fn()))
        .trace[0]?.outcome,
    ).toBe('denied');
  });
  it('authorizes conversation ownership before agent execution and excludes content from logs', async () => {
    let logs = '';
    const app = buildApp(loadConfig({ LAB_AUTH_MODE: 'fixtures' }), {
      write: (line: string) => {
        logs += line;
      },
    });
    try {
      const headers = { authorization: 'Bearer lab-only-north-agent-a' };
      const created = await app.inject({
        method: 'POST',
        url: '/v1/conversations',
        headers,
        payload: { title: 'test' },
      });
      const id = conversationSchema.parse(created.json()).id;
      const url = `/v1/conversations/${id}/agent`;
      expect(
        (
          await app.inject({
            method: 'POST',
            url,
            payload: { content: 'hello' },
          })
        ).statusCode,
      ).toBe(401);
      const denied = await app.inject({
        method: 'POST',
        url,
        headers: { authorization: 'Bearer lab-only-north-manager' },
        payload: { content: '/customer north-customer' },
      });
      expect(denied.statusCode).toBe(404);
      expect(logs).not.toContain('agent_tool_decision');
      const result = await app.inject({
        method: 'POST',
        url,
        headers,
        payload: { content: '/customer north-customer' },
      });
      expect(result.statusCode).toBe(200);
      expect(logs).toContain('agent_tool_decision');
      expect(logs).not.toContain('north-customer');
      expect(
        (
          await app.inject({
            method: 'POST',
            url,
            headers,
            payload: { content: 'hello', role: 'admin' },
          })
        ).statusCode,
      ).toBe(400);
    } finally {
      await app.close();
    }
  });
});
