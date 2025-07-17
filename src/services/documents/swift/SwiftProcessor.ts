import { BaseDocumentProcessor } from '../base/DocumentProcessor';
import { DocumentType, ProcessingResult, ValidationResult, PromptStep } from '../base/types';
import { 
  SwiftProcessingResult, 
  SwiftProcessingOptions,
  SwiftData,
  SwiftValidationRules
} from './types';
import { swiftSteps, getAllPrompts, getPromptForStep, getSwiftPrompt } from './prompts';
import { SwiftValidator } from './SwiftValidator';

/**
 * Processor for Swift documents
 * Handles single-step processing for MT103 and other Swift message types
 */
export class SwiftProcessor extends BaseDocumentProcessor {
  readonly documentType = DocumentType.SWIFT;
  readonly supportedFormats = ['pdf'];
  readonly hasMultiStep = false; // Swift uses single-step processing

  private validationRules: SwiftValidationRules = {
    requireAllFields: false, // Some fields may be optional
    validateBICFormat: true,
    validateDateFormat: true,
    validateAmount: true,
    validateUETR: true,
    validateMessageType: true
  };

  /**
   * Main processing method
   */
  async process(file: File, options: SwiftProcessingOptions = {}): Promise<ProcessingResult> {
    try {
      this.log('info', 'Starting Swift processing', { 
        fileName: file.name, 
        fileSize: file.size
      });

      // Validate file first
      const fileValidation = this.validateFile(file);
      if (!fileValidation.isValid) {
        return this.createResult(false, undefined, `File validation failed: ${fileValidation.errors.map(e => e.message).join(', ')}`);
      }

      // Process Swift document
      const processingResult = await this.processSingleStep(file, options);

      // Validate extracted data if requested
      if (options.validateData !== false) {
        const validation = this.validate(processingResult);
        if (!validation.isValid) {
          this.log('warn', 'Data validation warnings found', { 
            errors: validation.errors,
            warnings: validation.warnings 
          });
        }
      }

      this.log('info', 'Swift processing completed successfully');

      return this.createResult(true, processingResult);

    } catch (error) {
      return this.handleError(error, 'Swift processing');
    }
  }

  /**
   * Single-step processing for Swift
   */
  private async processSingleStep(
    file: File, 
    options: SwiftProcessingOptions
  ): Promise<SwiftProcessingResult> {
    this.log('info', 'Processing Swift document');

    const prompt = getSwiftPrompt();
    
    // This would integrate with existing OCR services
    // For now, return mock data
    const swiftData = await this.extractSwiftData(file, prompt, options);

    const result: SwiftProcessingResult = {
      swiftData,
      metadata: {
        documentType: 'swift',
        processingTime: Date.now(),
        confidence: 0.95
      }
    };

    return result;
  }

  /**
   * Extract Swift data from file
   */
  private async extractSwiftData(
    file: File, 
    prompt: string,
    options: SwiftProcessingOptions
  ): Promise<SwiftData> {
    try {
      // This would integrate with existing Claude/OCR processing
      // For now, return mock data
      
      const mockData: SwiftData = {
        message_type: "FIN 103",
        senders_reference: "REF20240115001",
        transaction_reference: "TRX20240115001",
        uetr: "8a562c72-2f3e-4d6b-9c8a-1f4b5e3d7c9a",
        bank_operation_code: "CRED",
        value_date: "15/01/2024",
        currency: "USD",
        amount: 50000.00,
        ordering_customer: {
          name: "ACME CORPORATION",
          address: "123 BUSINESS STREET, NEW YORK, NY 10001"
        },
        ordering_institution: {
          name: "BANK OF AMERICA",
          bic: "BOFAUS3N",
          address: "100 FEDERAL STREET, BOSTON, MA"
        },
        account_with_institution_bic: "ITAUBRRJ",
        receiver_institution: {
          name: "BANCO ITAU SA",
          bic: "ITAUBRRJ"
        },
        beneficiary: {
          account: "12345678901",
          name: "EMPRESA IMPORTADORA LTDA",
          address: "RUA DO COMERCIO 500, SAO PAULO, SP"
        },
        remittance_information: "PAYMENT FOR INVOICE INV-2024-001",
        fatura: "INV-2024-001",
        details_of_charges: "SHA"
      };

      // Apply text normalization if requested
      if (options.normalizeText) {
        return this.normalizeSwiftData(mockData);
      }

      return mockData;

    } catch (error) {
      this.log('error', 'Error extracting Swift data', { error });
      throw error;
    }
  }

  /**
   * Normalize Swift data
   */
  private normalizeSwiftData(data: SwiftData): SwiftData {
    const normalized = { ...data };

    // Normalize text fields - remove special characters
    const normalizeText = (text: string): string => {
      if (!text) return text;
      return text.replace(/[^\w\s,.-]/g, ' ').replace(/\s+/g, ' ').trim();
    };

    // Apply normalization
    normalized.ordering_customer.name = normalizeText(normalized.ordering_customer.name);
    normalized.ordering_customer.address = normalizeText(normalized.ordering_customer.address);
    normalized.ordering_institution.name = normalizeText(normalized.ordering_institution.name);
    normalized.ordering_institution.address = normalizeText(normalized.ordering_institution.address);
    normalized.beneficiary.name = normalizeText(normalized.beneficiary.name);
    normalized.beneficiary.address = normalizeText(normalized.beneficiary.address);
    normalized.receiver_institution.name = normalizeText(normalized.receiver_institution.name);

    // Ensure account contains only numbers
    normalized.beneficiary.account = normalized.beneficiary.account.replace(/\D/g, '');

    return normalized;
  }

  /**
   * Validate Swift data
   */
  validate(data: any): ValidationResult {
    const validator = new SwiftValidator(this.validationRules);
    return validator.validate(data);
  }

  /**
   * Validate specific step data (Swift has only one step)
   */
  validateStep(stepNumber: number, data: any): ValidationResult {
    if (stepNumber !== 1) {
      return {
        isValid: false,
        errors: [{
          field: 'step',
          message: `Swift processing has only 1 step, requested step ${stepNumber}`,
          code: 'INVALID_STEP'
        }],
        warnings: []
      };
    }
    return this.validate(data);
  }

  /**
   * Get all prompts for this document type
   */
  getPrompts(): string[] {
    return getAllPrompts();
  }

  /**
   * Get processing steps
   */
  getSteps(): PromptStep[] {
    return swiftSteps;
  }

  /**
   * Get prompt for specific step
   */
  getPromptForStep(step: number, previousResult?: string): string {
    return getPromptForStep(step);
  }

  /**
   * Set validation rules
   */
  setValidationRules(rules: Partial<SwiftValidationRules>): void {
    this.validationRules = { ...this.validationRules, ...rules };
  }

  /**
   * Get current validation rules
   */
  getValidationRules(): SwiftValidationRules {
    return { ...this.validationRules };
  }

  /**
   * Parse Swift field tag value
   */
  private parseSwiftField(text: string, tag: string): string {
    const regex = new RegExp(`:${tag}:([^:]+)(?=:|$)`, 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : '';
  }

  /**
   * Parse value date, currency and amount from :32A: field
   */
  private parseValueDateCurrencyAmount(field32A: string): { 
    value_date: string; 
    currency: string; 
    amount: number 
  } {
    // Format: YYMMDDCUR1234,56
    const match = field32A.match(/^(\d{6})([A-Z]{3})([\d,]+)$/);
    if (!match) {
      return { value_date: '', currency: '', amount: 0 };
    }

    // Parse date
    const dateStr = match[1];
    const year = parseInt('20' + dateStr.substr(0, 2));
    const month = parseInt(dateStr.substr(2, 2));
    const day = parseInt(dateStr.substr(4, 2));
    const value_date = `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;

    // Parse currency
    const currency = match[2];

    // Parse amount
    const amountStr = match[3].replace(',', '.');
    const amount = parseFloat(amountStr);

    return { value_date, currency, amount };
  }
}