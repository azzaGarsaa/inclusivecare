import { generateToken, hashToken } from './tokens.js';

describe('tokens', () => {
  it('generates distinct URL-safe tokens', () => {
    const a = generateToken();
    const b = generateToken();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[\w-]{43}$/);
  });

  it('hashes deterministically without exposing the token', () => {
    const token = generateToken();
    expect(hashToken(token)).toBe(hashToken(token));
    expect(hashToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(token)).not.toContain(token);
  });
});
