import { NextRequest, NextResponse } from 'next/server';
import { getSecureSession } from '@/lib/supabase-server';
import { getNocoDBService } from '@/lib/services/nocodb';
import { NOCODB_TABLES, transformFromNocoDBFormat, TABLE_FIELD_MAPPINGS } from '@/config/nocodb-tables';

/**
 * GET endpoint to fetch audit logs for a process
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSecureSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const processId = searchParams.get('processId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!processId) {
      return NextResponse.json(
        { error: 'Process ID is required' },
        { status: 400 }
      );
    }

    const nocodb = getNocoDBService();

    try {
      // Fetch audit logs for the process
      const logsResult = await nocodb.find(
        NOCODB_TABLES.LOGS.ETAPA_AUDIT,
        {
          where: `(numero_processo,eq,${processId})`, // Changed to use numero_processo
          sort: '-CreatedAt', // Sort by creation date
          limit,
          offset
        }
      );
      const logs = logsResult.list || [];

      console.log(`📊 [AUDIT-LOGS] Found ${logs.length} audit entries for process ${processId}`);

      // Transform logs back from Portuguese field names to standard format
      const transformedLogs = logs.map((log: any) => {
        return {
          id: log.Id,
          hash_arquivo_origem: log.hash_arquivo_origem,
          numero_processo: log.numero_processo,
          responsavel: log.responsavel,
          ultima_etapa: log.ultima_etapa,
          nova_etapa: log.nova_etapa,
          descricao_regra: log.descricao_regra,
          created_at: log.CreatedAt,
          updated_at: log.UpdatedAt
        };
      });

      return NextResponse.json({
        success: true,
        logs: transformedLogs,
        total: logs.length,
        processId,
        limit,
        offset
      });

    } catch (dbError: any) {
      console.error('❌ [AUDIT-LOGS] Database error:', dbError);
      
      // If table doesn't exist or similar error, return empty logs
      if (dbError.message?.includes('not found') || dbError.message?.includes('does not exist')) {
        console.log('⚠️ [AUDIT-LOGS] Audit table not found, returning empty array');
        return NextResponse.json({
          success: true,
          logs: [],
          total: 0,
          processId,
          limit,
          offset,
          warning: 'Audit log table not configured'
        });
      }
      
      throw dbError;
    }

  } catch (error) {
    console.error('❌ [AUDIT-LOGS] Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch audit logs'
      },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint to create a manual audit log entry
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSecureSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      processId,
      processNumber,
      changeType = 'manual_update',
      previousStage,
      newStage,
      reason,
      notes,
      attachedDocuments = [],
      violations = [],
      forced = false
    } = body;

    if (!processId || !processNumber) {
      return NextResponse.json(
        { error: 'Process ID and number are required' },
        { status: 400 }
      );
    }

    const nocodb = getNocoDBService();

    // Create audit log entry
    const logData = transformToNocoDBFormat({
      hash_arquivo_origem: `manual_${processId}_${Date.now()}`,
      numero_processo: processNumber,
      responsavel: session.user.email || session.user.id,
      ultima_etapa: previousStage || '',
      nova_etapa: newStage || '',
      descricao_regra: reason || 'Atualização manual'
    }, TABLE_FIELD_MAPPINGS.LOGS_IMPORTACAO);

    try {
      const created = await nocodb.create(
        NOCODB_TABLES.LOGS.ETAPA_AUDIT,
        logData
      );

      console.log('📝 [AUDIT-LOGS] Manual audit log created');

      return NextResponse.json({
        success: true,
        logId: created.Id,
        message: 'Audit log created successfully'
      });

    } catch (dbError: any) {
      console.error('❌ [AUDIT-LOGS] Database error:', dbError);
      
      // If table doesn't exist, return success but with warning
      if (dbError.message?.includes('not found') || dbError.message?.includes('does not exist')) {
        console.log('⚠️ [AUDIT-LOGS] Audit table not found, skipping log creation');
        return NextResponse.json({
          success: true,
          warning: 'Audit log table not configured',
          message: 'Operation completed but audit log was not created'
        });
      }
      
      throw dbError;
    }

  } catch (error) {
    console.error('❌ [AUDIT-LOGS] Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create audit log'
      },
      { status: 500 }
    );
  }
}