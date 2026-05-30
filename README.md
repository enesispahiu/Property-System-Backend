# Property Rental System Backend

NestJS API for a multi-tenant property rental system. The React frontend is a separate repository and communicates with this service only through HTTP REST endpoints.

## Stack

- NestJS controllers, services, modules, guards, middleware, and scheduled jobs
- Prisma ORM with PostgreSQL
- JWT access tokens and refresh tokens
- Swagger UI at `/api/docs`
- Local Ollama integration for AI assistant features

## Setup

```bash
npm install
npx prisma generate
npx prisma migrate deploy
npm run seed
npm run start:dev
```

The API runs on `http://localhost:3000` unless `PORT` is set.

## Ollama AI Setup

AI endpoints use a local Ollama server, not OpenAI.

```bash
ollama --version
ollama pull llama3.2
ollama serve
```

Check available local models:

```bash
curl http://localhost:11434/api/tags
```

The backend also exposes `GET /ai/health`, which returns safe JSON even when Ollama is unavailable.

## Environment

Create a local `.env` file. Do not commit real environment files.

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/property_system?schema=public
JWT_SECRET=replace_me
JWT_ACCESS_SECRET=replace_me
JWT_REFRESH_SECRET=replace_me
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_TTL_SECONDS=60
PORT=3000
```

## Redis Search Cache

Public property search uses Redis through `ioredis` with a short TTL. If Redis is unavailable, search still queries PostgreSQL normally and cache read/write/invalidation errors are logged safely.

Local Redis commands:

```bash
docker run -d --name property-redis -p 6379:6379 redis:latest
docker start property-redis
docker ps
docker exec -it property-redis redis-cli ping
```

The ping command should return:

```bash
PONG
```

## Main Endpoints

- `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `POST /auth/refresh`, `GET /auth/me`
- `GET /search/properties`, `GET /search/history` (SuperAdmin only)
- `GET /properties/:id`, `GET /properties/:id/rules`, `GET /properties/:id/availability`
- `POST /properties/:propertyId/availability`, `DELETE /availability/:id`
- `POST /properties/:id/rules`, `DELETE /properties/rules/:ruleId`
- `POST /bookings`, `GET /bookings`, `GET /bookings/user/:userId`, `GET /bookings/:bookingId/invoice`
- `GET /invoices/me`, `GET /invoices/:id`
- `GET /notifications/me`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all`
- `POST /reviews`, `GET /properties/:propertyId/reviews`, `GET /properties/:propertyId/reviews/average`
- `GET /ai/health`, `POST /ai/chat`, `POST /ai/property-description`, `POST /ai/review-analysis`

## Architecture Notes

Tenant-owned data is separated by `tenantId` on users, properties, bookings, and reviews. Public search and property/review reads expose active properties, while protected tenant/admin routes use JWT, role guards, and tenant guards. Bookings store the tenant of the booked property while `GET /bookings/user/:userId` still lets a user see their own bookings across property tenants.

The Prisma schema contains more than 20 rental-domain models. Availability blocks are managed by tenant admins and are checked during booking creation. Booking guests are persisted with each booking when provided, while `guestCount` keeps the requested occupancy even without named guests. Successful payments create one paid invoice per booking/payment, and in-app notifications are created for booking, payment, cancellation, and selected admin lifecycle events.

`CancellationPolicy` and `PropertyRule` are active rental-platform models. Properties can reference a cancellation policy and expose house rules publicly. Tenant admins can add/remove house rules for their own properties. `ChatRoom` and `ChatMessage` remain in the schema as future/deprecated messaging models and are not presented as completed chat functionality.

Search cache entries are invalidated when property or tenant status changes through the application services.

Scheduled jobs are provided by `@nestjs/schedule`; the current job deletes search history older than 30 days.

## CI/CD Status

Backend CI is defined in `.github/workflows/ci.yml`. It installs dependencies, generates Prisma Client, applies migrations with `prisma migrate deploy`, builds the NestJS project, and runs Jest tests against a PostgreSQL service. No real deployment pipeline is currently implemented in this repository; deployment remains future work.

Project management notes are in `docs/project-management.md`.

## Testing

```bash
npm run build
npm run test
npm run test:e2e
```

## Collaboration Workflow

Use GitHub Projects or Jira to track epics, issues, and subissues. Work should happen on feature branches, with pull requests into `main`. PRs should include a short summary, test evidence, linked issue, and reviewer approval before merge. Do not rewrite shared history after a branch is published.
