const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export class ApiError extends Error {
  status: number;
  data?: unknown;
  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.status = status;
    this.data = data;
    this.name = 'ApiError';
  }
}

export const api = {
  async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = localStorage.getItem('token');
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {})
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { error: response.statusText };
      }
      if (response.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
      throw new ApiError(response.status, errorData.error || errorData.message || 'API request failed', errorData);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  },

  get<T>(endpoint: string) {
    return this.fetch<T>(endpoint);
  },

  post<T>(endpoint: string, data: unknown) {
    return this.fetch<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  patch<T>(endpoint: string, data: unknown) {
    return this.fetch<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }
};
