// Numerário (Nota Fiscal) document processor
import { BaseDocumentProcessor } from '../base/DocumentProcessor';
import { DocumentType, ProcessingOptions, ProcessingResult } from '../base/types';
import { NumerarioProcessingResult, NumerarioHeader, NumerarioItem } from './types';
import { numerarioSteps, getPromptForStep } from './prompts';
import { NumerarioValidator } from './NumerarioValidator';

export class NumerarioProcessor extends BaseDocumentProcessor {
  readonly documentType = DocumentType.NUMERARIO;
  readonly supportedFormats = ['pdf'];
  readonly hasMultiStep = true;
  
  private validator: NumerarioValidator;

  constructor() {
    super();
    this.validator = new NumerarioValidator();
  }

  async process(file: File, options?: ProcessingOptions): Promise<ProcessingResult> {
    try {
      // Validate file format
      const formatValidation = (this as any).validateFile(file);
      if (!formatValidation.isValid) {
        return (this as any).createErrorResult(formatValidation.error || 'Invalid file format');
      }

      // For Numerário documents, we use multi-step processing through OCR service
      // The actual OCR processing is handled by the API routes
      
      // Return a result indicating that processing should be handled by OCR service
      return {
        success: true,
        metadata: {
          documentType: this.documentType,
          totalSteps: numerarioSteps.length,
          processingTime: 0,
          confidence: 0
        },
        data: {
          requiresOCR: true,
          documentType: this.documentType,
          steps: numerarioSteps.map(step => ({
            step: step.step,
            name: step.name,
            description: step.description
          }))
        }
      };
    } catch (error) {
      console.error('Error processing Numerário document', error);
      return (this as any).createErrorResult(
        error instanceof Error ? error.message : 'Unknown error during processing'
      );
    }
  }

  validate(data: any): { isValid: boolean; errors: any[]; warnings: any[] } {
    try {
      // Parse the data structure based on multi-step result
      let processedData: NumerarioProcessingResult;
      
      if (data?.structuredResult) {
        // Multi-step OCR result format
        processedData = {
          diInfo: data.structuredResult.diInfo?.data || { numero_di: '' },
          header: data.structuredResult.header?.data || {},
          items: data.structuredResult.items?.data || []
        };
      } else if (data?.header || data?.items) {
        // Direct format
        processedData = {
          diInfo: data.diInfo || { numero_di: '' },
          header: data.header || {},
          items: data.items || []
        };
      } else {
        return {
          isValid: false,
          errors: [{ field: 'data', message: 'Invalid data structure', code: 'INVALID_STRUCTURE' }],
          warnings: []
        };
      }

      return this.validator.validate(processedData);
    } catch (error) {
      console.error('Validation error', error);
      return {
        isValid: false,
        errors: [{ 
          field: 'general', 
          message: error instanceof Error ? error.message : 'Validation error',
          code: 'VALIDATION_ERROR'
        }],
        warnings: []
      };
    }
  }

  getPrompts(): string[] {
    return numerarioSteps.map(step => step.prompt);
  }

  getSteps() {
    return numerarioSteps;
  }

  getPromptForStep(step: number, previousResult?: string): string {
    return getPromptForStep(step, previousResult);
  }

  preprocessData(data: any): any {
    // Clean and normalize Numerário data
    if (!data) return data;
    
    const processed = { ...data };
    
    // Normalize numeric fields in header
    if (processed.header) {
      const numericFields = [
        'valor_total_produtos', 'valor_total_nota', 'base_calculo_icms',
        'valor_icms', 'valor_total_ipi', 'valor_frete', 'valor_seguro',
        'desconto', 'outras_despesas', 'quantidade_volumes', 'peso_bruto', 'peso_liquido'
      ];
      
      numericFields.forEach(field => {
        if (processed.header[field]) {
          processed.header[field] = this.normalizeNumericValue(processed.header[field]);
        }
      });
      
      // Clean chave_acesso (remove spaces)
      if (processed.header.chave_acesso) {
        processed.header.chave_acesso = processed.header.chave_acesso.replace(/\s/g, '');
      }
    }
    
    // Process items
    if (Array.isArray(processed.items)) {
      processed.items = processed.items.map((item: any) => ({
        ...item,
        quantidade: this.normalizeNumericValue(item.quantidade),
        valor_unitario: this.normalizeNumericValue(item.valor_unitario),
        valor_total_produto: this.normalizeNumericValue(item.valor_total_produto),
        base_icms: this.normalizeNumericValue(item.base_icms),
        valor_icms_produto: this.normalizeNumericValue(item.valor_icms_produto),
        aliquota_icms: this.normalizeNumericValue(item.aliquota_icms),
        valor_ipi_produto: this.normalizeNumericValue(item.valor_ipi_produto),
        aliquota_ipi: this.normalizeNumericValue(item.aliquota_ipi)
      }));
    }
    
    return processed;
  }

  postprocessData(data: any): any {
    if (!data) return data;
    
    const processed = { ...data };
    
    // Calculate summary if not present
    if (!processed.summary && processed.header && processed.items) {
      const totalValue = parseFloat(processed.header.valor_total_produtos) || 0;
      const totalICMS = parseFloat(processed.header.valor_icms) || 0;
      const totalIPI = parseFloat(processed.header.valor_total_ipi) || 0;
      const totalWeight = parseFloat(processed.header.peso_bruto) || 0;
      
      processed.summary = {
        totalItems: processed.items.length,
        totalValue,
        totalICMS,
        totalIPI,
        totalWeight
      };
    }
    
    // Extract DI number from header if not in diInfo
    if (processed.header && (!processed.diInfo || !processed.diInfo.numero_di)) {
      const diNumber = processed.header.di_number || this.extractDIFromText(
        processed.header.informacoes_complementares || '' + ' ' +
        processed.header.informacoes_fisco || ''
      );
      
      if (diNumber) {
        processed.diInfo = { numero_di: diNumber };
      }
    }
    
    return processed;
  }

  private normalizeNumericValue(value: any): string {
    if (!value) return '0';
    
    // Remove currency symbols and spaces
    const cleaned = String(value)
      .replace(/[R$\s]/g, '')
      .replace(/\./g, '') // Remove thousand separators
      .replace(',', '.'); // Convert decimal separator
    
    return cleaned;
  }

  private extractDIFromText(text: string): string | null {
    // Pattern for DI number: YY/NNNNNNN-D
    const diPattern = /\b\d{2}\/\d{7}-\d\b/g;
    const matches = text.match(diPattern);
    return matches ? matches[0] : null;
  }
}