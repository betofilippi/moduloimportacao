import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { DocumentType } from '@/services/documents/base/types';
import { getFileType, isValidFileType, getMimeType } from '@/services/ocr/pdfProcessor';
import { StorageService } from '@/lib/services/StorageService';
import { getAuthenticatedUser } from '@/lib/supabase-server';
import { getNocoDBService } from '@/lib/services/nocodb';
import { NOCODB_TABLES } from '@/config/nocodb-tables';
import { getDocumentCacheService } from '@/lib/services/DocumentCacheService';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export async function POST(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser();
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const documentType = formData.get('documentType') as DocumentType;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo foi enviado' }, { status: 400 });
    }
    if (!documentType || !Object.values(DocumentType).includes(documentType)) {
      return NextResponse.json({ error: 'Tipo de documento inválido' }, { status: 400 });
    }
    if (!await isValidFileType(file.name)) {
      return NextResponse.json({ error: 'Tipo de arquivo não suportado. Use apenas arquivos PDF.' }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Arquivo muito grande. Tamanho máximo: 20MB' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileHash = createHash('sha256').update(buffer).digest('hex');

    const nocodb = getNocoDBService();
    const existingRecords = await nocodb.find(NOCODB_TABLES.DOCUMENT_UPLOADS, {
      where: `(hashArquivo,eq,${fileHash})`,
      limit: 1,
    });
    const existingDoc = existingRecords.list[0];

    if (existingDoc) {
      console.log(`File ${file.name} (hash: ${fileHash}) already exists. Reusing storage path: ${existingDoc.caminhoArmazenamento}`);
      
      // Check current status before updating
      const currentStatus = existingDoc.statusProcessamento;
      
      // Only update to 'pendente' if not already 'completo'
      const updateData = currentStatus === 'completo' ? {
        dataUpload: new Date().toISOString(),
        tipoDocumento: documentType,
        nomeOriginal: file.name,
        Id: existingDoc.Id
      } : {
        statusProcessamento: 'pendente',
        dataUpload: new Date().toISOString(),
        tipoDocumento: documentType,
        nomeOriginal: file.name,
        Id: existingDoc.Id
      };
      
      const updatedRecord = await nocodb.update(NOCODB_TABLES.DOCUMENT_UPLOADS, existingDoc.Id, updateData);

      console.log('UPDATE NOCODB:::::::::::::::::::::::::::::::::::::::::::', existingDoc);
      
      // If document is already processed, reconstruct the data
      if (existingDoc.statusProcessamento === 'completo') {
        console.log('Document already processed. Reconstructing data from cache...');
        
        const cacheService = getDocumentCacheService();
        const structuredResult = await cacheService.reconstructStructuredResult(
          {
            id: existingDoc.Id,
            hashArquivo: existingDoc.hashArquivo,
            caminhoArmazenamento: existingDoc.caminhoArmazenamento,
            urlPublica: existingDoc.urlPublica,
            nomeOriginal: existingDoc.nomeOriginal,
            tamanhoArquivo: existingDoc.tamanhoArquivo,
            tipoMime: existingDoc.tipoMime,
            tipoDocumento: existingDoc.tipoDocumento,
            idUsuario: existingDoc.idUsuario,
            emailUsuario: existingDoc.emailUsuario,
            dataUpload: existingDoc.dataUpload,
            statusProcessamento: existingDoc.statusProcessamento,
            dataProcessamento: existingDoc.dataProcessamento,
            idDocumento: existingDoc.idDocumento
          },
          documentType
        );
        
        if (structuredResult) {
          return NextResponse.json({
            success: true,
            fromCache: true,
            data: {
              id: updatedRecord.Id,
              filename: existingDoc.caminhoArmazenamento.split('/').pop(),
              originalName: existingDoc.nomeOriginal,
              size: existingDoc.tamanhoArquivo,
              documentType: existingDoc.tipoDocumento,
              fileType: getFileType(existingDoc.nomeOriginal),
              storagePath: existingDoc.caminhoArmazenamento,
              publicUrl: existingDoc.urlPublica,
              fileHash: existingDoc.hashArquivo,
              userId: existingDoc.idUsuario,
              structuredResult: structuredResult,
              isAlreadySaved: true, // Document with status 'completo' is already saved
              message: 'Documento já processado anteriormente. Dados recuperados do cache.'
            },
          });
        }
      }

      // Return normal response for pending documents
      return NextResponse.json({
        success: true,
        data: {
          id: updatedRecord.Id,
          filename: existingDoc.caminhoArmazenamento.split('/').pop(),
          originalName: existingDoc.nomeOriginal,
          size: existingDoc.tamanhoArquivo,
          documentType: existingDoc.tipoDocumento,
          fileType: getFileType(existingDoc.nomeOriginal),
          storagePath: existingDoc.caminhoArmazenamento,
          publicUrl: existingDoc.urlPublica,
          fileHash: existingDoc.hashArquivo,
          userId: existingDoc.idUsuario,
        },
      });
    }

    console.log(`Processing new upload for file: ${file.name}`);
    const mimeType = getMimeType(file.name);
    const { path, publicUrl, fileHash: newFileHash } = await StorageService.uploadFile(
      buffer,
      file.name,
      mimeType,
      user.id
    );

    const fileType = getFileType(file.name);
    const uploadMetadata = {
      hashArquivo: newFileHash,
      caminhoArmazenamento: path,
      urlPublica: publicUrl,
      nomeOriginal: file.name,
      tamanhoArquivo: file.size,
      tipoMime: mimeType,
      tipoDocumento: documentType,
      idUsuario: user.id,
      emailUsuario: user.email,
      dataUpload: new Date().toISOString(),
      statusProcessamento: 'pendente',
    };

    const savedMetadata = await nocodb.create(NOCODB_TABLES.DOCUMENT_UPLOADS, uploadMetadata);

    return NextResponse.json({
      success: true,
      data: {
        id: savedMetadata.id,
        filename: path.split('/').pop(),
        originalName: file.name,
        size: file.size,
        documentType,
        fileType,
        storagePath: path,
        publicUrl,
        fileHash: newFileHash,
        userId: user.id,
      },
    });

  } catch (error) {
    console.error('Upload error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro ao fazer upload do arquivo';
    if (errorMessage === 'Usuário não autenticado') {
      return NextResponse.json({ error: errorMessage }, { status: 401 });
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
