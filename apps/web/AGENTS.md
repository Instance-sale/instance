# Web Agent Guidelines (`apps/web`)

This app is the frontend user dashboard and visual automation canvas for Instance, built with Next.js 16, React 19, Tailwind CSS, HeroUI, and XYFlow.

## Architectural Standards

### 1. App Router & Localized Navigation
- Navigation uses clean dashboard paths: `app/dashboard/[companyId]/...`.
- Always preserve company context parameters (`companyId`) when linking between dashboard sub-pages.

### 2. Client vs Server Boundaries
- Default to Server Components for static layouts, SEO metadata, and read-only data fetching.
- Use `"use client"` only where browser interactivity, hooks, or visual canvas controls are required.

### 3. Visual Flow Builder (`XYFlow`)
- Automation canvas nodes are located in `automation/components/FlowBuilder/node-config/nodes/`.
- Every node configuration drawer must validate inputs before mutating node state.
- Keep node state serializable so the JSON payload matches the `AutomationNode` schema in PostgreSQL.

### 4. UI/UX Standards
- Use HeroUI components and Lucide icons for consistency.
- Ensure all screens support dark and light mode without opaque bounding boxes obscuring text.
- Form inputs must include clear placeholder examples and validation error feedback for non-technical users.

### 5. Documentation Sync
- Any new dashboard page, modal form, or flow node must be documented in `docs/features.mdx` with real UI navigation paths (e.g. `Dashboard -> Automation -> New Automation`).

