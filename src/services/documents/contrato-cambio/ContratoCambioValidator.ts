import { DocumentValidator } from '../base/DocumentValidator';
import { ValidationResult, ValidationError, ValidationWarning } from '../base/types';
import { ContratoCambioProcessingResult } from './types';

export class ContratoCambioValidator extends DocumentValidator {
  validate(data: ContratoCambioProcessingResult): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    const cambioData = data.data;
    
    // Required fields
    if (!cambioData?.contrato) {
      errors.push({
        field: 'contrato',
        message: 'Número do contrato é obrigatório',
        code: 'REQUIRED_FIELD'
      });
    }
    
    if (!cambioData?.data) {
      errors.push({
        field: 'data',
        message: 'Data do contrato é obrigatória',
        code: 'REQUIRED_FIELD'
      });
    } else if (!this.isValidDate(cambioData.data)) {
      errors.push({
        field: 'data',
        message: 'Data do contrato em formato inválido (esperado DD/MM/YYYY)',
        code: 'INVALID_FORMAT'
      });
    }
    
    if (!cambioData?.corretora) {
      errors.push({
        field: 'corretora',
        message: 'Corretora é obrigatória',
        code: 'REQUIRED_FIELD'
      });
    }
    
    if (!cambioData?.moeda) {
      errors.push({
        field: 'moeda',
        message: 'Moeda é obrigatória',
        code: 'REQUIRED_FIELD'
      });
    } else if (cambioData.moeda.length !== 3) {
      warnings.push({
        field: 'moeda',
        message: 'Código da moeda deve ter 3 caracteres'
      });
    }
    
    // Value validations
    if (!cambioData?.valor_estrangeiro) {
      errors.push({
        field: 'valor_estrangeiro',
        message: 'Valor em moeda estrangeira é obrigatório',
        code: 'REQUIRED_FIELD'
      });
    } else if (!this.isValidCurrencyFormat(cambioData.valor_estrangeiro, 'USD')) {
      warnings.push({
        field: 'valor_estrangeiro',
        message: 'Valor estrangeiro deve estar no formato USD XXX.XXX,XX'
      });
    }
    
    if (!cambioData?.taxa_cambial) {
      errors.push({
        field: 'taxa_cambial',
        message: 'Taxa de câmbio é obrigatória',
        code: 'REQUIRED_FIELD'
      });
    } else if (!this.isValidCurrencyFormat(cambioData.taxa_cambial, 'R$', true)) {
      warnings.push({
        field: 'taxa_cambial',
        message: 'Taxa de câmbio deve estar no formato R$ X,XXX'
      });
    }
    
    if (!cambioData?.valor_nacional) {
      errors.push({
        field: 'valor_nacional',
        message: 'Valor em reais é obrigatório',
        code: 'REQUIRED_FIELD'
      });
    } else if (!this.isValidCurrencyFormat(cambioData.valor_nacional, 'R$')) {
      warnings.push({
        field: 'valor_nacional',
        message: 'Valor nacional deve estar no formato R$ XXX.XXX,XX'
      });
    }
    
    // Invoice/fatura validation
    if (!cambioData?.fatura) {
      warnings.push({
        field: 'fatura',
        message: 'Número da fatura não encontrado'
      });
    }
    
    // Beneficiary information
    if (!cambioData?.recebedor) {
      errors.push({
        field: 'recebedor',
        message: 'Recebedor/pagador no exterior é obrigatório',
        code: 'REQUIRED_FIELD'
      });
    }
    
    if (!cambioData?.pais) {
      warnings.push({
        field: 'pais',
        message: 'País do recebedor não especificado'
      });
    }
    
    // Banking information
    if (!cambioData?.swift) {
      warnings.push({
        field: 'swift',
        message: 'Código SWIFT não encontrado'
      });
    } else if (!this.isValidSWIFT(cambioData.swift)) {
      warnings.push({
        field: 'swift',
        message: 'Código SWIFT parece inválido'
      });
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  private isValidDate(date: string): boolean {
    const regex = /^\d{2}\/\d{2}\/\d{4}$/;
    return regex.test(date);
  }
  
  private isValidCurrencyFormat(value: string, prefix: string, isRate: boolean = false): boolean {
    if (!value.startsWith(prefix)) return false;
    
    const numberPart = value.substring(prefix.length).trim();
    
    if (isRate) {
      // For exchange rates: R$ X,XXX
      const rateRegex = /^\d{1,2},\d{3}$/;
      return rateRegex.test(numberPart);
    } else {
      // For amounts: XXX.XXX,XX
      const amountRegex = /^\d{1,3}(\.\d{3})*,\d{2}$/;
      return amountRegex.test(numberPart);
    }
  }
  
  private isValidSWIFT(swift: string): boolean {
    // SWIFT codes are 8 or 11 characters
    return /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(swift);
  }
}