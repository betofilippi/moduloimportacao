// Base types for document processing system

export enum DocumentType {
  PACKING_LIST = 'packing_list',
  COMMERCIAL_INVOICE = 'commercial_invoice',
  PROFORMA_INVOICE = 'proforma_invoice',
  DI = 'di',
  SWIFT = 'swift',
  NUMERARIO = 'numerario',
  NOTA_FISCAL = 'nota_fiscal',
  CI = 'ci',
  AFRMM = 'afrmm',
  UNKNOWN = 'unknown',
}

export interface DocumentTypeInfo {
  value: DocumentType;
  label: string;
  description: string;
  supportedFormats: string[];
  hasMultiStep: boolean;
}

export interface PromptStep {
  step: number;
  name: string;
  description: string;
  prompt: string;
  expectsInput?: boolean; // Se espera resultado do prompt anterior
}

export interface ProcessingOptions {
  useMultiStep?: boolean;
  extractImages?: boolean;
  validateData?: boolean;
  saveToStorage?: boolean;
}

export interface ProcessingResult {
  success: boolean;
  data?: any;
  error?: string;
  steps?: Array<{
    step: number;
    stepName: string;
    result: any;
    timestamp: string;
  }>;
  metadata?: {
    documentType: DocumentType;
    totalSteps?: number;
    processingTime?: number;
    confidence?: number;
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

export interface DocumentMetadata {
  fileName: string;
  fileSize: number;
  uploadDate: string;
  documentType: DocumentType;
  processingStatus: 'pending' | 'processing' | 'completed' | 'error';
  confidence?: number;
}

// Base interface for all document processors
export interface DocumentProcessor {
  readonly documentType: DocumentType;
  readonly supportedFormats: string[];
  readonly hasMultiStep: boolean;
  
  // Main processing method
  process(file: File, options?: ProcessingOptions): Promise<ProcessingResult>;
  
  // Validation methods
  validate(data: any): ValidationResult;
  validateStep?(stepNumber: number, data: any): ValidationResult;
  
  // Prompt methods
  getPrompts(): string[];
  getSteps(): PromptStep[];
  getPromptForStep(step: number, previousResult?: string): string;
  
  // Utility methods
  extractText?(file: File): Promise<string>;
  preprocessData?(data: any): any;
  postprocessData?(data: any): any;
}

// Base interface for document viewers
export interface DocumentViewerProps {
  results: ProcessingResult;
  onSave?: (data: any) => void;
  onEdit?: (data: any) => void;
  variant?: 'summary' | 'detailed';
  readonly?: boolean;
}

// Base interface for document editors
export interface DocumentEditorProps {
  data: any;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  readonly?: boolean;
}

// Factory registry interface
export interface ProcessorRegistry {
  register(type: DocumentType, processor: DocumentProcessor): void;
  getProcessor(type: DocumentType): DocumentProcessor;
  getSupportedTypes(): DocumentType[];
  getTypeInfo(type: DocumentType): DocumentTypeInfo;
}