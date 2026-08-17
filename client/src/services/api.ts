const API_BASE = '/api';

interface RequestOptions extends RequestInit {
  data?: unknown;
}

class ApiClient {
  private getHeaders(contentType = 'application/json'): HeadersInit {
    const headers: Record<string, string> = {};
    if (contentType) {
      headers['Content-Type'] = contentType;
    }

    const token = localStorage.getItem('bingo_access_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  public async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { data, ...customConfig } = options;
    const config: RequestInit = {
      ...customConfig,
      headers: {
        ...this.getHeaders(),
        ...customConfig.headers,
      },
    };

    if (data) {
      config.body = JSON.stringify(data);
    }

    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const response = await fetch(`${API_BASE}${cleanEndpoint}`, config);
    const result = await response.json();

    if (!response.ok) {
      let errorMessage = result.error?.message || result.message || 'An unexpected error occurred';
      if (result.error?.details && Array.isArray(result.error.details) && result.error.details.length > 0) {
        const first = result.error.details[0];
        if (first && first.message) {
          errorMessage = first.message;
        }
      }
      const error = new Error(errorMessage);
      (error as any).status = response.status;
      (error as any).details = result.error?.details;
      (error as any).code = result.error?.code;
      throw error;
    }

    return result.data !== undefined ? result.data : result;
  }

  public get<T>(endpoint: string, headers?: HeadersInit): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', headers });
  }

  public post<T>(endpoint: string, data?: unknown, headers?: HeadersInit): Promise<T> {
    return this.request<T>(endpoint, { method: 'POST', data, headers });
  }

  public patch<T>(endpoint: string, data?: unknown, headers?: HeadersInit): Promise<T> {
    return this.request<T>(endpoint, { method: 'PATCH', data, headers });
  }

  public put<T>(endpoint: string, data?: unknown, headers?: HeadersInit): Promise<T> {
    return this.request<T>(endpoint, { method: 'PUT', data, headers });
  }

  public delete<T>(endpoint: string, headers?: HeadersInit): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE', headers });
  }
}

export const api = new ApiClient();
