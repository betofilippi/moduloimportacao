import { NextRequest, NextResponse } from 'next/server';
import { getSecureSession } from '@/lib/supabase-server';
import { documentTypeMapping } from '@/services/documents/unknown/prompts';
import { internalFetch, fileToBuffer } from '@/lib/internal-fetch';

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
    const session = await getSecureSession();
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
      // Step 1: Upload file with type 'unknown'
      console.log('📤 [IDENTIFY] Uploading file to storage...');
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('documentType', 'unknown');
      
      const uploadResponse = await internalFetch(
        new URL('/api/ocr/upload', request.url).toString(),
        {
          method: 'POST',
          body: uploadFormData
        }
      );

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        console.log('❌ [IDENTIFY] Upload failed:', errorData);
        throw new Error(errorData.error || 'Failed to upload file');
      }

      const uploadResult = await uploadResponse.json();
      console.log('✅ [IDENTIFY] Upload successful:', {
        storagePath: uploadResult.data.storagePath,
        fileHash: uploadResult.data.fileHash,
        fromCache: uploadResult.fromCache || false
      });

      // Step 2: Extract with identification prompt
      console.log('🔍 [IDENTIFY] Running OCR with identification prompt...');
      const extractData = {
        storagePath: uploadResult.data.storagePath,
        fileType: '.pdf',
        documentType: 'unknown',
        fileHash: uploadResult.data.fileHash
      };

      const extractResponse = await internalFetch(
        new URL('/api/ocr/extract-claude-multi', request.url).toString(),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(extractData)
        }
      );

      if (!extractResponse.ok) {
        const errorData = await extractResponse.json();
        console.log('❌ [IDENTIFY] OCR extraction failed:', errorData);
        throw new Error(errorData.error || 'Failed to extract text');
      }

      const extractResult = await extractResponse.json();
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