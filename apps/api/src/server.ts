import { loadConfig } from './config.js';
import { loadHostedConfig } from './hosted-config.js';
import { createHostedWorkshopRuntime } from './hosted-runtime.js';
import { buildHostedWorkshopApp } from './hosted-workshop.js';

const config = loadConfig();
const runtime = await createHostedWorkshopRuntime(loadHostedConfig());
const app = buildHostedWorkshopApp({
  config,
  runtime,
  logger: true,
});

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  app.log.info({ signal }, 'Shutting down Mission Control API');
  await app.close();
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    void shutdown(signal).catch(() => {
      app.log.error(
        { code: 'shutdown-failed' },
        'Mission Control API shutdown failed',
      );
      process.exitCode = 1;
    });
  });
}

try {
  await app.listen({
    host: config.host,
    port: config.port,
  });
} catch {
  app.log.fatal(
    { code: 'startup-failed' },
    'Mission Control API failed to start',
  );
  await app.close();
  process.exitCode = 1;
}
