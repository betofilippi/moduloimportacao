// DI (Declaração de Importação) document processor
import { BaseDocumentProcessor } from '../base/DocumentProcessor';
import { DocumentType, ProcessingOptions, ProcessingResult } from '../base/types';
import { DIProcessingResult, DIHeader, DIItem, DITaxInfo } from './types';
import { diSteps, getPromptForStep } from './prompts';
import { DIValidator } from './DIValidator';

export class DIProcessor extends BaseDocumentProcessor {
  readonly documentType = DocumentType.DI;
  readonly supportedFormats = ['pdf'];
  readonly hasMultiStep = true;
  
  private validator: DIValidator;

  constructor() {
    super();
    this.validator = new DIValidator();
  }

  async process(file: File, options?: ProcessingOptions): Promise<ProcessingResult> {
    try {
      // Validate file format
      const formatValidation = (this as any).validateFile(file);
      if (!formatValidation.isValid) {
        return (this as any).createErrorResult(formatValidation.error || 'Invalid file format');
      }

      // For DI documents, we use multi-step processing through OCR service
      // The actual OCR processing is handled by the API routes
      
      // Return a result indicating that processing should be handled by OCR service
      return {
        success: true,
        metadata: {
          documentType: this.documentType,
          totalSteps: diSteps.length,
          processingTime: 0,
          confidence: 0
        },
        data: {
          requiresOCR: true,
          documentType: this.documentType,
          steps: diSteps.map(step => ({
            step: step.step,
            name: step.name,
            description: step.description
          }))
        }
      };
    } catch (error) {
      console.error('Error processing DI document', error);
      return (this as any).createErrorResult(
        error instanceof Error ? error.message : 'Unknown error during processing'
      );
    }
  }

  validate(data: any): { isValid: boolean; errors: any[]; warnings: any[] } {
    try {
      // Parse the data structure based on multi-step result
      let processedData: DIProcessingResult;
      
      if (data?.structuredResult) {
        // Multi-step OCR result format
        processedData = {
          header: data.structuredResult.header?.data || {},
          items: data.structuredResult.items?.data || [],
          taxInfo: data.structuredResult.taxInfo?.data || []
        };
      } else if (data?.header || data?.items) {
        // Direct format
        processedData = {
          header: data.header || {},
          items: data.items || [],
          taxInfo: data.taxInfo || []
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
    return diSteps.map(step => step.prompt);
  }

  getSteps() {
    return diSteps;
  }

  getPromptForStep(step: number, previousResult?: string): string {
    return getPromptForStep(step, previousResult);
  }

  preprocessData(data: any): any {
    // Clean and normalize DI data
    if (!data) return data;
    
    const processed = { ...data };
    
    // Normalize numeric fields
    if (processed.header) {
      const numericFields = [
        'quantidade_total_adicoes', 'peso_bruto_total_kg', 'peso_liquido_total_kg',
        'quantidade_total_embalagens', 'taxa_dolar', 'frete_usd', 'seguro_usd',
        'VMLE_usd', 'VMLD_usd', 'valor_total_impostos_recolhidos'
      ];
      
      numericFields.forEach(field => {
        if (processed.header[field]) {
          processed.header[field] = this.normalizeNumericValue(processed.header[field]);
        }
      });
    }
    
    // Process items
    if (Array.isArray(processed.items)) {
      processed.items = processed.items.map((item: any) => ({
        ...item,
        quantidade_produto: this.normalizeNumericValue(item.quantidade_produto),
        valor_unitario_produto_usd: this.normalizeNumericValue(item.valor_unitario_produto_usd),
        valor_total_item_usd: this.normalizeNumericValue(item.valor_total_item_usd),
        peso_liquido_adicao_kg: this.normalizeNumericValue(item.peso_liquido_adicao_kg)
      }));
    }
    
    // Process tax info
    if (Array.isArray(processed.taxInfo)) {
      processed.taxInfo = processed.taxInfo.map((tax: any) => {
        const normalizedTax = { ...tax };
        const taxNumericFields = [
          'quantidade_item', 'vucv_usd', 'valor_total_item_usd',
          'participacao_percentual_item', 'aliquota_ii_percentual',
          'valor_ii_recolhido', 'aliquota_ipi_percentual', 'valor_ipi_recolhido',
          'base_calculo_pis', 'aliquota_pis_percentual', 'valor_pis_recolhido',
          'base_calculo_cofins', 'aliquota_cofins_percentual', 
          'valor_cofins_recolhido', 'valor_total_tributos'
        ];
        
        taxNumericFields.forEach(field => {
          if (normalizedTax[field]) {
            normalizedTax[field] = this.normalizeNumericValue(normalizedTax[field]);
          }
        });
        
        return normalizedTax;
      });
    }
    
    return processed;
  }

  postprocessData(data: any): any {
    if (!data) return data;
    
    const processed = { ...data };
    
    // Calculate summary if not present
    if (!processed.summary && processed.header && processed.items && processed.taxInfo) {
      processed.summary = {
        totalItems: processed.items.length,
        totalAdditions: parseInt(processed.header.quantidade_total_adicoes) || 0,
        totalWeight: parseFloat(processed.header.peso_liquido_total_kg) || 0,
        totalValue: parseFloat(processed.header.VMLE_usd) || 0,
        totalTaxes: parseFloat(processed.header.valor_total_impostos_recolhidos) || 0
      };
    }
    
    // Merge tax info with items if requested
    if (processed.items && processed.taxInfo) {
      processed.itemsWithTax = processed.items.map((item: any) => {
        const taxInfo = processed.taxInfo.find(
          (tax: DITaxInfo) => tax.codigo_item === item.codigo_item && 
                              tax.numero_adicao === item.numero_adicao
        );
        return {
          ...item,
          taxInfo: taxInfo || null
        };
      });
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
}