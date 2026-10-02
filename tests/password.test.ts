import { describe, expect, it } from 'vitest';
import {
  hashPassword,
  verifyPassword,
} from '../worker/auth/password';

describe('password authentication', () => {
  it('hashes and verifies a valid password', async () => {
    const password = 'AdPilot-Secure-Password-2026!';

    const hash = await hashPassword(password);

    expect(hash).toMatch(
      /^pbkdf2\$SHA-256\$310000\$/,
    );

    await expect(
      verifyPassword(password, hash),
    ).resolves.toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await hashPassword(
      'AdPilot-Secure-Password-2026!',
    );

    await expect(
      verifyPassword('Wrong-Password-2026!', hash),
    ).resolves.toBe(false);
  });

  it('rejects passwords shorter than 12 characters', async () => {
    await expect(
      hashPassword('short'),
    ).rejects.toThrow(
      'Password must contain at least 12 characters.',
    );
  });
});
