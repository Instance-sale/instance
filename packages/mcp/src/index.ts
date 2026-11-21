#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { InstanceClient } from "./client.js";

const server = new McpServer({
  name: "instance-mcp",
  version: "0.1.0",
});

const client = new InstanceClient();

// 1. Workspace Info
const workspaceInfoHandler = async () => {
  try {
    const data = await client.getWorkspaceInfo();
    return {
      content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    };
  } catch (err: any) {
    return {
      isError: true,
      content: [{ type: "text" as const, text: err.message || "Failed to fetch workspace info" }],
    };
  }
};

server.tool(
  "instance_workspace_info",
  "Inspect the Instance workspace details, connected Instagram accounts, handle, and metadata.",
  {},
  workspaceInfoHandler
);

server.tool(
  "instance_get_workspace_info",
  "Inspect the Instance workspace details, connected Instagram accounts, handle, and metadata.",
  {},
  workspaceInfoHandler
);

// 2. List Contacts / Leads
server.tool(
  "instance_list_contacts",
  "List and search leads / contacts with optional filters for status, score, or search query.",
  {
    page: z.number().optional().describe("Page number (default: 1)"),
    limit: z.number().optional().describe("Number of contacts to return (default: 25, max: 100)"),
    search: z.string().optional().describe("Search term matching username, name, or email"),
    status: z.string().optional().describe("Pipeline stage / deal status filter"),
    tag: z.string().optional().describe("Filter by specific tag"),
    qualified: z.string().optional().describe("Filter by qualification status ('true' or 'false')"),
    minScore: z.number().optional().describe("Minimum AI qualification score (0-100)"),
    maxScore: z.number().optional().describe("Maximum AI qualification score (0-100)"),
  },
  async (args) => {
    try {
      const data = await client.listContacts(args);
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: err.message || "Failed to list contacts" }],
      };
    }
  }
);

// 3. Find Single Contact
server.tool(
  "instance_find_contact",
  "Find a specific lead by their Instagram username (@username), email, or phone number.",
  {
    username: z.string().optional().describe("Instagram username (with or without @)"),
    email: z.string().optional().describe("Contact email address"),
    phone: z.string().optional().describe("Contact phone number"),
  },
  async (args) => {
    try {
      const data = await client.findContact(args);
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: err.message || "Failed to find contact" }],
      };
    }
  }
);

// 4. Create Unified Contact
server.tool(
  "instance_create_contact",
  "Create or sync a unified contact record in the CRM.",
  {
    username: z.string().optional().describe("Instagram handle"),
    name: z.string().optional().describe("Full name of the contact"),
    email: z.string().optional().describe("Email address"),
    phone: z.string().optional().describe("Phone number"),
    status: z.string().optional().describe("Initial pipeline status (e.g. New, Qualified)"),
    tags: z.array(z.string()).optional().describe("List of initial tags"),
  },
  async (args) => {
    try {
      const data = await client.createContact(args);
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: err.message || "Failed to create contact" }],
      };
    }
  }
);

// 5. Update Contact Status
server.tool(
  "instance_update_contact_status",
  "Update the deal pipeline stage or status for an existing lead.",
  {
    contactId: z.string().describe("Contact ID"),
    status: z.string().describe("New pipeline stage (e.g. Qualified, In Negotiation, Closed Won)"),
  },
  async ({ contactId, status }) => {
    try {
      const data = await client.updateStatus(contactId, status);
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: err.message || "Failed to update contact status" }],
      };
    }
  }
);

// 6. Add Tags to Contact
server.tool(
  "instance_add_tags",
  "Add tags to an existing lead in the CRM.",
  {
    contactId: z.string().describe("Contact ID"),
    tags: z.array(z.string()).describe("Tags to add (e.g. ['VIP', 'Hot Lead'])"),
  },
  async ({ contactId, tags }) => {
    try {
      const data = await client.addTags(contactId, tags);
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: err.message || "Failed to add tags" }],
      };
    }
  }
);

// 7. Trigger Automation Flow
server.tool(
  "instance_trigger_automation",
  "Trigger an automated Instagram sales funnel or flow for a contact.",
  {
    automationId: z.string().describe("Automation Flow ID to trigger"),
    contactId: z.string().optional().describe("Target contact ID"),
    username: z.string().optional().describe("Target Instagram username (alternative to contactId)"),
    variables: z.record(z.any()).optional().describe("Optional dynamic variables to inject into flow"),
  },
  async ({ automationId, contactId, username, variables }) => {
    try {
      const data = await client.triggerAutomation(automationId, { contactId, username, variables });
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text" as const, text: err.message || "Failed to trigger automation" }],
      };
    }
  }
);

// 8. Get Audience Lists
server.tool(
  "instance_get_audience_lists",
  "Get all audience lists and segmentation groups in the workspace with contact counts.",
  {},
  async () => {
    try {
      const data = await client.getAudienceLists();
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text" as const, text: err.message || "Failed to fetch audience lists" }],
      };
    }
  }
);

// 9. Create Audience List
server.tool(
  "instance_create_audience_list",
  "Create a new audience segmentation list (e.g. 'VIP Buyers', 'Black Friday Leads').",
  {
    name: z.string().describe("Name of the audience list"),
    description: z.string().optional().describe("Optional description"),
    color: z.string().optional().describe("Optional hex color or tag color"),
  },
  async (args) => {
    try {
      const data = await client.createAudienceList(args);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text" as const, text: err.message || "Failed to create audience list" }],
      };
    }
  }
);

// 10. Query Audience Contacts
server.tool(
  "instance_query_audience_contacts",
  "Query contacts in an audience list with deep channel (email/phone), score, and search filters.",
  {
    listId: z.string().describe("Target audience list ID"),
    channelFilter: z.enum(["all", "email", "phone", "both"]).optional().describe("Filter by available contact channel"),
    search: z.string().optional().describe("Search term for contact name, email, or username"),
    page: z.number().optional().describe("Page number (default: 1)"),
    limit: z.number().optional().describe("Page size (default: 25, max: 100)"),
  },
  async ({ listId, ...params }) => {
    try {
      const data = await client.queryAudienceContacts(listId, params);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text" as const, text: err.message || "Failed to query audience contacts" }],
      };
    }
  }
);

// 11. Assign to Audience List
server.tool(
  "instance_assign_to_audience_list",
  "Assign one or more contact IDs into an audience list.",
  {
    listId: z.string().describe("Target audience list ID"),
    contactIds: z.array(z.string()).describe("Array of contact IDs to assign"),
  },
  async ({ listId, contactIds }) => {
    try {
      const data = await client.assignToAudienceList(listId, contactIds);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text" as const, text: err.message || "Failed to assign to audience list" }],
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[Instance MCP Server] Started successfully via stdio");
}

main().catch((err) => {
  console.error("[Instance MCP Server] Fatal error:", err);
  process.exit(1);
});
