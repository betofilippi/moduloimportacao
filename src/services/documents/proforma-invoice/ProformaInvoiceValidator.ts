import { DocumentValidator } from '../base/DocumentValidator';
import { ValidationResult, ValidationError, ValidationWarning } from '../base/types';
import { 
  ProformaInvoiceProcessingResult, 
  ProformaInvoiceValidationRules,
  ProformaInvoiceHeader,
  ProformaInvoiceItem
} from './types';

/**
 * Validator for Proforma Invoice documents
 */
export class ProformaInvoiceValidator extends DocumentValidator {
  constructor(private rules: ProformaInvoiceValidationRules) {
    super();
  }

  /**
   * Validate complete proforma invoice data
   */
  validate(data: ProformaInvoiceProcessingResult): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate header
    if (this.rules.requireHeader) {
      const headerValidation = this.validateHeader(data.header);
      errors.push(...headerValidation.errors);
      warnings.push(...headerValidation.warnings);
    }

    // Validate items
    if (this.rules.requireItems) {
      const itemsValidation = this.validateItems(data.items);
      errors.push(...itemsValidation.errors);
      warnings.push(...itemsValidation.warnings);
    }

    // Validate price consistency
    if (this.rules.validatePriceConsistency) {
      const priceValidation = this.validatePriceConsistency(data);
      errors.push(...priceValidation.errors);
      warnings.push(...priceValidation.warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate header data
   */
  private validateHeader(header: ProformaInvoiceHeader): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Required fields
    const requiredFields = [
      'contracted_company',
      'date',
      'load_port',
      'destination',
      'total_price'
    ];

    for (const field of requiredFields) {
      if (!header[field as keyof ProformaInvoiceHeader]) {
        errors.push({
          field,
          message: `Campo obrigatório não encontrado: ${field}`,
          code: 'MISSING_REQUIRED_FIELD'
        });
      }
    }

    // Validate email format
    if (this.rules.validateEmail && header.contracted_email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(header.contracted_email)) {
        errors.push({
          field: 'contracted_email',
          message: 'Formato de email inválido',
          code: 'INVALID_EMAIL_FORMAT'
        });
      }
    }

    // Validate date format (DD/MM/YYYY)
    if (this.rules.validateDateFormat && header.date) {
      const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
      if (!dateRegex.test(header.date)) {
        errors.push({
          field: 'date',
          message: 'Data deve estar no formato DD/MM/YYYY',
          code: 'INVALID_DATE_FORMAT'
        });
      } else {
        // Validate date is reasonable
        const [day, month, year] = header.date.split('/').map(Number);
        const date = new Date(year, month - 1, day);
        if (isNaN(date.getTime())) {
          errors.push({
            field: 'date',
            message: 'Data inválida',
            code: 'INVALID_DATE'
          });
        }
      }
    }

    // Validate total price
    if (header.total_price !== undefined) {
      if (typeof header.total_price !== 'number' || header.total_price < 0) {
        errors.push({
          field: 'total_price',
          message: 'Preço total deve ser um número positivo',
          code: 'INVALID_PRICE'
        });
      }
    }

    // Warnings
    if (!header.payment_terms) {
      warnings.push({
        field: 'payment_terms',
        message: 'Termos de pagamento não especificados',
        suggestion: 'Adicione os termos de pagamento para maior clareza'
      });
    }

    if (!header.package) {
      warnings.push({
        field: 'package',
        message: 'Tipo de embalagem não especificado',
        suggestion: 'Especifique o tipo de embalagem'
      });
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate items data
   */
  private validateItems(items: ProformaInvoiceItem[]): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check minimum items
    if (this.rules.minItems && items.length < this.rules.minItems) {
      errors.push({
        field: 'items',
        message: `Número mínimo de itens: ${this.rules.minItems}`,
        code: 'INSUFFICIENT_ITEMS'
      });
    }

    // Check maximum items
    if (this.rules.maxItems && items.length > this.rules.maxItems) {
      warnings.push({
        field: 'items',
        message: `Número de itens excede o máximo recomendado: ${this.rules.maxItems}`,
        suggestion: 'Considere dividir em múltiplas invoices'
      });
    }

    // Validate each item
    items.forEach((item, index) => {
      // Required fields
      if (!item.item) {
        errors.push({
          field: `items[${index}].item`,
          message: `Nome do item é obrigatório (item ${index + 1})`,
          code: 'MISSING_ITEM_NAME'
        });
      }

      if (item.quantity === undefined || item.quantity <= 0) {
        errors.push({
          field: `items[${index}].quantity`,
          message: `Quantidade deve ser maior que zero (item ${index + 1})`,
          code: 'INVALID_QUANTITY'
        });
      }

      if (item.unit_price === undefined || item.unit_price < 0) {
        errors.push({
          field: `items[${index}].unit_price`,
          message: `Preço unitário deve ser não-negativo (item ${index + 1})`,
          code: 'INVALID_UNIT_PRICE'
        });
      }

      // Validate item numbers sequence
      if (this.rules.validateItemNumbers) {
        if (item.item_number !== index + 1) {
          warnings.push({
            field: `items[${index}].item_number`,
            message: `Numeração de item fora de sequência (esperado ${index + 1}, encontrado ${item.item_number})`,
            suggestion: 'Renumere os itens sequencialmente'
          });
        }
      }

      // Warnings for missing descriptions
      if (!item.description_in_english) {
        warnings.push({
          field: `items[${index}].description_in_english`,
          message: `Descrição em inglês não fornecida (item ${index + 1})`,
          suggestion: 'Adicione descrição em inglês para clareza internacional'
        });
      }

      if (!item.specifications) {
        warnings.push({
          field: `items[${index}].specifications`,
          message: `Especificações não fornecidas (item ${index + 1})`,
          suggestion: 'Adicione especificações técnicas quando aplicável'
        });
      }
    });

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate price consistency between header and items
   */
  private validatePriceConsistency(data: ProformaInvoiceProcessingResult): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (data.header.total_price !== undefined && data.items.length > 0) {
      const calculatedTotal = data.items.reduce((sum, item) => {
        return sum + (item.quantity * item.unit_price);
      }, 0);

      const difference = Math.abs(data.header.total_price - calculatedTotal);
      const tolerance = 0.01; // Allow 1 cent difference for rounding

      if (difference > tolerance) {
        errors.push({
          field: 'total_price',
          message: `Total calculado (${calculatedTotal.toFixed(2)}) não corresponde ao total declarado (${data.header.total_price.toFixed(2)})`,
          code: 'PRICE_MISMATCH'
        });
      }
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate specific step data
   */
  validateStep(stepNumber: number, data: any): ValidationResult {
    switch (stepNumber) {
      case 1:
        // Validate header data
        return this.validateHeader(data as ProformaInvoiceHeader);
      
      case 2:
        // Validate items data
        return this.validateItems(data as ProformaInvoiceItem[]);
      
      default:
        return {
          isValid: false,
          errors: [{
            field: 'step',
            message: `Step ${stepNumber} não reconhecido`,
            code: 'INVALID_STEP'
          }],
          warnings: []
        };
    }
  }

  /**
   * Get validation summary
   */
  getValidationSummary(result: ValidationResult): string {
    const errorCount = result.errors.length;
    const warningCount = result.warnings.length;

    if (errorCount === 0 && warningCount === 0) {
      return 'Validação completa: Nenhum problema encontrado';
    }

    const parts = [];
    if (errorCount > 0) {
      parts.push(`${errorCount} erro${errorCount > 1 ? 's' : ''}`);
    }
    if (warningCount > 0) {
      parts.push(`${warningCount} aviso${warningCount > 1 ? 's' : ''}`);
    }

    return `Validação completa: ${parts.join(' e ')} encontrado${errorCount + warningCount > 1 ? 's' : ''}`;
  }
}