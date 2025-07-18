import { BaseDocumentProcessor } from '../base/DocumentProcessor';
import { DocumentType, ProcessingOptions, ProcessingResult, PromptStep } from '../base/types';
import { notaFiscalSteps } from './prompts';
import { NotaFiscalProcessingResult } from './types';
import { NotaFiscalValidator } from './NotaFiscalValidator';

export class NotaFiscalProcessor extends BaseDocumentProcessor {
  readonly documentType = DocumentType.NOTA_FISCAL;
  readonly supportedFormats = ['pdf'];
  readonly hasMultiStep = true;
  
  private validator: NotaFiscalValidator;

  constructor() {
    super();
    this.validator = new NotaFiscalValidator();
  }

  async process(file: File, options?: ProcessingOptions): Promise<ProcessingResult> {
    try {
      // Validate file format
      const formatValidation = this.validateFile(file);
      if (!formatValidation.isValid) {
        return this.createResult(false, undefined, formatValidation.errors?.[0]?.message || 'Invalid file format');
      }

      // For Nota Fiscal documents, we use multi-step processing through OCR service
      // The actual OCR processing is handled by the API routes
      
      // Return a result indicating that processing should be handled by OCR service
      return {
        success: true,
        metadata: {
          documentType: this.documentType,
          totalSteps: notaFiscalSteps.length,
          processingTime: 0,
          confidence: 0
        },
        data: {
          requiresOCR: true,
          documentType: this.documentType,
          steps: notaFiscalSteps.map(step => ({
            step: step.step,
            name: step.name,
            description: step.description
          }))
        }
      };
    } catch (error) {
      console.error('Error processing Nota Fiscal document', error);
      return this.createResult(false, undefined, error instanceof Error ? error.message : 'Unknown error during processing');
    }
  }

  validate(data: any): { isValid: boolean; errors: any[]; warnings: any[] } {
    try {
      // Parse the data structure based on multi-step result
      let processedData: NotaFiscalProcessingResult;
      
      if (data?.structuredResult) {
        // Multi-step OCR result format
        processedData = {
          header: data.structuredResult.header?.data || {},
          items: data.structuredResult.items?.data || []
        };
      } else if (data?.header || data?.items) {
        // Direct format
        processedData = {
          header: data.header || {},
          items: data.items || []
        };
      } else {
        return {
          isValid: false,
          errors: [{ field: 'data', message: 'Invalid data structure', code: 'INVALID_STRUCTURE' }],
          warnings: []
        };
      }

      return this.validator.validate(processedData);
    } catch (error) {
      console.error('Validation error', error);
      return {
        isValid: false,
        errors: [{ 
          field: 'general', 
          message: error instanceof Error ? error.message : 'Validation error',
          code: 'VALIDATION_ERROR'
        }],
        warnings: []
      };
    }
  }

  getPrompts(): string[] {
    return notaFiscalSteps.map(step => step.prompt);
  }

  getSteps(): PromptStep[] {
    return notaFiscalSteps;
  }

  getPromptForStep(step: number, previousResult?: string): string {
    const stepInfo = notaFiscalSteps.find(s => s.step === step);
    if (!stepInfo) {
      throw new Error(`Invalid step number: ${step}`);
    }
    
    let prompt = stepInfo.prompt;
    
    // Add previous result context if needed
    if (stepInfo.expectsInput && previousResult) {
      prompt += `\n\nInformação do passo anterior para contexto:\n${previousResult}`;
    }
    
    return prompt;
  }
}