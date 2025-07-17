import { NextRequest, NextResponse } from 'next/server';
import { 
  DocumentType, 
  validateDocument, 
  hasDocumentProcessor 
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
          error: `Unsupported document type: ${documentType}`,
          supportedTypes: Object.values(DocumentType)
        },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    
    if (!body.data) {
      return NextResponse.json(
        { error: 'No data provided for validation' },
        { status: 400 }
      );
    }

    console.log(`🔍 Validating ${documentType} data`);

    // Validate the document data
    const validationResult = validateDocument(body.data, documentType);

    console.log(`✅ Validation completed for ${documentType}:`, {
      isValid: validationResult.isValid,
      errorCount: validationResult.errors.length,
      warningCount: validationResult.warnings.length
    });

    return NextResponse.json({
      success: true,
      validation: validationResult
    });

  } catch (error) {
    console.error('Document validation error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error during validation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}