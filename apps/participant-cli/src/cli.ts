#!/usr/bin/env node

import { homedir } from 'node:os';

import { createMutableTokenSource, ParticipantAuthSession } from './auth.js';
import {
  defaultParticipantConfigPath,
  FileParticipantConfigRepository,
} from './config.js';
import { createParticipantProgram } from './program.js';
import {
  defaultParticipantCredentialPath,
  FileParticipantCredentialRepository,
} from './credentials.js';
import { HttpParticipantRegistrationClient } from './registration.js';
import { HttpParticipantMissionWorkflow } from './workflow.js';

async function main(): Promise<void> {
  const home = process.env.MISSION_CONTROL_HOME ?? homedir();
  const configRepository = new FileParticipantConfigRepository(
    defaultParticipantConfigPath(home),
  );
  const credentialRepository = new FileParticipantCredentialRepository(
    defaultParticipantCredentialPath(home),
  );
  const storedCredentials = await credentialRepository.load();
  const config = await configRepository.load();
  const tokenSource = createMutableTokenSource(
    process.env.MISSION_CONTROL_UNIT_TOKEN ??
      (storedCredentials?.apiUrl === undefined ||
      storedCredentials.apiUrl === config?.apiUrl
        ? storedCredentials?.unitToken
        : undefined),
  );
  const auth = new ParticipantAuthSession(tokenSource);
  const registrationClient = new HttpParticipantRegistrationClient({
    auth,
    configRepository,
    credentialRepository,
    updateToken: (token) => {
      tokenSource.write(token);
    },
  });
  const missionWorkflow = new HttpParticipantMissionWorkflow({
    auth,
    configRepository,
  });

  await createParticipantProgram({
    auth,
    configRepository,
    missionWorkflow,
    registrationClient,
    ...(() => {
      const environmentLocale =
        process.env.LC_ALL ?? process.env.LC_MESSAGES ?? process.env.LANG;
      return environmentLocale === undefined ? {} : { environmentLocale };
    })(),
  }).parseAsync(process.argv);
}

try {
  await main();
} catch (error) {
  console.error(
    error instanceof Error ? error.message : 'Participant command failed.',
  );
  process.exitCode = 1;
}
