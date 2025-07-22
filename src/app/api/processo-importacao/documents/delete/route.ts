import { NextRequest, NextResponse } from 'next/server';
import { getSecureSession } from '@/lib/supabase-server';
import { getProcessDocumentService } from '@/lib/services/ProcessDocumentService';
import { getDocumentCacheService } from '@/lib/services/DocumentCacheService';
import { getNocoDBService } from '@/lib/services/nocodb';
import { NOCODB_TABLES, transformToNocoDBFormat, TABLE_FIELD_MAPPINGS } from '@/config/nocodb-tables';

/**
 * POST endpoint to remove a document from a process
 * 
 * Request body:
 * - documentHash: The hash of the document to remove
 * - processId: The ID of the process to remove the document from
 * 
 * This endpoint will:
 * 1. Remove the document-process relationship
 * 2. Check if document is linked to other processes
 * 3. Mark as deleted in DOCUMENT_UPLOADS if not linked elsewhere
 * 4. Create an audit log entry
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSecureSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { documentHash, processId } = body;

    // Validate required parameters
    if (!documentHash || !processId) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Document hash and process ID are required' 
        },
        { status: 400 }
      );
    }

    console.log(`🗑️ [DELETE-DOCUMENT] Removing document ${documentHash} from process ${processId}`);

    const processDocumentService = getProcessDocumentService();
    const documentCacheService = getDocumentCacheService();
    const nocodb = getNocoDBService();

    // Get process details for audit log
    let processNumber = processId; // Default to ID if we can't find the number
    try {
      const processes = await nocodb.find(NOCODB_TABLES.PROCESSOS_IMPORTACAO, {
        where: `(Id,eq,${processId})`,
        limit: 1
      });
      
      if (processes.list && processes.list.length > 0) {
        processNumber = processes.list[0].numero_processo || processId;
      }
    } catch (error) {
      console.warn('⚠️ [DELETE-DOCUMENT] Could not fetch process details:', error);
    }

    // Remove the document-process relationship
    const unlinkResult = await processDocumentService.unlinkDocumentFromProcess(
      processId,
      documentHash
    );

    if (!unlinkResult.success) {
      console.error('❌ [DELETE-DOCUMENT] Failed to unlink document:', unlinkResult.error);
      return NextResponse.json(
        { 
          success: false,
          error: unlinkResult.error || 'Failed to remove document from process' 
        },
        { status: 500 }
      );
    }

    console.log('✅ [DELETE-DOCUMENT] Document unlinked from process successfully');

    // Check if the document is linked to any other processes
    const linkedProcesses = await processDocumentService.getDocumentProcesses(documentHash);
    const isOrphan = linkedProcesses.length === 0;

    console.log(`📊 [DELETE-DOCUMENT] Document is linked to ${linkedProcesses.length} other processes`);

    // If document is not linked to any other processes, mark it as deleted
    if (isOrphan) {
      try {
        // Find the document upload record
        const uploads = await nocodb.find(NOCODB_TABLES.DOCUMENT_UPLOADS, {
          where: `(hashArquivo,eq,${documentHash})`,
          limit: 1
        });

        if (uploads.list && uploads.list.length > 0) {
          const upload = uploads.list[0];
          
          // Update the status to indicate it's no longer linked to any process
          await nocodb.update(NOCODB_TABLES.DOCUMENT_UPLOADS, upload.Id, {
            statusProcessamento: 'removido',
            dataProcessamento: new Date().toISOString(),
            Id: upload.Id
          });

          console.log('📝 [DELETE-DOCUMENT] Marked orphaned document as removed');
        }
      } catch (error) {
        console.error('⚠️ [DELETE-DOCUMENT] Error updating document status:', error);
        // Don't fail the operation if we can't update the status
      }
    }

    // Create audit log entry
    try {
      const auditLogData = transformToNocoDBFormat({
        hash_arquivo_origem: documentHash,
        numero_processo: processNumber,
        responsavel: session.user.email || session.user.id,
        ultima_etapa: 'document_attached',
        nova_etapa: 'document_removed',
        descricao_regra: `Documento removido do processo por ${session.user.email || session.user.id}`
      }, TABLE_FIELD_MAPPINGS.LOGS_IMPORTACAO);

      await nocodb.create(NOCODB_TABLES.LOGS.ETAPA_AUDIT, auditLogData);
      
      console.log('📝 [DELETE-DOCUMENT] Audit log created');
    } catch (auditError: any) {
      console.error('⚠️ [DELETE-DOCUMENT] Error creating audit log:', auditError);
      
      // If audit table doesn't exist, log but don't fail
      if (auditError.message?.includes('not found') || auditError.message?.includes('does not exist')) {
        console.log('⚠️ [DELETE-DOCUMENT] Audit table not found, skipping audit log');
      }
    }

    // Update process pipeline to remove the document
    try {
      const processes = await nocodb.find(NOCODB_TABLES.PROCESSOS_IMPORTACAO, {
        where: `(Id,eq,${processId})`,
        limit: 1
      });

      if (processes.list && processes.list.length > 0) {
        const process = processes.list[0];
        
        // Parse and update pipeline
        let pipeline = [];
        try {
          pipeline = JSON.parse(process.documentsPipeline || '[]');
        } catch (e) {
          pipeline = [];
        }

        // Remove document from pipeline
        pipeline = pipeline.filter((doc: any) => doc.fileHash !== documentHash);

        await nocodb.update(NOCODB_TABLES.PROCESSOS_IMPORTACAO, process.Id, {
          documentsPipeline: JSON.stringify(pipeline)
        });

        console.log('📝 [DELETE-DOCUMENT] Updated process pipeline');
      }
    } catch (error) {
      console.error('⚠️ [DELETE-DOCUMENT] Error updating process pipeline:', error);
      // Don't fail the operation if we can't update the pipeline
    }

    return NextResponse.json({
      success: true,
      message: 'Document removed from process successfully',
      documentHash,
      processId,
      isOrphan,
      linkedProcessCount: linkedProcesses.length
    });

  } catch (error) {
    console.error('❌ [DELETE-DOCUMENT] Unexpected error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove document from process'
      },
      { status: 500 }
    );
  }
}