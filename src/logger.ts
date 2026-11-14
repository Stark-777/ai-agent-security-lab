import pino from 'pino';
import type { DestinationStream } from 'pino';
import type { AppConfig } from './config.ts';

export function createLogger(
  level: AppConfig['logLevel'],
  destination?: DestinationStream,
) {
  const options: pino.LoggerOptions = {
    level,
    base: null,
    // Defense in depth for accidental structured credential fields. This is not
    // a general secret detector: callers must never log free-form user content.
    redact: {
      paths: [
        'authorization',
        'cookie',
        'password',
        'token',
        'secret',
        '*.authorization',
        '*.cookie',
        '*.password',
        '*.token',
        '*.secret',
        'req.headers.authorization',
        'req.headers.cookie',
        'res.headers["set-cookie"]',
      ],
      censor: '[REDACTED]',
    },
    serializers: {
      req: () => ({ omitted: true }),
      res: () => ({ omitted: true }),
      err: () => ({ omitted: true }),
    },
  };
  return destination ? pino(options, destination) : pino(options);
}
