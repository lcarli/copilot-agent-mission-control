import { fileURLToPath } from 'node:url';

import { createDashboardServer, dashboardApiOrigin } from './app.js';

const port = process.env.PORT ?? '8080';
if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65_535)
  throw new Error('PORT must be an integer between 1 and 65535.');

const server = await createDashboardServer({
  apiOrigin: dashboardApiOrigin(process.env.MISSION_CONTROL_API_URL).origin,
  staticDirectory: fileURLToPath(new URL('../dist/', import.meta.url)),
});
server.once('error', (error) => {
  console.error('Dashboard server failed', error);
  process.exitCode = 1;
});
server.listen(Number(port), '0.0.0.0');
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.once(signal, () => {
    server.close((error) => {
      if (error !== undefined) {
        console.error('Dashboard shutdown failed', error);
        process.exitCode = 1;
      }
    });
  });
}
