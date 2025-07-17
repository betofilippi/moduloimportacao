/**
 * NocoDB Factory and Singleton Instance
 */

import { NocoDBService } from './NocoDBService';

let nocodbInstance: NocoDBService | null = null;

/**
 * Get or create a singleton instance of NocoDBService
 * @returns NocoDBService instance
 * @throws Error if environment variables are not configured
 */
export function getNocoDBService(): NocoDBService {
  if (!nocodbInstance) {
    const baseURL = process.env.NEXT_PUBLIC_NOCODB_API_URL;
    const apiToken = process.env.NEXT_PUBLIC_NOCODB_API_TOKEN;

    if (!baseURL || !apiToken) {
      throw new Error(
        'NocoDB configuration missing. Please check NEXT_PUBLIC_NOCODB_API_URL and NEXT_PUBLIC_NOCODB_API_TOKEN environment variables.'
      );
    }

    // Warn if using default token
    if (apiToken === 'your_token_here') {
      console.warn(
        '⚠️  Warning: Using default NocoDB token. Please update NOCODB_API_TOKEN in .env.local'
      );
    }

    nocodbInstance = new NocoDBService({
      baseURL,
      apiToken,
    });

    console.log('✅ NocoDB service initialized');
  }

  return nocodbInstance;
}

/**
 * Reset the NocoDB instance (useful for testing)
 */
export function resetNocoDBService(): void {
  nocodbInstance = null;
}

/**
 * Check if NocoDB is configured
 */
export function isNocoDBConfigured(): boolean {
  const baseURL = process.env.NEXT_PUBLIC_NOCODB_API_URL;
  const apiToken = process.env.NEXT_PUBLIC_NOCODB_API_TOKEN;
  
  return !!(baseURL && apiToken && apiToken !== 'your_token_here');
}

/**
 * Get NocoDB configuration status
 */
export function getNocoDBStatus(): {
  configured: boolean;
  hasUrl: boolean;
  hasToken: boolean;
  isDefaultToken: boolean;
} {
  const baseURL = process.env.NEXT_PUBLIC_NOCODB_API_URL;
  const apiToken = process.env.NEXT_PUBLIC_NOCODB_API_TOKEN;

  return {
    configured: isNocoDBConfigured(),
    hasUrl: !!baseURL,
    hasToken: !!apiToken,
    isDefaultToken: apiToken === 'your_token_here',
  };
}