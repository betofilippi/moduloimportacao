import { DocumentType, DocumentProcessor as IDocumentProcessor, ProcessingOptions, ProcessingResult, ValidationResult, PromptStep } from './types';

/**
 * Abstract base class for document processors
 * Provides common functionality that can be shared across document types
 */
export abstract class BaseDocumentProcessor implements IDocumentProcessor {
  abstract readonly documentType: DocumentType;
  abstract readonly supportedFormats: string[];
  abstract readonly hasMultiStep: boolean;

  /**
   * Main processing method - must be implemented by each document type
   */
  abstract process(file: File, options?: ProcessingOptions): Promise<ProcessingResult>;

  /**
   * Validation method - can be overridden for specific validation logic
   */
  abstract validate(data: any): ValidationResult;

  /**
   * Get all prompts for this document type
   */
  abstract getPrompts(): string[];

  /**
   * Get processing steps for multi-step documents
   */
  abstract getSteps(): PromptStep[];

  /**
   * Get prompt for specific step
   */
  abstract getPromptForStep(step: number, previousResult?: string): string;

  /**
   * Extract text from file - common implementation using OCR services
   */
  protected async extractTextFromFile(file: File): Promise<string> {
    // This would integrate with existing OCR services
    // For now, return empty string as placeholder
    return '';
  }

  /**
   * Validate file format and size
   */
  protected validateFile(file: File): ValidationResult {
    const errors: any[] = [];
    const warnings: any[] = [];

    // Check file format
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (fileExtension && !this.supportedFormats.includes(fileExtension)) {
      errors.push({
        field: 'file',
        message: `Formato de arquivo não suportado: ${fileExtension}`,
        code: 'UNSUPPORTED_FORMAT'
      });
    }

    // Check file size (max 50MB)
    const maxSizeBytes = 50 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      errors.push({
        field: 'file',
        message: 'Arquivo muito grande. Tamanho máximo: 50MB',
        code: 'FILE_TOO_LARGE'
      });
    }

    // Check if file is empty
    if (file.size === 0) {
      errors.push({
        field: 'file',
        message: 'Arquivo está vazio',
        code: 'EMPTY_FILE'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Create a processing result with common metadata
   */
  protected createResult(success: boolean, data?: any, error?: string): ProcessingResult {
    return {
      success,
      data,
      error,
      metadata: {
        documentType: this.documentType,
        processingTime: Date.now(),
        totalSteps: this.hasMultiStep ? this.getSteps().length : 1
      }
    };
  }

  /**
   * Log processing events (can be extended for monitoring)
   */
  protected log(level: 'info' | 'warn' | 'error', message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const logData = {
      timestamp,
      level,
      documentType: this.documentType,
      message,
      data
    };

    if (level === 'error') {
      console.error('Document Processing Error:', logData);
    } else if (level === 'warn') {
      console.warn('Document Processing Warning:', logData);
    } else {
      console.log('Document Processing Info:', logData);
    }
  }

  /**
   * Handle errors in a consistent way
   */
  protected handleError(error: any, context: string): ProcessingResult {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    this.log('error', `Error in ${context}`, { error: errorMessage });
    
    return this.createResult(false, undefined, `${context}: ${errorMessage}`);
  }

  /**
   * Validate required fields in extracted data
   */
  protected validateRequiredFields(data: any, requiredFields: string[]): ValidationResult {
    const errors: any[] = [];
    const warnings: any[] = [];

    for (const field of requiredFields) {
      const value = this.getNestedValue(data, field);
      if (value === null || value === undefined || value === '') {
        errors.push({
          field,
          message: `Campo obrigatório não encontrado: ${field}`,
          code: 'MISSING_REQUIRED_FIELD'
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Sanitize and normalize extracted data
   */
  protected sanitizeData(data: any): any {
    if (data === null || data === undefined) {
      return data;
    }

    if (typeof data === 'string') {
      return data.trim();
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item));
    }

    if (typeof data === 'object') {
      const sanitized: any = {};
      for (const key in data) {
        if (data.hasOwnProperty(key)) {
          sanitized[key] = this.sanitizeData(data[key]);
        }
      }
      return sanitized;
    }

    return data;
  }
}