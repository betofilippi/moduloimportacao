import { NextRequest, NextResponse } from 'next/server';
import { getSecureSession } from '@/lib/supabase-server';
import { getNocoDBService } from '@/lib/services/nocodb';
import { NOCODB_TABLES } from '@/config/nocodb-tables';

/**
 * Check import process details including related documents
 * Returns process data, related documents, and upload details
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const auth = await getSecureSession();
    if (!auth?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    let body;
    try {
      const text = await request.text();
      if (!text) {
        return NextResponse.json(
          { error: 'Empty request body' },
          { status: 400 }
        );
      }
      body = JSON.parse(text);
    } catch (parseError) {
      console.error('❌ [CHECK PROCESS] JSON parse error:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    
    const { processId } = body;

    if (!processId) {
      return NextResponse.json(
        { error: 'Process ID is required' },
        { status: 400 }
      );
    }

    console.log('🔍 [CHECK PROCESS] Checking process:', processId);

    const nocodb = getNocoDBService();

    // 1. Get process data
    const processData = await nocodb.findOne(
      NOCODB_TABLES.PROCESSOS_IMPORTACAO,
      processId
    );

    if (!processData) {
      return NextResponse.json(
        { error: 'Process not found' },
        { status: 404 }
      );
    }

    // 2. Get related documents from relationship table
    const relatedDocs = await nocodb.find(NOCODB_TABLES.PROCESSO_DOCUMENTO_REL, {
      where: `(processo_importacao,eq,${processId})`,
      limit: 100
    });

    console.log(`📊 [CHECK PROCESS] Found ${relatedDocs.list.length} related documents`);

    // 3. Get document details from uploads table
    const documentDetails = [];
    if (relatedDocs.list.length > 0) {
      // Get unique file hashes
      const fileHashes = [...new Set(relatedDocs.list.map(doc => doc.hash_arquivo_upload))];
      
      // Fetch upload details for each hash
      for (const hash of fileHashes) {
        if (hash) {
          try {
            const uploadRecord = await nocodb.find(NOCODB_TABLES.DOCUMENT_UPLOADS, {
              where: `(hashArquivo,eq,${hash})`,
              limit: 1
            });
            
            if (uploadRecord.list && uploadRecord.list.length > 0) {
              documentDetails.push(uploadRecord.list[0]);
            }
          } catch (error) {
            console.error(`Error fetching upload for hash ${hash}:`, error);
          }
        }
      }
    }

    console.log(`✅ [CHECK PROCESS] Retrieved ${documentDetails.length} document details`);

    // 4. Count documents by type
    const documentCounts: Record<string, number> = {};
    const documentTypes: string[] = [];
    
    documentDetails.forEach(doc => {
      if (doc.tipoDocumento && doc.tipoDocumento !== 'unknown') {
        documentCounts[doc.tipoDocumento] = (documentCounts[doc.tipoDocumento] || 0) + 1;
        if (!documentTypes.includes(doc.tipoDocumento)) {
          documentTypes.push(doc.tipoDocumento);
        }
      }
    });

    // Prepare response
    const response = {
      success: true,
      process: {
        id: processData.Id,
        numero_processo: processData.numero_processo,
        empresa: processData.empresa,
        descricao: processData.descricao,
        responsavel: processData.responsavel,
        status: processData.status,
        data_inicio: processData.data_inicio,
        invoiceNumber: processData.invoiceNumber
      },
      documents: {
        total: documentDetails.length,
        byType: documentCounts,
        types: documentTypes,
        details: documentDetails.map(doc => ({
          id: doc.Id,
          hashArquivo: doc.hashArquivo,
          nomeArquivoOriginal: doc.nomeArquivoOriginal,
          tipoDocumento: doc.tipoDocumento,
          statusProcessamento: doc.statusProcessamento,
          dataUpload: doc.dataUpload,
          idDocumento: doc.idDocumento
        }))
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ [CHECK PROCESS] Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}