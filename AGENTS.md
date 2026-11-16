# Instance Agent Guidelines

You are an expert full-stack developer working on Instance, an open-source sales CRM and Instagram automation platform.

## Sub-Package Specializations

When working in specific workspace apps, consult their specialized instructions:
- Backend REST API: [apps/api/AGENTS.md](/apps/api/AGENTS.md)
- Frontend Web App: [apps/web/AGENTS.md](/apps/web/AGENTS.md)
- Background Workers: [apps/workers/AGENTS.md](/apps/workers/AGENTS.md)

---

## Senior Engineering Ethos

The best code is the code never written. Solve the whole problem with the least new code. End your response with one or two lines: what you skipped or did not check, and any risk the user must know.

### Before You Write
1. Read the task and the code it touches.
2. List every place your change must reach: callers, tests, fixtures, config, exports, and docs (always ask: does this change require updating or adding documentation in `docs/`?).
3. Check what your change could break for users: data it would destroy or expose, callers that stop working. That is scope. Extra features are not.

### The Smallest Complete Change
1. Does it need to exist? Skip features, options, and flexibility nobody asked for.
2. Already in this codebase (a helper, component, service, pattern)? Use it the way the surrounding code does.
3. Standard library or platform feature? Use it. A house component beats a third-party dependency.
4. Installed dependency? Use it. Never add a dependency for a few lines.
5. Can it be one line a reader gets at a glance? One line.
6. Otherwise: the minimum code that works.

### Monorepo Rules
- Be lazy about the solution, never about the change itself: finish every part the task needs, including callers, tests, and fixtures your change touches.
- No unnecessary wrappers, type conversions, or "for later" boilerplate. Keep the structure the codebase already has.
- Bug fix: before you edit, search every caller of the function you touch, then fix the root cause once in the shared code.
- Non-trivial logic (a branch, a loop, a parser, money or security) leaves one small test or assert-based check. Trivial changes need none.
- A shortcut with a known limit gets a code comment in this format: `shortcut: <the limit>, <when to upgrade>`.

Never cut: validation at trust boundaries, error handling that prevents data loss, security, accessibility, and anything the user explicitly asked for.

---

## Documentation Law

Documentation is code. Whenever adding, refactoring, or modifying APIs, database models, dashboard UI features, background workers, or Instagram integrations, evaluate whether documentation in `docs/` needs an update.

### Strict Documentation Standards:
- **ZERO em dashes or en dashes** anywhere in titles, tables, or text (use hyphens `-`, colons `:`, or parentheses).
- **ZERO graph diagrams** (e.g., `graph TD`, `graph LR`). All architectural diagrams must use clean Mermaid `sequenceDiagram` or `erDiagram` syntax.
- **ZERO rect rgb(...)** or opaque bounding boxes that obscure text in dark or light mode.
- **Exact In-App UI Paths**: Always document real UI navigation (e.g., `Dashboard -> Automation -> New Automation`) rather than raw `.env` edits.
- **docs.json Sync**: Any newly created `.mdx` doc must be registered in both [docs.json](/docs/docs.json) and [docs/docs.json](/docs/docs.json).
- **Canonical Online Docs URL**: Reference `https://docs.instance.sale/oss` for all public documentation links.
- **Clickable Links**: Use `file:///` links for all local file and code references in assistant output.

---

## Internationalization (i18n) Law

- **Single Source of Truth**: Edit UI strings only in [apps/web/locales/en.json](/apps/web/locales/en.json). Never manually edit secondary locale catalogs.
- **Automated Sync**: Run `pnpm run translate` locally or let the GitHub Actions CI/CD workflow translate catalogs using Groq AI.
- **Language Selector Location**: Language selector resides exclusively under `Dashboard -> Settings -> Account Profile` ([BasicInformation.tsx](/apps/web/app/dashboard/[companyId]/settings/components/BasicInformation.tsx)). Do not place language switchers on login, signup, or public landing pages.
- **URL Cleanliness**: Preserve clean URLs (`/dashboard/[companyId]`) without locale subpath prefixes; locale state is stored strictly in the `NEXT_LOCALE` cookie.
