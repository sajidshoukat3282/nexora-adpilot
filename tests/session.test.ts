import { describe, expect, it } from 'vitest';
import {
  createSession,
  revokeSession,
  clearSessionCookie,
} from '../worker/auth/session';

function createMockDb() {
  const inserted: Record<string, unknown>[] = [];
  let revoked = false;

  const db = {
    prepare(sql: string) {
      return {
        bind(...values: unknown[]) {
          return {
            async run() {
              if (sql.includes('INSERT INTO sessions')) {
                inserted.push({
                  sql,
                  values,
                });
              }

              if (sql.includes('UPDATE sessions')) {
                revoked = true;
              }

              return {
                success: true,
                meta: {
                  changes: sql.includes('UPDATE sessions') && revoked ? 1 : 0,
                },
              };
            },
          };
        },
      };
    },
  } as unknown as D1Database;

  return {
    db,
    inserted,
    isRevoked: () => revoked,
  };
}

describe('session authentication', () => {
  it('creates a secure session cookie and stores only the token hash', async () => {
    const mock = createMockDb();

    const session = await createSession(
      mock.db,
      'account-1',
      'membership-1',
    );

    expect(session.sessionId).toBeTruthy();
    expect(session.expiresAt).toBeTruthy();

    expect(session.setCookie).toContain(
      'adpilot_session=',
    );
    expect(session.setCookie).toContain(
      'HttpOnly',
    );
    expect(session.setCookie).toContain(
      'Secure',
    );
    expect(session.setCookie).toContain(
      'SameSite=Lax',
    );
    expect(session.setCookie).toContain(
      'Max-Age=2592000',
    );

    expect(mock.inserted).toHaveLength(1);

    const values = mock.inserted[0].values as unknown[];

    expect(values[1]).toBe('account-1');
    expect(values[2]).toBe('membership-1');

    const tokenHash = values[3];

    expect(typeof tokenHash).toBe('string');
    expect(tokenHash).toMatch(/^[a-f0-9]{64}$/);

    expect(session.setCookie).not.toContain(
      tokenHash as string,
    );
  });

  it('revokes an active session', async () => {
    const mock = createMockDb();

    const session = await createSession(
      mock.db,
      'account-1',
      'membership-1',
    );

    const cookie = session.setCookie.split(';')[0];

    const request = new Request(
      'https://adpilot.test/api/auth/logout',
      {
        method: 'POST',
        headers: {
          Cookie: cookie,
        },
      },
    );

    const revoked = await revokeSession(
      request,
      mock.db,
    );

    expect(revoked).toBe(true);
    expect(mock.isRevoked()).toBe(true);
  });

  it('clears the session cookie securely', () => {
    const cookie = clearSessionCookie();

    expect(cookie).toContain(
      'adpilot_session=',
    );
    expect(cookie).toContain(
      'HttpOnly',
    );
    expect(cookie).toContain(
      'Secure',
    );
    expect(cookie).toContain(
      'SameSite=Lax',
    );
    expect(cookie).toContain(
      'Max-Age=0',
    );
  });
});
