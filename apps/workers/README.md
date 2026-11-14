# Instance Background Workers (`apps/workers`)

The asynchronous job processor for Instance, powered by BullMQ, Redis, and Prisma ORM.

## Key Responsibilities

- **Outbound Message Delivery**: Sends direct messages, carousels, videos, audio notes, and PDFs via the Instagram Graph API.
- **Lead Profile Enrichment**: Fetches public Instagram bios, follower counts, and avatars in the background.
- **Rate Limit Enforcement**: Pre-flight quota verification using `InstagramAccountHealth` before every message dispatch.
- **Anti-Ban Jitter**: Injects randomized delays (3 to 12 seconds) between outgoing messages to emulate human pacing.
- **Circuit Breaker Handling**: Automatically delays queue jobs and initiates backoffs upon receiving Meta rate-limit error codes (4 or 429).

## Local Development

```bash
# Run from repository root
pnpm dev:workers

# Build workers
pnpm --filter @instance/workers build
```

## Documentation

For deep dives into account health tracking, circuit breakers, and rate limit protections:
- [Safety & Anti-Ban Guide](https://docs.instance.sale/oss/safety)
- [Architecture Overview](https://docs.instance.sale/oss/overview)
- [Full Documentation Portal](https://docs.instance.sale/oss)

