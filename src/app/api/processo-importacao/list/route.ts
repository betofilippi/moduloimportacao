import { NextRequest, NextResponse } from 'next/server';
import { getSecureSession } from '@/lib/supabase-server';
import { getNocoDBService } from '@/lib/services/nocodb';
import { NOCODB_TABLES } from '@/config/nocodb-tables';

/**
 * List all import processes
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

    console.log('🔍 [LIST PROCESSES] Loading processes...');

    const nocodb = getNocoDBService();

    // Get all processes ordered by creation date (newest first)
    const result = await nocodb.find(NOCODB_TABLES.PROCESSOS_IMPORTACAO, {
      sort: '-criado_em,-data_inicio',
      limit: 100
    });

    console.log(`✅ [LIST PROCESSES] Found ${result.list.length} processes`);

    // Format response
    const response = {
      success: true,
      processes: result.list,
      total: result.list.length
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ [LIST PROCESSES] Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}