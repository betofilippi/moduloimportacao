import { NextRequest, NextResponse } from 'next/server';
import { getSecureSession } from '@/lib/supabase-server';
import { getNocoDBService } from '@/lib/services/nocodb';
import { NOCODB_TABLES } from '@/config/nocodb-tables';

/**
 * Search for import processes based on various criteria
 * Used to find related processes for document attachment
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

    const body = await request.json();
    const { invoiceNumber } = body;

    console.log('🔍 [SEARCH PROCESS] Searching for invoice:', invoiceNumber);

    if (!invoiceNumber) {
      return NextResponse.json({
        success: true,
        processes: [],
        message: 'Número da invoice não fornecido'
      });
    }

    const nocodb = getNocoDBService();
    
    // Simple search by invoiceNumber only
    const result = await nocodb.find(NOCODB_TABLES.PROCESSOS_IMPORTACAO, {
      where: `(invoiceNumber,eq,${invoiceNumber})`,
      limit: 10
    });

    console.log(`✅ [SEARCH PROCESS] Found ${result.list.length} processes`);

    // Format response
    const response = {
      success: true,
      processes: result.list.map(p => ({
        id: p.Id,
        numero_processo: p.numero_processo,
        empresa: p.empresa,
        invoice: p.invoiceNumber,
        status: p.status,
        data_inicio: p.data_inicio
      })),
      searchedInvoice: invoiceNumber
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ [SEARCH PROCESS] Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}