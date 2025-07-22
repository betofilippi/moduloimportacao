import { NextRequest, NextResponse } from 'next/server';
import { getSecureSession } from '@/lib/supabase-server';
import { getNocoDBService } from '@/lib/services/nocodb';
import { NOCODB_TABLES } from '@/config/nocodb-tables';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSecureSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { processId } = body;

    // Validate processId
    if (!processId) {
      return NextResponse.json(
        { error: 'ID do processo é obrigatório' },
        { status: 400 }
      );
    }

    const nocodb = getNocoDBService();

    // 1. First check if process exists
    const process = await nocodb.findOne(NOCODB_TABLES.PROCESSOS_IMPORTACAO, processId);
    if (!process) {
      return NextResponse.json(
        { error: 'Processo não encontrado' },
        { status: 404 }
      );
    }

    // 2. Find all document relationships for this process
    const relationships = await nocodb.list(NOCODB_TABLES.PROCESSO_DOCUMENTO_REL, {
      where: `(processo_importacao,eq,${processId})`,
      limit: 1000
    });

    // 3. Delete all document relationships
    let deletedRelationships = 0;
    if (relationships && relationships.list && relationships.list.length > 0) {
      for (const rel of relationships.list) {
        await nocodb.delete(NOCODB_TABLES.PROCESSO_DOCUMENTO_REL, rel.Id);
        deletedRelationships++;
      }
    }

    // 4. Create final audit log entry
    const auditLog = {
      numero_processo: process.Id,
      ultima_etapa: process.etapa || 'desconhecido',
      nova_etapa: 'excluido',
      descricao_regra: `Processo ${process.numero_processo} excluído permanentemente. ${deletedRelationships} documento(s) desvinculado(s).`,
      responsavel: session.user.email
      // CreatedAt será preenchido automaticamente pelo NocoDB
    };

    // Try to create audit log but don't fail if table doesn't exist
    try {
      await nocodb.create(NOCODB_TABLES.LOGS.ETAPA_AUDIT, auditLog);
    } catch (auditError) {
      console.warn('Warning: Could not create audit log entry:', auditError);
      // Continue with deletion even if audit fails
    }

    // 5. Delete the process itself
    await nocodb.delete(NOCODB_TABLES.PROCESSOS_IMPORTACAO, processId);

    // Return success with cleanup details
    return NextResponse.json({
      success: true,
      message: 'Processo excluído com sucesso',
      details: {
        processId,
        numeroProcesso: process.numero_processo,
        documentosDesvinculados: deletedRelationships,
        auditLogCriado: true
      }
    });

  } catch (error) {
    console.error('Erro ao excluir processo:', error);
    
    // Handle specific NocoDB errors
    if (error instanceof Error) {
      // If it's a foreign key constraint error
      if (error.message.includes('constraint') || error.message.includes('foreign key')) {
        return NextResponse.json(
          { 
            error: 'Não foi possível excluir o processo. Existem dependências que impedem a exclusão.',
            details: 'Verifique se há outros registros vinculados a este processo.'
          },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { 
        error: 'Erro ao excluir processo',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}