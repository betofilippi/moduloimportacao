import { DocumentValidator } from '../base/DocumentValidator';
import { ValidationResult, ValidationError } from '../base/types';
import { NotaFiscalProcessingResult } from './types';

export class NotaFiscalValidator extends DocumentValidator {
  validate(data: NotaFiscalProcessingResult): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    
    // Validate header
    if (!data.header) {
      errors.push({
        field: 'header',
        message: 'Cabeçalho da Nota Fiscal não encontrado',
        severity: 'error'
      });
      return { isValid: false, errors, warnings };
    }
    
    // Required header fields validation
    const requiredHeaderFields = [
      { field: 'numero_nf', label: 'Número da NF-e' },
      { field: 'serie', label: 'Série' },
      { field: 'data_emissao', label: 'Data de Emissão' },
      { field: 'chave_acesso', label: 'Chave de Acesso' },
      { field: 'emitente_razao_social', label: 'Razão Social do Emitente' },
      { field: 'destinatario_razao_social', label: 'Razão Social do Destinatário' },
      { field: 'valor_total_nota', label: 'Valor Total da Nota' }
    ];
    
    for (const { field, label } of requiredHeaderFields) {
      if (!data.header[field as keyof typeof data.header]) {
        errors.push({
          field,
          message: `${label} é obrigatório`,
          severity: 'error'
        });
      }
    }
    
    // Validate chave_acesso format (44 digits)
    if (data.header.chave_acesso) {
      const chaveOnly = data.header.chave_acesso.replace(/\D/g, '');
      if (chaveOnly.length !== 44) {
        errors.push({
          field: 'chave_acesso',
          message: 'Chave de acesso deve ter 44 dígitos',
          severity: 'error'
        });
      }
    }
    
    // Validate date format (DD/MM/YYYY)
    if (data.header.data_emissao) {
      const datePattern = /^\d{2}\/\d{2}\/\d{4}$/;
      if (!datePattern.test(data.header.data_emissao)) {
        warnings.push({
          field: 'data_emissao',
          message: 'Data de emissão deve estar no formato DD/MM/YYYY',
          severity: 'warning'
        });
      }
    }
    
    // Validate monetary values
    const monetaryFields = [
      'valor_total_produtos',
      'valor_total_nota',
      'base_calculo_icms',
      'valor_icms',
      'valor_total_ipi'
    ];
    
    for (const field of monetaryFields) {
      const value = data.header[field as keyof typeof data.header];
      if (value && !this.isValidMonetaryValue(value)) {
        warnings.push({
          field,
          message: `${field} deve ser um valor monetário válido`,
          severity: 'warning'
        });
      }
    }
    
    // Validate items
    if (!data.items || data.items.length === 0) {
      warnings.push({
        field: 'items',
        message: 'Nenhum item encontrado na Nota Fiscal',
        severity: 'warning'
      });
    } else {
      // Validate each item
      data.items.forEach((item, index) => {
        const itemPrefix = `Item ${index + 1}`;
        
        // Required item fields
        const requiredItemFields = [
          { field: 'codigo_produto', label: 'Código do Produto' },
          { field: 'descricao_produto', label: 'Descrição do Produto' },
          { field: 'quantidade', label: 'Quantidade' },
          { field: 'valor_unitario', label: 'Valor Unitário' },
          { field: 'valor_total_produto', label: 'Valor Total do Produto' }
        ];
        
        for (const { field, label } of requiredItemFields) {
          if (!item[field as keyof typeof item]) {
            errors.push({
              field: `items[${index}].${field}`,
              message: `${itemPrefix}: ${label} é obrigatório`,
              severity: 'error'
            });
          }
        }
        
        // Validate NCM (8 digits)
        if (item.ncm_sh) {
          const ncmOnly = item.ncm_sh.replace(/\D/g, '');
          if (ncmOnly.length !== 8) {
            warnings.push({
              field: `items[${index}].ncm_sh`,
              message: `${itemPrefix}: NCM deve ter 8 dígitos`,
              severity: 'warning'
            });
          }
        }
        
        // Validate CFOP (4 digits)
        if (item.cfop) {
          const cfopOnly = item.cfop.replace(/\D/g, '');
          if (cfopOnly.length !== 4) {
            warnings.push({
              field: `items[${index}].cfop`,
              message: `${itemPrefix}: CFOP deve ter 4 dígitos`,
              severity: 'warning'
            });
          }
        }
        
        // Validate quantity and values
        if (item.quantidade && !this.isValidNumber(item.quantidade)) {
          warnings.push({
            field: `items[${index}].quantidade`,
            message: `${itemPrefix}: Quantidade deve ser um número válido`,
            severity: 'warning'
          });
        }
        
        if (item.valor_unitario && !this.isValidMonetaryValue(item.valor_unitario)) {
          warnings.push({
            field: `items[${index}].valor_unitario`,
            message: `${itemPrefix}: Valor unitário deve ser um valor monetário válido`,
            severity: 'warning'
          });
        }
        
        if (item.valor_total_produto && !this.isValidMonetaryValue(item.valor_total_produto)) {
          warnings.push({
            field: `items[${index}].valor_total_produto`,
            message: `${itemPrefix}: Valor total deve ser um valor monetário válido`,
            severity: 'warning'
          });
        }
      });
    }
    
    // Cross-validation: check if total values match
    if (data.header.valor_total_nota && data.items.length > 0) {
      const totalItemsValue = data.items.reduce((sum, item) => {
        const itemValue = this.parseMonetaryValue(item.valor_total_produto);
        return sum + itemValue;
      }, 0);
      
      const notaTotal = this.parseMonetaryValue(data.header.valor_total_nota);
      const diff = Math.abs(totalItemsValue - notaTotal);
      
      // Allow small differences due to rounding
      if (diff > 0.01) {
        warnings.push({
          field: 'valor_total_nota',
          message: 'Valor total da nota não confere com a soma dos itens',
          severity: 'warning'
        });
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  private isValidMonetaryValue(value: string): boolean {
    // Brazilian monetary format: 1.234.567,89 or 1234567,89
    const pattern = /^\d{1,3}(\.\d{3})*,\d{2}$|^\d+,\d{2}$/;
    return pattern.test(value);
  }
  
  private isValidNumber(value: string): boolean {
    // Number format: 1234,5678 or 1.234,5678
    const pattern = /^\d{1,3}(\.\d{3})*,\d+$|^\d+,\d+$/;
    return pattern.test(value);
  }
  
  private parseMonetaryValue(value: string): number {
    if (!value) return 0;
    // Remove dots and replace comma with dot
    const cleaned = value.replace(/\./g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  }
}