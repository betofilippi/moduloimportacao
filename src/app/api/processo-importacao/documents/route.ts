import { NextRequest, NextResponse } from 'next/server';
import { getSecureSession } from '@/lib/supabase-server';
import { getNocoDBService } from '@/lib/services/nocodb';
import { NOCODB_TABLES } from '@/config/nocodb-tables';

/**
 * GET endpoint to fetch documents for a process
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

    // Get process info
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

    // Get document relationships
    const relationsResult = await nocodb.find(
      NOCODB_TABLES.PROCESSO_DOCUMENTO_REL,
      {
        where: `(processo_importacao,eq,${processId})`,
        limit: 100
      }
    );
    const relations = relationsResult.list || [];

    // Get document details for each relation
    const documents = await Promise.all(
      relations.map(async (rel: any) => {
        try {
          // Get document upload info
          const uploadsResult = await nocodb.find(
            NOCODB_TABLES.DOCUMENT_UPLOADS,
            {
              where: `(hashArquivo,eq,${rel.hash_arquivo_upload})`,
              limit: 1
            }
          );
          const uploads = uploadsResult.list || [];
          
          if (uploads.length > 0) {
            const upload = uploads[0];
            return {
              id: upload.Id,
              hashArquivo: upload.hashArquivo,
              nomeArquivo: upload.nomeOriginal || upload.nomeArquivo,
              tipoDocumento: upload.tipoDocumento,
              dataUpload: upload.dataUpload,
              statusProcessamento: upload.statusProcessamento || 'pendente',
              usuario: upload.emailUsuario || upload.idUsuario,
              tamanho: upload.tamanhoArquivo,
              idDocumento: upload.idDocumento
            };
          }
          return null;
        } catch (error) {
          console.error('Error fetching document details:', error);
          return null;
        }
      })
    );

    // Filter out null values
    const validDocuments = documents.filter(doc => doc !== null);

    console.log(`📄 [DOCUMENTS] Found ${validDocuments.length} documents for process ${processId}`);

    return NextResponse.json({
      success: true,
      processId,
      processNumber: process.numero_processo,
      documents: validDocuments,
      total: validDocuments.length
    });

  } catch (error) {
    console.error('❌ [DOCUMENTS] Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch documents'
      },
      { status: 500 }
    );
  }
}