import { DocumentValidator } from '../base/DocumentValidator';
import { ValidationResult, ValidationError, ValidationWarning } from '../base/types';
import { BLProcessingResult } from './types';

export class BLValidator extends DocumentValidator {
  validate(data: BLProcessingResult): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    // Required header fields
    if (!data.header?.bl_number) {
      errors.push({
        field: 'bl_number',
        message: 'Número da BL é obrigatório',
        code: 'REQUIRED_FIELD'
      });
    }
    
    if (!data.header?.consignee) {
      errors.push({
        field: 'consignee',
        message: 'Importador é obrigatório',
        code: 'REQUIRED_FIELD'
      });
    }
    
    if (!data.header?.shipper) {
      errors.push({
        field: 'shipper',
        message: 'Exportador é obrigatório',
        code: 'REQUIRED_FIELD'
      });
    }
    
    // Port validations
    if (!data.header?.port_of_loading) {
      errors.push({
        field: 'port_of_loading',
        message: 'Porto de carregamento é obrigatório',
        code: 'REQUIRED_FIELD'
      });
    }
    
    if (!data.header?.port_of_discharge) {
      errors.push({
        field: 'port_of_discharge',
        message: 'Porto de descarga é obrigatório',
        code: 'REQUIRED_FIELD'
      });
    }
    
    // Date validations
    if (!data.header?.issue_date) {
      warnings.push({
        field: 'issue_date',
        message: 'Data de emissão não encontrada'
      });
    }
    
    // CNPJ validation
    if (data.header?.cnpj_consignee && !this.isValidCNPJ(data.header.cnpj_consignee)) {
      warnings.push({
        field: 'cnpj_consignee',
        message: 'CNPJ do importador parece inválido'
      });
    }
    
    // Container validations
    if (data.containers && data.containers.length > 0) {
      data.containers.forEach((container, index) => {
        if (!container.container_number) {
          errors.push({
            field: `containers[${index}].container_number`,
            message: `Número do container ${index + 1} é obrigatório`,
            code: 'REQUIRED_FIELD'
          });
        }
        
        if (!container.container_size) {
          warnings.push({
            field: `containers[${index}].container_size`,
            message: `Tamanho do container ${index + 1} não especificado`
          });
        }
      });
    } else {
      warnings.push({
        field: 'containers',
        message: 'Nenhum container encontrado na BL'
      });
    }
    
    // Freight value validations
    if (data.header?.freight_value_usd) {
      const freightValue = parseFloat(data.header.freight_value_usd.replace(/[^0-9.-]/g, ''));
      if (isNaN(freightValue) || freightValue < 0) {
        errors.push({
          field: 'freight_value_usd',
          message: 'Valor do frete em USD inválido',
          code: 'INVALID_VALUE'
        });
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  private isValidCNPJ(cnpj: string): boolean {
    // Remove non-numeric characters
    const cleaned = cnpj.replace(/[^\d]/g, '');
    return cleaned.length === 14;
  }
}