import { BaseDocumentProcessor } from '../base/DocumentProcessor';
import { DocumentValidator } from '../base/DocumentValidator';
import { DocumentType, ProcessingOptions, ProcessingResult, ValidationResult, PromptStep } from '../base/types';
import { 
  CommercialInvoiceProcessingResult, 
  CommercialInvoiceValidationRules, 
  CommercialInvoiceProcessingOptions,
  CommercialInvoiceHeader,
  CommercialInvoiceItem
} from './types';
import { commercialInvoiceSteps, getCommercialInvoicePrompt, getPromptForStep } from './prompts';
import { CommercialInvoiceValidator } from './CommercialInvoiceValidator';

/**
 * Processor for Commercial Invoice documents
 * Single-step processing approach (invoices are typically simpler than packing lists)
 */
export class CommercialInvoiceProcessor extends BaseDocumentProcessor {
  readonly documentType = DocumentType.COMMERCIAL_INVOICE;
  readonly supportedFormats = ['pdf'];
  readonly hasMultiStep = false; // Single step processing

  private validationRules: CommercialInvoiceValidationRules = {
    requireHeader: true,
    requireItems: true,
    validateInvoiceNumber: true,
    validateSupplierInfo: true,
    validateBuyerInfo: true,
    validateAmountConsistency: true,
    validateItemTotals: true,
    validateCurrency: true,
    validateHSCodes: false, // Optional
    validateDates: true
  };

  /**
   * Main processing method
   */
  async process(file: File, options: CommercialInvoiceProcessingOptions = {}): Promise<ProcessingResult> {
    try {
      this.log('info', 'Starting commercial invoice processing', { 
        fileName: file.name, 
        fileSize: file.size 
      });

      // Validate file first
      const fileValidation = this.validateFile(file);
      if (!fileValidation.isValid) {
        return this.createResult(false, undefined, `File validation failed: ${fileValidation.errors.map(e => e.message).join(', ')}`);
      }

      // Extract text from file
      const extractedText = await this.extractTextFromFile(file);

      // Process using single-step approach
      const processingResult = await this.processSingleStep(extractedText, options);

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

      // Post-process data
      const finalResult = this.postprocessData(processingResult);

      this.log('info', 'Commercial invoice processing completed successfully');

      return this.createResult(true, finalResult);

    } catch (error) {
      return this.handleError(error, 'Commercial invoice processing');
    }
  }

  /**
   * Single-step processing approach
   */
  private async processSingleStep(
    extractedText: string, 
    options: CommercialInvoiceProcessingOptions
  ): Promise<CommercialInvoiceProcessingResult> {
    this.log('info', 'Processing commercial invoice using single-step approach');

    const prompt = getCommercialInvoicePrompt();
    
    // This would integrate with existing Claude/OCR services
    // For now, return a mock result
    const result: CommercialInvoiceProcessingResult = {
      header: {
        invoiceNumber: "CI-2024-001",
        invoiceDate: "15/03/2024",
        totalAmount: 5000.00,
        currency: "USD",
        supplierName: "Mock Supplier Company Ltd.",
        supplierAddress: "123 Export Street, Shanghai, China",
        buyerName: "Mock Buyer Company Ltda.",
        buyerAddress: "456 Import Avenue, São Paulo, Brazil",
        paymentTerms: "T/T 30 days",
        incoterm: "FOB",
        incotermPlace: "Shanghai",
        totalWeight: 250.5,
        numberOfPackages: 10,
        portOfLoading: "Shanghai",
        portOfDischarge: "Santos",
        countryOfOrigin: "China",
        countryOfDestination: "Brazil"
      },
      items: [
        {
          lineNumber: 1,
          description: "Electronic Components - Model ABC123",
          quantity: 100,
          unit: "PCS",
          unitPrice: 50.00,
          totalPrice: 5000.00,
          weight: 250.5
        }
      ],
      fullText: extractedText
    };

    return result;
  }

  /**
   * Validate commercial invoice data
   */
  validate(data: any): ValidationResult {
    const validator = new CommercialInvoiceValidator(this.validationRules);
    return validator.validate(data);
  }

  /**
   * Get all prompts for this document type
   */
  getPrompts(): string[] {
    return [getCommercialInvoicePrompt()];
  }

  /**
   * Get processing steps
   */
  getSteps(): PromptStep[] {
    return commercialInvoiceSteps;
  }

  /**
   * Get prompt for specific step
   */
  getPromptForStep(step: number, previousResult?: string): string {
    return getPromptForStep(step, previousResult);
  }

  /**
   * Post-process extracted data
   */
  postprocessData(data: CommercialInvoiceProcessingResult): CommercialInvoiceProcessingResult {
    if (!data) return data;

    // Clean and normalize data
    const processed = this.sanitizeData(data) as CommercialInvoiceProcessingResult;

    // Calculate missing totals if needed
    if (processed.items && processed.header) {
      this.calculateTotals(processed);
    }

    // Validate currency format
    if (processed.header?.currency) {
      processed.header.currency = processed.header.currency.toUpperCase();
    }

    // Normalize country names
    if (processed.header?.countryOfOrigin) {
      processed.header.countryOfOrigin = this.normalizeCountryName(processed.header.countryOfOrigin);
    }
    
    if (processed.header?.countryOfDestination) {
      processed.header.countryOfDestination = this.normalizeCountryName(processed.header.countryOfDestination);
    }

    return processed;
  }

  /**
   * Calculate totals and verify consistency
   */
  private calculateTotals(data: CommercialInvoiceProcessingResult): void {
    if (!data.items || !data.header) return;

    // Calculate total from items
    const itemsTotal = data.items.reduce((sum, item) => {
      const itemTotal = (item.quantity || 0) * (item.unitPrice || 0);
      if (!item.totalPrice) {
        item.totalPrice = itemTotal;
      }
      return sum + (item.totalPrice || 0);
    }, 0);

    // Calculate total weight
    const totalWeight = data.items.reduce((sum, item) => 
      sum + (item.weight || 0), 0);

    // Update header totals if they were missing
    if (!data.header.totalAmount) {
      data.header.totalAmount = itemsTotal;
    }

    if (!data.header.totalWeight && totalWeight > 0) {
      data.header.totalWeight = totalWeight;
    }

    // Log discrepancies
    if (data.header.totalAmount && Math.abs(data.header.totalAmount - itemsTotal) > 0.01) {
      this.log('warn', 'Amount discrepancy detected', {
        headerTotal: data.header.totalAmount,
        itemsTotal: itemsTotal,
        difference: Math.abs(data.header.totalAmount - itemsTotal)
      });
    }
  }

  /**
   * Normalize country names
   */
  private normalizeCountryName(country: string): string {
    const countryMappings: Record<string, string> = {
      'china': 'China',
      'brasil': 'Brazil',
      'brazil': 'Brazil',
      'usa': 'United States',
      'us': 'United States',
      'united states of america': 'United States',
      'germany': 'Germany',
      'deutschland': 'Germany',
      'japan': 'Japan',
      'south korea': 'South Korea',
      'korea': 'South Korea'
    };

    const normalized = country.toLowerCase().trim();
    return countryMappings[normalized] || country;
  }

  /**
   * Extract text from file using OCR services
   */
  protected async extractTextFromFile(file: File): Promise<string> {
    // This would integrate with existing OCR services
    // (cloudVision, claudePDF, etc.)
    
    this.log('info', 'Extracting text from commercial invoice file', { fileName: file.name });
    
    // For now, return empty string as placeholder
    return '';
  }

  /**
   * Set validation rules
   */
  setValidationRules(rules: Partial<CommercialInvoiceValidationRules>): void {
    this.validationRules = { ...this.validationRules, ...rules };
  }

  /**
   * Get current validation rules
   */
  getValidationRules(): CommercialInvoiceValidationRules {
    return { ...this.validationRules };
  }

  /**
   * Multi-step processing approach
   */
  private async processMultiStep(
    extractedText: string, 
    options: CommercialInvoiceProcessingOptions
  ): Promise<CommercialInvoiceProcessingResult> {
    this.log('info', 'Processing commercial invoice using multi-step approach');

    const steps = this.getSteps();
    const stepResults: Array<{ step: number; stepName: string; result: any; timestamp: string }> = [];

    for (const step of steps) {
      this.log('info', `Executing step ${step.step}: ${step.name}`);

      const prompt = step.prompt;
      
      // This would integrate with existing Claude/OCR services
      // For now, simulate step processing
      const stepResult = await this.executeStep(step, prompt, extractedText);
      
      stepResults.push({
        step: step.step,
        stepName: step.name,
        result: stepResult,
        timestamp: new Date().toISOString()
      });
    }

    // Combine step results into final result
    const finalResult = this.combineStepResults(stepResults);

    // Add multi-prompt metadata
    finalResult.multiPrompt = {
      documentType: 'commercial_invoice',
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
            invoice_number: "VIM240008",
            invoice_date: "25th, Aug, 2024",
            load_port: "SHANGHAI",
            destination_port: "NAVEGANTES",
            document_url: "",
            shipper_company: "Mock Supplier Company Ltd.",
            shipper_address: "123 Export Street, Shanghai, China",
            shipper_tel: "+86 12345678",
            shipper_email: "export@supplier.com",
            consignee_company: "Mock Buyer Company Ltda.",
            consignee_address: "456 Import Avenue, São Paulo, Brazil",
            consignee_cnpj: "12.345.678/0001-90",
            notify_party_company: "Notify Company Ltda.",
            notify_party_cnpj: "98.765.432/0001-10",
            notify_party_address: "789 Notify Street, Rio, Brazil",
            total_amount_usd: "$5,000.00",
            total_amount_words: "FIVE THOUSAND US DOLLARS ONLY"
          };
        
        case 2: // Item details extraction
          return [
            {
              invoice_number: "VIM240008",
              item_number: "1",
              reference: "REF001",
              name_chinese: "电子元件",
              name_english: "Electronic Components",
              quantity: "100",
              unit: "pcs",
              unit_price_usd: "$50.00",
              amount_usd: "$5,000.00"
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
   * Combine results from multiple steps into final structure
   */
  private combineStepResults(stepResults: Array<{ step: number; stepName: string; result: any }>): CommercialInvoiceProcessingResult {
    const result: CommercialInvoiceProcessingResult = {
      header: {},
      items: [],
      fullText: ''
    };

    stepResults.forEach(sr => {
      switch (sr.step) {
        case 1: // General data - convert to header format
          const generalData = sr.result;
          result.header = {
            invoiceNumber: generalData.invoice_number,
            invoiceDate: this.formatDateToBrazilian(generalData.invoice_date),
            totalAmount: this.parseMonetaryValue(generalData.total_amount_usd),
            currency: 'USD',
            supplierName: generalData.shipper_company,
            supplierAddress: generalData.shipper_address,
            supplierTaxId: generalData.shipper_tel, // Using tel as tax ID for now
            buyerName: generalData.consignee_company,
            buyerAddress: generalData.consignee_address,
            buyerTaxId: generalData.consignee_cnpj,
            portOfLoading: generalData.load_port,
            portOfDischarge: generalData.destination_port,
            // Additional mapped fields
            notifyPartyName: generalData.notify_party_company,
            notifyPartyCNPJ: generalData.notify_party_cnpj,
            notifyPartyAddress: generalData.notify_party_address,
            totalAmountWords: generalData.total_amount_words
          };
          break;
          
        case 2: // Items data - convert to items format
          const itemsData = Array.isArray(sr.result) ? sr.result : [sr.result];
          result.items = itemsData.map((item: any, index: number) => ({
            lineNumber: parseInt(item.item_number) || index + 1,
            reference: item.reference,
            description: item.name_english,
            descriptionChinese: item.name_chinese,
            quantity: parseFloat(item.quantity) || 0,
            unit: item.unit,
            unitPrice: this.parseMonetaryValue(item.unit_price_usd),
            totalPrice: this.parseMonetaryValue(item.amount_usd)
          }));
          break;
      }
    });

    return result;
  }

  /**
   * Parse monetary value from string (e.g., "$1,234.56" -> 1234.56)
   */
  private parseMonetaryValue(value: string | number): number {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    
    // Remove currency symbols and commas
    const cleaned = value.toString().replace(/[$,]/g, '');
    return parseFloat(cleaned) || 0;
  }

  /**
   * Format date to Brazilian format (DD/MM/YYYY)
   */
  private formatDateToBrazilian(dateStr: string): string {
    if (!dateStr) return '';
    
    // Try to parse different date formats
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    }
    
    // If parsing fails, try manual parsing for formats like "25th, Aug, 2024"
    const monthMap: Record<string, string> = {
      'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
      'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
      'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
    };
    
    const match = dateStr.match(/(\d+)\w*,?\s+(\w+),?\s+(\d{4})/);
    if (match) {
      const day = match[1].padStart(2, '0');
      const month = monthMap[match[2]] || '01';
      const year = match[3];
      return `${day}/${month}/${year}`;
    }
    
    return dateStr; // Return original if can't parse
  }

  /**
   * Get summary data for display
   */
  getSummary(data: CommercialInvoiceProcessingResult): any {
    if (!data.header) return null;

    return {
      invoiceNumber: data.header.invoiceNumber,
      totalAmount: data.header.totalAmount,
      currency: data.header.currency,
      supplierName: data.header.supplierName,
      buyerName: data.header.buyerName,
      itemCount: data.items?.length || 0,
      totalWeight: data.header.totalWeight,
      invoiceDate: data.header.invoiceDate
    };
  }

  /**
   * Validate specific invoice field formats
   */
  validateInvoiceFields(data: CommercialInvoiceProcessingResult): ValidationResult {
    const errors: any[] = [];
    const warnings: any[] = [];

    if (!data.header) {
      return DocumentValidator.createValidationResult([{
        field: 'header',
        message: 'Cabeçalho da invoice não encontrado',
        code: 'MISSING_HEADER'
      }]);
    }

    const header = data.header;

    // Validate invoice number format
    if (header.invoiceNumber && !/^[A-Z0-9\-_]{3,}$/i.test(header.invoiceNumber)) {
      DocumentValidator.addWarning(warnings, 'header.invoiceNumber', 
        'Formato do número da invoice pode estar incorreto');
    }

    // Validate currency code
    const validCurrencies = ['USD', 'EUR', 'BRL', 'CNY', 'GBP', 'JPY'];
    if (header.currency && !validCurrencies.includes(header.currency.toUpperCase())) {
      DocumentValidator.addWarning(warnings, 'header.currency', 
        `Código de moeda desconhecido: ${header.currency}`);
    }

    // Validate date format
    if (header.invoiceDate && !DocumentValidator.validateDateFormat(header.invoiceDate)) {
      DocumentValidator.addError(errors, 'header.invoiceDate', 
        'Formato de data inválido (esperado DD/MM/YYYY)', 'INVALID_DATE_FORMAT');
    }

    return DocumentValidator.createValidationResult(errors, warnings);
  }
}