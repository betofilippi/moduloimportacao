// Numerário (Nota Fiscal) document validator
import { ValidationResult, ValidationError, ValidationWarning } from '../base/types';
import { DocumentValidator } from '../base/DocumentValidator';
import { NumerarioProcessingResult, numerarioValidationRules } from './types';

export class NumerarioValidator {
  private validator: DocumentValidator;

  constructor() {
    this.validator = new DocumentValidator();
  }

  validate(data: NumerarioProcessingResult): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate DI info
    if (!data.diInfo || !data.diInfo.numero_di) {
      warnings.push({
        field: 'diInfo.numero_di',
        message: 'Número da DI não encontrado',
        suggestion: 'Verifique se o número da DI está nas informações complementares'
      });
    } else if (!this.validator.validateDINumber(data.diInfo.numero_di)) {
      errors.push({
        field: 'diInfo.numero_di',
        message: 'Formato inválido de número da DI',
        code: 'INVALID_DI_NUMBER'
      });
    }

    // Validate header
    if (!data.header) {
      errors.push({
        field: 'header',
        message: 'Dados gerais da NF-e não encontrados',
        code: 'MISSING_HEADER'
      });
    } else {
      this.validateHeader(data.header, errors, warnings);
    }

    // Validate items
    if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
      errors.push({
        field: 'items',
        message: 'Nenhum produto encontrado na NF-e',
        code: 'MISSING_ITEMS'
      });
    } else {
      this.validateItems(data.items, errors, warnings);
    }

    // Cross-validation
    if (data.header && data.items) {
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
    numerarioValidationRules.requiredHeaderFields.forEach(field => {
      if (!header[field]) {
        errors.push({
          field: `header.${field}`,
          message: `Campo obrigatório ausente: ${field}`,
          code: 'REQUIRED_FIELD'
        });
      }
    });

    // Validate NF-e number format
    if (header.numero_nf && !/^\d{3}\.\d{3}\.\d{3}$/.test(header.numero_nf)) {
      warnings.push({
        field: 'header.numero_nf',
        message: 'Formato de número da NF-e pode estar incorreto',
        suggestion: 'O formato esperado é 000.000.000'
      });
    }

    // Validate chave de acesso (44 digits)
    if (header.chave_acesso) {
      const cleanKey = header.chave_acesso.replace(/\s/g, '');
      if (cleanKey.length !== 44 || !/^\d{44}$/.test(cleanKey)) {
        errors.push({
          field: 'header.chave_acesso',
          message: 'Chave de acesso inválida (deve ter 44 dígitos)',
          code: 'INVALID_ACCESS_KEY'
        });
      }
    }

    // Validate dates
    numerarioValidationRules.dateFields.forEach(field => {
      if (header[field] && !this.validator.validateDate(header[field])) {
        errors.push({
          field: `header.${field}`,
          message: `Data inválida: ${field}`,
          code: 'INVALID_DATE'
        });
      }
    });

    // Validate numeric fields
    const headerNumericFields = numerarioValidationRules.numericFields.filter(field => 
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

    // Validate financial totals
    if (header.valor_total_produtos && header.valor_total_nota) {
      const produtos = parseFloat(header.valor_total_produtos);
      const total = parseFloat(header.valor_total_nota);
      const icms = parseFloat(header.valor_icms) || 0;
      const ipi = parseFloat(header.valor_total_ipi) || 0;
      const frete = parseFloat(header.valor_frete) || 0;
      const seguro = parseFloat(header.valor_seguro) || 0;
      const despesas = parseFloat(header.outras_despesas) || 0;
      const desconto = parseFloat(header.desconto) || 0;
      
      const expectedTotal = produtos + ipi + frete + seguro + despesas - desconto;
      
      if (Math.abs(total - expectedTotal) > 0.01) {
        warnings.push({
          field: 'header.valor_total_nota',
          message: `Valor total calculado (${expectedTotal.toFixed(2)}) não confere com o declarado (${total.toFixed(2)})`,
          suggestion: 'Verifique os valores de produtos, impostos, frete e descontos'
        });
      }
    }

    // Validate transport info
    if (header.frete_por_conta && !['0-Emitente', '1-Destinatário', '2-Terceiros', '9-Sem Frete'].includes(header.frete_por_conta)) {
      warnings.push({
        field: 'header.frete_por_conta',
        message: 'Modalidade de frete inválida',
        suggestion: 'Use: 0-Emitente, 1-Destinatário, 2-Terceiros ou 9-Sem Frete'
      });
    }
  }

  private validateItems(items: any[], errors: ValidationError[], warnings: ValidationWarning[]) {
    const itemCodes = new Set<string>();
    let totalCalculado = 0;
    
    items.forEach((item, index) => {
      // Check required fields
      numerarioValidationRules.requiredItemFields.forEach(field => {
        if (!item[field]) {
          errors.push({
            field: `items[${index}].${field}`,
            message: `Campo obrigatório ausente no produto ${index + 1}: ${field}`,
            code: 'REQUIRED_FIELD'
          });
        }
      });

      // Validate NCM code
      if (item.ncm_sh && !this.validator.validateNCM(item.ncm_sh)) {
        errors.push({
          field: `items[${index}].ncm_sh`,
          message: `NCM inválido no produto ${index + 1}`,
          code: 'INVALID_NCM'
        });
      }

      // Validate CFOP
      if (item.cfop && !/^\d{4}$/.test(item.cfop)) {
        errors.push({
          field: `items[${index}].cfop`,
          message: `CFOP inválido no produto ${index + 1} (deve ter 4 dígitos)`,
          code: 'INVALID_CFOP'
        });
      }

      // Check for duplicate product codes
      if (item.codigo_produto) {
        if (itemCodes.has(item.codigo_produto)) {
          warnings.push({
            field: `items[${index}].codigo_produto`,
            message: `Código de produto duplicado: ${item.codigo_produto}`,
            suggestion: 'Verifique se os produtos foram extraídos corretamente'
          });
        }
        itemCodes.add(item.codigo_produto);
      }

      // Validate numeric values
      const itemNumericFields = ['quantidade', 'valor_unitario', 'valor_total_produto', 
                                 'base_icms', 'valor_icms_produto', 'aliquota_icms',
                                 'valor_ipi_produto', 'aliquota_ipi'];
      
      itemNumericFields.forEach(field => {
        if (item[field] && !this.validator.validateNumeric(item[field])) {
          errors.push({
            field: `items[${index}].${field}`,
            message: `Valor numérico inválido no produto ${index + 1}: ${field}`,
            code: 'INVALID_NUMERIC'
          });
        }
      });

      // Validate calculated total
      if (item.quantidade && item.valor_unitario && item.valor_total_produto) {
        const qty = parseFloat(item.quantidade);
        const unitPrice = parseFloat(item.valor_unitario);
        const total = parseFloat(item.valor_total_produto);
        const expectedTotal = qty * unitPrice;
        
        if (Math.abs(total - expectedTotal) > 0.01) {
          warnings.push({
            field: `items[${index}].valor_total_produto`,
            message: `Valor total calculado não confere no produto ${index + 1}: esperado ${expectedTotal.toFixed(2)}, encontrado ${total.toFixed(2)}`,
            suggestion: 'Verifique os valores de quantidade e preço unitário'
          });
        }
        
        totalCalculado += total;
      }

      // Validate tax rates
      if (item.aliquota_icms) {
        const icmsRate = parseFloat(item.aliquota_icms);
        if (icmsRate < 0 || icmsRate > 30) {
          warnings.push({
            field: `items[${index}].aliquota_icms`,
            message: `Alíquota ICMS fora do intervalo esperado (0%-30%): ${icmsRate}%`,
            suggestion: 'Verifique se a alíquota está correta'
          });
        }
      }

      if (item.aliquota_ipi) {
        const ipiRate = parseFloat(item.aliquota_ipi);
        if (ipiRate < 0 || ipiRate > 100) {
          warnings.push({
            field: `items[${index}].aliquota_ipi`,
            message: `Alíquota IPI fora do intervalo esperado (0%-100%): ${ipiRate}%`,
            suggestion: 'Verifique se a alíquota está correta'
          });
        }
      }

      // Validate reference field
      if (!item.reference) {
        warnings.push({
          field: `items[${index}].reference`,
          message: `Referência não encontrada no produto ${index + 1}`,
          suggestion: 'A referência geralmente aparece na descrição do produto'
        });
      }
    });
  }

  private crossValidate(data: NumerarioProcessingResult, errors: ValidationError[], warnings: ValidationWarning[]) {
    const { header, items } = data;

    // Validate total value of products
    if (header.valor_total_produtos && items.length > 0) {
      const totalFromHeader = parseFloat(header.valor_total_produtos);
      const totalFromItems = items.reduce((sum, item) => 
        sum + (parseFloat(item.valor_total_produto) || 0), 0
      );
      
      if (Math.abs(totalFromHeader - totalFromItems) > 1) {
        warnings.push({
          field: 'header.valor_total_produtos',
          message: `Total de produtos não confere: header ${totalFromHeader.toFixed(2)}, soma dos itens ${totalFromItems.toFixed(2)}`,
          suggestion: 'Verifique se todos os produtos foram extraídos corretamente'
        });
      }
    }

    // Validate total ICMS
    if (header.valor_icms && items.length > 0) {
      const icmsFromHeader = parseFloat(header.valor_icms);
      const icmsFromItems = items.reduce((sum, item) => 
        sum + (parseFloat(item.valor_icms_produto) || 0), 0
      );
      
      if (Math.abs(icmsFromHeader - icmsFromItems) > 1) {
        warnings.push({
          field: 'header.valor_icms',
          message: `Total de ICMS não confere: header ${icmsFromHeader.toFixed(2)}, soma dos itens ${icmsFromItems.toFixed(2)}`,
          suggestion: 'Verifique os valores de ICMS por produto'
        });
      }
    }

    // Validate total IPI
    if (header.valor_total_ipi && items.length > 0) {
      const ipiFromHeader = parseFloat(header.valor_total_ipi);
      const ipiFromItems = items.reduce((sum, item) => 
        sum + (parseFloat(item.valor_ipi_produto) || 0), 0
      );
      
      if (Math.abs(ipiFromHeader - ipiFromItems) > 1) {
        warnings.push({
          field: 'header.valor_total_ipi',
          message: `Total de IPI não confere: header ${ipiFromHeader.toFixed(2)}, soma dos itens ${ipiFromItems.toFixed(2)}`,
          suggestion: 'Verifique os valores de IPI por produto'
        });
      }
    }

    // Validate volume count
    if (header.quantidade_volumes && items.length > 0) {
      const volumesFromHeader = parseInt(header.quantidade_volumes);
      if (volumesFromHeader === 0 || volumesFromHeader < items.length) {
        warnings.push({
          field: 'header.quantidade_volumes',
          message: `Quantidade de volumes (${volumesFromHeader}) parece inconsistente com o número de itens (${items.length})`,
          suggestion: 'Verifique se a quantidade de volumes está correta'
        });
      }
    }
  }
}