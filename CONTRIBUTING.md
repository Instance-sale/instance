# Contributing to Instance

Thank you for your interest in contributing to Instance! We are building the open-source standard for Instagram sales automation and CRM, and community contributions are essential to our mission.

---

## Code of Conduct

By participating in this project, you agree to treat everyone with respect, maintain constructive collaboration, and adhere to welcoming, professional communication standards.

---

## Getting Started & Development Setup

To get your local development environment configured, follow the comprehensive guides in our documentation portal:
- [Local Installation Guide](https://docs.instance.sale/oss/installation)
- [Docker Guide](https://docs.instance.sale/oss/docker)
- [Instagram Setup Guide](https://docs.instance.sale/oss/instagram-setup)
- [Meta App Review & Live Mode](https://docs.instance.sale/oss/meta-app-review)
- [Architecture Overview](https://docs.instance.sale/oss/overview)
- [Production Deployment](https://docs.instance.sale/oss/deployment)

---

## Monorepo Project Structure

```text
instance-oss/
├── apps/
│   ├── api/        # NestJS REST API and Meta webhook ingestion
│   ├── web/        # Next.js 16 frontend and visual flow builder
│   └── workers/    # BullMQ queue processors and background jobs
├── packages/
│   ├── prisma/     # Database schema, Prisma client, and migrations
│   └── types/      # Shared TypeScript types and interfaces
└── docs/           # Mintlify documentation portal
```

---

## How to Report a Bug

If you find a bug, please submit an issue on GitHub using this format:

1. **Title**: Clear, concise summary (e.g. `[Bug]: Webhook deduplication fails on comment edits`).
2. **Description**: Explanation of what happened versus what you expected to happen.
3. **Steps to Reproduce**:
   - Step 1...
   - Step 2...
   - Step 3...
4. **Affected Component**: `apps/web`, `apps/api`, `apps/workers`, or `packages/prisma`.
5. **Potential Impact**: Minor visual issue, flow disruption, or critical data failure.
6. **Suggested Solution**: (Optional) Ideas or code pointers for fixing the issue.

---

## How to Suggest a Feature

Have an idea for a new automation trigger, CRM filter, or messaging node?

1. Open a **Feature Request** on GitHub Issues.
2. Outline the business problem you are solving and who benefits (e.g. coaches, e-commerce stores, agencies).
3. Provide proposed mockups or flow logic where applicable.

---

## Pull Request (PR) Workflow

1. **Fork the Repository**: Create your personal fork on GitHub.
2. **Create a Feature Branch**:
   ```bash
   git checkout -b feat/your-feature-name
   ```
3. **Keep Changes Focused**: The smallest complete diff wins. Avoid formatting unrelated files.
4. **Run Tests & Checks**:
   ```bash
   pnpm lint
   pnpm typecheck
   pnpm test
   ```
5. **Commit Message Format**: Follow the Conventional Commits specification:
   - `feat:` A new user-facing feature or automation node
   - `fix:` A bug fix in API, Web, or Workers
   - `docs:` Documentation additions or corrections in `docs/`
   - `refactor:` Code refactoring without changing behavior
   - `test:` Adding or improving tests
   - `chore:` Dependency updates or build tooling changes
6. **Submit Your PR**: Reference any relevant issues in your PR description.

---

## Security Vulnerabilities

Please do **NOT** report security vulnerabilities via public GitHub issues. Refer to [SECURITY.md](file:///c:/Users/Sumama/Desktop/instance-oss/SECURITY.md) for our private disclosure process.

