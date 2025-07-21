import { BaseDocumentProcessor } from '../base/DocumentProcessor';
import { DocumentType, ProcessingResult, ValidationResult, PromptStep } from '../base/types';
import { 
  ProformaInvoiceProcessingResult, 
  ProformaInvoiceProcessingOptions,
  ProformaInvoiceHeader,
  ProformaInvoiceItem,
  ProformaInvoiceValidationRules
} from './types';
import { proformaInvoiceSteps, getAllPrompts, getPromptForStep } from './prompts';
import { ProformaInvoiceValidator } from './ProformaInvoiceValidator';

/**
 * Processor for Proforma Invoice documents
 * Handles multi-step processing with 2 prompts
 */
export class ProformaInvoiceProcessor extends BaseDocumentProcessor {
  readonly documentType = DocumentType.PROFORMA_INVOICE;
  readonly supportedFormats = ['pdf'];
  readonly hasMultiStep = true;

  private validationRules: ProformaInvoiceValidationRules = {
    requireHeader: true,
    requireItems: true,
    validateEmail: true,
    validateDateFormat: true,
    validatePriceConsistency: true,
    validateItemNumbers: true,
    minItems: 1
  };

  /**
   * Main processing method
   */
  async process(file: File, options: ProformaInvoiceProcessingOptions = {}): Promise<ProcessingResult> {
    try {
      this.log('info', 'Starting proforma invoice processing', { 
        fileName: file.name, 
        fileSize: file.size,
        useMultiStep: options.useMultiStep !== false // Default to true for multi-step
      });

      // Validate file first
      const fileValidation = this.validateFile(file);
      if (!fileValidation.isValid) {
        return this.createResult(false, undefined, `File validation failed: ${fileValidation.errors.map(e => e.message).join(', ')}`);
      }

      // For proforma invoice, we always use multi-step processing
      const processingResult = await this.processMultiStep(file, options);

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

      this.log('info', 'Proforma invoice processing completed successfully');

      return this.createResult(true, processingResult);

    } catch (error) {
      return this.handleError(error, 'Proforma invoice processing');
    }
  }

  /**
   * Multi-step processing approach
   */
  private async processMultiStep(
    file: File, 
    options: ProformaInvoiceProcessingOptions
  ): Promise<ProformaInvoiceProcessingResult> {
    this.log('info', 'Using multi-step processing for proforma invoice');

    const steps = this.getSteps();
    const stepResults: Array<{ step: number; stepName: string; result: any; timestamp: string }> = [];

    // This would integrate with existing OCR services
    // For now, we'll create a placeholder structure
    for (const step of steps) {
      this.log('info', `Executing step ${step.step}: ${step.name}`);

      const stepResult = await this.executeStep(step, file);
      
      stepResults.push({
        step: step.step,
        stepName: step.name,
        result: stepResult,
        timestamp: new Date().toISOString()
      });
    }

    // Combine step results into final result
    const finalResult = this.combineStepResults(stepResults, options);

    finalResult.multiPrompt = {
      documentType: 'proforma_invoice',
      totalSteps: steps.length,
      steps: stepResults.map(sr => ({
        step: sr.step,
        stepName: sr.stepName,
        result: sr.result
      }))
    };

    return finalResult;
  }

  /**
   * Execute a single processing step
   */
  private async executeStep(step: PromptStep, file: File): Promise<any> {
    try {
      // This integrates with existing Claude/OCR processing
      // The actual implementation would call the OCR service
      // This is a placeholder that should be replaced with actual OCR integration
      
      throw new Error('ProformaInvoiceProcessor.executeStep needs to be integrated with OCR service');
      
    } catch (error) {
      this.log('error', `Error executing step ${step.step}`, { error });
      throw error;
    }
  }

  /**
   * Combine results from multiple steps
   */
  private combineStepResults(
    stepResults: Array<{ step: number; stepName: string; result: any }>,
    options: ProformaInvoiceProcessingOptions
  ): ProformaInvoiceProcessingResult {
    const result: ProformaInvoiceProcessingResult = {
      header: {} as ProformaInvoiceHeader,
      items: []
    };

    stepResults.forEach(sr => {
      switch (sr.step) {
        case 1: // General data
          result.header = sr.result as ProformaInvoiceHeader;
          break;
        case 2: // Items
          result.items = Array.isArray(sr.result) ? sr.result : [];
          
          // Normalize Chinese text if requested
          if (options.normalizeChineseText) {
            result.items = result.items.map(item => ({
              ...item,
              description_in_chinese: this.normalizeChineseText(item.description_in_chinese)
            }));
          }
          break;
      }
    });

    // Calculate total from items if needed
    if (result.items.length > 0) {
      const calculatedTotal = result.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
      // You might want to validate this against header.total_price
    }

    return result;
  }

  /**
   * Normalize Chinese text
   */
  private normalizeChineseText(text: string): string {
    if (!text) return text;
    // Remove any non-Chinese characters mixed in
    return text.replace(/[a-zA-Z0-9]/g, '').trim();
  }

  /**
   * Validate proforma invoice data
   */
  validate(data: any): ValidationResult {
    const validator = new ProformaInvoiceValidator(this.validationRules);
    return validator.validate(data);
  }

  /**
   * Validate specific step data
   */
  validateStep(stepNumber: number, data: any): ValidationResult {
    const validator = new ProformaInvoiceValidator(this.validationRules);
    return validator.validateStep(stepNumber, data);
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
    return proformaInvoiceSteps;
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
  setValidationRules(rules: Partial<ProformaInvoiceValidationRules>): void {
    this.validationRules = { ...this.validationRules, ...rules };
  }

  /**
   * Get current validation rules
   */
  getValidationRules(): ProformaInvoiceValidationRules {
    return { ...this.validationRules };
  }
}