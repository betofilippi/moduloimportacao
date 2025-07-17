import { DocumentValidator } from '../base/DocumentValidator';
import { ValidationResult, ValidationError, ValidationWarning } from '../base/types';
import { 
  SwiftProcessingResult, 
  SwiftValidationRules,
  SwiftData,
  SwiftMessageType,
  SwiftChargeType
} from './types';

/**
 * Validator for Swift documents
 */
export class SwiftValidator extends DocumentValidator {
  constructor(private rules: SwiftValidationRules) {
    super();
  }

  /**
   * Validate complete Swift data
   */
  validate(data: SwiftProcessingResult): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!data.swiftData) {
      errors.push({
        field: 'swiftData',
        message: 'Dados Swift não encontrados',
        code: 'MISSING_SWIFT_DATA'
      });
      return { isValid: false, errors, warnings };
    }

    const swiftData = data.swiftData;

    // Validate message type
    if (this.rules.validateMessageType) {
      const messageValidation = this.validateMessageType(swiftData.message_type);
      errors.push(...messageValidation.errors);
      warnings.push(...messageValidation.warnings);
    }

    // Validate BIC codes
    if (this.rules.validateBICFormat) {
      const bicValidation = this.validateBICCodes(swiftData);
      errors.push(...bicValidation.errors);
      warnings.push(...bicValidation.warnings);
    }

    // Validate date format
    if (this.rules.validateDateFormat) {
      const dateValidation = this.validateDateFormat(swiftData.value_date);
      errors.push(...dateValidation.errors);
      warnings.push(...dateValidation.warnings);
    }

    // Validate amount
    if (this.rules.validateAmount) {
      const amountValidation = this.validateAmount(swiftData.amount, swiftData.currency);
      errors.push(...amountValidation.errors);
      warnings.push(...amountValidation.warnings);
    }

    // Validate UETR
    if (this.rules.validateUETR) {
      const uetrValidation = this.validateUETR(swiftData.uetr);
      errors.push(...uetrValidation.errors);
      warnings.push(...uetrValidation.warnings);
    }

    // Validate required fields
    if (this.rules.requireAllFields) {
      const requiredValidation = this.validateRequiredFields(swiftData);
      errors.push(...requiredValidation.errors);
      warnings.push(...requiredValidation.warnings);
    }

    // Additional validations
    const additionalValidation = this.performAdditionalValidations(swiftData);
    errors.push(...additionalValidation.errors);
    warnings.push(...additionalValidation.warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate message type
   */
  private validateMessageType(messageType: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!messageType || messageType === 'UNKNOWN') {
      warnings.push({
        field: 'message_type',
        message: 'Tipo de mensagem SWIFT não identificado',
        suggestion: 'Verifique se o documento é uma mensagem SWIFT válida'
      });
    } else if (!Object.values(SwiftMessageType).includes(messageType as SwiftMessageType)) {
      warnings.push({
        field: 'message_type',
        message: `Tipo de mensagem SWIFT não reconhecido: ${messageType}`,
        suggestion: 'Tipos comuns: FIN 103, FIN 202, FIN 900, FIN 910'
      });
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate BIC codes
   */
  private validateBICCodes(data: SwiftData): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const validateBIC = (bic: string, field: string): void => {
      if (!bic) {
        warnings.push({
          field,
          message: `BIC não encontrado para ${field}`,
          suggestion: 'BIC deve ter 8 ou 11 caracteres'
        });
        return;
      }

      // BIC format: 4 letters (bank) + 2 letters (country) + 2 letters/digits (location) + optional 3 letters/digits (branch)
      const bicRegex = /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/;
      if (!bicRegex.test(bic)) {
        errors.push({
          field,
          message: `Formato BIC inválido: ${bic}`,
          code: 'INVALID_BIC_FORMAT'
        });
      }
    };

    // Validate all BIC codes
    if (data.ordering_institution.bic) {
      validateBIC(data.ordering_institution.bic, 'ordering_institution.bic');
    }
    if (data.account_with_institution_bic) {
      validateBIC(data.account_with_institution_bic, 'account_with_institution_bic');
    }
    if (data.receiver_institution.bic) {
      validateBIC(data.receiver_institution.bic, 'receiver_institution.bic');
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate date format (DD/MM/YYYY)
   */
  private validateDateFormat(date: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!date) {
      errors.push({
        field: 'value_date',
        message: 'Data de valor não encontrada',
        code: 'MISSING_VALUE_DATE'
      });
      return { isValid: false, errors, warnings };
    }

    const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!dateRegex.test(date)) {
      errors.push({
        field: 'value_date',
        message: 'Data deve estar no formato DD/MM/YYYY',
        code: 'INVALID_DATE_FORMAT'
      });
    } else {
      // Validate date is reasonable
      const [day, month, year] = date.split('/').map(Number);
      const dateObj = new Date(year, month - 1, day);
      
      if (isNaN(dateObj.getTime())) {
        errors.push({
          field: 'value_date',
          message: 'Data inválida',
          code: 'INVALID_DATE'
        });
      } else {
        // Check if date is in reasonable range (not too far in past or future)
        const now = new Date();
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(now.getFullYear() - 1);
        const oneYearAhead = new Date();
        oneYearAhead.setFullYear(now.getFullYear() + 1);

        if (dateObj < oneYearAgo || dateObj > oneYearAhead) {
          warnings.push({
            field: 'value_date',
            message: 'Data parece estar fora do intervalo esperado',
            suggestion: 'Verifique se a data está correta'
          });
        }
      }
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate amount and currency
   */
  private validateAmount(amount: number, currency: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (amount === undefined || amount === null) {
      errors.push({
        field: 'amount',
        message: 'Valor não encontrado',
        code: 'MISSING_AMOUNT'
      });
    } else if (amount < 0) {
      errors.push({
        field: 'amount',
        message: 'Valor não pode ser negativo',
        code: 'NEGATIVE_AMOUNT'
      });
    } else if (amount === 0) {
      warnings.push({
        field: 'amount',
        message: 'Valor igual a zero',
        suggestion: 'Verifique se o valor está correto'
      });
    }

    if (!currency) {
      errors.push({
        field: 'currency',
        message: 'Moeda não especificada',
        code: 'MISSING_CURRENCY'
      });
    } else if (!/^[A-Z]{3}$/.test(currency)) {
      errors.push({
        field: 'currency',
        message: `Formato de moeda inválido: ${currency}`,
        code: 'INVALID_CURRENCY_FORMAT'
      });
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate UETR (Unique End-to-end Transaction Reference)
   */
  private validateUETR(uetr: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!uetr) {
      warnings.push({
        field: 'uetr',
        message: 'UETR não encontrado',
        suggestion: 'UETR é importante para rastreamento da transação'
      });
    } else {
      // UETR should be a valid UUID v4
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(uetr)) {
        errors.push({
          field: 'uetr',
          message: 'Formato UETR inválido (deve ser UUID v4)',
          code: 'INVALID_UETR_FORMAT'
        });
      }
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate required fields
   */
  private validateRequiredFields(data: SwiftData): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const requiredFields = [
      'senders_reference',
      'value_date',
      'currency',
      'amount',
      'ordering_customer.name',
      'beneficiary.name',
      'beneficiary.account'
    ];

    for (const fieldPath of requiredFields) {
      const value = this.getNestedValue(data, fieldPath);
      if (!value || (typeof value === 'number' && value === 0)) {
        errors.push({
          field: fieldPath,
          message: `Campo obrigatório não encontrado: ${fieldPath}`,
          code: 'MISSING_REQUIRED_FIELD'
        });
      }
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Perform additional validations
   */
  private performAdditionalValidations(data: SwiftData): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate details of charges
    if (data.details_of_charges) {
      if (!Object.values(SwiftChargeType).includes(data.details_of_charges as SwiftChargeType)) {
        warnings.push({
          field: 'details_of_charges',
          message: `Tipo de cobrança não reconhecido: ${data.details_of_charges}`,
          suggestion: 'Valores válidos: OUR, SHA, BEN'
        });
      }
    }

    // Validate beneficiary account (only numbers)
    if (data.beneficiary.account && /\D/.test(data.beneficiary.account)) {
      errors.push({
        field: 'beneficiary.account',
        message: 'Conta do beneficiário deve conter apenas números',
        code: 'INVALID_ACCOUNT_FORMAT'
      });
    }

    // Check if invoice number was extracted
    if (!data.fatura) {
      warnings.push({
        field: 'fatura',
        message: 'Número da fatura não encontrado',
        suggestion: 'Verifique se há referência de fatura no campo de informações de remessa'
      });
    }

    // Validate bank operation code
    if (!data.bank_operation_code) {
      warnings.push({
        field: 'bank_operation_code',
        message: 'Código de operação bancária não encontrado',
        suggestion: 'Código comum: CRED'
      });
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
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