#!/usr/bin/env node

import { homedir } from 'node:os';

import {
  createEnvironmentTokenSource,
  ParticipantAuthSession,
} from './auth.js';
import {
  defaultParticipantConfigPath,
  FileParticipantConfigRepository,
} from './config.js';
import { createParticipantProgram } from './program.js';

const configRepository = new FileParticipantConfigRepository(
  defaultParticipantConfigPath(homedir()),
);
const auth = new ParticipantAuthSession(
  createEnvironmentTokenSource(process.env),
);

await createParticipantProgram({
  auth,
  configRepository,
  ...(() => {
    const environmentLocale =
      process.env.LC_ALL ?? process.env.LC_MESSAGES ?? process.env.LANG;
    return environmentLocale === undefined ? {} : { environmentLocale };
  })(),
}).parseAsync(process.argv);
