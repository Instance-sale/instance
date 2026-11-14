import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { instagramApiService } from './instagram-api.service';

describe('InstagramApiService - Carousel Cards', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('formats generic template with elements for carousel cards up to 10 cards', async () => {
    const capturedBodies: any[] = [];

    globalThis.fetch = vi.fn().mockImplementation(async (_url: string, init: any) => {
      const parsed = JSON.parse(init.body);
      capturedBodies.push(parsed);
      return {
        ok: true,
        status: 200,
        json: async () => ({ message_id: 'meta-carousel-msg-123' }),
      };
    });

    const cards = [
      {
        title: 'Product 1',
        subtitle: 'Special offer',
        imageUrl: 'https://example.com/p1.jpg',
        buttons: [{ type: 'link' as const, title: 'Buy Now', url: 'https://store.com/1' }],
      },
      {
        title: 'Product 2',
        subtitle: 'Best seller',
        imageUrl: 'https://example.com/p2.jpg',
        buttons: [{ type: 'reply' as const, title: 'Details' }],
      },
    ];

    const result = await instagramApiService.sendMessage(
      'token-abc',
      'user-recipient-1',
      'Here are your products',
      undefined,
      'TEXT',
      [],
      'buttons',
      cards,
    );

    expect(result.messageId).toBe('meta-carousel-msg-123');
    const genericTemplateBody = capturedBodies.find(
      (b) => b?.message?.attachment?.payload?.template_type === 'generic',
    );
    expect(genericTemplateBody).toBeDefined();
    const template = genericTemplateBody.message.attachment.payload;
    expect(template.elements).toHaveLength(2);
    expect(template.elements[0].title).toBe('Product 1');
    expect(template.elements[0].buttons[0].type).toBe('web_url');
    expect(template.elements[1].buttons[0].type).toBe('postback');
  });
});
