import { PublicClientApplication, type AccountInfo } from '@azure/msal-browser';
import type { WorkshopIdentity } from '@mission-control/event-contracts';

export interface InstructorIdentity {
  signIn(): Promise<string>;
  token(): Promise<string>;
  signOut(): Promise<void>;
}

export async function createInstructorIdentity(
  config: WorkshopIdentity,
): Promise<InstructorIdentity> {
  const redirect = new URL(config.redirectUri);
  if (
    redirect.origin !== window.location.origin ||
    redirect.pathname !== '/auth.html' ||
    redirect.search !== '' ||
    redirect.hash !== ''
  )
    throw new Error(
      'Instructor sign-in redirect does not match this dashboard.',
    );
  const client = new PublicClientApplication({
    auth: {
      clientId: config.clientId,
      authority: `https://login.microsoftonline.com/${config.tenantId}`,
      redirectUri: config.redirectUri,
    },
    cache: { cacheLocation: 'memoryStorage' },
  });
  await client.initialize();
  let account: AccountInfo | undefined;
  const scopes = [config.scope];
  return {
    async signIn() {
      const result = await client.loginPopup({
        scopes,
        prompt: 'select_account',
      });
      account = result.account;
      return account.homeAccountId;
    },
    async token() {
      if (account === undefined)
        throw new Error('Microsoft sign-in is required.');
      return (await client.acquireTokenSilent({ account, scopes })).accessToken;
    },
    async signOut() {
      const previous = account;
      account = undefined;
      if (previous !== undefined)
        await client.clearCache({ account: previous });
    },
  };
}
