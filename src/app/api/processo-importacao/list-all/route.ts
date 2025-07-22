import { NextRequest, NextResponse } from 'next/server';
import { getSecureSession } from '@/lib/supabase-server';
import { getNocoDBService } from '@/lib/services/nocodb';
import { NOCODB_TABLES } from '@/config/nocodb-tables';

/**
 * List all active import processes
 * Used for documents without invoice numbers (BL, Contrato de Câmbio)
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const auth = await getSecureSession();
    if (!auth?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const nocodb = getNocoDBService();
    
    // Get all active processes (not completed/cancelled)
    const result = await nocodb.find(NOCODB_TABLES.PROCESSOS_IMPORTACAO, {
      where: `(status,neq,concluido)~and(status,neq,cancelado)`,
      sort: '-data_inicio',
      limit: 100
    });

    console.log(`✅ [LIST ALL PROCESSES] Found ${result.list.length} active processes`);

    // Format response
    const response = {
      success: true,
      processes: result.list.map(p => ({
        id: p.Id,
        numero_processo: p.numero_processo,
        empresa: p.empresa,
        invoice: p.invoiceNumber,
        status: p.status,
        data_inicio: p.data_inicio,
        descricao: p.descricao,
        responsavel: p.responsavel
      })),
      total: result.list.length
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ [LIST ALL PROCESSES] Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}