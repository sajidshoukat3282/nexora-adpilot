# Nexora AdPilot

**The Operating Platform for OOH & DOOH**

## Phase 2 foundation

This source package contains the Phase 1 frontend plus the additive Phase 2 domain/repository foundation. Existing Phase 1 modules are preserved; Phase 2 boundaries are provider-agnostic and prepared for server-side authentication, tenant isolation, subscriptions, D1/R2, integrations and real delivery providers.

### Foundation covered

1. Multi-tenant company/account/membership boundaries
2. Account/auth and role/designation separation
3. RBAC and protected-request pipeline
4. Subscription, entitlements, seats/devices/usage
5. Global geography and location search
6. Inventory/site/asset foundation
7. Physical dimensions
8. Digital resolution
9. Technical compatibility
10. Rate cards and negotiated rates
11. Multi-currency
12. Deterministic smart media planning
13. CRM/sales lifecycle
14. Campaign workflow and audit history
15. Creative management/storage boundary
16. Approval workflow
17. Scheduling
18. Live delivery/provider boundary
19. Proof of posting/playback
20. Mobile field verification
21. Permission-aware Report Center
22. Analytics
23. Finance/invoice/payment boundaries
24. Client portal visibility
25. Notifications
26. Integration/programmatic boundaries
27. Security/audit boundary

Real payment processing, production D1/R2, live CMS/player integrations, DSP/SSP/OpenRTB execution, AI services and native mobile applications remain intentionally outside this foundation until explicitly authorized.

## Environment configuration

Copy `.env.example` to `.env` for local development. Do not commit `.env` or real secrets.

Current frontend configuration boundary:

- `VITE_APP_ENV` — local environment name
- `VITE_API_BASE_URL` — future backend/API base URL; leave empty while using demo repositories

Production secrets and server-side credentials must not be exposed through `VITE_*` variables.

## Validation

Install dependencies first:

```bash
npm install
```

Then run:

```bash
npm run typecheck
npm run typecheck:domain
npm run test
npm run build
```

The test suite is Vitest-based and focuses on critical domain invariants such as campaign transitions, currency conversion, creative compatibility and report permissions.

`tsconfig.final-domain.json` is intentionally retained as a narrow architecture/domain validation configuration. `tsconfig.json` is the canonical application typecheck configuration; the two configurations have different scopes and are not competing build configurations.
