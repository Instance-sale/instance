# Workers Agent Guidelines (`apps/workers`)

This service manages background job execution, BullMQ queue processing, rate limit checking, and outbound Instagram message delivery for Instance.

## Architectural Standards

### 1. Job Processing & Idempotency
- All BullMQ worker jobs (`FETCH_PROFILE`, `SEND_DM`, `REPLY_COMMENT`, `SEND_MEDIA`) must be idempotent.
- Verify job payload parameters before executing API calls to prevent invalid requests to Meta.

### 2. Pre-Flight Rate Limit & Health Verification
- Before sending any outbound message, query `InstagramAccountHealth` for the target account.
- If the account is paused (`isPaused = true`) or throttled (`status = 'THROTTLED'` or `'RESTRICTED'`), do not discard the job. Re-queue the job with a delayed backoff (`job.moveToDelayed`).

### 3. Circuit Breaker on API Errors
- When the Graph API returns error code 4 or 429:
  1. Record the error in `ApiErrorLog`.
  2. Set `isPaused = true` and `status = 'THROTTLED'` in `InstagramAccountHealth`.
  3. Schedule `resumeAt = Date.now() + 60 minutes`.
  4. Move pending jobs to delayed state.

### 4. Anti-Ban Human Pacing (Jitter)
- Do not burst multiple messages to Instagram at the same millisecond.
- Inject randomized jitter delays (between 3 and 12 seconds) between message dispatches to protect account health.

### 5. Documentation Sync
- Any changes to queue retry logic, backoff multipliers, or job payload structures must be updated in `docs/safety.mdx`.

