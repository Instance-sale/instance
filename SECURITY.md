# Security Policy

Security and data privacy are fundamental to Instance. Because Instance connects to Meta developer applications and manages direct customer messaging, we treat security reports with the highest urgency.

---

## Supported Versions

| Version | Supported |
| :--- | :--- |
| `0.1.x` (Current Main) | Yes |
| Older releases | No |

---

## Reporting a Security Vulnerability

If you discover a security vulnerability, please do **NOT** open a public GitHub issue.

Please report the issue confidentially via email to:
**security@instance.sales**

### What to Include in Your Report:
- **Title**: Clear vulnerability title (e.g., `Webhook signature timing attack vulnerability`).
- **Description**: Detailed explanation of the vulnerability and attack vector.
- **Steps to Reproduce**: Minimal proof of concept or reproduction steps.
- **Affected Component**: `apps/api`, `apps/web`, `apps/workers`, or `.env` handling.
- **Potential Impact**: Exposure of customer records, token extraction, or unauthorized API execution.

### Response Commitment:
- We will acknowledge receipt of your vulnerability report within **48 hours**.
- We will provide regular updates regarding mitigation progress and coordinated patch release.

---

## Security Best Practices for Self-Hosters

1. **Keep Secrets Private**: Never commit `.env` or share production `NEXTAUTH_SECRET`, `CRON_SECRET`, or `INSTAGRAM_APP_SECRET`.
2. **Always Use HTTPS in Production**: Meta strictly mandates SSL for webhooks and OAuth redirects. Never run production instances on unencrypted HTTP.
3. **Protect Webhook Endpoints**: Instance automatically verifies `X-Hub-Signature-256` headers using your `INSTAGRAM_APP_SECRET`. Never disable signature verification in production.
4. **Isolate Database Access**: Use pooled connection strings with SSL mode enabled (`sslmode=require`) to prevent man-in-the-middle attacks on database queries.

