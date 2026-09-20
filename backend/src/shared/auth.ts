/**
 * Authenticated identity extraction (Phase 3+4).
 *
 * API Gateway Cognito JWT authorizer validates the bearer token BEFORE the
 * Lambda runs and injects verified claims into the request context. The
 * backend therefore NEVER trusts an ownerId from the request body —
 * identity always comes from the token sub.
 */

import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { HttpError } from './http';

interface JwtAuthorizerContext {
  jwt?: { claims?: Record<string, unknown> };
}

/** Extract the Cognito sub of the authenticated caller, or 401. */
export function requireJwtSub(event: APIGatewayProxyEventV2): string {
  const ctx = event.requestContext.authorizer as JwtAuthorizerContext | undefined;
  const claims = ctx?.jwt?.claims;
  const sub = claims?.sub;
  if (typeof sub !== 'string' || sub.length === 0) {
    throw new HttpError(401, 'Sign in to continue.', 'UNAUTHORIZED');
  }
  return sub;
}
