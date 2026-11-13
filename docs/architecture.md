# Architecture

This document describes what is built. The plan for what comes next is in
`InclusiveCare-Roadmap.pdf`; progress is tracked in `checklist.md`.

## Overview

```
Browser ── Angular app (apps/web)
              │  /api/v1  (same origin: dev proxy locally, reverse proxy in production)
              ▼
          NestJS API (apps/api) ── PostgreSQL
              │
              └── SMTP (Mailpit in development)
```

Redis is provisioned in `docker-compose.yml` but not used yet. It arrives with background jobs
(BullMQ) in milestone M4; until then emails are sent directly, without waiting for the result.

## API

### Module rules

- One folder per business module under `src/modules`, each with `controllers/`, `dto/`,
  `services/`, `repositories/`.
- A module's `index.ts` is its public surface. Other modules import from it and nothing else.
- Only repositories talk to Prisma. One Prisma schema file per module in `prisma/schema/`.
- Schema changes go through migrations (`npm run db:migrate -w api`). There is no automatic
  schema synchronisation.

### Current modules

| Module | Responsibility |
| --- | --- |
| `identity` | Registration, email verification, sign-in, sessions, password reset, own account, user administration, roles |
| `mail` | `Mailer` contract and its SMTP implementation |
| `audit` | Append-only log of sensitive operations |
| `health` | Liveness and database check |

### Conventions

- Routes are prefixed `/api/v1` (URI versioning).
- Success: `{ "data": … }`, plus `"meta"` for paginated lists.
- Failure: `{ "error": { "code", "message", "details" } }`. Codes are stable and are what the
  web app translates; see `src/common/errors/error-codes.ts`.
- Every route requires a signed-in user unless marked `@Public()`. `@Roles(...)` restricts
  further.
- Validation uses `class-validator` DTOs; unknown properties are rejected.
- The OpenAPI document is generated from the code (Swagger UI at `/api/docs` outside
  production). The web app's types are generated from it with `npm run api:types`.

### Authentication

| Aspect | Decision |
| --- | --- |
| Passwords | Argon2id. Minimum 10 characters, no composition rules (NIST SP 800-63B). |
| Access token | JWT (HS256), 15 minutes, carries only the user id. Held in memory by the web app. |
| Refresh token | Random 256-bit value in an `HttpOnly`, `SameSite=Strict` cookie scoped to `/api/v1/auth`. Stored as a SHA-256 hash. 30 days. |
| Rotation | Each refresh token works once. Reusing an old one revokes the whole session. A 10-second grace window covers two tabs refreshing together. |
| Authorisation data | User status and roles are read from the database on every request, so a suspension or role change is immediate. |
| Email links | Single-use tokens, stored hashed. Verification: 24 hours. Reset: 1 hour. |
| Enumeration | Registration, resend and forgot-password always answer 204. Sign-in gives one answer for unknown address and wrong password, and spends the same time on both. |
| Rate limits | 120 requests a minute per address overall; 10 a minute on endpoints that take a password or send email. |

`@nestjs/authentication` (first-party, version 0.1 at the time of writing) was considered and
set aside: the specification calls for JWT with refresh tokens, and a pre-1.0 package was judged
too young for the security core. Worth revisiting once it is stable.

### Roles

Platform roles are `USER`, `MODERATOR` and `ADMIN`; a user can hold several, and everyone holds
`USER`. Permissions are expressed in code with `@Roles`. Administrators cannot change their own
roles or status, which also guarantees one administrator always remains. Organisation
membership and care relationships (acting for another person) are added in later milestones.

### Account deletion

Deleting an account closes it and overwrites the email, name and password hash. The row is
kept so later records (orders, reviews) keep a valid owner. The email address becomes free to
register again.

### Database

Tables so far: `users`, `user_roles`, `refresh_tokens`, `one_time_tokens`, `consents`,
`audit_logs`. All primary keys are UUIDs and all timestamps are `timestamptz`.

## Web

### Structure

```
src/app/core      Singletons: API types, authentication, i18n, accessibility settings
src/app/shared    Reusable UI and form helpers
src/app/features  One folder per feature, lazy-loaded
```

Components are standalone, use `OnPush` change detection and signals, and the app runs without
zone.js.

### Accessibility

Target: WCAG 2.2 AA. What is in place:

- Skip link, landmarks, one `<h1>` per page. After navigation, focus moves to the new page's
  heading and the document title is updated in the active language.
- All sizes in `rem`. The text-size setting changes the root font size, so everything scales.
- Display settings (text size, high contrast, reduced motion, simplified layout) apply
  immediately, are remembered on the device and saved to the account.
- Forms: visible labels, `autocomplete` attributes, errors linked to their field, focus moved
  to the first invalid field on submit, submit buttons never disabled, show/hide on passwords
  instead of a confirmation field.
- Persistent inline messages (`role="alert"` / `role="status"`) rather than timed toasts.
- Layout uses logical CSS properties; Arabic switches the whole interface to right-to-left.
- Native `<select>` for language and filters; controls are at least 44 px high.

Automated checks (axe, in `e2e/tests/accessibility.spec.ts`) cover every page in the three
languages and in high-contrast mode. Automated tools find only part of the problems: a manual
pass with a keyboard and with screen readers is still required before release.

### Internationalisation

Interface text lives in `public/i18n/{fr,en,ar}.json`. A unit test fails if the three files do
not have the same keys and placeholders. The language is taken from the account after sign-in,
otherwise from the device's last choice, otherwise from the browser.

## Testing

| Layer | Tool | Location |
| --- | --- | --- |
| API unit | Vitest | `apps/api/src/**/*.spec.ts` |
| API integration | Vitest, Supertest, real PostgreSQL | `apps/api/test` |
| Web unit | Vitest (Angular test runner) | `apps/web/src/**/*.spec.ts` |
| Browser journeys and accessibility | Playwright, axe-core | `e2e/tests` |
