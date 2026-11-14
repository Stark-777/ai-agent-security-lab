import { buildApp } from './app.ts';
import { loadConfig } from './config.ts';

async function main() {
  const config = loadConfig();
  const app = buildApp(config);
  const shutdown = async () => {
    try {
      await app.close();
    } catch {
      app.log.error({ event: 'shutdown_failed' });
      process.exitCode = 1;
    }
  };
  process.once('SIGINT', () => {
    void shutdown();
  });
  process.once('SIGTERM', () => {
    void shutdown();
  });
  await app.listen({ host: config.host, port: config.port });
}

main().catch(() => {
  // Startup exceptions may contain environment values. Keep stderr machine-readable and generic.
  process.stderr.write(
    JSON.stringify({
      level: 'error',
      event: 'startup_failed',
      message: 'Check configuration and port availability',
    }) + '\n',
  );
  process.exitCode = 1;
});
