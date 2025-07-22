import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/supabase-server';
import { documentTypeMapping } from '@/services/documents/unknown/prompts';
import { OCRUploadService, OCRExtractionService } from '@/services/ocr/internal';
import { DocumentType } from '@/services/documents/base/types';

/**
 * STEP 1: Upload and identify document type
 * - Uploads file with type 'unknown'
 * - Extracts text using identification prompt
 * - Returns identified type for next processing step
 */
export async function POST(request: NextRequest) {
  console.log('📄 [IDENTIFY] Starting document identification process');
  
  try {
    // Check authentication
    const session = await getSession();
    if (!session?.user) {
      console.log('❌ [IDENTIFY] Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      console.log('❌ [IDENTIFY] No file provided');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    console.log(`📎 [IDENTIFY] File received: ${file.name} (${file.size} bytes)`);

    // Validate file type
    if (!file.type.includes('pdf')) {
      console.log('❌ [IDENTIFY] Invalid file type:', file.type);
      return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 });
    }

    try {
      // Step 1: Upload file with type 'unknown' using internal service
      console.log('📤 [IDENTIFY] Uploading file to storage...');
      
      const uploadResult = await OCRUploadService.uploadFile(
        file,
        DocumentType.UNKNOWN,
        {
          userId: session.user.id,
          userEmail: session.user.email
        }
      );

      console.log('✅ [IDENTIFY] Upload successful:', {
        storagePath: uploadResult.data.storagePath,
        fileHash: uploadResult.data.fileHash,
        fromCache: uploadResult.fromCache || false
      });

      // Step 2: Extract with identification prompt using internal service
      console.log('🔍 [IDENTIFY] Running OCR with identification prompt...');
      
      const extractResult = await OCRExtractionService.extractData(
        uploadResult.data.storagePath,
        '.pdf',
        'unknown',
        {
          userId: session.user.id,
          fileHash: uploadResult.data.fileHash
        }
      );

      console.log('✅ [IDENTIFY] OCR extraction successful');

      // Parse identification result
      let identificationData;
      if (extractResult.data?.extractedData) {
        identificationData = extractResult.data.extractedData;
      } else if (extractResult.data?.rawText) {
        try {
          identificationData = JSON.parse(extractResult.data.rawText);
        } catch (e) {
          console.error('❌ [IDENTIFY] Failed to parse identification result:', e);
          throw new Error('Invalid identification result');
        }
      }

      console.log('🎯 [IDENTIFY] Document identified:', {
        tipo: identificationData.tipo,
        has_invoice: identificationData.has_invoice_number,
        document_number: identificationData.document_number
      });

      // Map to internal type
      const mappedType = documentTypeMapping[identificationData.tipo] || 'unknown';
      console.log(`🔄 [IDENTIFY] Mapped type: ${identificationData.tipo} → ${mappedType}`);

      // Prepare response with all necessary data for next step
      const response = {
        success: true,
        uploadData: {
          storagePath: uploadResult.data.storagePath,
          fileHash: uploadResult.data.fileHash,
          originalFileName: file.name,
          fromCache: uploadResult.fromCache || false
        },
        identification: {
          tipo: identificationData.tipo,
          mappedType: mappedType,
          document_number: identificationData.document_number,
          has_invoice_number: identificationData.has_invoice_number,
          resumo: identificationData.resumo,
          data: identificationData.data,
          proximo_modulo: identificationData.proximo_modulo
        },
        nextStep: {
          shouldProcess: mappedType !== 'unknown' && mappedType !== 'other',
          documentType: mappedType,
          message: mappedType === 'unknown' 
            ? 'Documento não identificado. Selecione o tipo manualmente.'
            : `Documento identificado como ${mappedType}. Pronto para processar.`
        }
      };

      console.log('✅ [IDENTIFY] Identification complete:', {
        success: true,
        tipo: identificationData.tipo,
        mappedType: mappedType,
        shouldProcess: response.nextStep.shouldProcess
      });

      return NextResponse.json(response);

    } catch (processingError) {
      console.error('❌ [IDENTIFY] Processing error:', processingError);
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to process document',
          details: processingError instanceof Error ? processingError.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ [IDENTIFY] General error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}