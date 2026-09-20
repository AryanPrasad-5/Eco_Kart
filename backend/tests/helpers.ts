import type { APIGatewayProxyResultV2 } from 'aws-lambda';

export interface JsonObjectResult {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

/** APIGatewayProxyResultV2 is a union that includes bare `string`; narrow it. */
export function asObjectResult(res: APIGatewayProxyResultV2): JsonObjectResult {
  if (typeof res === 'string') throw new Error('Expected object response, got string');
  return res as JsonObjectResult;
}

export function jsonBody(res: APIGatewayProxyResultV2): any {
  return JSON.parse(asObjectResult(res).body);
}
