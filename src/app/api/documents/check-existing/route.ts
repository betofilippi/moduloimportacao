import { NextRequest, NextResponse } from 'next/server';
import { getSecureSession } from '@/lib/supabase-server';
import { getNocoDBService } from '@/lib/services/nocodb';
import { NOCODB_TABLES } from '@/config/nocodb-tables';
import crypto from 'crypto';

/**
 * Check if a file has already been processed and connected to a process
 */
export async function POST(request: NextRequest) {
  console.log('🔍 [CHECK-EXISTING] Starting file existence check');
  
  try {
    // Check authentication
    const session = await getSecureSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Calculate file hash
    const buffer = await file.arrayBuffer();
    const hash = crypto
      .createHash('sha256')
      .update(Buffer.from(buffer))
      .digest('hex');

    console.log(`📊 [CHECK-EXISTING] File: ${file.name}, Hash: ${hash}`);

    const nocodb = getNocoDBService();
    
    // Check if file was already uploaded
    const uploadRecords = await nocodb.find(NOCODB_TABLES.DOCUMENT_UPLOADS, {
      where: `(hashArquivo,eq,${hash})`,
      limit: 1
    });

    if (!uploadRecords.list || uploadRecords.list.length === 0) {
      console.log('✅ [CHECK-EXISTING] File not found - new file');
      return NextResponse.json({
        exists: false,
        fileHash: hash
      });
    }

    const uploadRecord = uploadRecords.list[0];
    console.log('📋 [CHECK-EXISTING] Found upload record:', {
      id: uploadRecord.Id,
      status: uploadRecord.statusProcessamento,
      documentType: uploadRecord.tipoDocumento,
      documentId: uploadRecord.idDocumento
    });

    // Check if connected to any process
    const relationRecords = await nocodb.find(NOCODB_TABLES.PROCESSO_DOCUMENTO_REL, {
      where: `(hash_arquivo_upload,eq,${hash})`,
      limit: 10
    });

    let processInfo = null;
    
    if (relationRecords.list && relationRecords.list.length > 0) {
      // Get process details for connected processes
      const processIds = relationRecords.list.map(rel => rel.processo_importacao);
      const processPromises = processIds.map(async (processId) => {
        try {
          const process = await nocodb.findOne(NOCODB_TABLES.PROCESSOS_IMPORTACAO, processId);
          return {
            id: process.Id,
            numeroProcesso: process.numero_processo,
            empresa: process.empresa,
            invoice: process.invoiceNumber,
            status: process.status
          };
        } catch (error) {
          console.error(`Error fetching process ${processId}:`, error);
          return null;
        }
      });
      
      const processes = (await Promise.all(processPromises)).filter(p => p !== null);
      
      if (processes.length > 0) {
        processInfo = {
          connected: true,
          processCount: processes.length,
          processes: processes
        };
      }
    }

    return NextResponse.json({
      exists: true,
      fileHash: hash,
      uploadRecord: {
        id: uploadRecord.Id,
        status: uploadRecord.statusProcessamento,
        documentType: uploadRecord.tipoDocumento,
        documentId: uploadRecord.idDocumento,
        uploadedAt: uploadRecord.CreatedAt
      },
      processInfo: processInfo || {
        connected: false,
        processCount: 0,
        processes: []
      }
    });

  } catch (error) {
    console.error('❌ [CHECK-EXISTING] Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check file'
      },
      { status: 500 }
    );
  }
}