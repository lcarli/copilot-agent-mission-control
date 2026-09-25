import { buildApp } from './app.js';
import { loadConfig } from './config.js';

const config = loadConfig();
const app = buildApp({ config });

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  app.log.info({ signal }, 'Shutting down Mission Control API');
  await app.close();
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    void shutdown(signal).finally(() => {
      process.exitCode = 0;
    });
  });
}

try {
  await app.listen({
    host: config.host,
    port: config.port,
  });
} catch (error) {
  app.log.fatal({ err: error }, 'Mission Control API failed to start');
  process.exitCode = 1;
}
