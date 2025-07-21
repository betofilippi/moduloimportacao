/**
 * Types for Unknown Document Processing
 * Used to identify document type and extract relevant data
 */

export interface UnknownDocumentIdentification {
  identifiedType: string;
  confidence: number;
  reasoning: string;
  extractedInvoiceNumber?: string;
  extractedData?: Record<string, any>;
  rawClassification?: any; // Store the raw response from the classification prompt
}

export interface UnknownDocumentProcessingResult {
  identification: UnknownDocumentIdentification;
  rawData: any;
  suggestions: {
    documentType: string;
    matchingProcesses?: Array<{
      processId: string;
      invoiceNumber: string;
      confidence: number;
    }>;
  };
}

export interface UnknownDocumentProcessingOptions {
  searchForProcess?: boolean;
  autoIdentify?: boolean;
  extractAllData?: boolean;
}

export interface DocumentTypeIdentificationResult {
  type: 'proforma_invoice' | 'commercial_invoice' | 'packing_list' | 'swift' | 'di' | 'numerario' | 'nota_fiscal' | 'other';
  confidence: number;
  indicators: string[];
  extractedInvoiceNumber?: string;
}