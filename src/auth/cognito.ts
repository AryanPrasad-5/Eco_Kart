/**
 * Zero-dependency Cognito user-pool auth client (Phase 3).
 *
 * Talks directly to the public Cognito IDP JSON API (USER_PASSWORD_AUTH +
 * REFRESH_TOKEN_AUTH over HTTPS). No AWS SDK, no AWS credentials, no client
 * secret - a public user-pool client by design. The backend never sees the
 * password; it only ever receives the resulting access token, which API
 * Gateway verifies against the user pool before the Lambda runs.
 */

export interface AuthSession {
  accessToken: string;
  /** ID token - sent as the API bearer (audience-checked by the JWT authorizer). */
  idToken: string;
  refreshToken: string;
  /** Cognito sub - stable user id used as listing ownerId. */
  sub: string;
  email: string;
  /** access-token expiry (ms epoch). */
  expiresAt: number;
}

const LS_KEY = 'smartsort.session.v1';

export class CognitoError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = 'CognitoError';
  }
}

function poolConfig(): { poolId: string; clientId: string } {
  const poolId = import.meta.env.VITE_COGNITO_USER_POOL_ID as string | undefined;
  const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID as string | undefined;
  if (!poolId || !clientId) {
    throw new CognitoError('NotConfigured', 'Authentication is not configured in this build.');
  }
  return { poolId, clientId };
}

function idpBase(poolId: string): string {
  return 'https://cognito-idp.' + poolId.split('_')[0] + '.amazonaws.com/';
}

interface IdpResult extends Record<string, unknown> {
  __type?: string;
  message?: string;
  AuthenticationResult?: {
    AccessToken?: string;
    IdToken?: string;
    RefreshToken?: string;
    ExpiresIn?: number;
  };
}

async function idpCall<T extends IdpResult>(poolId: string, operation: string, payload: Record<string, unknown>): Promise<T> {
  let res: Response;
  try {
    res = await fetch(idpBase(poolId), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-amz-json-1.1',
        'X-Amz-Target': 'AWSCognitoIdentityProviderService.' + operation,
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new CognitoError('NetworkError', 'Cannot reach the authentication service.');
  }
  const body = (await res.json().catch(() => ({}))) as T;
  if (!res.ok) {
    const code = (body.__type ?? 'Error').split('.').pop() ?? 'Error';
    throw new CognitoError(code, body.message ?? 'Authentication failed.');
  }
  return body;
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const part = token.split('.')[1] ?? '';
  try {
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(decodeURIComponent(escape(atob(b64)))) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function sessionFrom(result: NonNullable<IdpResult['AuthenticationResult']>): AuthSession {
  if (!result.AccessToken || !result.IdToken || !result.RefreshToken) {
    throw new CognitoError('InvalidSession', 'Authentication response was incomplete.');
  }
  const claims = decodeJwtPayload(result.AccessToken);
  return {
    accessToken: result.AccessToken,
    idToken: result.IdToken,
    refreshToken: result.RefreshToken,
    sub: typeof claims.sub === 'string' ? claims.sub : '',
    email: typeof claims.email === 'string' ? claims.email : typeof claims.username === 'string' ? claims.username : '',
    expiresAt: Date.now() + (typeof result.ExpiresIn === 'number' ? result.ExpiresIn * 1000 : 3600000) - 30000,
  };
}

/* - session persistence (the refresh token keeps the session alive) --- */

export function persistSession(session: AuthSession): void {
  localStorage.setItem(LS_KEY, JSON.stringify(session));
}

export function loadSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  localStorage.removeItem(LS_KEY);
}

/* - public auth operations -------------------------------------------- */

export async function signUp(email: string, password: string): Promise<{ confirmed: boolean }> {
  const { poolId, clientId } = poolConfig();
  const res = await idpCall<IdpResult & { UserConfirmed?: boolean }>(poolId, 'SignUp', {
    ClientId: clientId,
    Username: email,
    Password: password,
    UserAttributes: [{ Name: 'email', Value: email }],
  });
  return { confirmed: res.UserConfirmed === true };
}

export async function confirmSignUp(email: string, code: string): Promise<void> {
  const { poolId, clientId } = poolConfig();
  await idpCall(poolId, 'ConfirmSignUp', { ClientId: clientId, Username: email, ConfirmationCode: code });
}

export async function signIn(email: string, password: string): Promise<AuthSession> {
  const { poolId, clientId } = poolConfig();
  const res = await idpCall<IdpResult>(poolId, 'InitiateAuth', {
    AuthFlow: 'USER_PASSWORD_AUTH',
    ClientId: clientId,
    AuthParameters: { USERNAME: email, PASSWORD: password },
  });
  if (!res.AuthenticationResult) {
    throw new CognitoError('ChallengeRequired', 'Additional verification is required for this account.');
  }
  const session = sessionFrom(res.AuthenticationResult);
  persistSession(session);
  return session;
}

/** Exchange the refresh token for a fresh access token; updates the session. */
export async function refreshSession(): Promise<AuthSession | null> {
  const current = loadSession();
  if (!current?.refreshToken) return null;
  const { poolId, clientId } = poolConfig();
  const res = await idpCall<IdpResult>(poolId, 'InitiateAuth', {
    AuthFlow: 'REFRESH_TOKEN_AUTH',
    ClientId: clientId,
    AuthParameters: { REFRESH_TOKEN: current.refreshToken },
  });
  if (!res.AuthenticationResult?.AccessToken) return null;
  const fresh: AuthSession = {
    ...current,
    accessToken: res.AuthenticationResult.AccessToken,
    idToken: res.AuthenticationResult.IdToken ?? current.idToken,
    expiresAt: Date.now() + (typeof res.AuthenticationResult.ExpiresIn === 'number' ? res.AuthenticationResult.ExpiresIn * 1000 : 3600000) - 30000,
  };
  persistSession(fresh);
  return fresh;
}

export function signOut(): void {
  clearSession();
}

/** Valid (unexpired) ID token for API calls, refreshing when needed. */
export async function getAccessToken(): Promise<string | null> {
  const s = loadSession();
  if (!s) return null;
  if (Date.now() < s.expiresAt) return s.idToken;
  const fresh = await refreshSession();
  return fresh?.idToken ?? null;
}
