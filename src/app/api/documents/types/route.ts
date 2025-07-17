import { NextRequest, NextResponse } from 'next/server';
import { 
  getAllDocumentTypeInfos, 
  getSupportedDocumentTypes,
  documentProcessorFactory 
} from '@/services/documents';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const format = url.searchParams.get('format') || 'full';

    if (format === 'simple') {
      // Return simple list of supported types
      const supportedTypes = getSupportedDocumentTypes();
      
      return NextResponse.json({
        success: true,
        documentTypes: supportedTypes,
        count: supportedTypes.length
      });
    }

    // Return full type information
    const typeInfos = getAllDocumentTypeInfos();
    const stats = documentProcessorFactory.getStatistics();

    return NextResponse.json({
      success: true,
      documentTypes: typeInfos,
      statistics: stats,
      count: typeInfos.length
    });

  } catch (error) {
    console.error('Error getting document types:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}