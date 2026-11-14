import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.ts';

describe('configuration boundary', () => {
  it('defaults to loopback and ignores unrelated environment variables', () => {
    expect(
      loadConfig({ HOST: '0.0.0.0', UNRELATED: 'synthetic-secret' }),
    ).toEqual({
      host: '127.0.0.1',
      port: 3000,
      logLevel: 'info',
      authMode: 'disabled',
    });
  });
  it('requires an explicit container bind mode for all interfaces', () => {
    expect(loadConfig({ LAB_BIND_MODE: 'container', PORT: '3100' }).host).toBe(
      '0.0.0.0',
    );
  });
  it.each(['', '0', '-1', '65536', '3000oops', '1.5', 'Infinity', ' 3000'])(
    'rejects invalid port %j',
    (PORT) => {
      expect(() => loadConfig({ PORT })).toThrow('Invalid configuration: PORT');
    },
  );
  it('does not echo bad configuration values', () => {
    expect(() => loadConfig({ LOG_LEVEL: 'synthetic-config-secret' })).toThrow(
      /^Invalid configuration: LOG_LEVEL$/,
    );
    expect(() => loadConfig({ LAB_BIND_MODE: 'public' })).toThrow(
      'LAB_BIND_MODE',
    );
  });
});
