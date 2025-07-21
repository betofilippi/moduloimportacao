import { NextRequest, NextResponse } from 'next/server';
import { getSecureSession } from '@/lib/supabase-server';
import { getNocoDBService } from '@/lib/services/nocodb';
import { NOCODB_TABLES } from '@/config/nocodb-tables';
import { format } from 'date-fns';

/**
 * Simplified process creation for unknown documents
 * Creates a process with minimal data - just invoice number
 */
export async function POST(request: NextRequest) {
  console.log('🚀 [CREATE-SIMPLE] Starting simplified process creation');
  
  try {
    // Check authentication
    const auth = await getSecureSession();
    if (!auth?.user) {
      console.log('❌ [CREATE-SIMPLE] Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { invoiceNumber, fileHash } = body;

    console.log('📋 [CREATE-SIMPLE] Request data:', {
      invoiceNumber,
      fileHash
    });

    // Validate required field
    if (!invoiceNumber) {
      console.log('❌ [CREATE-SIMPLE] Missing invoice number');
      return NextResponse.json(
        { error: 'Invoice number is required' },
        { status: 400 }
      );
    }

    try {
      const nocodb = getNocoDBService();
      
      // Generate process number
      const processNumber = `IMP-${invoiceNumber}`;
      
      // Check if process already exists
      const existingProcesses = await nocodb.find(NOCODB_TABLES.PROCESSOS_IMPORTACAO, {
        where: `(numero_processo,eq,${processNumber})`,
        limit: 1
      });

      if (existingProcesses.list && existingProcesses.list.length > 0) {
        console.log('⚠️ [CREATE-SIMPLE] Process already exists:', processNumber);
        
        // If process exists and fileHash is provided, connect the document
        if (fileHash) {
          const existingProcess = existingProcesses.list[0];
          await connectDocumentToProcess(existingProcess.Id, fileHash);
        }
        
        return NextResponse.json({
          success: true,
          processId: existingProcesses.list[0].Id,
          processNumber: processNumber,
          isNew: false,
          message: 'Processo já existe, documento foi conectado'
        });
      }

      // Create minimal process data
      const processData = {
        numero_processo: processNumber,
        invoiceNumber: invoiceNumber,
        descricao: 'Processo criado automaticamente via documento desconhecido',
        empresa: 'A definir',
        responsavel: 'Sistema',
        email_responsavel: '',
        data_inicio: format(new Date(), 'yyyy-MM-dd'),
        status: 'active',
        etapa: 'solicitado', // Default Kanban stage
        criado_por: auth.user.email || 'sistema'
      };

      console.log('📊 [CREATE-SIMPLE] Creating process with data:', processData);

      // Create the process
      const createdProcess = await nocodb.create(
        NOCODB_TABLES.PROCESSOS_IMPORTACAO,
        processData
      );

      console.log('✅ [CREATE-SIMPLE] Process created:', {
        id: createdProcess.Id,
        processNumber: processNumber
      });

      // Connect document if fileHash provided
      if (fileHash) {
        await connectDocumentToProcess(createdProcess.Id, fileHash);
        
        // Also update document type in DOCUMENT_UPLOADS if it was unknown
        try {
          // First, find the upload record by hash to get the ID
          const uploadRecords = await nocodb.find(NOCODB_TABLES.DOCUMENT_UPLOADS, {
            where: `(hashArquivo,eq,${fileHash})`,
            limit: 1
          });
          
          console.log('🔍 [CREATE-SIMPLE] Found upload records:', uploadRecords.list?.length || 0);
          
          if (uploadRecords.list && uploadRecords.list.length > 0) {
            const uploadRecord = uploadRecords.list[0];
            console.log('📋 [CREATE-SIMPLE] Current upload record:', {
              Id: uploadRecord.Id,
              currentType: uploadRecord.tipoDocumento,
              hash: uploadRecord.hashArquivo
            });
            
            if (uploadRecord.tipoDocumento === 'unknown' || uploadRecord.tipoDocumento === 'desconhecido') {
              // Now update using the correct ID
              const updateResult = await nocodb.update(
                NOCODB_TABLES.DOCUMENT_UPLOADS,
                uploadRecord.Id,
                {
                  tipoDocumento: 'identificado_com_processo'
                }
              );
              console.log('✅ [CREATE-SIMPLE] Updated document type from unknown to identificado_com_processo', updateResult);
            }
          } else {
            console.log('⚠️ [CREATE-SIMPLE] No upload record found for hash:', fileHash);
          }
        } catch (error) {
          console.error('❌ [CREATE-SIMPLE] Error updating document type:', error);
          // Don't fail the operation
        }
      }

      return NextResponse.json({
        success: true,
        processId: createdProcess.Id,
        processNumber: processNumber,
        isNew: true,
        message: 'Processo criado com sucesso'
      });

    } catch (dbError) {
      console.error('❌ [CREATE-SIMPLE] Database error:', dbError);
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to create process',
          details: dbError instanceof Error ? dbError.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ [CREATE-SIMPLE] General error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

/**
 * Helper function to connect document to process
 */
async function connectDocumentToProcess(processId: string, fileHash: string) {
  try {
    const nocodb = getNocoDBService();
    
    // Check if connection already exists
    const existingRelations = await nocodb.find(NOCODB_TABLES.PROCESSO_DOCUMENTO_REL, {
      where: `(processo_importacao,eq,${processId})~and(hash_arquivo_upload,eq,${fileHash})`,
      limit: 1
    });

    if (existingRelations.list && existingRelations.list.length > 0) {
      console.log('⚠️ [CREATE-SIMPLE] Document already connected to process');
      return;
    }

    // Create the connection
    await nocodb.create(NOCODB_TABLES.PROCESSO_DOCUMENTO_REL, {
      processo_importacao: processId,
      hash_arquivo_upload: fileHash
    });

    console.log('✅ [CREATE-SIMPLE] Document connected to process');
  } catch (error) {
    console.error('❌ [CREATE-SIMPLE] Error connecting document:', error);
    // Don't throw - this is not critical
  }
}