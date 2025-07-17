import { BaseDocumentProcessor } from '../base/DocumentProcessor';
import { DocumentValidator } from '../base/DocumentValidator';
import { DocumentType, ProcessingOptions, ProcessingResult, ValidationResult, PromptStep } from '../base/types';
import { 
  PackingListProcessingResult, 
  PackingListValidationRules, 
  PackingListProcessingOptions,
  PackingListItem,
  PackingListHeader,
  PackingListContainer
} from './types';
import { packingListSteps, getSingleStepPrompt, getPromptForStep } from './prompts';
import { PackingListValidator } from './PackingListValidator';

/**
 * Processor for Packing List documents
 * Handles both single-step and multi-step processing approaches
 */
export class PackingListProcessor extends BaseDocumentProcessor {
  readonly documentType = DocumentType.PACKING_LIST;
  readonly supportedFormats = ['pdf'];
  readonly hasMultiStep = true;

  private validationRules: PackingListValidationRules = {
    requireHeader: true,
    requireContainers: true,
    requireItems: true,
    validateContainerNumbers: true,
    validateWeightConsistency: true,
    validatePackageConsistency: true,
    validateItemNumberSequence: true
  };

  /**
   * Main processing method
   */
  async process(file: File, options: PackingListProcessingOptions = {}): Promise<ProcessingResult> {
    try {
      this.log('info', 'Starting packing list processing', { 
        fileName: file.name, 
        fileSize: file.size,
        useMultiStep: options.useMultiStep 
      });

      // Validate file first
      const fileValidation = this.validateFile(file);
      if (!fileValidation.isValid) {
        return this.createResult(false, undefined, `File validation failed: ${fileValidation.errors.map(e => e.message).join(', ')}`);
      }

      // Extract text from file (placeholder - would integrate with existing OCR services)
      const extractedText = await this.extractTextFromFile(file);

      let processingResult: PackingListProcessingResult;

      if (options.useMultiStep) {
        processingResult = await this.processMultiStep(extractedText, options);
      } else {
        processingResult = await this.processSingleStep(extractedText, options);
      }

      // Validate extracted data if requested
      if (options.validateData) {
        const validation = this.validate(processingResult);
        if (!validation.isValid) {
          this.log('warn', 'Data validation warnings found', { 
            errors: validation.errors,
            warnings: validation.warnings 
          });
        }
      }

      // Apply grouping and shared box detection if enabled
      if (options.enableGrouping && processingResult.items_por_container) {
        processingResult = await this.applyGrouping(processingResult, options);
      }

      this.log('info', 'Packing list processing completed successfully');

      return this.createResult(true, processingResult);

    } catch (error) {
      return this.handleError(error, 'Packing list processing');
    }
  }

  /**
   * Single-step processing approach
   */
  private async processSingleStep(
    extractedText: string, 
    options: PackingListProcessingOptions
  ): Promise<PackingListProcessingResult> {
    this.log('info', 'Using single-step processing approach');

    const prompt = getSingleStepPrompt();
    
    // This would integrate with existing Claude/OCR services
    // For now, return a mock result
    const result: PackingListProcessingResult = {
      header: {},
      containers: [],
      items_por_container: []
    };

    return result;
  }

  /**
   * Multi-step processing approach
   */
  private async processMultiStep(
    extractedText: string, 
    options: PackingListProcessingOptions
  ): Promise<PackingListProcessingResult> {
    this.log('info', 'Using multi-step processing approach');

    const steps = this.getSteps();
    const stepResults: Array<{ step: number; stepName: string; result: any; timestamp: string }> = [];
    let previousResult: string | undefined;

    for (const step of steps) {
      this.log('info', `Executing step ${step.step}: ${step.name}`);

      const prompt = this.getPromptForStep(step.step, previousResult);
      
      // This would integrate with existing Claude/OCR services
      // For now, simulate step processing
      const stepResult = await this.executeStep(step, prompt, extractedText);
      
      stepResults.push({
        step: step.step,
        stepName: step.name,
        result: stepResult,
        timestamp: new Date().toISOString()
      });

      // Pass result to next step if needed
      if (step.expectsInput) {
        previousResult = typeof stepResult === 'string' ? stepResult : JSON.stringify(stepResult);
      }
    }

    // Combine step results into final result
    const finalResult = this.combineStepResults(stepResults);

    finalResult.multiPrompt = {
      documentType: 'packing_list',
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
  private async executeStep(step: PromptStep, prompt: string, extractedText: string): Promise<any> {
    try {
      // This would integrate with existing Claude/OCR processing
      // For now, return mock data based on step type
      
      switch (step.step) {
        case 1: // General data extraction
          return {
            invoice: "MOCK_INVOICE_001",
            consignee: "Mock Consignee Company",
            package_total: 100,
            items_qty_total: 10,
            total_gw: 1500.5
          };
        
        case 2: // Container mapping
          return [
            {
              invoice: "MOCK_INVOICE_001",
              container: "MOCK1234567",
              booking: "BK001",
              tipo_container: "40'HQ",
              quantidade_de_pacotes: 50,
              peso_bruto: 750.0,
              volume: 30.0,
              from_package: 1,
              to_package: 50,
              from_item: 1,
              to_item: 5
            }
          ];
        
        case 3: // Disposition explanation
          return "Mock disposition explanation for container mapping";
        
        case 4: // Final distribution
          return [
            {
              item_number: 1,
              reference: "REF001",
              descricao_ingles: "Mock Product 1",
              quantidade_de_pacotes: 10,
              peso_bruto_total: 150.0,
              container: "MOCK1234567"
            }
          ];
        
        default:
          return {};
      }
    } catch (error) {
      this.log('error', `Error executing step ${step.step}`, { error });
      throw error;
    }
  }

  /**
   * Combine results from multiple steps
   */
  private combineStepResults(stepResults: Array<{ step: number; stepName: string; result: any }>): PackingListProcessingResult {
    const result: PackingListProcessingResult = {
      header: {},
      containers: [],
      items_por_container: []
    };

    stepResults.forEach(sr => {
      switch (sr.step) {
        case 1: // General data
          result.header = sr.result as PackingListHeader;
          break;
        case 2: // Container mapping
          result.containers = Array.isArray(sr.result) ? sr.result : [sr.result];
          break;
        case 4: // Final distribution
          result.items_por_container = Array.isArray(sr.result) ? sr.result : [sr.result];
          break;
        // Step 3 is just explanation text, not stored in final result
      }
    });

    return result;
  }

  /**
   * Apply grouping and shared box detection
   */
  private async applyGrouping(
    result: PackingListProcessingResult, 
    options: PackingListProcessingOptions
  ): Promise<PackingListProcessingResult> {
    if (!options.autoDetectSharedBoxes || !result.items_por_container) {
      return result;
    }

    this.log('info', 'Applying shared box detection and grouping');

    // This would integrate with existing SharedBoxDetector
    // For now, return result unchanged
    return result;
  }

  /**
   * Validate packing list data
   */
  validate(data: any): ValidationResult {
    const validator = new PackingListValidator(this.validationRules);
    return validator.validate(data);
  }

  /**
   * Validate specific step data
   */
  validateStep(stepNumber: number, data: any): ValidationResult {
    const validator = new PackingListValidator(this.validationRules);
    return validator.validateStep(stepNumber, data);
  }

  /**
   * Get all prompts for this document type
   */
  getPrompts(): string[] {
    return [
      getSingleStepPrompt(),
      ...packingListSteps.map(step => step.prompt)
    ];
  }

  /**
   * Get processing steps
   */
  getSteps(): PromptStep[] {
    return packingListSteps;
  }

  /**
   * Get prompt for specific step
   */
  getPromptForStep(step: number, previousResult?: string): string {
    return getPromptForStep(step, previousResult);
  }

  /**
   * Extract text from file using OCR services
   */
  protected async extractTextFromFile(file: File): Promise<string> {
    // This would integrate with existing OCR services
    // (cloudVision, claudePDF, etc.)
    
    this.log('info', 'Extracting text from file', { fileName: file.name });
    
    // For now, return empty string as placeholder
    return '';
  }

  /**
   * Set validation rules
   */
  setValidationRules(rules: Partial<PackingListValidationRules>): void {
    this.validationRules = { ...this.validationRules, ...rules };
  }

  /**
   * Get current validation rules
   */
  getValidationRules(): PackingListValidationRules {
    return { ...this.validationRules };
  }
}