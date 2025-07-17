/**
 * Types for multi-prompt document processing
 * These types are used by the OCR service when processing documents with multiple steps
 */

// Document types supported by multi-prompt processing
export type MultiPromptDocumentType = 'packing_list' | 'commercial_invoice' | 'proforma_invoice' | 'swift' | 'di' | 'numerario';

// Interface for multi-prompt processing result
export interface MultiPromptResult {
  step: number;
  stepName: string;
  stepDescription: string;
  result: string;
  metadata?: {
    tokenUsage?: {
      input: number;
      output: number;
    };
    processingTime: number;
  };
}

// Interface for final multi-prompt processing result
export interface FinalMultiPromptResult {
  success: boolean;
  documentType: MultiPromptDocumentType;
  totalSteps: number;
  steps: MultiPromptResult[];
  finalResult: {
    rawText: string;
    extractedData: any;
    structuredResult?: any;
    validation?: {
      isValid: boolean;
      missingFields: string[];
    };
  };
  metadata: {
    totalProcessingTime: number;
    totalTokenUsage: {
      input: number;
      output: number;
    };
  };
}