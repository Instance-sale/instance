const API_BASE_URL =
  typeof window !== 'undefined'
    ? ''
    : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export async function apiClient<T = any>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = normalizedEndpoint.startsWith('/api')
    ? `${API_BASE_URL}${normalizedEndpoint}`
    : `${API_BASE_URL}/api${normalizedEndpoint}`;

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // When running on the server, forward request cookies to the NestJS API
  if (typeof window === 'undefined') {
    try {
      const { cookies } = await import('next/headers');
      const cookieStore = await cookies();
      const cookieString = cookieStore.toString();
      if (cookieString && !headers.has('Cookie')) {
        headers.set('Cookie', cookieString);
      }
    } catch {
      // Ignored outside request context (e.g. static generation)
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    let errorMessage = response.statusText;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.message || errorJson.error || errorMessage;
    } catch {
      if (errorText) errorMessage = errorText;
    }
    throw new Error(errorMessage || `API Error ${response.status}`);
  }

  const text = await response.text();
  if (!text || text.trim() === '') {
    return null as unknown as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch (err) {
    console.error(`[apiClient] Failed to parse JSON from ${url}:`, err);
    return null as unknown as T;
  }
}
