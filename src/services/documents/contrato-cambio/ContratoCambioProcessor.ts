import { BaseDocumentProcessor } from '../base/DocumentProcessor';
import { DocumentType, ProcessingOptions, ProcessingResult, ValidationResult, PromptStep } from '../base/types';
import { contratoCambioPrompt } from './prompts';
import { ContratoCambioProcessingResult } from './types';
import { ContratoCambioValidator } from './ContratoCambioValidator';

export class ContratoCambioProcessor extends BaseDocumentProcessor {
  readonly documentType = DocumentType.CONTRATO_CAMBIO;
  readonly supportedFormats = ['pdf'];
  readonly hasMultiStep = false; // Single step processing
  
  private validator: ContratoCambioValidator;
  
  constructor() {
    super();
    this.validator = new ContratoCambioValidator();
  }
  
  async process(file: File, options?: ProcessingOptions): Promise<ProcessingResult> {
    try {
      // Validate file format
      const formatValidation = this.validateFile(file);
      if (!formatValidation.isValid) {
        return this.createResult(false, undefined, formatValidation.errors.map(e => e.message).join(', '));
      }
      
      // For Contrato de Câmbio, we use single-step processing through OCR service
      return {
        success: true,
        metadata: {
          documentType: this.documentType,
          totalSteps: 1,
          processingTime: 0,
          confidence: 0
        },
        data: {
          requiresOCR: true,
          documentType: this.documentType,
          prompt: contratoCambioPrompt
        }
      };
    } catch (error) {
      return this.handleError(error, 'Contrato de Câmbio processing');
    }
  }
  
  validate(data: any): ValidationResult {
    return this.validator.validate(data);
  }
  
  validateStep(stepNumber: number, data: any): ValidationResult {
    if (stepNumber !== 1) {
      return {
        isValid: false,
        errors: [{
          field: 'step',
          message: `Contrato de Câmbio has only 1 step, requested step ${stepNumber}`,
          code: 'INVALID_STEP'
        }],
        warnings: []
      };
    }
    return this.validate(data);
  }
  
  getPrompts(): string[] {
    return [contratoCambioPrompt];
  }
  
  getSteps(): PromptStep[] {
    return [{
      step: 1,
      name: 'Extract',
      description: 'Extract all contract data',
      prompt: contratoCambioPrompt,
      expectsInput: false
    }];
  }
  
  getPromptForStep(step: number, previousResult?: string): string {
    return step === 1 ? contratoCambioPrompt : '';
  }
  
  protected handleError(error: any, context: string): ProcessingResult {
    console.error(`Error in ${context}:`, error);
    return {
      success: false,
      error: error.message || 'Unknown error occurred',
      metadata: {
        documentType: this.documentType,
        processingTime: Date.now()
      }
    };
  }
  
  protected log(level: string, message: string, data?: any): void {
    console.log(`[${level.toUpperCase()}] ${message}`, data || '');
  }
}