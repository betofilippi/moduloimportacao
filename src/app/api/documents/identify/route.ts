import { NextRequest, NextResponse } from 'next/server';
import { getSecureSession } from '@/lib/supabase-server';
import { documentTypeMapping } from '@/services/documents/unknown/prompts';
import { StorageService } from '@/lib/services/StorageService';
import { DocumentCacheService } from '@/lib/services/DocumentCacheService';
import { extractMultiPromptsPDF } from '@/services/ocr/pdfProcessor';
import { getNocoDBService } from '@/lib/services/nocodb';
import { NOCODB_TABLES } from '@/config/nocodb-tables';
import crypto from 'crypto';

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
      // Step 1: Upload file with type 'unknown' directly
      console.log('📤 [IDENTIFY] Uploading file to storage...');
      
      // Convert file to buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Calculate file hash
      const hash = crypto.createHash('sha256');
      hash.update(buffer);
      const fileHash = hash.digest('hex');

      // Check if file exists in cache
      const cacheService = new DocumentCacheService();
      const existingDoc = await cacheService.checkExistingDocument(fileHash);
      
      let uploadData;
      if (existingDoc) {
        console.log('✅ [IDENTIFY] File found in cache');
        uploadData = {
          storagePath: existingDoc.caminhoArquivo || '',
          fileHash: existingDoc.hashArquivo,
          fileUrl: existingDoc.urlArquivo || '',
          fromCache: true
        };
      } else {
        // Upload to storage
        const { path: storagePath, publicUrl, fileHash: generatedHash } = await StorageService.uploadFile(
          buffer,
          file.name,
          file.type,
          session.user.id
        );
        
        // Ensure hash consistency
        if (generatedHash !== fileHash) {
          console.warn('Hash mismatch - using generated hash');
        }

        // Save to database
        const nocodb = getNocoDBService();
        const uploadRecord = {
          hashArquivo: fileHash,
          nomeArquivo: safeName,
          nomeOriginal: file.name,
          tipoDocumento: 'unknown',
          tamanhoArquivo: file.size,
          caminhoArquivo: storagePath,
          urlArquivo: publicUrl,
          idUsuario: session.user.id,
          emailUsuario: session.user.email,
          dataUpload: new Date().toISOString(),
          statusProcessamento: 'pendente'
        };

        try {
          await nocodb.create(NOCODB_TABLES.DOCUMENT_UPLOADS, uploadRecord);
          console.log('✅ [IDENTIFY] Document saved to database');
        } catch (dbError) {
          console.error('❌ [IDENTIFY] Database error:', dbError);
          // Continue even if DB save fails
        }

        uploadData = {
          storagePath,
          fileHash,
          fileUrl: publicUrl || '',
          fromCache: false
        };
      }

      console.log('✅ [IDENTIFY] Upload successful:', {
        storagePath: uploadData.storagePath,
        fileHash: uploadData.fileHash,
        fromCache: uploadData.fromCache || false
      });

      // Step 2: Extract with identification prompt directly
      console.log('🔍 [IDENTIFY] Running OCR with identification prompt...');
      
      const extractResult = await extractMultiPromptsPDF(
        uploadData.storagePath,
        'unknown',
        { fileHash: uploadData.fileHash }
      );

      if (!extractResult.success || extractResult.error) {
        console.log('❌ [IDENTIFY] OCR extraction failed:', extractResult.error);
        throw new Error(extractResult.error || 'Failed to extract text');
      }

      console.log('✅ [IDENTIFY] OCR extraction successful');

      // Parse identification result
      let identificationData;
      if (extractResult.extractedData) {
        identificationData = extractResult.extractedData;
      } else if (extractResult.rawText) {
        try {
          identificationData = JSON.parse(extractResult.rawText);
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
          storagePath: uploadData.storagePath,
          fileHash: uploadData.fileHash,
          originalFileName: file.name,
          fromCache: uploadData.fromCache || false
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