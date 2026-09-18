/**
 * HTTP plumbing for API Gateway HTTP API (payload v2): CORS + JSON responses.
 * Error mapping lives in errors.ts; request parsing/validation in validate.ts.
 */

import type { APIGatewayProxyResultV2 } from 'aws-lambda';

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

/**
 * CORS — locked down at deploy time via the ALLOWED_ORIGIN template parameter
 * (Amplify domain in production, http://localhost:5173 in dev). The wildcard
 * here is only the template's documented dev default, never the production value.
 */
export const corsHeaders = (allowedOrigin: string): Record<string, string> => ({
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json; charset=utf-8',
});

export function jsonResponse(
  status: number,
  body: unknown,
  allowedOrigin: string,
): APIGatewayProxyResultV2 {
  return { statusCode: status, headers: corsHeaders(allowedOrigin), body: JSON.stringify(body) };
}
