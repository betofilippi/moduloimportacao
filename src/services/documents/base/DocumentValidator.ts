import { ValidationResult, ValidationError, ValidationWarning, DocumentType } from './types';

/**
 * Common validation utilities for all document types
 */
export class DocumentValidator {
  /**
   * Validate email format
   */
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  validateEmail(email: string): boolean {
    return DocumentValidator.validateEmail(email);
  }

  /**
   * Validate date format (DD/MM/YYYY)
   */
  static validateDateFormat(date: string): boolean {
    const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!dateRegex.test(date)) {
      return false;
    }

    const [day, month, year] = date.split('/').map(Number);
    const dateObj = new Date(year, month - 1, day);
    
    return dateObj.getDate() === day &&
           dateObj.getMonth() === month - 1 &&
           dateObj.getFullYear() === year;
  }

  validateDate(date: string): boolean {
    return DocumentValidator.validateDateFormat(date);
  }

  /**
   * Validate numeric value
   */
  static validateNumeric(value: any, options: {
    min?: number;
    max?: number;
    allowDecimals?: boolean;
  } = {}): boolean {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    
    if (isNaN(num)) {
      return false;
    }

    if (!options.allowDecimals && num % 1 !== 0) {
      return false;
    }

    if (options.min !== undefined && num < options.min) {
      return false;
    }

    if (options.max !== undefined && num > options.max) {
      return false;
    }

    return true;
  }

  /**
   * Validate CNPJ format
   */
  static validateCNPJ(cnpj: string): boolean {
    const cleanCNPJ = cnpj.replace(/[^\d]/g, '');
    
    if (cleanCNPJ.length !== 14) {
      return false;
    }

    // Check if all digits are the same
    if (/^(\d)\1+$/.test(cleanCNPJ)) {
      return false;
    }

    // CNPJ validation algorithm
    let sum = 0;
    let weight = 2;
    
    for (let i = 11; i >= 0; i--) {
      sum += parseInt(cleanCNPJ[i]) * weight;
      weight = weight === 9 ? 2 : weight + 1;
    }
    
    const digit1 = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    
    if (parseInt(cleanCNPJ[12]) !== digit1) {
      return false;
    }
    
    sum = 0;
    weight = 2;
    
    for (let i = 12; i >= 0; i--) {
      sum += parseInt(cleanCNPJ[i]) * weight;
      weight = weight === 9 ? 2 : weight + 1;
    }
    
    const digit2 = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    
    return parseInt(cleanCNPJ[13]) === digit2;
  }

  /**
   * Validate currency format
   */
  static validateCurrency(amount: string | number): boolean {
    if (typeof amount === 'number') {
      return amount >= 0;
    }

    const cleanAmount = amount.replace(/[^\d.,]/g, '');
    const num = parseFloat(cleanAmount.replace(',', '.'));
    
    return !isNaN(num) && num >= 0;
  }

  /**
   * Validate container number format
   */
  static validateContainerNumber(containerNumber: string): boolean {
    // Standard container format: 4 letters + 7 digits
    const containerRegex = /^[A-Z]{4}\d{7}$/;
    return containerRegex.test(containerNumber.toUpperCase());
  }

  /**
   * Validate NCM/HS code format
   */
  static validateNCMCode(ncm: string): boolean {
    // NCM: 8 digits, HS: 6 digits
    const ncmRegex = /^\d{6,8}$/;
    return ncmRegex.test(ncm);
  }

  /**
   * Validate DI number format
   */
  static validateDINumber(diNumber: string): boolean {
    // DI format: YY/NNNNNNN-D (e.g., 24/2645116-4)
    const diRegex = /^\d{2}\/\d{7}-\d$/;
    return diRegex.test(diNumber);
  }

  /**
   * Validate CPF format
   */
  static validateCPF(cpf: string): boolean {
    const cleanCPF = cpf.replace(/[^\d]/g, '');
    
    if (cleanCPF.length !== 11) {
      return false;
    }

    // Check if all digits are the same
    if (/^(\d)\1+$/.test(cleanCPF)) {
      return false;
    }

    // CPF validation algorithm
    let sum = 0;
    let remainder;

    for (let i = 1; i <= 9; i++) {
      sum = sum + parseInt(cleanCPF.substring(i - 1, i)) * (11 - i);
    }
    
    remainder = (sum * 10) % 11;
    if ((remainder === 10) || (remainder === 11)) remainder = 0;
    if (remainder !== parseInt(cleanCPF.substring(9, 10))) return false;

    sum = 0;
    for (let i = 1; i <= 10; i++) {
      sum = sum + parseInt(cleanCPF.substring(i - 1, i)) * (12 - i);
    }
    
    remainder = (sum * 10) % 11;
    if ((remainder === 10) || (remainder === 11)) remainder = 0;
    if (remainder !== parseInt(cleanCPF.substring(10, 11))) return false;

    return true;
  }

  // Instance methods for convenience
  validateNumeric(value: any, options?: any): boolean {
    return DocumentValidator.validateNumeric(value, options);
  }

  validateCNPJ(cnpj: string): boolean {
    return DocumentValidator.validateCNPJ(cnpj);
  }

  validateNCM(ncm: string): boolean {
    return DocumentValidator.validateNCMCode(ncm);
  }

  validateDINumber(diNumber: string): boolean {
    return DocumentValidator.validateDINumber(diNumber);
  }

  validateCPF(cpf: string): boolean {
    return DocumentValidator.validateCPF(cpf);
  }

  /**
   * Create validation result
   */
  static createValidationResult(
    errors: ValidationError[] = [],
    warnings: ValidationWarning[] = []
  ): ValidationResult {
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Add validation error
   */
  static addError(
    errors: ValidationError[],
    field: string,
    message: string,
    code: string
  ): void {
    errors.push({ field, message, code });
  }

  /**
   * Add validation warning
   */
  static addWarning(
    warnings: ValidationWarning[],
    field: string,
    message: string,
    suggestion?: string
  ): void {
    warnings.push({ field, message, suggestion });
  }

  /**
   * Validate array of items with consistent structure
   */
  static validateItemsConsistency<T>(
    items: T[],
    requiredFields: (keyof T)[],
    documentType: DocumentType
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!Array.isArray(items) || items.length === 0) {
      this.addError(errors, 'items', 'Lista de itens está vazia ou inválida', 'EMPTY_ITEMS');
      return this.createValidationResult(errors, warnings);
    }

    // Check each item for required fields
    items.forEach((item, index) => {
      requiredFields.forEach(field => {
        const value = item[field];
        if (value === null || value === undefined || value === '') {
          this.addError(
            errors,
            `items[${index}].${String(field)}`,
            `Campo obrigatório ausente no item ${index + 1}: ${String(field)}`,
            'MISSING_ITEM_FIELD'
          );
        }
      });
    });

    // Document-specific validations
    if (documentType === DocumentType.PACKING_LIST) {
      this.validatePackingListItems(items as any[], errors, warnings);
    }

    return this.createValidationResult(errors, warnings);
  }

  /**
   * Specific validation for packing list items
   */
  private static validatePackingListItems(
    items: any[],
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    let totalPackages = 0;
    let totalWeight = 0;

    items.forEach((item, index) => {
      // Validate quantities
      if (item.quantidade_de_pacotes && !this.validateNumeric(item.quantidade_de_pacotes, { min: 0 })) {
        this.addError(
          errors,
          `items[${index}].quantidade_de_pacotes`,
          `Quantidade de pacotes inválida no item ${index + 1}`,
          'INVALID_PACKAGE_QUANTITY'
        );
      }

      if (item.peso_bruto_total && !this.validateNumeric(item.peso_bruto_total, { min: 0, allowDecimals: true })) {
        this.addError(
          errors,
          `items[${index}].peso_bruto_total`,
          `Peso bruto total inválido no item ${index + 1}`,
          'INVALID_WEIGHT'
        );
      }

      // Accumulate totals for summary validation
      if (item.quantidade_de_pacotes) {
        totalPackages += Number(item.quantidade_de_pacotes);
      }
      
      if (item.peso_bruto_total) {
        totalWeight += Number(item.peso_bruto_total);
      }

      // Check for missing descriptions
      if (!item.descricao_ingles && !item.descricao_chines) {
        this.addWarning(
          warnings,
          `items[${index}].descricao`,
          `Item ${index + 1} não possui descrição em inglês ou chinês`,
          'Adicione uma descrição para facilitar a identificação'
        );
      }
    });

    // Summary validations can be added here
    if (totalPackages === 0) {
      this.addWarning(
        warnings,
        'summary.packages',
        'Total de pacotes é zero, verifique se os dados foram extraídos corretamente'
      );
    }

    if (totalWeight === 0) {
      this.addWarning(
        warnings,
        'summary.weight',
        'Peso total é zero, verifique se os dados foram extraídos corretamente'
      );
    }
  }

  /**
   * Validate data consistency between related fields
   */
  static validateDataConsistency(data: any, documentType: DocumentType): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    switch (documentType) {
      case DocumentType.PACKING_LIST:
        this.validatePackingListConsistency(data, errors, warnings);
        break;
      case DocumentType.COMMERCIAL_INVOICE:
        this.validateInvoiceConsistency(data, errors, warnings);
        break;
      // Add other document types as needed
    }

    return this.createValidationResult(errors, warnings);
  }

  private static validatePackingListConsistency(
    data: any,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    // Check if header totals match item sums
    if (data.header && data.items_por_container) {
      const itemsTotal = data.items_por_container.reduce((sum: number, item: any) => 
        sum + (Number(item.quantidade_de_pacotes) || 0), 0
      );

      if (data.header.quantidade_de_pacotes && itemsTotal !== data.header.quantidade_de_pacotes) {
        this.addError(
          errors,
          'consistency.packages',
          `Total de pacotes no cabeçalho (${data.header.quantidade_de_pacotes}) não confere com soma dos itens (${itemsTotal})`,
          'PACKAGE_TOTAL_MISMATCH'
        );
      }
    }
  }

  private static validateInvoiceConsistency(
    data: any,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    // Add invoice-specific consistency checks
    if (data.items && data.totalAmount) {
      const itemsTotal = data.items.reduce((sum: number, item: any) => 
        sum + (Number(item.totalPrice) || 0), 0
      );

      const tolerance = 0.01; // 1 cent tolerance for rounding
      if (Math.abs(itemsTotal - Number(data.totalAmount)) > tolerance) {
        this.addError(
          errors,
          'consistency.amount',
          `Valor total (${data.totalAmount}) não confere com soma dos itens (${itemsTotal})`,
          'AMOUNT_TOTAL_MISMATCH'
        );
      }
    }
  }
}