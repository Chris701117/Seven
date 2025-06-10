import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from './queryClient';

describe('apiRequest', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns parsed JSON for successful responses', async () => {
    const payload = { success: true };
    // Mock fetch to return OK response
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    ) as any;

    const data = await apiRequest('GET', '/api/success');
    expect(data).toEqual(payload);
  });

  it('throws an error when response status is not OK', async () => {
    const errorData = { message: 'Bad Request' };
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(errorData), {
        status: 400,
        statusText: 'Bad Request',
        headers: { 'Content-Type': 'application/json' }
      })
    ) as any;

    await expect(apiRequest('GET', '/api/error')).rejects.toHaveProperty('status', 400);
  });
});
