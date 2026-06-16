/**
 * Parse the Bearer token from an incoming HTTP Authorization header.
 *
 * Used by the HTTP transport to support per-request API-key auth (multi-tenant
 * hosting): a remote caller sends `Authorization: Bearer sk_...` and the server
 * forwards that key to the upstream OneSource API on their behalf.
 *
 * Node lowercases header names; a header value may be `string`, `string[]`
 * (repeated header), or `undefined`. Returns the trimmed token, or `undefined`
 * when the header is absent, uses a non-Bearer scheme, or carries no token.
 */
export function parseBearerToken(
  authorization: string | string[] | undefined,
): string | undefined {
  const raw = Array.isArray(authorization) ? authorization[0] : authorization;
  if (typeof raw !== 'string') return undefined;
  const token = /^Bearer\s+(.+)$/i.exec(raw.trim())?.[1]?.trim();
  return token ? token : undefined;
}
