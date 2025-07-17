import { NextRequest, NextResponse } from 'next/server';
import { 
  DocumentType, 
  processDocument, 
  hasDocumentProcessor, 
  getSupportedFormats, 
  isFormatSupported 
} from '@/services/documents';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const resolvedParams = await params;
    const documentType = resolvedParams.type as DocumentType;

    // Validate document type
    if (!hasDocumentProcessor(documentType)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Unsupported document type: ${documentType}`,
          supportedTypes: Object.values(DocumentType)
        },
        { status: 400 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const options = formData.get('options');

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file format
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (!fileExtension || !isFormatSupported(documentType, fileExtension)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Unsupported file format: ${fileExtension}`,
          supportedFormats: getSupportedFormats(documentType)
        },
        { status: 400 }
      );
    }

    // Parse processing options
    let processingOptions = {};
    if (options) {
      try {
        processingOptions = JSON.parse(options as string);
      } catch (error) {
        console.warn('Invalid options JSON, using defaults:', error);
      }
    }

    console.log(`📄 Processing ${documentType} document:`, {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      options: processingOptions
    });

    // Process the document
    const result = await processDocument(file, documentType, processingOptions);

    // Log processing result
    if (result.success) {
      console.log(`✅ Successfully processed ${documentType} document:`, {
        fileName: file.name,
        processingTime: result.metadata?.processingTime,
        totalSteps: result.metadata?.totalSteps
      });
    } else {
      console.error(`❌ Failed to process ${documentType} document:`, {
        fileName: file.name,
        error: result.error
      });
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Document processing error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error during document processing',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const resolvedParams = await params;
    const documentType = resolvedParams.type as DocumentType;

    // Validate document type
    if (!hasDocumentProcessor(documentType)) {
      return NextResponse.json(
        { 
          error: `Unsupported document type: ${documentType}`,
          supportedTypes: Object.values(DocumentType)
        },
        { status: 400 }
      );
    }

    // Return information about the document type
    const processor = await import('@/services/documents').then(mod => 
      mod.getDocumentProcessor(documentType)
    );

    const info = {
      documentType,
      supportedFormats: processor.supportedFormats,
      hasMultiStep: processor.hasMultiStep,
      steps: processor.getSteps(),
      prompts: processor.getPrompts().length
    };

    return NextResponse.json(info);

  } catch (error) {
    console.error('Error getting document type info:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}