import { NextRequest, NextResponse } from 'next/server';
import { 
  DocumentType, 
  getDocumentPrompts, 
  getDocumentSteps,
  hasDocumentProcessor 
} from '@/services/documents';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const resolvedParams = await params;
    const documentType = resolvedParams.type as DocumentType;
    const url = new URL(request.url);
    const step = url.searchParams.get('step');
    const format = url.searchParams.get('format') || 'full';

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

    const processor = await import('@/services/documents').then(mod => 
      mod.getDocumentProcessor(documentType)
    );

    if (step) {
      // Return specific step prompt
      const stepNumber = parseInt(step);
      const steps = getDocumentSteps(documentType);
      const stepInfo = steps.find(s => s.step === stepNumber);

      if (!stepInfo) {
        return NextResponse.json(
          { error: `Invalid step number: ${stepNumber}` },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        step: stepInfo,
        prompt: processor.getPromptForStep(stepNumber)
      });
    }

    if (format === 'simple') {
      // Return just the prompt strings
      const prompts = getDocumentPrompts(documentType);
      
      return NextResponse.json({
        success: true,
        documentType,
        prompts,
        count: prompts.length
      });
    }

    // Return full information
    const prompts = getDocumentPrompts(documentType);
    const steps = getDocumentSteps(documentType);

    return NextResponse.json({
      success: true,
      documentType,
      hasMultiStep: processor.hasMultiStep,
      prompts: {
        all: prompts,
        count: prompts.length
      },
      steps: {
        all: steps,
        count: steps.length
      }
    });

  } catch (error) {
    console.error('Error getting document prompts:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}