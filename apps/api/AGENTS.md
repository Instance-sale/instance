# API Agent Guidelines (`apps/api`)

This app is the core REST backend and webhook ingestion engine for Instance, built with NestJS 11, TypeScript, Prisma ORM, and Redis.

## Architectural Standards

### 1. Webhook Ingestion & Deduplication
- **Immediate 200 OK**: Meta webhooks will timeout and retry if not acknowledged within 3 seconds. Ingest the payload, reserve the event key, enqueue downstream jobs, and return `200 OK` immediately.
- **HMAC Signature Verification**: All requests to `/api/webhook/instagram` must verify `X-Hub-Signature-256` against `INSTAGRAM_APP_SECRET` using `crypto.timingSafeEqual` ([instagram-webhook-router.service.ts](/apps/api/src/instagram/services/instagram-webhook-router.service.ts#L26-L56)).
- **Redis Idempotency**: Always call `redisService.reserveWebhookEvent` before executing logic for comment IDs or message IDs to prevent duplicate triggers from Meta webhook retries.

### 2. Database & State Mutations
- Use Prisma transactions (`prisma.$transaction`) for operations that span multiple tables (e.g. creating a lead profile, recording a story mention, and enqueueing background jobs).
- Ensure queries filter by `companyId` or verify account ownership to enforce multi-tenant isolation.

### 3. Queue Enqueueing
- Heavy tasks (fetching profile avatars/bios, sending outbound DMs, executing slow sentiment analysis) must be dispatched to background workers via `BackgroundJob` or BullMQ, never executed in the synchronous HTTP request path.

### 4. Health & Error Logging
- All Instagram Graph API call failures must be recorded via `ApiErrorLog` with endpoint and error code.
- Update `InstagramAccountHealth` counters and trigger throttling status on error codes 4 or 429.

### 5. Documentation Sync
- Any new controller endpoint, webhook topic, or cron job must be documented in `docs/` and synced with [docs.json](/docs/docs.json).

