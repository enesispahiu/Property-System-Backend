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
PORT=3000
```

## Main Endpoints

- `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `POST /auth/refresh`, `GET /auth/me`
- `GET /search/properties`
- `GET /properties/:id`
- `POST /bookings`, `GET /bookings`, `GET /bookings/user/:userId`
- `POST /reviews`, `GET /properties/:propertyId/reviews`, `GET /properties/:propertyId/reviews/average`
- `GET /ai/health`, `POST /ai/chat`, `POST /ai/property-description`, `POST /ai/review-analysis`

## Architecture Notes

Tenant-owned data is separated by `tenantId` on users, properties, bookings, and reviews. Public search and property/review reads expose active properties, while protected tenant/admin routes use JWT, role guards, and tenant guards. Bookings store the tenant of the booked property while `GET /bookings/user/:userId` still lets a user see their own bookings across property tenants.

The Prisma schema contains 20 rental-domain models. In addition to core tenant, user, property, booking, review, amenity, image, availability, chat, token, search-history, category, and payment records, it includes saved properties through `FavoriteProperty`, user/system messages through `Notification`, billing records through `Invoice`, and named occupants through `BookingGuest`.

Search uses an in-memory cache with a short TTL, so local development does not require Redis. Redis can be added later as an optional shared cache for multi-instance deployments.

Scheduled jobs are provided by `@nestjs/schedule`; the current job deletes search history older than 30 days.

## Testing

```bash
npm run build
npm run test
npm run test:e2e
```

## Collaboration Workflow

Use GitHub Projects or Jira to track epics, issues, and subissues. Work should happen on feature branches, with pull requests into `main`. PRs should include a short summary, test evidence, linked issue, and reviewer approval before merge. Do not rewrite shared history after a branch is published.
