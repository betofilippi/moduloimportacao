'use server';

/**
 * Server Actions for internal API calls
 * Avoids network requests by calling functions directly
 */

import { getSecureSession } from '@/lib/supabase-server';
import { uploadToStorage } from '@/lib/services/StorageService';
import { getNocoDBService } from '@/lib/services/nocodb';
import { NOCODB_TABLES } from '@/config/nocodb-tables';
import { DocumentCacheService } from '@/lib/services/DocumentCacheService';
import { extractPDFWithClaude } from '@/services/ocr/claudePDF';
import crypto from 'crypto';

export interface UploadResult {
  success: boolean;
  data?: {
    storagePath: string;
    fileHash: string;
    fileUrl: string;
    fromCache?: boolean;
  };
  error?: string;
}

export interface ExtractResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Direct file upload without HTTP request
 */
export async function directFileUpload(
  file: File,
  documentType: string = 'unknown'
): Promise<UploadResult> {
  try {
    // Get secure session
    const session = await getSecureSession();
    if (!session?.user) {
      return { success: false, error: 'Unauthorized' };
    }

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
    
    if (existingDoc) {
      console.log('✅ [DIRECT-UPLOAD] File found in cache');
      return {
        success: true,
        data: {
          storagePath: existingDoc.caminhoArquivo || '',
          fileHash: existingDoc.hashArquivo,
          fileUrl: existingDoc.urlArquivo || '',
          fromCache: true
        }
      };
    }

    // Upload to storage
    const timestamp = new Date().toISOString().split('T')[0];
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `documents/${timestamp}/${fileHash}_${safeName}`;
    
    const { publicUrl, error: uploadError } = await uploadToStorage(
      storagePath,
      buffer,
      file.type
    );

    if (uploadError) {
      console.error('❌ [DIRECT-UPLOAD] Storage error:', uploadError);
      return { success: false, error: uploadError.message };
    }

    // Save to database
    const nocodb = getNocoDBService();
    const uploadData = {
      hashArquivo: fileHash,
      nomeArquivo: safeName,
      nomeOriginal: file.name,
      tipoDocumento: documentType,
      tamanhoArquivo: file.size,
      caminhoArquivo: storagePath,
      urlArquivo: publicUrl,
      idUsuario: session.user.id,
      emailUsuario: session.user.email,
      dataUpload: new Date().toISOString(),
      statusProcessamento: 'pendente'
    };

    try {
      await nocodb.create(NOCODB_TABLES.DOCUMENT_UPLOADS, uploadData);
      console.log('✅ [DIRECT-UPLOAD] Document saved to database');
    } catch (dbError) {
      console.error('❌ [DIRECT-UPLOAD] Database error:', dbError);
      // Continue even if DB save fails
    }

    return {
      success: true,
      data: {
        storagePath,
        fileHash,
        fileUrl: publicUrl || ''
      }
    };
  } catch (error) {
    console.error('❌ [DIRECT-UPLOAD] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    };
  }
}

/**
 * Direct OCR extraction without HTTP request
 */
export async function directOCRExtraction(
  storagePath: string,
  documentType: string,
  fileHash: string
): Promise<ExtractResult> {
  try {
    // Get secure session
    const session = await getSecureSession();
    if (!session?.user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Extract with Claude
    const result = await extractPDFWithClaude(
      storagePath,
      documentType,
      undefined,
      { fileHash }
    );

    if (result.error) {
      return { success: false, error: result.error };
    }

    return {
      success: true,
      data: result
    };
  } catch (error) {
    console.error('❌ [DIRECT-OCR] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'OCR extraction failed'
    };
  }
}

/**
 * Direct process search without HTTP request
 */
export async function directFindProcess(
  invoiceNumber: string
): Promise<{ success: boolean; processes?: any[]; error?: string }> {
  try {
    const session = await getSecureSession();
    if (!session?.user) {
      return { success: false, error: 'Unauthorized' };
    }

    const nocodb = getNocoDBService();
    const result = await nocodb.find(NOCODB_TABLES.PROCESSOS_IMPORTACAO, {
      where: `(invoiceNumber,eq,${invoiceNumber})`,
      limit: 50,
      sort: ['-data_inicio']
    });

    const processes = result.list || [];
    
    // Map to minimal process data
    const mappedProcesses = processes.map(p => ({
      id: p.Id,
      numero_processo: p.numero_processo,
      empresa: p.empresa,
      invoice: p.invoiceNumber,
      status: p.status,
      data_inicio: p.data_inicio
    }));

    return {
      success: true,
      processes: mappedProcesses
    };
  } catch (error) {
    console.error('❌ [DIRECT-FIND-PROCESS] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Process search failed'
    };
  }
}

/**
 * Direct document-process connection without HTTP request
 */
export async function directConnectProcess(
  processId: string,
  fileHash: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getSecureSession();
    if (!session?.user) {
      return { success: false, error: 'Unauthorized' };
    }

    const nocodb = getNocoDBService();
    
    // Create relationship record
    const relationData = {
      processo_importacao: processId,
      hash_arquivo_upload: fileHash,
      criado_em: new Date().toISOString(),
      criado_por: session.user.email || 'sistema'
    };

    await nocodb.create(NOCODB_TABLES.PROCESSO_DOCUMENTO_REL, relationData);
    
    console.log('✅ [DIRECT-CONNECT] Document connected to process');
    
    return { success: true };
  } catch (error) {
    console.error('❌ [DIRECT-CONNECT] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Connection failed'
    };
  }
}