// DI (Declaração de Importação) document validator
import { ValidationResult, ValidationError, ValidationWarning } from '../base/types';
import { DocumentValidator } from '../base/DocumentValidator';
import { DIProcessingResult, diValidationRules } from './types';

export class DIValidator {
  private validator: DocumentValidator;

  constructor() {
    this.validator = new DocumentValidator();
  }

  validate(data: DIProcessingResult): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate header
    if (!data.header) {
      errors.push({
        field: 'header',
        message: 'Dados gerais da DI não encontrados',
        code: 'MISSING_HEADER'
      });
    } else {
      this.validateHeader(data.header, errors, warnings);
    }

    // Validate items
    if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
      errors.push({
        field: 'items',
        message: 'Nenhum item encontrado na DI',
        code: 'MISSING_ITEMS'
      });
    } else {
      this.validateItems(data.items, errors, warnings);
    }

    // Validate tax info
    if (!data.taxInfo || !Array.isArray(data.taxInfo) || data.taxInfo.length === 0) {
      warnings.push({
        field: 'taxInfo',
        message: 'Informações tributárias não encontradas',
        suggestion: 'Verifique se o processamento tributário foi concluído'
      });
    } else {
      this.validateTaxInfo(data.taxInfo, data.items, errors, warnings);
    }

    // Cross-validation
    if (data.header && data.items && data.taxInfo) {
      this.crossValidate(data, errors, warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private validateHeader(header: any, errors: ValidationError[], warnings: ValidationWarning[]) {
    // Check required fields
    diValidationRules.requiredHeaderFields.forEach(field => {
      if (!header[field]) {
        errors.push({
          field: `header.${field}`,
          message: `Campo obrigatório ausente: ${field}`,
          code: 'REQUIRED_FIELD'
        });
      }
    });

    // Validate DI number format
    if (header.numero_DI && !this.validator.validateDINumber(header.numero_DI)) {
      errors.push({
        field: 'header.numero_DI',
        message: 'Formato inválido de número da DI',
        code: 'INVALID_DI_NUMBER'
      });
    }

    // Validate dates
    diValidationRules.dateFields.forEach(field => {
      if (header[field] && !this.validator.validateDate(header[field])) {
        errors.push({
          field: `header.${field}`,
          message: `Data inválida: ${field}`,
          code: 'INVALID_DATE'
        });
      }
    });

    // Validate CNPJ fields
    diValidationRules.cnpjFields.forEach(field => {
      if (header[field] && !this.validator.validateCNPJ(header[field])) {
        errors.push({
          field: `header.${field}`,
          message: `CNPJ inválido: ${field}`,
          code: 'INVALID_CNPJ'
        });
      }
    });

    // Validate CPF
    if (header.representante_legal_CPF && !this.validator.validateCPF(header.representante_legal_CPF)) {
      errors.push({
        field: 'header.representante_legal_CPF',
        message: 'CPF do representante legal inválido',
        code: 'INVALID_CPF'
      });
    }

    // Validate numeric fields
    const headerNumericFields = diValidationRules.numericFields.filter(field => 
      field in header && !field.includes('.')
    );
    
    headerNumericFields.forEach(field => {
      if (header[field] && !this.validator.validateNumeric(header[field])) {
        warnings.push({
          field: `header.${field}`,
          message: `Valor numérico inválido: ${field}`,
          suggestion: 'Verifique se o valor está no formato correto'
        });
      }
    });

    // Validate exchange rate
    if (header.taxa_dolar) {
      const rate = parseFloat(header.taxa_dolar);
      if (isNaN(rate) || rate <= 0 || rate > 100) {
        warnings.push({
          field: 'header.taxa_dolar',
          message: 'Taxa de câmbio fora do intervalo esperado',
          suggestion: 'Verifique se a taxa do dólar está correta'
        });
      }
    }
  }

  private validateItems(items: any[], errors: ValidationError[], warnings: ValidationWarning[]) {
    const itemCodes = new Set<string>();
    
    items.forEach((item, index) => {
      // Check required fields
      diValidationRules.requiredItemFields.forEach(field => {
        if (!item[field]) {
          errors.push({
            field: `items[${index}].${field}`,
            message: `Campo obrigatório ausente no item ${index + 1}: ${field}`,
            code: 'REQUIRED_FIELD'
          });
        }
      });

      // Validate NCM code
      if (item.ncm_completa && !this.validator.validateNCM(item.ncm_completa)) {
        errors.push({
          field: `items[${index}].ncm_completa`,
          message: `NCM inválido no item ${index + 1}`,
          code: 'INVALID_NCM'
        });
      }

      // Check for duplicate item codes within same addition
      const itemKey = `${item.numero_adicao}-${item.codigo_item}`;
      if (itemCodes.has(itemKey)) {
        warnings.push({
          field: `items[${index}].codigo_item`,
          message: `Código de item duplicado na mesma adição: ${item.codigo_item}`,
          suggestion: 'Verifique se os itens foram extraídos corretamente'
        });
      }
      itemCodes.add(itemKey);

      // Validate numeric values
      const itemNumericFields = ['quantidade_produto', 'valor_unitario_produto_usd', 'valor_total_item_usd'];
      itemNumericFields.forEach(field => {
        if (item[field] && !this.validator.validateNumeric(item[field])) {
          errors.push({
            field: `items[${index}].${field}`,
            message: `Valor numérico inválido no item ${index + 1}: ${field}`,
            code: 'INVALID_NUMERIC'
          });
        }
      });

      // Validate calculated total
      if (item.quantidade_produto && item.valor_unitario_produto_usd && item.valor_total_item_usd) {
        const qty = parseFloat(item.quantidade_produto);
        const unitPrice = parseFloat(item.valor_unitario_produto_usd);
        const total = parseFloat(item.valor_total_item_usd);
        const expectedTotal = qty * unitPrice;
        
        if (Math.abs(total - expectedTotal) > 0.01) {
          warnings.push({
            field: `items[${index}].valor_total_item_usd`,
            message: `Valor total calculado não confere: esperado ${expectedTotal.toFixed(2)}, encontrado ${total.toFixed(2)}`,
            suggestion: 'Verifique os valores de quantidade e preço unitário'
          });
        }
      }
    });
  }

  private validateTaxInfo(taxInfo: any[], items: any[], errors: ValidationError[], warnings: ValidationWarning[]) {
    taxInfo.forEach((tax, index) => {
      // Check required fields
      diValidationRules.requiredTaxFields.forEach(field => {
        if (!tax[field]) {
          errors.push({
            field: `taxInfo[${index}].${field}`,
            message: `Campo obrigatório ausente nas informações tributárias ${index + 1}: ${field}`,
            code: 'REQUIRED_FIELD'
          });
        }
      });

      // Validate tax rates
      const taxRates = [
        { field: 'aliquota_ii_percentual', min: 0, max: 100 },
        { field: 'aliquota_ipi_percentual', min: 0, max: 100 },
        { field: 'aliquota_pis_percentual', min: 0, max: 10 },
        { field: 'aliquota_cofins_percentual', min: 0, max: 15 }
      ];

      taxRates.forEach(({ field, min, max }) => {
        if (tax[field]) {
          const rate = parseFloat(tax[field]);
          if (isNaN(rate) || rate < min || rate > max) {
            warnings.push({
              field: `taxInfo[${index}].${field}`,
              message: `Alíquota fora do intervalo esperado (${min}%-${max}%): ${rate}%`,
              suggestion: 'Verifique se a alíquota está correta'
            });
          }
        }
      });

      // Check if tax item exists in items list
      const matchingItem = items.find(item => 
        item.codigo_item === tax.codigo_item && 
        item.numero_adicao === tax.numero_adicao
      );
      
      if (!matchingItem) {
        warnings.push({
          field: `taxInfo[${index}].codigo_item`,
          message: `Item não encontrado na lista de itens: ${tax.codigo_item} (Adição ${tax.numero_adicao})`,
          suggestion: 'Verifique se os códigos de item correspondem entre as etapas'
        });
      }

      // Validate calculated total taxes
      if (tax.valor_ii_recolhido && tax.valor_ipi_recolhido && 
          tax.valor_pis_recolhido && tax.valor_cofins_recolhido && 
          tax.valor_total_tributos) {
        
        const ii = parseFloat(tax.valor_ii_recolhido) || 0;
        const ipi = parseFloat(tax.valor_ipi_recolhido) || 0;
        const pis = parseFloat(tax.valor_pis_recolhido) || 0;
        const cofins = parseFloat(tax.valor_cofins_recolhido) || 0;
        const expectedTotal = ii + ipi + pis + cofins;
        const actualTotal = parseFloat(tax.valor_total_tributos);
        
        if (Math.abs(actualTotal - expectedTotal) > 0.01) {
          warnings.push({
            field: `taxInfo[${index}].valor_total_tributos`,
            message: `Total de tributos não confere: esperado ${expectedTotal.toFixed(2)}, encontrado ${actualTotal.toFixed(2)}`,
            suggestion: 'Verifique os valores individuais dos tributos'
          });
        }
      }
    });
  }

  private crossValidate(data: DIProcessingResult, errors: ValidationError[], warnings: ValidationWarning[]) {
    const { header, items, taxInfo } = data;

    // Validate total additions count
    if (header.quantidade_total_adicoes) {
      const expectedAdditions = parseInt(header.quantidade_total_adicoes);
      const uniqueAdditions = new Set(items.map(item => item.numero_adicao)).size;
      
      if (uniqueAdditions !== expectedAdditions) {
        warnings.push({
          field: 'header.quantidade_total_adicoes',
          message: `Número de adições não confere: esperado ${expectedAdditions}, encontrado ${uniqueAdditions}`,
          suggestion: 'Verifique se todas as adições foram processadas'
        });
      }
    }

    // Validate items count matches between items and tax info
    if (items.length !== taxInfo.length) {
      warnings.push({
        field: 'general',
        message: `Número de itens (${items.length}) não corresponde ao número de registros tributários (${taxInfo.length})`,
        suggestion: 'Verifique se todos os itens têm informações tributárias correspondentes'
      });
    }

    // Validate total taxes
    if (header.valor_total_impostos_recolhidos && taxInfo.length > 0) {
      const totalFromHeader = parseFloat(header.valor_total_impostos_recolhidos);
      const totalFromItems = taxInfo.reduce((sum, tax) => 
        sum + (parseFloat(tax.valor_total_tributos) || 0), 0
      );
      
      if (Math.abs(totalFromHeader - totalFromItems) > 1) {
        warnings.push({
          field: 'header.valor_total_impostos_recolhidos',
          message: `Total de impostos não confere: header ${totalFromHeader.toFixed(2)}, soma dos itens ${totalFromItems.toFixed(2)}`,
          suggestion: 'Verifique os cálculos de impostos por item'
        });
      }
    }
  }
}