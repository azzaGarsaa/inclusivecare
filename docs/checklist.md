# Development checklist

A box is ticked only when the feature is implemented and covered by a passing test.

## Phase 1 (MVP)

### M0 Foundations

- [x] Repository with npm workspaces (`apps/api`, `apps/web`), Node version pinned
- [x] Local infrastructure with Docker Compose (PostgreSQL + PostGIS, Redis, Mailpit)
- [x] API: validated environment configuration, structured logging, security headers
- [x] API: consistent success and error format, validation, versioned routes, rate limiting
- [x] API: Prisma with migrations, separate test database, development seed
- [x] API: OpenAPI document and Swagger UI; web types generated from it
- [x] Web: accessible shell (skip link, landmarks, focus and title on navigation)
- [x] Web: French, English and Arabic with runtime switching and right-to-left
- [x] Web: display settings (text size, contrast, reduced motion, simplified layout)
- [x] Browser tests with automated accessibility scans
- [ ] Continuous integration pipeline
- [ ] Linting for the web app

### M1 Identity and profiles

- [x] Registration with consent records and email verification
- [x] Sign-in, sign-out, session refresh with rotation and reuse detection
- [x] Password reset by email
- [x] Own account: profile, password change, account deletion
- [x] Roles (`USER`, `MODERATOR`, `ADMIN`) and role-based access control
- [x] User administration: search, filters, pagination, roles, suspension
- [x] Audit log for sensitive operations
- [x] Transactional emails in three languages
- [ ] Beneficiary profiles (a person cared for, with or without an account)
- [ ] Care relationships: acting on behalf of a beneficiary, with scopes
- [ ] Addresses
- [ ] Terms of use and privacy policy pages (legal text to be supplied)
- [ ] Two-factor authentication for administrators

### M2 Organisations and admin

- [ ] Organisations, members and capabilities
- [ ] Document upload and verification queue
- [ ] Admin shell and audit log viewer

### M3 Catalogue

- [ ] Categories and attribute definitions
- [ ] Vendor product management
- [ ] Search, needs-based filters, wishlist

### M4 Orders and notifications

- [ ] Cart and multi-vendor checkout
- [ ] Order tracking and vendor order handling
- [ ] In-app and email notifications, background jobs

### M5 Healthcare directory

- [ ] Professionals and institutions
- [ ] Geographic search and accessibility facilities
- [ ] Appointment requests

### M6 Rentals

- [ ] Rental catalogue and availability
- [ ] Booking lifecycle and reminders

### M7 Reviews

- [ ] Structured accessibility reviews and verified badges
- [ ] Photos, reports and moderation

### M8 Dashboards and hardening

- [ ] Role dashboards
- [ ] Data export
- [ ] Security review and full manual accessibility audit
- [ ] Deployment documentation

## Known limitations

- The French and Arabic interface text was written without review by native speakers.
- Accessibility has been checked with automated tools and keyboard-driven browser tests only.
  No screen reader testing has been done yet.
- Emails are sent directly rather than through a retrying queue; a mail server outage loses
  the message. The user can ask for it again.
- Rate limiting is counted in memory, so it is per API instance.
