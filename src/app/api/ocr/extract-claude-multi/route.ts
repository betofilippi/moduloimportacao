import { NextRequest, NextResponse } from 'next/server';
import { extractDataWithMultiplePrompts } from '@/services/ocr/claudePDF';
import { StorageService } from '@/lib/services/StorageService';
import { getAuthenticatedUser } from '@/lib/supabase-server';
import { MultiPromptDocumentType } from '@/services/ocr/multiPromptTypes';
import { createHash } from 'crypto';

// In-memory cache for tracking active requests
const activeRequests = new Map<string, {
  promise: Promise<unknown>;
  timestamp: number;
  userId: string;
}>();

// Clean up expired requests (older than 15 minutes)
const CLEANUP_INTERVAL = 15 * 60 * 1000; // 15 minutes
const cleanupExpiredRequests = () => {
  const now = Date.now();
  for (const [key, value] of activeRequests.entries()) {
    if (now - value.timestamp > CLEANUP_INTERVAL) {
      activeRequests.delete(key);
    }
  }
};

// Run cleanup every 5 minutes
setInterval(cleanupExpiredRequests, 5 * 60 * 1000);

// Export function to get active request (for status endpoint)
export function getActiveRequest(requestId: string) {
  return activeRequests.get(requestId);
}

// Configure timeout for Vercel Pro (800 seconds)
export const maxDuration = 800;
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    let user;
    try {
      const authData = await getAuthenticatedUser();
      user = authData.user;
    } catch (authError) {
      console.log('Authentication failed:', authError);
      return NextResponse.json(
        { error: 'Usuário não autenticado' },
        { status: 401 }
      );
    }

    const { storagePath, fileType, documentType } = await request.json();

    if (!storagePath) {
      return NextResponse.json(
        { error: 'Caminho do arquivo não fornecido' },
        { status: 400 }
      );
    }

    if (!documentType) {
      return NextResponse.json(
        { error: 'Tipo de documento não fornecido' },
        { status: 400 }
      );
    }

    // Create a unique request ID based on user, storage path, and document type
    const requestId = createHash('md5')
      .update(`${user.id}-${storagePath}-${documentType}`)
      .digest('hex');

    // Check if this request is already being processed
    const existingRequest = activeRequests.get(requestId);
    if (existingRequest) {
      console.log(`Request ${requestId} already in progress, returning existing result`);
      try {
        const result = await existingRequest.promise;
        return NextResponse.json(result);
      } catch (error) {
        // If the existing request failed, remove it and continue with new processing
        activeRequests.delete(requestId);
        console.log(`Existing request ${requestId} failed, proceeding with new request`);
      }
    }

    // Validate file type - Claude only processes PDFs directly
    if (fileType !== '.pdf') {
      return NextResponse.json(
        { 
          error: 'Tipo de arquivo não suportado', 
          details: 'Esta rota processa apenas arquivos PDF.' 
        },
        { status: 400 }
      );
    }

    // Validate document type for multi-prompt processing
    const supportedTypes: MultiPromptDocumentType[] = ['packing_list', 'commercial_invoice', 'proforma_invoice', 'swift', 'di', 'numerario', 'nota_fiscal', 'bl', 'contrato_cambio'];
    const isUnknown = documentType === 'unknown';
    
    if (!isUnknown && !supportedTypes.includes(documentType as MultiPromptDocumentType)) {
      return NextResponse.json(
        { 
          error: 'Tipo de documento não suportado para processamento multi-prompt', 
          details: `Tipos suportados: ${supportedTypes.join(', ')}, unknown` 
        },
        { status: 400 }
      );
    }

    console.log(`Processing PDF with Claude multi-prompt for user ${user.id}, document type: ${documentType}, request ID: ${requestId}`);
    
    // Create the processing promise
    const processingPromise = (async () => {
      // Download file from Supabase Storage
      const fileBuffer = await StorageService.downloadFile(storagePath);
      
      // Track progress steps
      const progressSteps: Array<{
        step: number;
        stepName: string;
        stepDescription: string;
        completed: boolean;
        result?: string;
      }> = [];

      // Progress callback function
      const onProgress = (step: number, total: number, stepName: string, stepDescription: string) => {
        console.log(`Progress: Step ${step}/${total} - ${stepName}: ${stepDescription}`);
        
        // Mark current step as in progress
        const existingStep = progressSteps.find(p => p.step === step);
        if (!existingStep) {
          progressSteps.push({
            step,
            stepName,
            stepDescription,
            completed: false
          });
        }
      };
      
      // Process PDF - handle unknown type specially
      let result;
      if (isUnknown) {
        // For unknown documents, use single-step extraction with identification prompt
        const { extractDataFromPDF } = await import('@/services/ocr/claudePDF');
        const ocrResult = await extractDataFromPDF(fileBuffer, 'unknown' as any);
        
        // Format result to match multi-prompt structure
        result = {
          success: true,
          data: {
            extractedData: ocrResult.extractedData,
            rawText: ocrResult.text,
            cleanedText: ocrResult.text,
            ocrResults: [{
              page: 1,
              text: ocrResult.text,
              method: 'claude-unknown-identification',
              confidence: ocrResult.confidence,
              language: 'pt-BR'
            }],
            totalPages: ocrResult.totalPages,
            storagePath,
            documentType,
            metadata: ocrResult.metadata
          }
        };
      } else {
        // Process PDF with multiple prompts for known types
        const multiPromptResult = await extractDataWithMultiplePrompts(
          fileBuffer, 
          documentType as MultiPromptDocumentType,
          onProgress
        );
        
        // Update progress steps with results
        multiPromptResult.steps.forEach(stepResult => {
          const progressStep = progressSteps.find(p => p.step === stepResult.step);
          if (progressStep) {
            progressStep.completed = true;
            progressStep.result = stepResult.result;
          } else {
            progressSteps.push({
              step: stepResult.step,
              stepName: stepResult.stepName,
              stepDescription: stepResult.stepDescription,
              completed: true,
              result: stepResult.result
            });
          }
        });

        // Format response to match existing API structure but with multi-prompt data
        result = {
          success: true,
          data: {
            // Multi-prompt specific data
            multiPrompt: {
              documentType: multiPromptResult.documentType,
              totalSteps: multiPromptResult.totalSteps,
              steps: multiPromptResult.steps,
              progressSteps: progressSteps.sort((a, b) => a.step - b.step),
            },
            
            // New structured data from each step
            structuredResult: multiPromptResult.finalResult.structuredResult,
            
            // Final extracted data (backward compatibility)
            extractedData: multiPromptResult.finalResult.extractedData,
            rawText: multiPromptResult.finalResult.rawText,
            
            // For compatibility with existing frontend
            cleanedText: multiPromptResult.finalResult.rawText,
            
            // OCR metadata (adapted for multi-prompt)
            ocrResults: multiPromptResult.steps.map((step, index) => ({
              page: index + 1,
              text: step.result,
              method: `claude-multi-prompt-step-${step.step}`,
              confidence: 0.95,
              language: 'pt-BR',
              stepName: step.stepName,
              stepDescription: step.stepDescription,
            })),
            
            // Document metadata
            totalPages: 1, // Will be calculated if needed
            storagePath,
            documentType,
            
            // Processing metadata
            metadata: {
              model: 'claude-4-sonnet-20250514',
              processingTime: multiPromptResult.metadata.totalProcessingTime,
              tokenUsage: multiPromptResult.metadata.totalTokenUsage,
              multiPrompt: true,
              stepsCompleted: multiPromptResult.totalSteps,
              requestId,
            },
          },
        };
      }

      return result;
    })();

    // Store the processing promise in the active requests map
    activeRequests.set(requestId, {
      promise: processingPromise,
      timestamp: Date.now(),
      userId: user.id
    });

    // For large files, return immediately with job ID and let client poll for status
    const fileSizeMB = (await StorageService.getFileSize(storagePath)) / (1024 * 1024);
    
    if (fileSizeMB > 5) {
      // Return job ID immediately for large files
      return NextResponse.json({
        success: true,
        requestId: requestId,  // Changed from jobId to requestId for consistency
        status: 'processing',
        message: 'Processamento iniciado. Use o requestId para verificar o status.',
        estimatedTime: `${Math.ceil(fileSizeMB / 2)}-${Math.ceil(fileSizeMB / 2) + 2} minutos`,
        statusEndpoint: `/api/ocr/extract-claude-multi/status?requestId=${requestId}`
      });
    }
    
    try {
      // For small files, process synchronously
      const result = await processingPromise;
      
      // Remove from active requests after completion
      activeRequests.delete(requestId);
      
      return NextResponse.json(result);
    } catch (error) {
      // Remove from active requests if processing failed
      activeRequests.delete(requestId);
      throw error;
    }
  } catch (error) {
    console.error('Claude multi-prompt OCR extraction error:', error);
    
    // Check if it's an API key error
    if (error instanceof Error && error.message.includes('API key')) {
      return NextResponse.json(
        { 
          error: 'Erro de configuração', 
          details: 'Chave da API Claude não configurada ou inválida' 
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Erro ao processar documento com Claude multi-prompt',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}