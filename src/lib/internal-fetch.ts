import { headers } from 'next/headers';

/**
 * Internal fetch utility for making requests between API routes
 * Handles authentication headers and SSL issues
 */
export async function internalFetch(
  url: string, 
  options: RequestInit = {}
): Promise<Response> {
  const headersList = await headers();
  
  // Get necessary headers for authentication
  const authHeaders: Record<string, string> = {};
  
  // Copy cookie header for authentication
  const cookie = headersList.get('cookie');
  if (cookie) {
    authHeaders['Cookie'] = cookie;
  }
  
  // Copy authorization header if present
  const authorization = headersList.get('authorization');
  if (authorization) {
    authHeaders['Authorization'] = authorization;
  }
  
  // Merge headers
  const finalHeaders = {
    ...authHeaders,
    ...options.headers,
  };
  
  // Make the request with node fetch options to handle SSL
  return fetch(url, {
    ...options,
    headers: finalHeaders,
    // @ts-ignore - Node.js specific options
    agent: process.env.NODE_ENV === 'production' ? undefined : {
      rejectUnauthorized: false // Only for development to handle self-signed certs
    }
  });
}

/**
 * Convert File to Buffer for processing
 * Avoids experimental File API warnings
 */
export async function fileToBuffer(file: File): Promise<{
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  size: number;
}> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  return {
    buffer,
    originalName: file.name,
    mimeType: file.type,
    size: file.size
  };
}