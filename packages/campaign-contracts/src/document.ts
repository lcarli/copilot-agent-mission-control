import { readFile, realpath } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';

import { isAlias, isMap, isPair, isSeq, parseDocument } from 'yaml';

import type { CampaignLoadIssue } from './errors.js';

const formatDocumentPath = (root: string, absolutePath: string): string =>
  relative(root, absolutePath).split(sep).join('/');

const hasAlias = (node: unknown): boolean => {
  if (!node) {
    return false;
  }
  if (isAlias(node)) {
    return true;
  }
  if (isPair(node)) {
    return hasAlias(node.key) || hasAlias(node.value);
  }
  if (isMap(node) || isSeq(node)) {
    return node.items.some((item) => hasAlias(item));
  }
  return false;
};

export const resolvePackPath = async (
  rootDirectory: string,
  requestedPath: string,
): Promise<{ absolutePath: string } | { issue: CampaignLoadIssue }> => {
  const absolutePath = resolve(
    rootDirectory,
    requestedPath.replaceAll('/', sep),
  );
  const relativePath = relative(rootDirectory, absolutePath);
  if (
    isAbsolute(relativePath) ||
    relativePath === '..' ||
    relativePath.startsWith(`..${sep}`)
  ) {
    return {
      issue: {
        documentPath: requestedPath,
        pointer: '',
        code: 'path-outside-pack',
        messageKey: 'campaign.validation.pathOutsidePack',
        args: { path: requestedPath },
      },
    };
  }

  try {
    const realRoot = await realpath(rootDirectory);
    const realTarget = await realpath(absolutePath);
    const realRelative = relative(realRoot, realTarget);
    if (
      isAbsolute(realRelative) ||
      realRelative === '..' ||
      realRelative.startsWith(`..${sep}`)
    ) {
      return {
        issue: {
          documentPath: requestedPath,
          pointer: '',
          code: 'path-outside-pack',
          messageKey: 'campaign.validation.pathOutsidePack',
          args: { path: requestedPath },
        },
      };
    }
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return { absolutePath };
    }
    throw error;
  }

  return { absolutePath };
};

export const readCampaignDocument = async (
  rootDirectory: string,
  absolutePath: string,
): Promise<{ value: unknown } | { issue: CampaignLoadIssue }> => {
  const documentPath = formatDocumentPath(rootDirectory, absolutePath);
  let content: string;
  try {
    content = await readFile(absolutePath, 'utf8');
  } catch (error) {
    return {
      issue: {
        documentPath,
        pointer: '',
        code:
          error instanceof Error && 'code' in error && error.code === 'ENOENT'
            ? 'document-missing'
            : 'document-read-failed',
        messageKey: 'campaign.validation.documentUnreadable',
        args: { path: documentPath },
      },
    };
  }

  try {
    if (absolutePath.toLowerCase().endsWith('.json')) {
      return { value: JSON.parse(content) as unknown };
    }

    const document = parseDocument(content, {
      schema: 'core',
      uniqueKeys: true,
    });
    if (document.errors.length > 0 || hasAlias(document.contents)) {
      return {
        issue: {
          documentPath,
          pointer: '',
          code: 'document-parse-failed',
          messageKey: 'campaign.validation.documentInvalid',
          args: { path: documentPath },
        },
      };
    }

    return { value: document.toJS({ maxAliasCount: 0 }) as unknown };
  } catch {
    return {
      issue: {
        documentPath,
        pointer: '',
        code: 'document-parse-failed',
        messageKey: 'campaign.validation.documentInvalid',
        args: { path: documentPath },
      },
    };
  }
};

export const relativeDocumentPath = (
  rootDirectory: string,
  absolutePath: string,
): string => formatDocumentPath(rootDirectory, absolutePath);

export const parentDirectory = (path: string): string => dirname(path);
