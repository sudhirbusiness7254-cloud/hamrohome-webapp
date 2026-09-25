export type ApiError = {
  success: false;
  message: string;
  code: string;
  errors: Array<{ field?: string; message: string }>;
  requestId?: string;
};

export type ApiResponse<T> = { success: true; data: T; requestId?: string } | ApiError;

/**
 * Browser-safe API client. The browser only talks to relative URLs; the
 * server owns gateway credentials and verifies every price, stock quantity,
 * and payment webhook.
 */
export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) }
  });
  const payload = await response.json() as ApiResponse<T>;
  if (!response.ok || !payload.success) {
    const error = payload as ApiError;
    throw new Error(`${error.code}: ${error.message}`);
  }
  return payload.data;
}
