import { afterEach, expect, it, vi } from 'vitest';

import { createInstructorIdentity } from '../src/instructor-identity.js';

const msal = vi.hoisted(() => ({
  options: vi.fn(),
  initialize: vi.fn(() => Promise.resolve()),
  loginPopup: vi.fn(),
  acquireTokenSilent: vi.fn(),
  clearCache: vi.fn(() => Promise.resolve()),
}));
vi.mock('@azure/msal-browser', () => ({
  PublicClientApplication: class {
    constructor(options: unknown) {
      msal.options(options);
    }
    initialize = msal.initialize;
    loginPopup = msal.loginPopup;
    acquireTokenSilent = msal.acquireTokenSilent;
    clearCache = msal.clearCache;
  },
}));
afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

const config = {
  tenantId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  scope: 'api://33333333-3333-4333-8333-333333333333/Workshop.Access',
  redirectUri: 'https://dashboard.example.test/auth.html',
};

it('initializes memory-only popup auth, never selects a cached account, and renews access tokens silently', async () => {
  vi.stubGlobal('window', {
    location: { origin: 'https://dashboard.example.test' },
  });
  const identity = await createInstructorIdentity(config);
  expect(msal.initialize).toHaveBeenCalledOnce();
  expect(msal.loginPopup).not.toHaveBeenCalled();
  expect(msal.options).toHaveBeenCalledWith({
    auth: {
      clientId: config.clientId,
      authority: `https://login.microsoftonline.com/${config.tenantId}`,
      redirectUri: config.redirectUri,
    },
    cache: { cacheLocation: 'memoryStorage' },
  });
  await expect(identity.token()).rejects.toThrow('required');
  const account = { homeAccountId: 'selected-synthetic-account' };
  msal.loginPopup.mockResolvedValue({ account });
  expect(await identity.signIn()).toBe(account.homeAccountId);
  msal.acquireTokenSilent.mockResolvedValue({
    accessToken: 'synthetic-access-token',
  });
  expect(await identity.token()).toBe('synthetic-access-token');
  expect(msal.acquireTokenSilent).toHaveBeenCalledWith({
    account,
    scopes: [config.scope],
  });
  await identity.signOut();
  expect(msal.clearCache).toHaveBeenCalledWith({ account });
  await expect(identity.token()).rejects.toThrow('required');
});

it('rejects a cross-origin redirect before constructing an authentication client', async () => {
  vi.stubGlobal('window', {
    location: { origin: 'https://another.example.test' },
  });
  await expect(createInstructorIdentity(config)).rejects.toThrow(
    'does not match',
  );
  expect(msal.options).not.toHaveBeenCalled();
});
