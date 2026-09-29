import { loadConfig } from './config.js';
import { buildLocalWorkshopApp } from './local-workshop.js';

const config = loadConfig();
const instructorToken = process.env.MISSION_CONTROL_LOCAL_INSTRUCTOR_TOKEN;
if (instructorToken === undefined) {
  throw new Error(
    'Set MISSION_CONTROL_LOCAL_INSTRUCTOR_TOKEN before starting the local rehearsal API.',
  );
}
const app = buildLocalWorkshopApp({
  instructorToken,
  port: config.port,
  logger: true,
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    void app.close().catch((error: unknown) => {
      app.log.error({ err: error }, 'Local workshop shutdown failed');
      process.exitCode = 1;
    });
  });
}

try {
  await app.listen({ host: '127.0.0.1', port: config.port });
  app.log.warn(
    'Local rehearsal only: in-memory data is lost on restart; no Azure or SignalR integration.',
  );
} catch (error) {
  app.log.fatal({ err: error }, 'Local workshop API failed to start');
  process.exitCode = 1;
}
