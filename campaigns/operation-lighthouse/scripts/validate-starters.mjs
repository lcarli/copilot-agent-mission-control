import { readFile, stat } from 'node:fs/promises';
import { dirname, isAbsolute, join, normalize, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const campaignRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const startersRoot = join(campaignRoot, 'starters');
const manifest = JSON.parse(
  await readFile(join(startersRoot, 'starter-manifest.json'), 'utf8'),
);

if (manifest.schemaVersion !== '1.0' || !Array.isArray(manifest.missions)) {
  throw new Error('Starter manifest is invalid.');
}

let previousGuidance = Number.POSITIVE_INFINITY;
const missionIds = new Set();
for (const mission of manifest.missions) {
  if (
    typeof mission.missionId !== 'string' ||
    missionIds.has(mission.missionId) ||
    !Number.isSafeInteger(mission.guidanceLevel) ||
    mission.guidanceLevel >= previousGuidance ||
    !Array.isArray(mission.files) ||
    mission.files.length === 0
  ) {
    throw new Error(
      `Invalid progressive starter: ${String(mission.missionId)}`,
    );
  }
  missionIds.add(mission.missionId);
  previousGuidance = mission.guidanceLevel;

  for (const file of mission.files) {
    if (typeof file !== 'string' || isAbsolute(file)) {
      throw new Error(`Invalid starter path: ${String(file)}`);
    }
    const resolved = normalize(join(startersRoot, file));
    if (relative(startersRoot, resolved).startsWith('..')) {
      throw new Error(`Starter path escapes root: ${file}`);
    }
    if (!(await stat(resolved)).isFile()) {
      throw new Error(`Starter file is missing: ${file}`);
    }
    const content = await readFile(resolved, 'utf8');
    if (
      /-----BEGIN [A-Z ]*PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9_]+/u.test(
        content,
      )
    ) {
      throw new Error(`Starter contains credential-like content: ${file}`);
    }
  }
}

if (manifest.missions.length !== 5 || previousGuidance !== 1) {
  throw new Error('All five progressive mission starters are required.');
}

console.log('Operation Lighthouse starter structure is valid.');
