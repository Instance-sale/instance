<div align="center">

# Instance

**The open-source Manychat alternative. Scale your audience with zero subscription fees.**

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Documentation](https://img.shields.io/badge/Docs-instance.sale%2Foss%2Fdocs-2563EB)](https://docs.instance.sale/oss)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2016-000000?logo=next.js)](apps/web/)
[![NestJS](https://img.shields.io/badge/Backend-NestJS%2011-E0234E?logo=nestjs)](apps/api/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%2016-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Queue-Redis%207%20%7C%20BullMQ-DC382D?logo=redis&logoColor=white)](https://redis.io/)
[![Instagram Graph API](https://img.shields.io/badge/Instagram-Graph%20API%20v24.0-E4405F?logo=instagram&logoColor=white)](https://developers.facebook.com/)
[![Turborepo](https://img.shields.io/badge/Monorepo-Turborepo-EF4444?logo=turborepo&logoColor=white)](https://turbo.build/)
[![Docker](https://img.shields.io/badge/Docker-Containers-2496ED?logo=docker&logoColor=white)](docker-compose.yml)

<br />

</div>

Instance turns your Instagram presence into a 24/7 sales engine: building visual funnels, qualifying inbound leads, verifying followers before unlocking links, and capturing emails and phone numbers, all on your own infrastructure with zero monthly subscription fees and zero contact limits.


## Why this exists

Closed platforms charge monthly subscription fees that aggressively multiply as your audience grows ($15 to over $1,000 every single month just to hold your own contacts). The moment you pause or cancel, you lose your automation funnels, your conversation history, and your contact records.

Instance brings that entire sales automation engine and social CRM to software you own, inspect, and host yourself:

- **Zero software subscription fees**: 100% free and open source forever under the MIT license.
- **Unlimited contacts and storage**: Manage 1,000 or 1,000,000 leads in your own database without tier upgrades or artificial pricing walls.
- **Complete data ownership**: Your follower details, captured emails, phone numbers, and chat logs stay in your own PostgreSQL database.
- **Built on the official Meta Graph API**: Strictly compliant with official Instagram APIs. No fragile web scraping, no headless browser automation, and no Instagram passwords required.
- **Built-in anti-ban safeguards**: Built-in human jitter delays, token bucket rate limits, automatic circuit breakers, and warm-up schedules to keep your Instagram account safe.

<br />

---
### One Click Deployments

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/instance-open-source-sales-crm-and-insta?referralCode=hKG5AX&utm_medium=integration&utm_source=template&utm_campaign=generic)


## Key Features

Instance gives you a complete Instagram sales automation suite and social CRM:

1. **Instagram Icebreakers**: Capture inbound leads the moment they open your DMs before they even type a word. Display up to 4 clickable conversation starter buttons (e.g. "Get 20% Off", "Book a Call", "Pricing Details") directly in the Instagram chat window. Tap any prompt to instantly launch an automated sales funnel, test the experience inside the built-in mobile simulator, and sync it to your Instagram Professional account with one click.

2. **17 Ready-to-Deploy Templates**: Launch high-converting sales funnels without building from scratch. Pick from 17 pre-configured templates tailored for e-commerce, sales agencies, creators, and coaches, covering comment-to-DM checkout, Reel comment sales, affiliate link delivery, lead qualification quizzes, follower freebie lead magnets, and webinar RSVPs. Every template comes pre-wired with triggers, copy, and delay settings so you can launch in minutes.

3. **Visual Flow Builder**: Design multi-step conversation pathways as easily as drawing on a whiteboard. Use an infinite drag-and-drop canvas powered by React Flow with smooth zoom, pan, auto-alignment, and dedicated connecting wires sprouting from condition outcomes, buttons, and quick replies. Add color-coded sticky notes to document funnel logic, test full conversations inside the interactive desktop and iPhone chat simulator, and export or import JSON blueprints to clone funnels in seconds.

4. **Comment-to-DM Engine**: Convert public buzz on your feed posts and viral reels into private direct message sales conversations. Automatically like the user's comment as an instant receipt, and post public comment replies cycling through randomized text variations to boost algorithmic post ranking while preventing Meta spam flags.

5. **Fuzzy Matching, Sentiment, and Spam Shield**: Never lose a hot buyer to a mobile typing slip. Built-in fuzzy matching catches typos like "prce", "ifo", or "deall" with configurable sensitivity so interested leads always get your link. At the same time, the negative sentiment shield automatically spots toxic comments, competitor links, and spam, hiding them on your post via the Meta Graph API while skipping DMs to bad actors.

6. **Story Interactions and Ephemeral Media Persistence**: Turn fleeting 24-hour Stories into permanent sales relationships. Automatically send coupons when users tag your account in their Stories, qualify prospects responding to daily Story polls, and turn quick emoji reactions (fire, heart, clap) into active conversations. Because Stories disappear after 24 hours, Instance permanently preserves lead profiles, timestamps, media references, and chat logs in your CRM.

7. **Rich Direct Messaging Formats**: Engage prospects with interactive chat experiences that look and feel like native mobile apps. Send swipeable carousels (up to 10 visual product cards with images, headlines, and CTA buttons), inline message buttons, up to 13 horizontal quick reply pills for one-tap responses, and rich media (images, demo videos, audio voice notes, and documents). Choose between Send DM (new thread) or Reply DM (existing thread) to keep chat continuity.

8. **Message and Comment Variations (Anti-Spam & Personalization)**: Never get flagged for sending repetitive bot messages. Write multiple phrasing options for your DMs and public comment replies, and Instance will automatically cycle through them for every new person. You can drop in dynamic tags like `{name}`, `{username}`, `{comment}`, `{promo_code}`, or custom quiz answers so every response feels like a personal, human 1-on-1 conversation.

9. **Follower Gate (Follow-to-Unlock)**: Grow your follower count before handing over your best discount codes, lead magnets, or exclusive links. When someone requests a link, Instance sends a friendly prompt asking them to follow your account first with a "Check again" verification button. It checks Meta's follower status in real time with configurable retry limits (1 to 3 retries), unlocks the reward immediately once verified, and exits cleanly if they decline so nobody gets trapped.

10. **Logic Routing and A/B Testing**: Route prospects down personalized paths based on who they are and how they answer. Build multi-group condition branches using AND/OR rules evaluated against tags, pipeline stages, custom variables, follower counts, or quiz scores. Use randomizer nodes to split traffic by percentage weights to A/B test different offers or copy, and add natural typing indicators and timed delays for authentic human pacing.

11. **Conversational Contact Extraction**: Capture verified email addresses and phone numbers directly in chat without clunky external forms. Built-in validation loops check for valid email syntax in real time, politely prompting the user if they make a typo, and format phone numbers directly into structured CRM records ready for direct sales outreach.

12. **Native Instagram CRM and Lead Drawer**: Ditch external spreadsheets and third-party databases. Clicking any lead in your CRM opens a full-height inspection drawer showing their profile photo, Instagram handle, display name, follower count, bio, website link, and attribution channel (DM, Comment, Story Mention, Story Reply). Move leads along an interactive deal milestone stepper, copy extracted emails or phone numbers in one click, and manage global company tags (`VIP`, `Hot Lead`, `Agency`).

13. **Visual Kanban Pipeline and Table Views**: Manage your social sales pipeline visually with drag-and-drop ease. Organize contacts across custom stages (`New Lead`, `Engaged`, `Qualified`, `Closed Won`) with infinite column scrolling, stage count badges, and filters for tags, follower size, or dates. Switch effortlessly between the Kanban view, a dense table view, or a Story Mentions log, and export clean CSV or XML lists for Klaviyo, Beehiiv, Mailchimp, or HubSpot.

14. **Audience Lists and Multi-Channel Segmentation**: Slice your audience into hyper-targeted lists for outbound campaigns and retargeting. Group contacts into color-coded lists with pinned shortcuts, filter leads by available channels (contacts with verified email, phone number, or both), track which automation funnel generated each group, and export filtered segments to CSV in seconds.

15. **End-to-End Analytics and Execution Telemetry**: Know exactly which posts and funnels generate revenue with full execution visibility. Track node-by-node conversion drop-offs to see where prospects stall, measure business metrics (leads captured, deals closed, revenue generated), and inspect live execution logs with step-by-step traces, run statuses (`COMPLETED`, `FAILED`, `RUNNING`, `CANCELLED`), and raw JSON payloads for effortless debugging.

16. **Built-in Internationalization (i18n)**: Run global campaigns without language barriers. Instance provides 8 localized interface languages out of the box: English (`en`), Portuguese (Brazil) (`pt`), Spanish (`es`), Hindi (`hi`), German (`de`), French (`fr`), Indonesian (`id`), and Turkish (`tr`), with cookie-based locale preferences that keep your URLs clean.

## Developer REST API and MCP Server

Connect any AI agent (Claude Desktop, Cursor, Windsurf, Claude Code, or custom agents) directly to your Instance CRM using the official Model Context Protocol (MCP) server. Automate workflows, query contacts, update deal stages, or trigger funnels externally using clean REST endpoints authenticated with workspace API keys.


## Instagram Anti-Ban & Safety Architecture

- Automatically tracks interaction timestamps to strictly respect Meta's 24-hour messaging window (pausing when expired and resetting upon reply), while injecting randomized 4 to 12 second delay jitter and 1-second thread pacing so outbound messages mimic human conversation speeds instead of bot bursts.
- Caps hourly message volume within official Meta limits (up to 750 comment-to-DMs and 60 public comment replies per hour) using Redis token buckets, holding outbound traffic safely in BullMQ queues during viral reels so zero messages or leads are dropped.
- Trips automatic circuit breakers to pause queues and enter safe cooldowns upon detecting Meta errors (368 action block, 4/429 throttling, 190 expired tokens), with AES-256 token encryption at rest and one-click account disconnection.

---

## Documentation Directory

Complete step-by-step documentation with screenshots, configuration guides, and production deployment instructions is available on our documentation portal:

| Document | Purpose | Online Docs Link |
| :--- | :--- | :--- |
| **Overview** | Platform architecture, microservices breakdown. | [Read Overview](https://docs.instance.sale/oss/overview) |
| **Installation** | Rapid 2-minute setup, environment variables reference, and local dev server. | [Read Installation](https://docs.instance.sale/oss/installation) |
| **Docker** | Container setup, named volume persistence, and docker compose orchestration. | [Read Docker Guide](https://docs.instance.sale/oss/docker) |
| **Instagram Setup** | Meta Developer App creation, webhook verification, and tester onboarding. | [Read Instagram Setup](https://docs.instance.sale/oss/instagram-setup) |
| **Meta App Review** | Production live mode, Business Verification, Allow Usage, and screencast guide. | [Read App Review Guide](https://docs.instance.sale/oss/meta-app-review) |
| **Feature Deep Dive** | In-depth tour of builder canvas, comment engine, story triggers, and CRM. | [Read Features](https://docs.instance.sale/oss/features) |
| **Developer API & MCP** | Programmatic REST API and native Model Context Protocol (MCP) server for AI agents. | [Read API & MCP Guide](https://docs.instance.sale/oss/api) |
| **Safety & Anti-Ban** | Jitter pacing, sliding-window rate limits, and circuit breakers. | [Read Safety Guide](https://docs.instance.sale/oss/safety) |
| **Production Deployment** | Production VPS deployment with Caddy SSL, Docker, and Railway. | [Read Deployment](https://docs.instance.sale/oss/deployment) |


## Need Help or Custom Deployment?

Looking for a managed deployment, custom scaling, or dedicated support for your brand?
- **Email**: [support@sumama.me](mailto:support@sumama.me)

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, next-intl, HeroUI, Tailwind CSS, Lucide Icons, React Flow (XYFlow)
- **Backend API**: NestJS 11, Express, Class Validator, Passport, Prisma ORM
- **Database**: PostgreSQL 16
- **Queue & Cache**: Redis 7, BullMQ, IoRedis
- **Media Storage**: Cloudflare R2 (S3-compatible, zero egress fees)
- **AI & Integrations**: Model Context Protocol (MCP), native `instance-mcp` server
- **Monorepo Engine**: Turborepo, pnpm workspaces


## Contributing

Contributions from the open-source community are warmly welcome! Please review [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines, branch conventions, and development workflows.


## Security

For vulnerability disclosures and security policies, please consult [SECURITY.md](SECURITY.md).


## License

Instance is open-source software licensed under the [AGPL-3.0 LICENSE](LICENSE).


## Listing
<a href="https://www.opensourcealternatives.to"><img src="https://www.opensourcealternatives.to/badge-osa.svg" alt="As seen on Open Source Alternatives"></a> 
