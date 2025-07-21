import { NextRequest, NextResponse } from 'next/server';
import { getSecureSession } from '@/lib/supabase-server';
import { getNocoDBService } from '@/lib/services/nocodb';
import { NOCODB_TABLES, KANBAN_CONFIG } from '@/config/nocodb-tables';

/**
 * Update process stage (etapa) for Kanban board
 * This route is structured to support future conditional logic
 */
export async function POST(request: NextRequest) {
  console.log('🎯 [UPDATE-STAGE] Starting stage update');
  
  try {
    // Check authentication
    const session = await getSecureSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { processId, newStage } = await request.json();

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
    
    // Future: Add validation for allowed transitions
    const transitions = KANBAN_CONFIG.TRANSITIONS;
    if (transitions && transitions[oldStage]) {
      const allowedTransitions = transitions[oldStage];
      if (allowedTransitions.length > 0 && !allowedTransitions.includes(newStage)) {
        console.warn(`⚠️ [UPDATE-STAGE] Transition from ${oldStage} to ${newStage} not in allowed list`);
        // For now, just log warning. In future, could enforce this.
      }
    }

    // Future: Add business logic based on stage changes
    // Example: When moving to 'processamento_nacional', check if all required documents are present
    // Example: When moving to 'auditado', validate all processes are complete
    
    const updateData: Record<string, any> = {
      etapa: newStage,
      atualizado_em: new Date().toISOString(),
      atualizado_por: session.user.email || session.user.id
    };

    // Future: Add automatic status updates based on stage
    // Example: When moving to 'auditado', set status to 'completed'
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

    console.log('✅ [UPDATE-STAGE] Stage updated successfully');

    // Future: Add webhook notifications
    // Example: Notify external systems when stage changes
    
    // Future: Add audit log
    // Example: Record stage change in audit table with user info

    return NextResponse.json({
      success: true,
      processId,
      oldStage,
      newStage,
      updatedFields: Object.keys(updateData)
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