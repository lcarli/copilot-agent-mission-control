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

const configRepository = new FileParticipantConfigRepository(
  defaultParticipantConfigPath(homedir()),
);
const credentialRepository = new FileParticipantCredentialRepository(
  defaultParticipantCredentialPath(homedir()),
);
const storedCredentials = await credentialRepository.load();
const tokenSource = createMutableTokenSource(
  process.env.MISSION_CONTROL_UNIT_TOKEN ?? storedCredentials?.unitToken,
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

await createParticipantProgram({
  auth,
  configRepository,
  registrationClient,
  ...(() => {
    const environmentLocale =
      process.env.LC_ALL ?? process.env.LC_MESSAGES ?? process.env.LANG;
    return environmentLocale === undefined ? {} : { environmentLocale };
  })(),
}).parseAsync(process.argv);
