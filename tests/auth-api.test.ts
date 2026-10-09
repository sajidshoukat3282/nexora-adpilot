import { describe, expect, it } from 'vitest';
import worker from '../worker/index';
import { hashPassword } from '../worker/auth/password';

type Account = {
  id: string;
  email: string;
  status: string;
  password_hash: string;
};

type Membership = {
  id: string;
  company_id: string;
  role: string;
  designation: string;
  account_type: 'owner' | 'employee' | 'client';
  status: string;
};

function createMockDb(
  account: Account | null,
  memberships: Membership[],
) {
  const sessionRows: Record<string, unknown>[] = [];

  const db = {
    prepare(sql: string) {
      return {
        bind(...values: unknown[]) {
          return {
            async first() {
              if (sql.includes('FROM accounts')) {
                return account;
              }

              return null;
            },

            async all() {
              if (sql.includes('FROM company_memberships')) {
                return {
                  results: memberships,
                };
              }

              return {
                results: [],
              };
            },

            async run() {
              if (sql.includes('INSERT INTO sessions')) {
                sessionRows.push({
                  sql,
                  values,
                });
              }

              return {
                success: true,
                meta: {
                  changes: 1,
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
    sessionRows,
  };
}

async function createAccount() {
  return {
    id: 'account-1',
    email: 'owner@nexora.test',
    status: 'active',
    password_hash: await hashPassword(
      'AdPilot-Secure-Password-2026!',
    ),
  };
}

const ownerMembership: Membership = {
  id: 'membership-1',
  company_id: 'company-1',
  role: 'owner',
  designation: 'Owner',
  account_type: 'owner',
  status: 'active',
};

describe('authentication API', () => {
  it('logs in with valid client credentials', async () => {
    const account = {
      ...(await createAccount()),
      email: 'client@nexora.test',
    };

    const clientMembership: Membership = {
      ...ownerMembership,
      account_type: 'client',
      role: 'client',
      designation: 'Client',
    };

    const mock = createMockDb(
      account,
      [clientMembership],
    );

    const request = new Request(
      'https://adpilot.test/api/auth/login',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          email: 'CLIENT@NEXORA.TEST',
          password:
            'AdPilot-Secure-Password-2026!',
        }),
      },
    );

    const response = await worker.fetch(
      request,
      {
        ASSETS: {} as Fetcher,
        DB: mock.db,
      },
    );

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body.ok).toBe(true);
    expect(body.account.id).toBe('account-1');
    expect(body.company.id).toBe('company-1');
    expect(body.membership.id).toBe('membership-1');

    const cookie = response.headers.get(
      'set-cookie',
    );

    expect(cookie).toContain(
      'adpilot_session=',
    );
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('SameSite=Lax');

    expect(mock.sessionRows).toHaveLength(1);
  });

  it('rejects an incorrect password', async () => {
    const account = await createAccount();

    const mock = createMockDb(
      account,
      [ownerMembership],
    );

    const request = new Request(
      'https://adpilot.test/api/auth/login',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          email: account.email,
          password: 'Wrong-Password-2026!',
        }),
      },
    );

    const response = await worker.fetch(
      request,
      {
        ASSETS: {} as Fetcher,
        DB: mock.db,
      },
    );

    expect(response.status).toBe(401);

    const body = await response.json();

    expect(body.error).toBe(
      'INVALID_CREDENTIALS',
    );
  });

  it('uses the same generic error for an unknown email', async () => {
    const mock = createMockDb(
      null,
      [],
    );

    const request = new Request(
      'https://adpilot.test/api/auth/login',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          email: 'unknown@nexora.test',
          password:
            'AdPilot-Secure-Password-2026!',
        }),
      },
    );

    const response = await worker.fetch(
      request,
      {
        ASSETS: {} as Fetcher,
        DB: mock.db,
      },
    );

    expect(response.status).toBe(401);

    const body = await response.json();

    expect(body.error).toBe(
      'INVALID_CREDENTIALS',
    );
  });

  it('requires company selection when multiple memberships exist', async () => {
    const account = await createAccount();

    const secondMembership: Membership = {
      ...ownerMembership,
      id: 'membership-2',
      company_id: 'company-2',
    };

    const mock = createMockDb(
      account,
      [
        ownerMembership,
        secondMembership,
      ],
    );

    const request = new Request(
      'https://adpilot.test/api/auth/login',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          email: account.email,
          password:
            'AdPilot-Secure-Password-2026!',
        }),
      },
    );

    const response = await worker.fetch(
      request,
      {
        ASSETS: {} as Fetcher,
        DB: mock.db,
      },
    );

    expect(response.status).toBe(409);

    const body = await response.json();

    expect(body.error).toBe(
      'COMPANY_SELECTION_REQUIRED',
    );
  });
});

describe('session and logout API', () => {
  it('returns the authenticated session context', async () => {
    const mock = createMockDb(
      null,
      [],
    );

    const request = new Request(
      'https://adpilot.test/api/session',
      {
        method: 'GET',
        headers: {
          Cookie:
            'adpilot_session=test-session-token',
        },
      },
    );

    const response = await worker.fetch(
      request,
      {
        ASSETS: {} as Fetcher,
        DB: mock.db,
      },
    );

    expect(response.status).toBe(401);

    const body = await response.json();

    expect(body.error).toBe(
      'UNAUTHENTICATED',
    );
  });

  it('logs out and clears the session cookie', async () => {
    const mock = createMockDb(
      null,
      [],
    );

    const request = new Request(
      'https://adpilot.test/api/auth/logout',
      {
        method: 'POST',
        headers: {
          Cookie:
            'adpilot_session=test-session-token',
        },
      },
    );

    const response = await worker.fetch(
      request,
      {
        ASSETS: {} as Fetcher,
        DB: mock.db,
      },
    );

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body.ok).toBe(true);
    expect(body.authenticated).toBe(false);

    const cookie = response.headers.get(
      'set-cookie',
    );

    expect(cookie).toContain(
      'adpilot_session=',
    );
    expect(cookie).toContain('Max-Age=0');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Secure');
  });
});
