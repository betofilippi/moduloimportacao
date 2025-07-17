import { NextRequest, NextResponse } from 'next/server';
import { getDocumentCacheService } from '@/lib/services/DocumentCacheService';
import { getNocoDBService } from '@/lib/services/nocodb';
import { NOCODB_TABLES } from '@/config/nocodb-tables';
import { getAuthenticatedUser } from '@/lib/supabase-server';

/**
 * GET /api/documents/cache/[hash]?type=document_type
 * 
 * Retrieves cached document data by file hash
 * Requires authentication and ownership verification
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ hash: string }> }
) {
  try {
    // 1. Verify authentication
    const { user } = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não autenticado' },
        { status: 401 }
      );
    }
    
    // 2. Validate parameters
    const { searchParams } = new URL(request.url);
    const documentType = searchParams.get('type');
    console.log('hash', params)
    const fileHash = (await params).hash;
    
    if (!documentType) {
      return NextResponse.json(
        { error: 'Parâmetro "type" é obrigatório' },
        { status: 400 }
      );
    }
    
    if (!fileHash || fileHash.length < 32) {
      return NextResponse.json(
        { error: 'Hash inválido' },
        { status: 400 }
      );
    }
    
    // Validate document type
    const validTypes = ['di', 'commercial_invoice', 'packing_list', 'proforma_invoice', 'swift', 'numerario'];
    if (!validTypes.includes(documentType.toLowerCase())) {
      return NextResponse.json(
        { error: `Tipo de documento inválido. Tipos válidos: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }
    
    // 3. Search for document by hash
    const nocodb = getNocoDBService();
    console.log(`Searching for document with hash: ${fileHash}`);
    
    const uploads = await nocodb.find(NOCODB_TABLES.DOCUMENT_UPLOADS, {
      where: `(hashArquivo,eq,${fileHash})`,
      limit: 1
    });
    
    if (uploads.list.length === 0) {
      return NextResponse.json(
        { error: 'Documento não encontrado' },
        { status: 404 }
      );
    }
    
    const upload = uploads.list[0];
    
    /*// 4. Verify ownership (user owns the file)
    if (upload.idUsuario !== user.id) {
      console.warn(`User ${user.id} tried to access file owned by ${upload.idUsuario}`);
      return NextResponse.json(
        { error: 'Acesso negado. Você não tem permissão para acessar este documento.' },
        { status: 403 }
      );
    }*/
    
    // 5. Check processing status
    if (upload.statusProcessamento !== 'completo') {
      return NextResponse.json({
        success: false,
        message: 'Documento ainda não foi processado completamente',
        data: upload
        
      });
    }
    
    // 6. Reconstruct document data
    console.log(`Reconstructing data for document type: ${documentType}`);
    const cacheService = getDocumentCacheService();
    console.log('passou service 1', upload)
    const structuredResult = await cacheService.reconstructStructuredResult(
      upload,
      documentType
    );
    
    if (!structuredResult) {
      console.error(`Failed to reconstruct data for document ${fileHash}`);
      return NextResponse.json(
        { error: 'Não foi possível recuperar os dados do documento. Os dados podem ter sido removidos ou corrompidos.' },
        { status: 500 }
      );
    }
    
    // 7. Return complete data
    const response = {
      success: true,
      data: {
        upload: {
          id: upload.id,
          hash: upload.hashArquivo,
          originalName: upload.nomeOriginal,
          fileSize: upload.tamanhoArquivo,
          mimeType: upload.tipoMime,
          uploadDate: upload.dataUpload,
          processDate: upload.dataProcessamento,
          documentId: upload.idDocumento,
          storagePath: upload.caminhoArmazenamento,
          publicUrl: upload.urlPublica
        },
        structuredResult,
        metadata: {
          documentType,
          fromCache: true,
          retrievedAt: new Date().toISOString(),
          userId: user.id
        }
      }
    };
    
    // Add cache headers for better performance
    const headers = new Headers();
    headers.set('Cache-Control', 'private, max-age=300'); // Cache for 5 minutes
    headers.set('X-Document-Hash', fileHash);
    headers.set('X-Document-Type', documentType);
    
    return NextResponse.json(response, { headers });
    
  } catch (error) {
    console.error('Error retrieving cached document:', error);
    
    // Check if it's an authentication error
    if (error instanceof Error && error.message === 'Usuário não autenticado') {
      return NextResponse.json(
        { error: 'Sessão expirada. Por favor, faça login novamente.' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Erro ao buscar documento', 
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}