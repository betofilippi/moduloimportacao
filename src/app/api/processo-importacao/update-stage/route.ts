import { NextRequest, NextResponse } from 'next/server';
import { getSecureSession } from '@/lib/supabase-server';
import { getNocoDBService } from '@/lib/services/nocodb';
import { NOCODB_TABLES, KANBAN_CONFIG, TABLE_FIELD_MAPPINGS } from '@/config/nocodb-tables';
import { ProcessBusinessRules } from '@/lib/services/ProcessBusinessRules';
import { transformToNocoDBFormat } from '@/config/nocodb-tables';

/**
 * Update process stage (etapa) with business rules validation
 */
export async function POST(request: NextRequest) {
  console.log('🎯 [UPDATE-STAGE] Starting stage update with business rules');
  
  try {
    // Check authentication
    const session = await getSecureSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      processId, 
      newStage,
      forceUpdate = false,
      reason = 'Mudança manual de etapa',
      notes = ''
    } = await request.json();

    // Validate inputs
    if (!processId || !newStage) {
      return NextResponse.json(
        { error: 'Missing required fields: processId, newStage' },
        { status: 400 }
      );
    }

    // Validate stage exists in configuration
    const validStages = KANBAN_CONFIG.STAGES.map(s => s.id);
    if (!validStages.includes(newStage)) {
      return NextResponse.json(
        { error: `Invalid stage: ${newStage}. Valid stages are: ${validStages.join(', ')}` },
        { status: 400 }
      );
    }

    console.log('🔄 [UPDATE-STAGE] Updating process:', processId, 'to stage:', newStage);

    const nocodb = getNocoDBService();
    
    // Get current process data
    const currentProcess = await nocodb.findOne(
      NOCODB_TABLES.PROCESSOS_IMPORTACAO,
      processId
    );

    if (!currentProcess) {
      return NextResponse.json(
        { error: 'Process not found' },
        { status: 404 }
      );
    }

    const oldStage = currentProcess.etapa || KANBAN_CONFIG.DEFAULT_STAGE;
    
    // Get attached documents
    const documentsResult = await nocodb.find(
      NOCODB_TABLES.PROCESSO_DOCUMENTO_REL,
      {
        where: `(processo_importacao,eq,${processId})`,
        limit: 100
      }
    );
    const documents = documentsResult.list || [];

    // Get document details with proper type handling
    const documentDetails = await Promise.all(
      documents.map(async (rel: any) => {
        try {
          const uploadsResult = await nocodb.find(
            NOCODB_TABLES.DOCUMENT_UPLOADS,
            {
              where: `(hashArquivo,eq,${rel.hash_arquivo_upload})`,
              limit: 1
            }
          );
          const uploads = uploadsResult.list || [];
          
          if (uploads && uploads.length > 0) {
            const upload = uploads[0];
            return {
              tipo_documento: upload.tipoDocumento,
              hash_arquivo: upload.hashArquivo,
              data_anexo: upload.dataUpload,
              nome_arquivo: upload.nomeArquivo
            };
          }
        } catch (error) {
          console.error('Error fetching document details:', error);
        }
        return null;
      })
    );

    const validDocuments = documentDetails.filter(doc => doc !== null);
    console.log('📄 [UPDATE-STAGE] Found documents:', validDocuments.length);
    console.log('📄 [UPDATE-STAGE] Document types:', validDocuments.map(doc => ({
      tipo: doc.tipo_documento,
      nome: doc.nome_arquivo
    })));

    // Check business rules for stage transition
    const transition = ProcessBusinessRules.checkStageTransition(
      oldStage,
      newStage,
      validDocuments,
      forceUpdate
    );

    // If transition is not allowed and not forced, return violations
    if (!transition.allowed && !forceUpdate) {
      console.warn('⚠️ [UPDATE-STAGE] Transition blocked by business rules');
      return NextResponse.json(
        {
          success: false,
          allowed: false,
          violations: transition.violations,
          requiredDocuments: transition.requiredDocuments,
          message: 'Stage change not allowed due to business rule violations'
        },
        { status: 400 }
      );
    }

    // Update the process stage
    const updateData: Record<string, any> = {
      etapa: newStage,
      atualizado_em: new Date().toISOString(),
      atualizado_por: session.user.email || session.user.id
    };

    // Auto-update status based on stage
    if (newStage === 'auditado' && currentProcess.status !== 'completed') {
      updateData.status = 'completed';
      console.log('🎉 [UPDATE-STAGE] Auto-updating status to completed');
    }

    // Update the process
    const updated = await nocodb.update(
      NOCODB_TABLES.PROCESSOS_IMPORTACAO,
      processId,
      updateData
    );

    // Create audit log (RN-09)
    const logData = transformToNocoDBFormat({
      hash_arquivo_origem: `process_${processId}_${Date.now()}`, // Generate unique hash for this log entry
      numero_processo: currentProcess.numero_processo,
      responsavel: session.user.email || session.user.id,
      ultima_etapa: oldStage,
      nova_etapa: newStage,
      descricao_regra: reason // The reason/justification from modal
    }, TABLE_FIELD_MAPPINGS.LOGS_IMPORTACAO);

    console.log('📝 [UPDATE-STAGE] Creating audit log with data:', logData);
    
    try {
      const auditResult = await nocodb.create(
        NOCODB_TABLES.LOGS.ETAPA_AUDIT,
        logData
      );
      console.log('✅ [UPDATE-STAGE] Audit log created successfully:', auditResult);
    } catch (auditError) {
      console.error('❌ [UPDATE-STAGE] Failed to create audit log:', auditError);
      console.error('❌ [UPDATE-STAGE] Log data that failed:', logData);
      // Continue even if audit fails
    }

    // Get all current violations for the new stage
    const currentViolations = ProcessBusinessRules.getAllViolations(
      newStage,
      validDocuments
    );

    console.log('✅ [UPDATE-STAGE] Stage updated successfully');

    return NextResponse.json({
      success: true,
      processId,
      oldStage,
      newStage,
      violations: currentViolations,
      suggestedStage: ProcessBusinessRules.getSuggestedStage(validDocuments),
      attachedDocuments: validDocuments,
      forced: forceUpdate
    });

  } catch (error) {
    console.error('❌ [UPDATE-STAGE] Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update stage'
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check current violations and stage suggestions
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSecureSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const processId = searchParams.get('processId');

    if (!processId) {
      return NextResponse.json(
        { error: 'Process ID is required' },
        { status: 400 }
      );
    }

    const nocodb = getNocoDBService();

    // Get process data
    const process = await nocodb.findOne(
      NOCODB_TABLES.PROCESSOS_IMPORTACAO,
      processId
    );

    if (!process) {
      return NextResponse.json(
        { error: 'Process not found' },
        { status: 404 }
      );
    }

    // Get attached documents
    const documentsResult = await nocodb.find(
      NOCODB_TABLES.PROCESSO_DOCUMENTO_REL,
      {
        where: `(processo_importacao,eq,${processId})`,
        limit: 100
      }
    );
    const documents = documentsResult.list || [];

    // Get document details
    const documentDetails = await Promise.all(
      documents.map(async (rel: any) => {
        try {
          const uploadsResult = await nocodb.find(
            NOCODB_TABLES.DOCUMENT_UPLOADS,
            {
              where: `(hashArquivo,eq,${rel.hash_arquivo_upload})`,
              limit: 1
            }
          );
          const uploads = uploadsResult.list || [];
          
          if (uploads && uploads.length > 0) {
            const upload = uploads[0];
            return {
              tipo_documento: upload.tipoDocumento,
              hash_arquivo: upload.hashArquivo,
              data_anexo: upload.dataUpload,
              nome_arquivo: upload.nomeArquivo
            };
          }
        } catch (error) {
          console.error('Error fetching document details:', error);
        }
        return null;
      })
    );

    const validDocuments = documentDetails.filter(doc => doc !== null);
    const currentStage = process.etapa || 'solicitado';
    
    console.log('📄 [CHECK-STAGE] Found documents:', validDocuments.map(doc => ({
      tipo: doc.tipo_documento,
      nome: doc.nome_arquivo
    })));

    // Get all violations
    const violations = ProcessBusinessRules.getAllViolations(
      currentStage,
      validDocuments
    );

    // Get suggested stage
    const suggestedStage = ProcessBusinessRules.getSuggestedStage(validDocuments);

    // Get required documents for current stage
    const requiredDocuments = ProcessBusinessRules.getStageRequiredDocuments(currentStage);

    // Get all stages for UI
    const stages = KANBAN_CONFIG.STAGES;
    
    const canTransitionTo = stages.map(stage => {
      const transition = ProcessBusinessRules.checkStageTransition(
        currentStage,
        stage.id,
        validDocuments,
        false
      );
      return {
        stage: stage.id,
        title: stage.title,
        allowed: transition.allowed,
        violations: transition.violations,
        requiredDocs: transition.requiredDocuments
      };
    });
    
    console.log('🎯 [CHECK-STAGE] Transition check results:', canTransitionTo.map(t => ({
      stage: t.stage,
      allowed: t.allowed,
      requiredDocs: t.requiredDocs
    })));

    return NextResponse.json({
      process: {
        id: processId,
        numero_processo: process.numero_processo,
        currentStage,
        status: process.status
      },
      violations,
      suggestedStage,
      requiredDocuments,
      attachedDocuments: validDocuments,
      documentTypes: ProcessBusinessRules.getAllDocumentTypes(),
      stages,
      canTransitionTo: canTransitionTo
    });

  } catch (error) {
    console.error('❌ [CHECK-STAGE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to check stage violations' },
      { status: 500 }
    );
  }
}