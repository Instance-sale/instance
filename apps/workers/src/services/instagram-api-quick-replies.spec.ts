import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { instagramApiService } from './instagram-api.service';

describe('InstagramApiService - Quick Replies', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('formats quick_replies payload when buttonStyle is quick_replies', async () => {
    let capturedBody: any = null;

    globalThis.fetch = vi.fn().mockImplementation(async (_url: string, init: any) => {
      capturedBody = JSON.parse(init.body);
      return {
        ok: true,
        status: 200,
        json: async () => ({ message_id: 'meta-quick-reply-msg-456' }),
      };
    });

    const buttons = [
      { type: 'reply' as const, title: 'Option Yes' },
      { type: 'reply' as const, title: 'Option No' },
      { type: 'reply' as const, title: 'Talk to human' },
    ];

    const result = await instagramApiService.sendMessage(
      'token-abc',
      'user-recipient-2',
      'Choose an option:',
      undefined,
      'TEXT',
      buttons,
      'quick_replies',
    );

    expect(result.messageId).toBe('meta-quick-reply-msg-456');
    expect(capturedBody).not.toBeNull();
    expect(capturedBody.message.text).toBe('Choose an option:');
    expect(capturedBody.message.quick_replies).toHaveLength(3);
    expect(capturedBody.message.quick_replies[0]).toEqual({
      content_type: 'text',
      title: 'Option Yes',
      payload: 'Option Yes',
    });
  });
});
