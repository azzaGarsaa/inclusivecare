# InclusiveCare

A digital platform for people with disabilities, their families, caregivers,
healthcare professionals and service providers.

- **API:** NestJS 12, PostgreSQL 17 (PostGIS), Prisma 7
- **Web:** Angular 22, Angular Material, Transloco (French, English, Arabic with right-to-left)
- **Status:** Phase 1 in progress. See [docs/checklist.md](docs/checklist.md) for what is built
  and [docs/InclusiveCare-Roadmap.pdf](docs/InclusiveCare-Roadmap.pdf) for the plan.

## Requirements

- Node.js 24 (`nvm use` reads `.nvmrc`)
- Docker with Compose
- Google Chrome, only for the browser tests

## Getting started

```bash
nvm use
npm install

# PostgreSQL (5433), Redis (6380) and Mailpit (SMTP 1025, inbox on 8025)
npm run infra:up

# API configuration, then database schema and demo data
cp apps/api/.env.example apps/api/.env      # then set JWT_ACCESS_SECRET (openssl rand -base64 48)
sed 's|/inclusivecare?|/inclusivecare_test?|; s|^NODE_ENV=.*|NODE_ENV=test|' apps/api/.env > apps/api/.env.test
npm run db:deploy -w api
npm run db:seed -w api

# In two terminals
npm run dev:api      # http://localhost:3333/api/v1   (Swagger UI: /api/docs)
npm run dev:web      # http://localhost:4200
```

Emails sent in development (confirmation and reset links) appear in Mailpit at
<http://localhost:8025>.

### Demo accounts

Created by the seed. All use the password `InclusiveCare-dev-2026`. Every person is fictional.

| Email | Role | Language |
| --- | --- | --- |
| `admin@inclusivecare.local` | Administrator | English |
| `moderator@inclusivecare.local` | Moderator | Arabic |
| `amina@inclusivecare.local` | User | French |
| `james@inclusivecare.local` | User | English |
| `leila@inclusivecare.local` | User | Arabic |

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev:api` / `npm run dev:web` | Start the API / the web app with reload |
| `npm run build` | Production build of both apps |
| `npm test` | Unit tests of both apps |
| `npm run test:e2e` | API integration tests against the `inclusivecare_test` database |
| `npm run test:browser` | Browser journeys and accessibility scans (Playwright, axe) |
| `npm run lint` | Lint the API |
| `npm run api:types` | Regenerate the web app's API types from the API's OpenAPI document |
| `npm run db:migrate -w api` | Create and apply a migration after changing the Prisma schema |
| `npm run db:seed -w api` | Load or reset the demo accounts |
| `npm run infra:up` / `infra:down` | Start / stop the local infrastructure |

The browser tests need the infrastructure running and the demo accounts seeded. They start the
API and the web app themselves if they are not already running.

## Repository layout

```
apps/api      NestJS API (modular monolith)
apps/web      Angular application
e2e           Playwright browser tests
docs          Architecture notes, checklist, roadmap
infra         Local infrastructure configuration
tools         Scripts (roadmap PDF generator)
```

More detail in [docs/architecture.md](docs/architecture.md).
