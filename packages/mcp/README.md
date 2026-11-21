# instance-mcp

Official Model Context Protocol (MCP) server for [Instance](https://instance.sale) - The AI Sales CRM & Instagram Growth Engine.

Connect Claude Desktop, Cursor, Windsurf, Claude Code, and custom AI agents natively to your Instance workspace.

---

## What It Does

`instance-mcp` runs locally as a standard I/O bridge. It enables your local AI assistant to interact securely with your Instance CRM data and automations via your Instance API key:

* Look up and search Instagram leads and qualification scores
* Create, filter, and assign contacts to audience segments
* Schedule Instagram feed posts, carousels, and reels
* Trigger Instagram automation funnels
* Inspect pipeline analytics and workspace metrics

All communication between your AI assistant and Instance happens over encrypted HTTPS calls authenticated with your private API key (`inst_live_...`).

---

## Quick Start

You do not need to install this package manually. AI clients execute it on demand via `npx`:

```bash
npx -y instance-mcp
```

---

## Setup Guide

### 1. Get Your API Key
1. Sign in to your Instance workspace at [instance.sale](https://instance.sale).
2. Navigate to **Dashboard -> Settings -> API Keys**.
3. Generate a new API key and copy the secret token (`inst_live_...`).

---

### 2. Claude Desktop

Add `instance` to your Claude Desktop configuration file:

* **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
* **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "instance": {
      "command": "npx",
      "args": ["-y", "instance-mcp"],
      "env": {
        "INSTANCE_API_KEY": "inst_live_your_secret_key_here",
        "INSTANCE_API_URL": "https://api.instance.sale"
      }
    }
  }
}
```

Restart Claude Desktop. You will see the hammer icon indicating Instance tools are active.

---

### 3. Cursor & Windsurf

In Cursor settings under **Features -> MCP Servers**:

1. Click **+ Add New MCP Server**.
2. Set **Name** to `instance`.
3. Set **Type** to `command`.
4. Set **Command** to:
   ```bash
   npx -y instance-mcp
   ```
5. Add Environment Variables:
   * `INSTANCE_API_KEY`: `inst_live_your_secret_key_here`
   * `INSTANCE_API_URL`: `https://api.instance.sale`

---

### 4. Claude Code CLI

Add the server directly from your terminal:

```bash
claude mcp add instance -- npx -y instance-mcp
```

Set your environment variables when prompted or in your shell profile.

---

### 5. Self-Hosted (Instance OSS)

If you are running the self-hosted Open Source version of Instance on your local machine or private server:

```json
{
  "mcpServers": {
    "instance": {
      "command": "npx",
      "args": ["-y", "instance-mcp"],
      "env": {
        "INSTANCE_API_KEY": "inst_live_your_secret_key_here",
        "INSTANCE_API_URL": "http://localhost:4000"
      }
    }
  }
}
```

---

## Available Tools

| Tool Name | Description |
| :--- | :--- |
| `instance_get_workspace` | Retrieve workspace details, company ID, name, plan tier, and permissions. |
| `instance_list_contacts` | List Instagram leads with pagination, search, and qualification score filters. |
| `instance_get_contact` | Get full profile, channel links, and custom tags for a specific contact. |
| `instance_find_contact` | Look up a contact quickly by Instagram username. |
| `instance_update_contact_stage` | Update CRM pipeline stage (lead, qualified, customer, churned). |
| `instance_list_automations` | List all active Instagram automation funnels in the workspace. |
| `instance_trigger_automation` | Trigger an Instagram keyword or DM automation flow for a lead. |
| `instance_get_analytics` | Retrieve CRM pipeline metrics, conversion rates, and revenue stats. |
| `instance_list_audience_lists` | List all audience segments with active contact counts. |
| `instance_create_audience_list` | Create a new targeted audience segment with description. |
| `instance_query_audience_contacts` | Query contacts in a list with channel filters (`email`, `phone`, `both`) and score thresholds. |
| `instance_assign_to_audience_list` | Bulk assign multiple contact IDs to an audience segment. |
| `instance_delete_audience_list` | Remove an audience segment without deleting the contacts. |
| `instance_list_scheduled_posts` | View scheduled Instagram posts filtered by date range and publish status. |
| `instance_schedule_post` | Schedule a feed post, carousel, or reel with caption, media URLs, and future publish time. |
| `instance_cancel_scheduled_post` | Cancel a pending scheduled Instagram post by ID. |

---

## Environment Variables

| Variable | Required | Default | Description |
| :--- | :--- | :--- | :--- |
| `INSTANCE_API_KEY` | **Yes** | None | Your Instance secret API key starting with `inst_live_`. |
| `INSTANCE_API_URL` | No | `https://api.instance.sale` | Base API URL. For OSS self-hosters, set to `http://localhost:4000`. |

---

## License

MIT © [Instance](https://instance.sale)
