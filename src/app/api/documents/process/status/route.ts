import { NextRequest, NextResponse } from 'next/server';
import { getSecureSession } from '@/lib/supabase-server';

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
    const session = await getSecureSession();
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
      // Call OCR status endpoint
      const statusResponse = await fetch(
        new URL(`/api/ocr/extract-claude-multi/status?requestId=${requestId}`, request.url).toString(),
        {
          method: 'GET',
          headers: {
            'Cookie': request.headers.get('cookie') || ''
          }
        }
      );

      if (!statusResponse.ok) {
        const errorData = await statusResponse.json();
        console.log('❌ [PROCESS STATUS] OCR status check failed:', errorData);
        return NextResponse.json(errorData, { status: statusResponse.status });
      }

      const statusResult = await statusResponse.json();
      
      // Check if processing is complete
      if (statusResult.status === 'completed' && statusResult.data) {
        console.log('✅ [PROCESS STATUS] Processing completed');
        
        // Extract document type and structured data
        const documentType = statusResult.data.metadata?.documentType || statusResult.data.documentType;
        let structuredData;
        
        if (statusResult.data.structuredResult) {
          structuredData = statusResult.data.structuredResult;
          console.log('📊 [PROCESS STATUS] Using structured result from multi-step extraction');
        } else if (statusResult.data.extractedData) {
          structuredData = statusResult.data.extractedData;
          console.log('📊 [PROCESS STATUS] Using extracted data');
        } else {
          console.log('⚠️ [PROCESS STATUS] No structured data found, using raw text');
          structuredData = { rawText: statusResult.data.rawText || '' };
        }

        // Prepare complete response similar to synchronous processing
        const response = {
          success: true,
          status: 'completed',
          documentType,
          extractedData: structuredData,
          metadata: {
            storagePath: statusResult.data.metadata?.storagePath,
            fileHash: statusResult.data.metadata?.fileHash,
            originalFileName: statusResult.data.metadata?.originalFileName,
            processingTime: statusResult.data.metadata?.processingTime,
            tokenUsage: statusResult.data.metadata?.tokenUsage,
            multiStep: statusResult.data.metadata?.multiPrompt || false
          },
          readyToSave: true,
          message: `Documento ${documentType} processado com sucesso`
        };

        return NextResponse.json(response);
      }

      // Return current status if not completed
      console.log('⏳ [PROCESS STATUS] Processing in progress:', {
        status: statusResult.status,
        progress: statusResult.progress,
        currentStep: statusResult.currentStep
      });

      return NextResponse.json({
        success: true,
        status: statusResult.status,
        progress: statusResult.progress || 0,
        currentStep: statusResult.currentStep,
        currentStepName: statusResult.currentStepName,
        estimatedTimeRemaining: statusResult.estimatedTimeRemaining,
        message: statusResult.message || 'Processamento em andamento...'
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