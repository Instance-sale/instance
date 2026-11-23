# Instance API Server (`apps/api`)

The backend REST API and webhook ingestion service for Instance, built with NestJS 11, TypeScript, and Prisma ORM.

## Key Responsibilities

- **Meta Webhook Ingestion**: Receives live Instagram events (`messages`, `messaging_postbacks`, `comments`, `mention`).
- **Cryptographic Security**: Validates `X-Hub-Signature-256` HMAC signatures on all incoming payloads.
- **Webhook Deduplication**: Leverages Redis idempotency locks to eliminate duplicate event executions.
- **REST APIs**: Powers the Next.js dashboard with CRM lead pipelines, audience lists, media uploads, and automation management.
- **Public Developer REST API**: Exposes `/api/v1/` endpoints with API key authentication and rate limiting for external integrations and AI agents.
- **Queue Dispatch**: Offloads long-running message delivery and profile enrichments to BullMQ workers.

## Local Development

```bash
# Run from repository root
pnpm dev:api

# Run tests
pnpm --filter @instance/api test

# Typecheck
pnpm --filter @instance/api typecheck
```

## Documentation

For full setup instructions, environment variable references, and Meta Developer Portal configurations:
- [Installation Guide](https://docs.instance.sale/oss/installation)
- [Instagram Setup Guide](https://docs.instance.sale/oss/instagram-setup)
- [Meta App Review & Live Mode](https://docs.instance.sale/oss/meta-app-review)
- [Developer API & MCP Guide](https://docs.instance.sale/oss/api)
- [Full Documentation Portal](https://docs.instance.sale/oss)

