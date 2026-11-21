export interface InstanceApiConfig {
  baseUrl: string;
  apiKey: string;
}

export class InstanceClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(config?: Partial<InstanceApiConfig>) {
    this.baseUrl = (config?.baseUrl || process.env.INSTANCE_API_URL || 'https://api.instance.sale').replace(/\/+$/, '');
    this.apiKey = config?.apiKey || process.env.INSTANCE_API_KEY || '';

    if (!this.apiKey) {
      console.error('[Instance MCP] Warning: INSTANCE_API_KEY environment variable is not set.');
    }
  }

  private async request<T = any>(method: string, path: string, options: { query?: Record<string, any>; body?: any } = {}): Promise<T> {
    const url = new URL(`${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`);

    if (options.query) {
      Object.entries(options.query).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          url.searchParams.append(k, String(v));
        }
      });
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-API-Key': this.apiKey,
    };

    const res = await fetch(url.toString(), {
      method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const json: any = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (res.status === 404) {
        throw new Error(
          `[Feature Unavailable] Endpoint not found on this server. If you are connected to Instance Community Edition (OSS), this feature is not enabled on your self-hosted server. It is available on Instance Cloud (https://api.instance.sale).`
        );
      }
      const errMsg = json.message || json.error || `Request failed with status ${res.status}`;
      throw new Error(`[Instance API Error ${res.status}] ${errMsg}`);
    }

    return json;
  }

  // Workspace
  async getWorkspaceInfo() {
    return this.request('GET', '/api/v1/workspace/info');
  }

  async getTags() {
    return this.request('GET', '/api/v1/tags');
  }

  async createTag(name: string) {
    return this.request('POST', '/api/v1/tags', { body: { name } });
  }

  async deleteTag(name: string) {
    return this.request('DELETE', `/api/v1/tags/${encodeURIComponent(name)}`);
  }

  async getAutomations() {
    return this.request('GET', '/api/v1/automations');
  }

  async getPipelines() {
    return this.request('GET', '/api/v1/pipelines');
  }

  // Contacts
  async listContacts(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    tag?: string;
    qualified?: string;
    minScore?: number;
    maxScore?: number;
  }) {
    return this.request('GET', '/api/v1/contacts', { query: params });
  }

  async findContact(params: { username?: string; email?: string; phone?: string }) {
    return this.request('GET', '/api/v1/contacts/find', { query: params });
  }

  async getContact(id: string) {
    return this.request('GET', `/api/v1/contacts/${id}`);
  }

  async createContact(data: {
    username?: string;
    name?: string;
    email?: string;
    phone?: string;
    status?: string;
    tags?: string[];
  }) {
    return this.request('POST', '/api/v1/contacts', { body: data });
  }

  async updateContact(id: string, data: { name?: string; email?: string; phone?: string; status?: string; tags?: string[] }) {
    return this.request('PATCH', `/api/v1/contacts/${id}`, { body: data });
  }

  async addTags(id: string, tags: string[]) {
    return this.request('POST', `/api/v1/contacts/${id}/tags`, { body: { tags } });
  }

  async removeTag(id: string, tagName: string) {
    return this.request('DELETE', `/api/v1/contacts/${id}/tags/${encodeURIComponent(tagName)}`);
  }

  async updateStatus(id: string, status: string) {
    return this.request('POST', `/api/v1/contacts/${id}/status`, { body: { status } });
  }

  // Automations
  async triggerAutomation(automationId: string, params: { contactId?: string; username?: string; variables?: Record<string, any> }) {
    return this.request('POST', `/api/v1/automations/${automationId}/trigger`, { body: params });
  }

  // Audience Lists & Segmentation
  async getAudienceLists() {
    return this.request('GET', '/api/v1/audience-lists');
  }

  async createAudienceList(data: { name: string; description?: string; color?: string }) {
    return this.request('POST', '/api/v1/audience-lists', { body: data });
  }

  async queryAudienceContacts(listId: string, params?: { channelFilter?: string; search?: string; minScore?: number; maxScore?: number; page?: number; limit?: number }) {
    return this.request('GET', `/api/v1/audience-lists/${listId}/contacts`, { query: params });
  }

  async assignToAudienceList(listId: string, contactIds: string[]) {
    return this.request('POST', `/api/v1/audience-lists/${listId}/assign`, { body: { contactIds } });
  }

  async deleteAudienceList(listId: string) {
    return this.request('DELETE', `/api/v1/audience-lists/${listId}`);
  }
}
