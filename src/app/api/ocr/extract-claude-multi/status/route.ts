import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-server';
import { createHash } from 'crypto';

// Import the active requests map from the main route
import { getActiveRequest } from '../route';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const { user } = await getAuthenticatedUser();
    
    // Get request parameters
    const url = new URL(request.url);
    const requestId = url.searchParams.get('requestId');
    
    if (!requestId) {
      return NextResponse.json(
        { error: 'Missing requestId parameter' },
        { status: 400 }
      );
    }
    
    // Check if request is active
    const activeRequest = getActiveRequest(requestId);
    
    if (!activeRequest) {
      return NextResponse.json(
        { status: 'not_found', message: 'No active request found' },
        { status: 404 }
      );
    }
    
    // Check if request is completed
    try {
      const result = await Promise.race([
        activeRequest.promise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('timeout')), 1000)
        )
      ]);
      
      // Request completed
      return NextResponse.json({
        status: 'completed',
        result
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'timeout') {
        // Request still in progress
        return NextResponse.json({
          status: 'processing',
          timestamp: activeRequest.timestamp,
          elapsedTime: Date.now() - activeRequest.timestamp
        });
      }
      
      // Request failed
      return NextResponse.json(
        { status: 'failed', error: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}