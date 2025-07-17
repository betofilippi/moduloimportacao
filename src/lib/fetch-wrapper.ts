/**
 * Fetch wrapper that handles authentication errors globally
 */

type FetchOptions = RequestInit & {
  skipAuthCheck?: boolean;
};

/**
 * Enhanced fetch that handles 401 responses by redirecting to login
 */
export async function authFetch(url: string, options?: FetchOptions): Promise<Response> {
  try {
    // Make the request
    const response = await fetch(url, {
      ...options,
      credentials: options?.credentials || 'include',
    });

    // Check for authentication errors
    if (response.status === 401 && !options?.skipAuthCheck) {
      // Clear any stored session data
      if (typeof window !== 'undefined') {
        // Redirect to login
        window.location.href = '/auth/login?expired=true';
      }
    }

    return response;
  } catch (error) {
    // Network errors or other issues
    console.error('Fetch error:', error);
    throw error;
  }
}

/**
 * JSON fetch wrapper for common API calls
 */
export async function fetchJSON<T = unknown>(
  url: string,
  options?: FetchOptions
): Promise<{ data?: T; error?: string; status: number }> {
  try {
    const response = await authFetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    const status = response.status;
    
    // Handle different response types
    if (!response.ok) {
      let error = 'Erro na requisição';
      
      try {
        const errorData = await response.json();
        error = errorData.error || errorData.message || error;
      } catch {
        // If response is not JSON, use status text
        error = response.statusText || error;
      }
      
      return { error, status };
    }

    // Success response
    try {
      const data = await response.json();
      return { data, status };
    } catch {
      // Response might be empty or not JSON
      return { status };
    }
  } catch (error) {
    console.error('FetchJSON error:', error);
    return {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      status: 0,
    };
  }
}

/**
 * Form data fetch wrapper
 */
export async function fetchFormData<T = any>(
  url: string,
  formData: FormData,
  options?: Omit<FetchOptions, 'body'>
): Promise<{ data?: T; error?: string; status: number }> {
  try {
    const response = await authFetch(url, {
      ...options,
      method: options?.method || 'POST',
      body: formData,
    });

    const status = response.status;
    
    if (!response.ok) {
      let error = 'Erro na requisição';
      
      try {
        const errorData = await response.json();
        error = errorData.error || errorData.message || error;
      } catch {
        error = response.statusText || error;
      }
      
      return { error, status };
    }

    try {
      const data = await response.json();
      return { data, status };
    } catch {
      return { status };
    }
  } catch (error) {
    console.error('FetchFormData error:', error);
    return {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      status: 0,
    };
  }
}