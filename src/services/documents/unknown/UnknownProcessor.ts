import { BaseDocumentProcessor } from '../base/DocumentProcessor';
import { DocumentType, ProcessingResult, ProcessingOptions, ValidationResult, PromptStep } from '../base/types';
import { 
  UnknownDocumentProcessingResult, 
  UnknownDocumentProcessingOptions,
  UnknownDocumentIdentification,
  DocumentTypeIdentificationResult
} from './types';
import { 
  documentIdentificationPrompt, 
  invoiceExtractionPrompt,
  dataExtractionPrompt,
  documentTypeMapping 
} from './prompts';

/**
 * Processor for Unknown Document types
 * Identifies document type and extracts relevant data
 */
export class UnknownDocumentProcessor extends BaseDocumentProcessor {
  readonly documentType = DocumentType.UNKNOWN;
  readonly supportedFormats = ['pdf'];
  readonly hasMultiStep = false;

  /**
   * Main processing method - processes results that have already been extracted
   */
  async process(file: File, options?: ProcessingOptions): Promise<ProcessingResult> {
    // For unknown documents, we expect the results to be passed in options
    // This is a special case since identification happens on the server
    const identificationResult = (options as any)?.identificationResult;
    
    if (!identificationResult) {
      return {
        success: false,
        error: 'No identification result provided',
        data: null,
        documentType: this.documentType
      };
    }
    
    return {
      success: true,
      data: identificationResult,
      documentType: this.documentType
    };
  }

  /**
   * Server-side processing method that includes the actual identification
   * This should only be called from server-side code (API routes)
   */
  async processWithIdentification(
    text: string, 
    options?: UnknownDocumentProcessingOptions
  ): Promise<ProcessingResult> {
    // This method is only for type definition
    // Actual implementation happens in the API route
    throw new Error('processWithIdentification should only be called from server-side code');
  }

  /**
   * Map identified type to DocumentType enum
   */
  public mapToDocumentType(identifiedType: string): DocumentType {
    const mapping: Record<string, DocumentType> = {
      'proforma_invoice': DocumentType.PROFORMA_INVOICE,
      'commercial_invoice': DocumentType.COMMERCIAL_INVOICE,
      'packing_list': DocumentType.PACKING_LIST,
      'swift': DocumentType.SWIFT,
      'di': DocumentType.DI,
      'numerario': DocumentType.NUMERARIO,
      'nota_fiscal': DocumentType.NOTA_FISCAL
    };

    return mapping[identifiedType] || DocumentType.UNKNOWN;
  }

  /**
   * Process with automatic type detection and routing
   * This method expects the identification to have already been done
   */
  async processWithAutoRoute(
    file: File,
    options?: UnknownDocumentProcessingOptions & { identificationResult?: any }
  ): Promise<{
    identifiedType: DocumentType;
    shouldProcess: boolean;
    identification: UnknownDocumentIdentification;
    extractedData?: any;
  }> {
    const identificationResult = options?.identificationResult;
    
    if (!identificationResult) {
      throw new Error('No identification result provided');
    }

    const identifiedType = this.mapToDocumentType(identificationResult.identifiedType);
    const shouldProcess = identifiedType !== DocumentType.UNKNOWN && identificationResult.confidence > 0.7;

    return {
      identifiedType,
      shouldProcess,
      identification: identificationResult,
      extractedData: identificationResult.extractedData
    };
  }
  
  // Implement abstract methods from base class
  validate(data: any): ValidationResult {
    // For unknown documents, we don't validate
    return {
      isValid: true,
      errors: [],
      warnings: []
    };
  }
  
  getPrompts(): string[] {
    return [documentIdentificationPrompt, invoiceExtractionPrompt, dataExtractionPrompt];
  }
  
  getSteps(): PromptStep[] {
    return []; // No multi-step for unknown documents
  }
  
  getPromptForStep(step: number, previousResult?: string): string {
    return ''; // Not applicable for unknown documents
  }
}