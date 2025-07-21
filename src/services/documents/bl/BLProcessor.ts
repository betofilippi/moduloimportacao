import { BaseDocumentProcessor } from '../base/DocumentProcessor';
import { DocumentType, ProcessingOptions, ProcessingResult, ValidationResult, PromptStep } from '../base/types';
import { blSteps } from './prompts';
import { BLProcessingResult } from './types';
import { BLValidator } from './BLValidator';

export class BLProcessor extends BaseDocumentProcessor {
  readonly documentType = DocumentType.BL;
  readonly supportedFormats = ['pdf'];
  readonly hasMultiStep = true; // BL uses multi-step processing (header + containers)
  
  private validator: BLValidator;
  
  constructor() {
    super();
    this.validator = new BLValidator();
  }
  
  async process(file: File, options?: ProcessingOptions): Promise<ProcessingResult> {
    try {
      // Validate file format
      const formatValidation = this.validateFile(file);
      if (!formatValidation.isValid) {
        return this.createResult(false, undefined, formatValidation.errors.map(e => e.message).join(', '));
      }
      
      // For BL documents, we use multi-step processing through OCR service
      // The actual OCR processing is handled by the API routes
      return {
        success: true,
        metadata: {
          documentType: this.documentType,
          totalSteps: blSteps.length,
          processingTime: 0,
          confidence: 0
        },
        data: {
          requiresOCR: true,
          documentType: this.documentType,
          steps: blSteps.map(step => ({
            step: step.step,
            name: step.name,
            prompt: step.prompt
          }))
        }
      };
    } catch (error) {
      return this.handleError(error, 'BL processing');
    }
  }
  
  validate(data: any): ValidationResult {
    return this.validator.validate(data);
  }
  
  validateStep(stepNumber: number, data: any): ValidationResult {
    // BL has 2 steps
    if (stepNumber < 1 || stepNumber > 2) {
      return {
        isValid: false,
        errors: [{
          field: 'step',
          message: `Invalid step number: ${stepNumber}`,
          code: 'INVALID_STEP'
        }],
        warnings: []
      };
    }
    return this.validate(data);
  }
  
  getPrompts(): string[] {
    return blSteps.map(step => step.prompt);
  }
  
  getSteps(): PromptStep[] {
    return blSteps;
  }
  
  getPromptForStep(step: number, previousResult?: string): string {
    const stepData = blSteps.find(s => s.step === step);
    return stepData ? stepData.prompt : '';
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