'use server';

/**
 * Server Actions for import processes
 * Direct database access without HTTP requests
 */

import { getSecureSession } from '@/lib/supabase-server';
import { getNocoDBService } from '@/lib/services/nocodb';
import { NOCODB_TABLES, TABLE_FIELD_MAPPINGS } from '@/config/nocodb-tables';

export interface ProcessSearchResult {
  success: boolean;
  processes?: Array<{
    id: string;
    numero_processo: string;
    empresa: string;
    invoice: string;
    status: string;
    data_inicio: string;
  }>;
  error?: string;
}

export interface ProcessConnectionResult {
  success: boolean;
  error?: string;
}

/**
 * Search for processes by invoice number
 */
export async function searchProcessesByInvoice(
  invoiceNumber: string
): Promise<ProcessSearchResult> {
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
    console.error('❌ [SEARCH-PROCESSES] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Process search failed'
    };
  }
}

/**
 * Get all active processes (for documents without invoice)
 */
export async function getAllActiveProcesses(): Promise<ProcessSearchResult> {
  try {
    const session = await getSecureSession();
    if (!session?.user) {
      return { success: false, error: 'Unauthorized' };
    }

    const nocodb = getNocoDBService();
    const result = await nocodb.find(NOCODB_TABLES.PROCESSOS_IMPORTACAO, {
      where: "(status,neq,finalizado)",
      limit: 1000,
      sort: ['-data_inicio']
    });

    const processes = result.list || [];
    
    // Map to minimal process data
    const mappedProcesses = processes.map(p => ({
      id: p.Id,
      numero_processo: p.numero_processo,
      empresa: p.empresa,
      invoice: p.invoiceNumber || '',
      status: p.status,
      data_inicio: p.data_inicio
    }));

    return {
      success: true,
      processes: mappedProcesses
    };
  } catch (error) {
    console.error('❌ [GET-ALL-PROCESSES] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get processes'
    };
  }
}

/**
 * Connect a document to a process
 */
export async function connectDocumentToProcess(
  processId: string,
  fileHash: string
): Promise<ProcessConnectionResult> {
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
    
    console.log('✅ [CONNECT-DOCUMENT] Document connected to process');
    
    return { success: true };
  } catch (error) {
    console.error('❌ [CONNECT-DOCUMENT] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Connection failed'
    };
  }
}

/**
 * Update process status in DOCUMENT_UPLOADS table
 */
export async function updateDocumentUploadStatus(
  fileHash: string,
  documentId: string,
  status: string = 'completo'
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getSecureSession();
    if (!session?.user) {
      return { success: false, error: 'Unauthorized' };
    }

    const nocodb = getNocoDBService();
    
    // Find upload record by hash
    const uploadRecords = await nocodb.find(NOCODB_TABLES.DOCUMENT_UPLOADS, {
      where: `(hashArquivo,eq,${fileHash})`,
      limit: 1
    });
    
    if (uploadRecords.list && uploadRecords.list.length > 0) {
      const uploadRecord = uploadRecords.list[0];
      
      // Update status
      await nocodb.update(NOCODB_TABLES.DOCUMENT_UPLOADS, uploadRecord.Id, {
        statusProcessamento: status,
        idDocumento: documentId,
        dataProcessamento: new Date().toISOString()
      });
      
      console.log(`✅ Status updated to '${status}' - Upload ID: ${uploadRecord.Id}`);
      return { success: true };
    }
    
    return { success: false, error: 'Upload record not found' };
  } catch (error) {
    console.error('❌ [UPDATE-UPLOAD-STATUS] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Status update failed'
    };
  }
}