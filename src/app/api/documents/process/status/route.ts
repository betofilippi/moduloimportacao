import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/supabase-server';
import { OCRExtractionService } from '@/services/ocr/internal';

/**
 * Check status of async document processing
 * - Receives requestId from process endpoint
 * - Polls OCR status endpoint
 * - Returns processing progress or final results
 */
export async function GET(request: NextRequest) {
  console.log('📊 [PROCESS STATUS] Checking document processing status');
  
  try {
    // Check authentication
    const session = await getSession();
    if (!session?.user) {
      console.log('❌ [PROCESS STATUS] Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get requestId from query params
    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('requestId');

    if (!requestId) {
      console.log('❌ [PROCESS STATUS] Missing requestId');
      return NextResponse.json(
        { error: 'Missing requestId parameter' },
        { status: 400 }
      );
    }

    console.log('🔍 [PROCESS STATUS] Checking status for:', { requestId });

    try {
      // Check status using internal service
      const statusResult = await OCRExtractionService.checkStatus(requestId);
      
      if (statusResult.status === 'not_found') {
        console.log('❌ [PROCESS STATUS] Request not found');
        return NextResponse.json(
          { status: 'not_found', message: 'No active request found' },
          { status: 404 }
        );
      }
      
      // Check if processing is complete
      if (statusResult.status === 'completed' && statusResult.result) {
        console.log('✅ [PROCESS STATUS] Processing completed');
        
        const data = statusResult.result;
        
        // Extract document type and structured data
        const documentType = data.metadata?.documentType || data.documentType;
        let structuredData;
        
        if (data.structuredResult) {
          structuredData = data.structuredResult;
          console.log('📊 [PROCESS STATUS] Using structured result from multi-step extraction');
        } else if (data.extractedData) {
          structuredData = data.extractedData;
          console.log('📊 [PROCESS STATUS] Using extracted data');
        } else {
          console.log('⚠️ [PROCESS STATUS] No structured data found, using raw text');
          structuredData = { rawText: data.rawText || '' };
        }

        // Prepare complete response similar to synchronous processing
        const response = {
          success: true,
          status: 'completed',
          documentType,
          extractedData: structuredData,
          metadata: {
            storagePath: data.metadata?.storagePath,
            fileHash: data.metadata?.fileHash,
            originalFileName: data.metadata?.originalFileName,
            processingTime: data.metadata?.processingTime,
            tokenUsage: data.metadata?.tokenUsage,
            multiStep: data.metadata?.multiPrompt || false
          },
          readyToSave: true,
          message: `Documento ${documentType} processado com sucesso`
        };

        return NextResponse.json(response);
      }
      
      // Return failed status
      if (statusResult.status === 'failed') {
        console.log('❌ [PROCESS STATUS] Processing failed:', statusResult.error);
        return NextResponse.json(
          { 
            success: false,
            status: 'failed',
            error: statusResult.error || 'Unknown processing error'
          },
          { status: 500 }
        );
      }

      // Return current status if still processing
      console.log('⏳ [PROCESS STATUS] Processing in progress:', {
        status: statusResult.status,
        elapsedTime: statusResult.elapsedTime
      });

      return NextResponse.json({
        success: true,
        status: statusResult.status,
        progress: Math.min(90, Math.floor((statusResult.elapsedTime || 0) / 1000)), // Estimate progress based on elapsed time
        estimatedTimeRemaining: statusResult.elapsedTime ? Math.max(5, 120 - Math.floor((statusResult.elapsedTime || 0) / 1000)) : 120,
        message: 'Processamento em andamento...'
      });

    } catch (statusError) {
      console.error('❌ [PROCESS STATUS] Status check error:', statusError);
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to check processing status',
          details: statusError instanceof Error ? statusError.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ [PROCESS STATUS] General error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}