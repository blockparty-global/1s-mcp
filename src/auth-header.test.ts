import { describe, it, expect } from 'vitest';
import { parseBearerToken } from './auth-header.js';

describe('parseBearerToken', () => {
  it('extracts a Bearer token', () => {
    expect(parseBearerToken('Bearer sk_abc123')).toBe('sk_abc123');
  });

  it('is case-insensitive on the scheme', () => {
    expect(parseBearerToken('bearer sk_abc')).toBe('sk_abc');
    expect(parseBearerToken('BEARER sk_abc')).toBe('sk_abc');
  });

  it('trims surrounding whitespace', () => {
    expect(parseBearerToken('  Bearer   sk_abc  ')).toBe('sk_abc');
  });

  it('returns undefined when the header is absent', () => {
    expect(parseBearerToken(undefined)).toBeUndefined();
  });

  it('returns undefined for non-Bearer schemes', () => {
    expect(parseBearerToken('Basic dXNlcjpwYXNz')).toBeUndefined();
  });

  it('returns undefined for a Bearer scheme with no token', () => {
    expect(parseBearerToken('Bearer')).toBeUndefined();
    expect(parseBearerToken('Bearer ')).toBeUndefined();
    expect(parseBearerToken('Bearer    ')).toBeUndefined();
  });

  it('takes the first value when the header is repeated (string[])', () => {
    expect(parseBearerToken(['Bearer sk_first', 'Bearer sk_second'])).toBe('sk_first');
  });
});
