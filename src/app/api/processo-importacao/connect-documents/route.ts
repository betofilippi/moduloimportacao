import { NextRequest, NextResponse } from 'next/server';
import { getSecureSession } from '@/lib/supabase-server';
import { getNocoDBService } from '@/lib/services/nocodb';
import { NOCODB_TABLES } from '@/config/nocodb-tables';

/**
 * Connect a document to an import process
 * Simply saves the relationship in the relational table
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
    const { processId, fileHash } = body;

    if (!processId || !fileHash) {
      return NextResponse.json(
        { error: 'Missing required fields: processId, fileHash' },
        { status: 400 }
      );
    }

    console.log('🔗 [CONNECT DOCUMENTS] Request:', {
      processId,
      fileHash
    });

    const nocodb = getNocoDBService();

    // Create relationship record
    const relationData = {
      processo_importacao: processId,
      hash_arquivo_upload: fileHash
    };

    const savedRelation = await nocodb.create(
      NOCODB_TABLES.PROCESSO_DOCUMENTO_REL,
      relationData
    );

    console.log('✅ [CONNECT DOCUMENTS] Document connected successfully');

    return NextResponse.json({
      success: true,
      relationId: savedRelation.Id,
      message: 'Documento conectado ao processo com sucesso'
    });

  } catch (error) {
    console.error('❌ [CONNECT DOCUMENTS] Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}