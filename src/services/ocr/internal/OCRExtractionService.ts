import { createHash } from 'crypto';
import { extractDataWithMultiplePrompts } from '@/services/ocr/claudePDF';
import { StorageService } from '@/lib/services/StorageService';
import { MultiPromptDocumentType } from '@/services/ocr/multiPromptTypes';

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

export interface ExtractionOptions {
  userId: string;
  fileHash?: string;
}

export interface ExtractionResult {
  success: boolean;
  requestId?: string;
  status?: string;
  message?: string;
  estimatedTime?: string;
  statusEndpoint?: string;
  data?: any;
}

export class OCRExtractionService {
  /**
   * Get an active extraction request by ID
   */
  static getActiveRequest(requestId: string) {
    return activeRequests.get(requestId);
  }

  /**
   * Extract data from a PDF using Claude multi-prompt
   * @param storagePath Path to the file in storage
   * @param fileType Type of file (must be .pdf)
   * @param documentType Type of document for extraction
   * @param options Extraction options including user info
   * @returns Extraction result or job ID for async processing
   */
  static async extractData(
    storagePath: string,
    fileType: string,
    documentType: string,
    options: ExtractionOptions
  ): Promise<ExtractionResult> {
    if (!storagePath) {
      throw new Error('Caminho do arquivo não fornecido');
    }

    if (!documentType) {
      throw new Error('Tipo de documento não fornecido');
    }

    // Create a unique request ID based on user, storage path, and document type
    const requestId = createHash('md5')
      .update(`${options.userId}-${storagePath}-${documentType}`)
      .digest('hex');

    // Check if this request is already being processed
    const existingRequest = activeRequests.get(requestId);
    if (existingRequest) {
      console.log(`Request ${requestId} already in progress, returning existing result`);
      try {
        const result = await existingRequest.promise;
        return result as ExtractionResult;
      } catch (error) {
        // If the existing request failed, remove it and continue with new processing
        activeRequests.delete(requestId);
        console.log(`Existing request ${requestId} failed, proceeding with new request`);
      }
    }

    // Validate file type - Claude only processes PDFs directly
    if (fileType !== '.pdf') {
      throw new Error('Esta rota processa apenas arquivos PDF.');
    }

    // Validate document type for multi-prompt processing
    const supportedTypes: MultiPromptDocumentType[] = ['packing_list', 'commercial_invoice', 'proforma_invoice', 'swift', 'di', 'numerario', 'nota_fiscal', 'bl', 'contrato_cambio'];
    const isUnknown = documentType === 'unknown';
    
    if (!isUnknown && !supportedTypes.includes(documentType as MultiPromptDocumentType)) {
      throw new Error(`Tipo de documento não suportado para processamento multi-prompt. Tipos suportados: ${supportedTypes.join(', ')}, unknown`);
    }

    console.log(`Processing PDF with Claude multi-prompt for user ${options.userId}, document type: ${documentType}, request ID: ${requestId}`);
    
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
            metadata: {
              ...ocrResult.metadata,
              fileHash: options.fileHash,
              storagePath,
              documentType
            }
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
              fileHash: options.fileHash,
              storagePath,
              documentType
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
      userId: options.userId
    });

    // For large files, return immediately with job ID and let client poll for status
    const fileSizeMB = (await StorageService.getFileSize(storagePath)) / (1024 * 1024);
    
    if (fileSizeMB > 5) {
      // Return job ID immediately for large files
      return {
        success: true,
        requestId: requestId,
        status: 'processing',
        message: 'Processamento iniciado. Use o requestId para verificar o status.',
        estimatedTime: `${Math.ceil(fileSizeMB / 2)}-${Math.ceil(fileSizeMB / 2) + 2} minutos`,
        statusEndpoint: `/api/ocr/extract-claude-multi/status?requestId=${requestId}`
      };
    }
    
    try {
      // For small files, process synchronously
      const result = await processingPromise;
      
      // Remove from active requests after completion
      activeRequests.delete(requestId);
      
      return result as ExtractionResult;
    } catch (error) {
      // Remove from active requests if processing failed
      activeRequests.delete(requestId);
      
      // Check if it's an API key error
      if (error instanceof Error && error.message.includes('API key')) {
        throw new Error('Chave da API Claude não configurada ou inválida');
      }
      
      throw error;
    }
  }

  /**
   * Check the status of an extraction request
   * @param requestId The request ID to check
   * @returns Status information
   */
  static async checkStatus(requestId: string): Promise<{
    status: string;
    result?: any;
    timestamp?: number;
    elapsedTime?: number;
    error?: string;
  }> {
    const activeRequest = this.getActiveRequest(requestId);
    
    if (!activeRequest) {
      return { status: 'not_found' };
    }
    
    // Check if request is completed
    try {
      const result = await Promise.race([
        activeRequest.promise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('timeout')), 1000)
        )
      ]);
      
      // Request completed
      return {
        status: 'completed',
        result: (result as any).data || result
      };
    } catch (error) {
      if (error instanceof Error && error.message === 'timeout') {
        // Request still in progress
        return {
          status: 'processing',
          timestamp: activeRequest.timestamp,
          elapsedTime: Date.now() - activeRequest.timestamp
        };
      }
      
      // Request failed
      return {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}