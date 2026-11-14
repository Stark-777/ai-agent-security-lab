import { z } from 'zod';

const environmentSchema = z.object({
  PORT: z
    .string()
    .regex(/^[0-9]+$/)
    .transform(Number)
    .pipe(z.number().int().min(1).max(65535))
    .prefault('3000'),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  LAB_BIND_MODE: z.enum(['loopback', 'container']).default('loopback'),
  LAB_AUTH_MODE: z.enum(['disabled', 'fixtures']).default('disabled'),
});

export function loadConfig(environment: NodeJS.ProcessEnv = process.env) {
  const result = environmentSchema.safeParse(environment);
  if (!result.success) {
    // Report field names only. Environment values may contain credentials.
    const fields = [
      ...new Set(result.error.issues.map((issue) => issue.path[0])),
    ];
    throw new Error(`Invalid configuration: ${fields.join(', ')}`);
  }
  return Object.freeze({
    port: result.data.PORT,
    host: result.data.LAB_BIND_MODE === 'container' ? '0.0.0.0' : '127.0.0.1',
    logLevel: result.data.LOG_LEVEL,
    authMode: result.data.LAB_AUTH_MODE,
  });
}

export type AppConfig = ReturnType<typeof loadConfig>;
