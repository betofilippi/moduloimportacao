import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/supabase-server';
import { getNocoDBService } from '@/lib/services/nocodb';
import { NOCODB_TABLES } from '@/config/nocodb-tables';

/**
 * Attach a document to an import process
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { processId, documentId, documentType } = body;

    if (!processId || !documentId || !documentType) {
      return NextResponse.json(
        { error: 'Missing required fields: processId, documentId, documentType' },
        { status: 400 }
      );
    }

    console.log('📎 [ATTACH DOCUMENT] Request:', {
      processId,
      documentId,
      documentType,
      userId: session.user.id
    });

    const nocodb = getNocoDBService();

    // Get the current process to update documents_attached
    const process = await nocodb.findById(NOCODB_TABLES.PROCESSO_IMPORTACAO, processId);
    
    if (!process) {
      return NextResponse.json(
        { error: 'Process not found' },
        { status: 404 }
      );
    }

    // Create document attachment info
    const attachmentInfo = `[${new Date().toISOString()}] Documento ${documentType} (ID: ${documentId}) anexado por ${session.user.email || session.user.id}`;
    
    // Update description with attachment info
    const currentDescription = process.descricao_adicionais || '';
    const newDescription = currentDescription ? 
      `${currentDescription}\n${attachmentInfo}` : 
      attachmentInfo;

    // Update process
    const updateData: any = {
      descricao_adicionais: newDescription,
      atualizado_em: new Date().toISOString(),
      atualizado_por: session.user.email || session.user.id
    };

    // Update status if this is the first document attachment
    if (process.status_atual === 'aberto') {
      updateData.status_atual = 'em_andamento';
    }

    const updatedProcess = await nocodb.update(
      NOCODB_TABLES.PROCESSO_IMPORTACAO,
      processId,
      updateData
    );

    console.log('✅ [ATTACH DOCUMENT] Document attached successfully');

    return NextResponse.json({
      success: true,
      process: updatedProcess,
      attachedDocument: {
        id: documentId,
        type: documentType,
        attachedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ [ATTACH DOCUMENT] Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}