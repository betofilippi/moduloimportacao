import { NextRequest, NextResponse } from 'next/server';
import { documentProcessorFactory } from '@/services/documents';

export async function GET(request: NextRequest) {
  try {
    const stats = documentProcessorFactory.getStatistics();
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'Document Processing System',
      version: '1.0.0',
      statistics: stats,
      processors: {
        registered: stats.totalProcessors,
        multiStep: stats.multiStepProcessors,
        supportedFormats: stats.supportedFormats,
        documentTypes: stats.documentTypes
      },
      checks: {
        factoryInitialized: stats.totalProcessors > 0,
        processorsRegistered: stats.documentTypes.length > 0,
        formatsSupported: stats.supportedFormats.length > 0
      }
    };

    // Determine overall health status
    const allChecksPass = Object.values(health.checks).every(check => check === true);
    health.status = allChecksPass ? 'healthy' : 'degraded';

    const statusCode = allChecksPass ? 200 : 503;

    return NextResponse.json(health, { status: statusCode });

  } catch (error) {
    console.error('Health check error:', error);
    
    return NextResponse.json(
      { 
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        service: 'Document Processing System',
        error: 'Health check failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 503 }
    );
  }
}