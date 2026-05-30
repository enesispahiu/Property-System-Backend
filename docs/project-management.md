# Project Management

## Team Roles

- Backend/API: NestJS modules, Prisma schema, authentication, tenant scoping, bookings, payments, invoices, notifications, Redis cache, and Ollama integration.
- Frontend/UI: React/Vite pages, customer booking flow, tenant admin panels, SuperAdmin panels, notifications, invoices, and property details.
- QA/Testing: Unit and e2e tests, manual smoke testing, build verification, and regression checks for auth, booking, payment, search, reviews, and admin flows.
- Documentation/DevOps: README updates, CI workflow documentation, seed instructions, environment setup, and project-management evidence.

## Completed Phases

- Core multi-tenant rental platform with tenants, users, roles, properties, bookings, reviews, payments, favorites, and search.
- Redis-backed public search cache with safe fallback when Redis is unavailable.
- Ollama-based AI assistant and property/review helper endpoints. No OpenAI provider is used.
- Availability blocks and booking guests as real rental-platform features.
- Invoices after successful payment and in-app notifications for booking/payment/cancel/admin lifecycle events.
- Cancellation policies and property house rules for property details and admin management.
- SuperAdmin search history UI backed by the existing protected `/search/history` endpoint.

## Feature List

- Public property search, filters, property details, reviews, favorites, booking, and payment.
- Tenant admin listing management, blocked availability management, house rule management, reservations, users, and reviews.
- SuperAdmin tenant lifecycle management, tenant admin creation, and search history review.
- Customer dashboards for bookings, payment state, invoices, notifications, favorites, and reviews.
- Backend guards for JWT auth, role access, and tenant data scoping.

## Branch Strategy

Work is organized on feature branches and merged through pull requests into `main`. Branch names should identify the feature or phase, for example `feature/availability-booking-guests` or `docs/project-management`.

## Pull Requests And Review

Pull requests should include a summary, changed areas, test/build evidence, linked task, and reviewer approval before merge. The workflow is GitHub PR/code-review based; the repository does not claim Jira or GitHub Projects artifacts unless those boards are provided separately.

## Sprint And Task Board Explanation

Tasks are grouped by project phase: core platform, rental booking flow, admin operations, AI/cache support, invoices/notifications, property rules/policies, UI polish, tests, and documentation. A simple Kanban board can use `Backlog`, `In Progress`, `Review`, and `Done` columns.

## Work Division

Backend and frontend work are split by API contract. Backend tasks define schema, migrations, services, guards, Swagger docs, and tests. Frontend tasks consume stable endpoints and add customer/admin UI only after backend behavior builds successfully.

## CI/CD Status

Backend CI exists in `.github/workflows/ci.yml` and runs dependency install, Prisma generation, migration deploy, build, and Jest tests against PostgreSQL. Frontend CI exists in the frontend repository and runs dependency install and production build. There is no real deployment pipeline in the repositories, so deployment is documented as future work.
