# Instance Web Dashboard (`apps/web`)

The frontend application and visual automation builder for Instance, built with Next.js 16, React 19, HeroUI, Tailwind CSS, and XYFlow.

## Key Features

- **Visual Flow Builder**: Drag-and-drop automation builder supporting triggers, actions, conditions, and randomizers.
- **Instagram CRM**: Lead details drawer, custom tags, status management, and direct Instagram links.
- **Sales Pipeline Kanban**: Visual lead management across customizable deal stages.
- **Audience Lists**: Campaign segmentation and one-click CSV export for email tools.
- **Template Library**: Pre-built automation funnels ready to deploy in seconds.

## Local Development

```bash
# Run from repository root
pnpm dev:web

# Build for production
pnpm --filter @instance/web build

# Start production server
pnpm --filter @instance/web start
```

## Documentation

For full setup guides, flow builder walkthroughs, and UI navigation paths:
- [Features Deep Dive](https://docs.instance.sale/oss/features)
- [Installation Guide](https://docs.instance.sale/oss/installation)
- [Overview & Architecture](https://docs.instance.sale/oss/overview)
- [Full Documentation Portal](https://docs.instance.sale/oss)

