import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/supabase-server';
import { getProcessDocumentService } from '@/lib/services/ProcessDocumentService';
import { getNocoDBService } from '@/lib/services/nocodb';
import { NOCODB_TABLES } from '@/config/nocodb-tables';

/**
 * API Route to connect a document to an import process
 * Handles document-process relationships
 */

interface ConnectDocumentRequest {
  processId: string;
  documentType: string;
  fileHash: string;
  documentId?: string;
  metadata?: {
    invoiceNumber?: string;
    uploadedAt?: string;
    processedAt?: string;
    status?: string;
  };
}

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

    const body: ConnectDocumentRequest = await request.json();
    const { processId, documentType, fileHash, documentId, metadata } = body;

    // Validate required fields
    if (!processId || !documentType || !fileHash) {
      return NextResponse.json(
        { error: 'Missing required fields: processId, documentType, fileHash' },
        { status: 400 }
      );
    }

    // Get services
    const processDocService = getProcessDocumentService();
    const nocodb = getNocoDBService();

    // Check if process exists
    const processes = await nocodb.find(NOCODB_TABLES.PROCESSOS_IMPORTACAO, {
      where: `(numero_processo,eq,${processId})`,
      limit: 1
    });

    if (!processes.list || processes.list.length === 0) {
      return NextResponse.json(
        { error: 'Process not found' },
        { status: 404 }
      );
    }

    const process = processes.list[0];

    // Link document to process
    const linkResult = await processDocService.linkDocumentWithMetadata(
      processId,
      fileHash,
      {
        documentType,
        documentId,
        status: metadata?.status || 'pending',
        uploadedAt: metadata?.uploadedAt || new Date().toISOString(),
        processedAt: metadata?.processedAt
      }
    );

    if (!linkResult.success) {
      return NextResponse.json(
        { error: linkResult.error || 'Failed to link document' },
        { status: 500 }
      );
    }

    // Update process documentsPipeline
    try {
      let documentsPipeline = [];
      
      // Parse existing pipeline
      if (process.documentsPipeline) {
        try {
          documentsPipeline = typeof process.documentsPipeline === 'string' 
            ? JSON.parse(process.documentsPipeline)
            : process.documentsPipeline;
        } catch (e) {
          console.error('Error parsing documentsPipeline:', e);
          documentsPipeline = [];
        }
      }

      // Check if document already exists in pipeline
      const existingIndex = documentsPipeline.findIndex(
        (doc: any) => doc.fileHash === fileHash || doc.documentType === documentType
      );

      const newDocument = {
        documentType,
        status: metadata?.status || 'pending',
        fileHash,
        documentId,
        uploadedAt: metadata?.uploadedAt || new Date().toISOString(),
        processedAt: metadata?.processedAt
      };

      if (existingIndex >= 0) {
        // Update existing document
        documentsPipeline[existingIndex] = newDocument;
      } else {
        // Add new document
        documentsPipeline.push(newDocument);
      }

      // Update process with new pipeline
      await nocodb.update(
        NOCODB_TABLES.PROCESSOS_IMPORTACAO,
        process.Id,
        {
          documentsPipeline: JSON.stringify(documentsPipeline)
        }
      );

      return NextResponse.json({
        success: true,
        message: 'Document connected successfully',
        processId,
        documentType,
        fileHash,
        pipeline: documentsPipeline
      });

    } catch (updateError) {
      console.error('Error updating process pipeline:', updateError);
      // Connection was successful, but pipeline update failed
      return NextResponse.json({
        success: true,
        message: 'Document connected, but pipeline update failed',
        warning: updateError instanceof Error ? updateError.message : 'Unknown error'
      });
    }

  } catch (error) {
    console.error('Error in connect-process API:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

/**
 * GET method to check if document is already connected
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const fileHash = searchParams.get('fileHash');
    const processId = searchParams.get('processId');

    if (!fileHash) {
      return NextResponse.json(
        { error: 'File hash is required' },
        { status: 400 }
      );
    }

    const processDocService = getProcessDocumentService();
    
    if (processId) {
      // Check specific process
      const isLinked = await processDocService.isDocumentLinkedToProcess(processId, fileHash);
      return NextResponse.json({ 
        isLinked,
        processId: isLinked ? processId : null 
      });
    } else {
      // Find any process linked to this document
      const linkedProcess = await processDocService.findProcessByDocument(fileHash);
      return NextResponse.json({
        isLinked: !!linkedProcess,
        processId: linkedProcess
      });
    }

  } catch (error) {
    console.error('Error checking document connection:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}