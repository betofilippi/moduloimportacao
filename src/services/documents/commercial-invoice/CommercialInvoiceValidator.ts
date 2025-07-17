import { DocumentValidator } from '../base/DocumentValidator';
import { ValidationResult, ValidationError, ValidationWarning } from '../base/types';
import { 
  CommercialInvoiceProcessingResult, 
  CommercialInvoiceValidationRules, 
  CommercialInvoiceHeader, 
  CommercialInvoiceItem 
} from './types';

/**
 * Validator specific to Commercial Invoice documents
 */
export class CommercialInvoiceValidator {
  constructor(private rules: CommercialInvoiceValidationRules) {}

  /**
   * Main validation method for commercial invoice data
   */
  validate(data: CommercialInvoiceProcessingResult): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate structure
    this.validateStructure(data, errors, warnings);

    // Validate header
    if (data.header && this.rules.requireHeader) {
      this.validateHeader(data.header, errors, warnings);
    }

    // Validate items
    if (data.items && this.rules.requireItems) {
      this.validateItems(data.items, errors, warnings);
    }

    // Cross-validation
    this.validateConsistency(data, errors, warnings);

    return DocumentValidator.createValidationResult(errors, warnings);
  }

  /**
   * Validate overall data structure
   */
  private validateStructure(data: CommercialInvoiceProcessingResult, errors: ValidationError[], warnings: ValidationWarning[]): void {
    if (!data || typeof data !== 'object') {
      DocumentValidator.addError(errors, 'data', 'Dados inválidos ou ausentes', 'INVALID_DATA_STRUCTURE');
      return;
    }

    // Check required sections
    if (this.rules.requireHeader && !data.header) {
      DocumentValidator.addError(errors, 'header', 'Cabeçalho da invoice ausente', 'MISSING_HEADER');
    }

    if (this.rules.requireItems && (!data.items || !Array.isArray(data.items))) {
      DocumentValidator.addError(errors, 'items', 'Lista de itens ausente ou inválida', 'MISSING_ITEMS');
    }
  }

  /**
   * Validate header data
   */
  private validateHeader(header: CommercialInvoiceHeader, errors: ValidationError[], warnings: ValidationWarning[]): void {
    // Validate invoice number
    if (this.rules.validateInvoiceNumber) {
      if (!header.invoiceNumber || typeof header.invoiceNumber !== 'string' || header.invoiceNumber.trim() === '') {
        DocumentValidator.addError(errors, 'header.invoiceNumber', 'Número da invoice ausente ou inválido', 'MISSING_INVOICE_NUMBER');
      } else if (header.invoiceNumber.length < 3) {
        DocumentValidator.addWarning(warnings, 'header.invoiceNumber', 'Número da invoice muito curto');
      }
    }

    // Validate supplier information
    if (this.rules.validateSupplierInfo) {
      if (!header.supplierName || header.supplierName.trim() === '') {
        DocumentValidator.addError(errors, 'header.supplierName', 'Nome do fornecedor ausente', 'MISSING_SUPPLIER_NAME');
      }

      if (!header.supplierAddress || header.supplierAddress.trim() === '') {
        DocumentValidator.addWarning(warnings, 'header.supplierAddress', 'Endereço do fornecedor não informado');
      }
    }

    // Validate buyer information
    if (this.rules.validateBuyerInfo) {
      if (!header.buyerName || header.buyerName.trim() === '') {
        DocumentValidator.addError(errors, 'header.buyerName', 'Nome do comprador ausente', 'MISSING_BUYER_NAME');
      }

      if (!header.buyerAddress || header.buyerAddress.trim() === '') {
        DocumentValidator.addWarning(warnings, 'header.buyerAddress', 'Endereço do comprador não informado');
      }
    }

    // Validate currency
    if (this.rules.validateCurrency) {
      if (!header.currency || header.currency.trim() === '') {
        DocumentValidator.addError(errors, 'header.currency', 'Moeda não informada', 'MISSING_CURRENCY');
      } else {
        const validCurrencies = ['USD', 'EUR', 'BRL', 'CNY', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF'];
        if (!validCurrencies.includes(header.currency.toUpperCase())) {
          DocumentValidator.addWarning(warnings, 'header.currency', 
            `Código de moeda não reconhecido: ${header.currency}`,
            'Verifique se o código está correto (ex: USD, EUR, BRL)');
        }
      }
    }

    // Validate total amount
    if (!header.totalAmount || !DocumentValidator.validateNumeric(header.totalAmount, { min: 0, allowDecimals: true })) {
      DocumentValidator.addError(errors, 'header.totalAmount', 'Valor total inválido ou ausente', 'INVALID_TOTAL_AMOUNT');
    } else if (header.totalAmount <= 0) {
      DocumentValidator.addWarning(warnings, 'header.totalAmount', 'Valor total é zero ou negativo');
    }

    // Validate date
    if (this.rules.validateDates && header.invoiceDate) {
      if (!DocumentValidator.validateDateFormat(header.invoiceDate)) {
        DocumentValidator.addError(errors, 'header.invoiceDate', 
          'Formato de data inválido (esperado DD/MM/YYYY)', 'INVALID_DATE_FORMAT');
      } else {
        // Check if date is reasonable (not too far in future or past)
        const invoiceDate = this.parseDate(header.invoiceDate);
        const now = new Date();
        const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        const oneYearFromNow = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());

        if (invoiceDate < oneYearAgo || invoiceDate > oneYearFromNow) {
          DocumentValidator.addWarning(warnings, 'header.invoiceDate', 
            'Data da invoice fora do período esperado (mais de 1 ano no passado ou futuro)');
        }
      }
    }

    // Validate numeric fields
    const numericFields = [
      { field: 'totalWeight', label: 'peso total' },
      { field: 'totalVolume', label: 'volume total' },
      { field: 'numberOfPackages', label: 'número de pacotes' }
    ];

    numericFields.forEach(({ field, label }) => {
      const value = (header as any)[field];
      if (value !== undefined && value !== null && 
          !DocumentValidator.validateNumeric(value, { min: 0, allowDecimals: true })) {
        DocumentValidator.addError(errors, `header.${field}`, 
          `${label} inválido`, 'INVALID_NUMERIC_FIELD');
      }
    });

    // Validate incoterm
    if (header.incoterm) {
      const validIncoterms = ['EXW', 'FCA', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP', 'FAS', 'FOB', 'CFR', 'CIF'];
      if (!validIncoterms.includes(header.incoterm.toUpperCase())) {
        DocumentValidator.addWarning(warnings, 'header.incoterm', 
          `Incoterm não reconhecido: ${header.incoterm}`,
          'Verifique se está correto (ex: FOB, CIF, EXW)');
      }
    }

    // Check for missing important fields
    const importantFields = [
      { field: 'paymentTerms', label: 'termos de pagamento' },
      { field: 'incoterm', label: 'incoterm' },
      { field: 'portOfLoading', label: 'porto de embarque' },
      { field: 'portOfDischarge', label: 'porto de descarga' }
    ];

    importantFields.forEach(({ field, label }) => {
      const value = (header as any)[field];
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        DocumentValidator.addWarning(warnings, `header.${field}`, `${label} não informado`);
      }
    });
  }

  /**
   * Validate items data
   */
  private validateItems(items: CommercialInvoiceItem[], errors: ValidationError[], warnings: ValidationWarning[]): void {
    if (items.length === 0) {
      DocumentValidator.addError(errors, 'items', 'Nenhum item encontrado na invoice', 'NO_ITEMS');
      return;
    }

    items.forEach((item, index) => {
      const prefix = `items[${index}]`;

      // Validate required fields
      if (!item.description || item.description.trim() === '') {
        DocumentValidator.addError(errors, `${prefix}.description`, 
          `Descrição ausente no item ${index + 1}`, 'MISSING_ITEM_DESCRIPTION');
      }

      if (!DocumentValidator.validateNumeric(item.quantity, { min: 0 })) {
        DocumentValidator.addError(errors, `${prefix}.quantity`, 
          `Quantidade inválida no item ${index + 1}`, 'INVALID_ITEM_QUANTITY');
      }

      if (!DocumentValidator.validateNumeric(item.unitPrice, { min: 0, allowDecimals: true })) {
        DocumentValidator.addError(errors, `${prefix}.unitPrice`, 
          `Preço unitário inválido no item ${index + 1}`, 'INVALID_UNIT_PRICE');
      }

      // Validate HS codes if required
      if (this.rules.validateHSCodes && item.hsCode) {
        if (!DocumentValidator.validateNCMCode(item.hsCode)) {
          DocumentValidator.addWarning(warnings, `${prefix}.hsCode`, 
            `Código HS/NCM inválido no item ${index + 1}: ${item.hsCode}`);
        }
      }

      // Validate total price calculation
      if (this.rules.validateItemTotals && item.quantity && item.unitPrice && item.totalPrice) {
        const calculatedTotal = item.quantity * item.unitPrice;
        const tolerance = 0.01; // 1 cent tolerance

        if (Math.abs(calculatedTotal - item.totalPrice) > tolerance) {
          DocumentValidator.addError(errors, `${prefix}.totalPrice`, 
            `Preço total incorreto no item ${index + 1}: ${item.quantity} × ${item.unitPrice} ≠ ${item.totalPrice}`, 
            'INCORRECT_ITEM_TOTAL');
        }
      }

      // Check for missing unit
      if (!item.unit || item.unit.trim() === '') {
        DocumentValidator.addWarning(warnings, `${prefix}.unit`, 
          `Unidade de medida não informada no item ${index + 1}`,
          'Adicione a unidade (ex: PCS, KG, SET)');
      }

      // Validate weight if provided
      if (item.weight !== undefined && !DocumentValidator.validateNumeric(item.weight, { min: 0, allowDecimals: true })) {
        DocumentValidator.addError(errors, `${prefix}.weight`, 
          `Peso inválido no item ${index + 1}`, 'INVALID_ITEM_WEIGHT');
      }

      // Check line number sequence
      if (item.lineNumber !== undefined && item.lineNumber !== index + 1) {
        DocumentValidator.addWarning(warnings, `${prefix}.lineNumber`, 
          `Numeração da linha inconsistente: esperado ${index + 1}, encontrado ${item.lineNumber}`);
      }
    });

    // Check for duplicate line numbers
    const lineNumbers = items
      .map(item => item.lineNumber)
      .filter(num => num !== undefined);
    
    const duplicates = lineNumbers.filter((num, index) => lineNumbers.indexOf(num) !== index);
    if (duplicates.length > 0) {
      DocumentValidator.addError(errors, 'items.lineNumbers', 
        `Números de linha duplicados: ${duplicates.join(', ')}`, 'DUPLICATE_LINE_NUMBERS');
    }
  }

  /**
   * Validate consistency between header and items
   */
  private validateConsistency(data: CommercialInvoiceProcessingResult, errors: ValidationError[], warnings: ValidationWarning[]): void {
    if (!this.rules.validateAmountConsistency || !data.header || !data.items) {
      return;
    }

    // Calculate total from items
    const itemsTotal = data.items.reduce((sum, item) => {
      const itemTotal = (item.totalPrice !== undefined) ? item.totalPrice : 
                       ((item.quantity || 0) * (item.unitPrice || 0));
      return sum + itemTotal;
    }, 0);

    // Compare with header total
    if (data.header.totalAmount !== undefined) {
      const tolerance = 0.01; // 1 cent tolerance
      const difference = Math.abs(data.header.totalAmount - itemsTotal);

      if (difference > tolerance) {
        DocumentValidator.addError(errors, 'consistency.totalAmount', 
          `Total do cabeçalho (${data.header.totalAmount}) não confere com soma dos itens (${itemsTotal.toFixed(2)})`, 
          'AMOUNT_TOTAL_MISMATCH');
      }
    }

    // Validate total weight consistency
    const itemsWeight = data.items.reduce((sum, item) => sum + (item.weight || 0), 0);
    if (data.header.totalWeight && itemsWeight > 0) {
      const weightTolerance = 0.1; // 100g tolerance
      const weightDifference = Math.abs(data.header.totalWeight - itemsWeight);

      if (weightDifference > weightTolerance) {
        DocumentValidator.addWarning(warnings, 'consistency.totalWeight', 
          `Peso total do cabeçalho (${data.header.totalWeight} kg) difere da soma dos itens (${itemsWeight.toFixed(2)} kg)`);
      }
    }

    // Check currency consistency
    if (data.header.currency) {
      const currencyMentions = data.items.filter(item => 
        item.description?.includes(data.header!.currency!) ||
        item.description?.includes('$') ||
        item.description?.includes('€') ||
        item.description?.includes('R$')
      );

      if (currencyMentions.length > 0 && currencyMentions.length !== data.items.length) {
        DocumentValidator.addWarning(warnings, 'consistency.currency', 
          'Moeda pode estar inconsistente entre itens');
      }
    }
  }

  /**
   * Parse date in DD/MM/YYYY format
   */
  private parseDate(dateString: string): Date {
    const [day, month, year] = dateString.split('/').map(Number);
    return new Date(year, month - 1, day);
  }

  /**
   * Validate specific invoice formats
   */
  validateInvoiceFormat(data: CommercialInvoiceProcessingResult): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!data.header) {
      return DocumentValidator.createValidationResult([{
        field: 'header',
        message: 'Cabeçalho ausente',
        code: 'MISSING_HEADER'
      }]);
    }

    // Check for common invoice format patterns
    const invoiceNumber = data.header.invoiceNumber;
    if (invoiceNumber) {
      // Check for common patterns
      const patterns = [
        { pattern: /^INV-\d+$/, name: 'INV-XXXXX' },
        { pattern: /^\d{4}-\d+$/, name: 'YYYY-XXXXX' },
        { pattern: /^[A-Z]{2,3}\d{6,}$/, name: 'LLNNNNNNN' }
      ];

      const matchesPattern = patterns.some(({ pattern }) => pattern.test(invoiceNumber));
      if (!matchesPattern && invoiceNumber.length > 15) {
        DocumentValidator.addWarning(warnings, 'header.invoiceNumber', 
          'Formato do número da invoice não segue padrões comuns',
          'Verifique se o número está correto');
      }
    }

    return DocumentValidator.createValidationResult(errors, warnings);
  }
}