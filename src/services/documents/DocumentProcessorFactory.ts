import { DocumentType, DocumentTypeInfo, DocumentProcessor, ProcessorRegistry } from './base/types';

/**
 * Factory class for managing document processors
 * Implements the Factory pattern for dynamic processor discovery and creation
 */
export class DocumentProcessorFactory implements ProcessorRegistry {
  private static instance: DocumentProcessorFactory;
  private processors = new Map<DocumentType, DocumentProcessor>();
  private typeInfos = new Map<DocumentType, DocumentTypeInfo>();

  private constructor() {
    // Initialize with default document type information
    this.initializeTypeInfos();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): DocumentProcessorFactory {
    if (!DocumentProcessorFactory.instance) {
      DocumentProcessorFactory.instance = new DocumentProcessorFactory();
    }
    return DocumentProcessorFactory.instance;
  }

  /**
   * Register a processor for a document type
   */
  register(type: DocumentType, processor: DocumentProcessor): void {
    if (processor.documentType !== type) {
      throw new Error(`Processor document type (${processor.documentType}) does not match registration type (${type})`);
    }

    this.processors.set(type, processor);
    
    // Update type info with processor information
    const existingInfo = this.typeInfos.get(type);
    if (existingInfo) {
      this.typeInfos.set(type, {
        ...existingInfo,
        supportedFormats: processor.supportedFormats,
        hasMultiStep: processor.hasMultiStep
      });
    }

    console.log(`📝 Registered processor for document type: ${type}`);
  }

  /**
   * Get processor for a document type
   */
  getProcessor(type: DocumentType): DocumentProcessor {
    const processor = this.processors.get(type);
    if (!processor) {
      throw new Error(`No processor registered for document type: ${type}`);
    }
    return processor;
  }

  /**
   * Check if processor is available for a document type
   */
  hasProcessor(type: DocumentType): boolean {
    return this.processors.has(type);
  }

  /**
   * Get all supported document types
   */
  getSupportedTypes(): DocumentType[] {
    return Array.from(this.processors.keys());
  }

  /**
   * Get type information for a document type
   */
  getTypeInfo(type: DocumentType): DocumentTypeInfo {
    const typeInfo = this.typeInfos.get(type);
    if (!typeInfo) {
      throw new Error(`No type information available for: ${type}`);
    }
    return typeInfo;
  }

  /**
   * Get all available document types with their information
   */
  getAllTypeInfos(): DocumentTypeInfo[] {
    return Array.from(this.typeInfos.values());
  }

  /**
   * Get supported file formats for a document type
   */
  getSupportedFormats(type: DocumentType): string[] {
    const processor = this.processors.get(type);
    return processor ? processor.supportedFormats : [];
  }

  /**
   * Check if a file format is supported for a document type
   */
  isFormatSupported(type: DocumentType, fileExtension: string): boolean {
    const formats = this.getSupportedFormats(type);
    return formats.includes(fileExtension.toLowerCase());
  }

  /**
   * Get document types that support multi-step processing
   */
  getMultiStepTypes(): DocumentType[] {
    return Array.from(this.processors.entries())
      .filter(([_, processor]) => processor.hasMultiStep)
      .map(([type, _]) => type);
  }

  /**
   * Auto-discover and register processors
   * This method would be called during application initialization
   */
  async autoRegisterProcessors(): Promise<void> {
    try {
      // Dynamic imports would be used here to load processors
      // For now, we'll use static imports in the main registration method
      console.log('🔍 Auto-discovering document processors...');
      
      // This would be implemented to automatically load all processors
      // from their respective directories
      
      console.log(`✅ Auto-registration complete. ${this.processors.size} processors registered.`);
    } catch (error) {
      console.error('❌ Error during processor auto-registration:', error);
    }
  }

  /**
   * Validate that a processor implements all required methods
   */
  private validateProcessor(processor: DocumentProcessor): boolean {
    const requiredMethods = ['process', 'validate', 'getPrompts', 'getSteps', 'getPromptForStep'];
    
    for (const method of requiredMethods) {
      if (typeof (processor as any)[method] !== 'function') {
        console.error(`Processor for ${processor.documentType} missing required method: ${method}`);
        return false;
      }
    }

    return true;
  }

  /**
   * Initialize default document type information
   */
  private initializeTypeInfos(): void {
    const defaultTypeInfos: DocumentTypeInfo[] = [
      {
        value: DocumentType.PACKING_LIST,
        label: 'Packing List',
        description: 'Lista de embalagem com pesos e volumes',
        supportedFormats: ['pdf'],
        hasMultiStep: true
      },
      {
        value: DocumentType.COMMERCIAL_INVOICE,
        label: 'Commercial Invoice',
        description: 'Fatura comercial com informações de venda',
        supportedFormats: ['pdf'],
        hasMultiStep: true
      },
      {
        value: DocumentType.PROFORMA_INVOICE,
        label: 'Proforma Invoice',
        description: 'Fatura proforma com detalhes preliminares de venda',
        supportedFormats: ['pdf'],
        hasMultiStep: true
      },
      {
        value: DocumentType.DI,
        label: 'Declaração de Importação (DI)',
        description: 'Documento oficial de importação',
        supportedFormats: ['pdf'],
        hasMultiStep: true
      },
      {
        value: DocumentType.SWIFT,
        label: 'Swift',
        description: 'Comprovante de transferência bancária',
        supportedFormats: ['pdf'],
        hasMultiStep: false
      },
      {
        value: DocumentType.NUMERARIO,
        label: 'Numerário',
        description: 'Documento de câmbio',
        supportedFormats: ['pdf'],
        hasMultiStep: true
      },
      {
        value: DocumentType.NOTA_FISCAL,
        label: 'Nota Fiscal',
        description: 'Nota fiscal nacional',
        supportedFormats: ['pdf'],
        hasMultiStep: false
      },
      /*{
        value: DocumentType.CI,
        label: 'Certificado de Importação',
        description: 'Certificado oficial de importação',
        supportedFormats: ['pdf'],
        hasMultiStep: false
      },
      {
        value: DocumentType.AFRMM,
        label: 'AFRMM',
        description: 'Adicional ao Frete para Renovação da Marinha Mercante',
        supportedFormats: ['pdf'],
        hasMultiStep: false
      }*/
    ];

    defaultTypeInfos.forEach(info => {
      this.typeInfos.set(info.value, info);
    });
  }

  /**
   * Get statistics about registered processors
   */
  getStatistics(): {
    totalProcessors: number;
    multiStepProcessors: number;
    supportedFormats: string[];
    documentTypes: DocumentType[];
  } {
    const processors = Array.from(this.processors.values());
    const allFormats = new Set<string>();
    
    processors.forEach(processor => {
      processor.supportedFormats.forEach(format => allFormats.add(format));
    });

    return {
      totalProcessors: processors.length,
      multiStepProcessors: processors.filter(p => p.hasMultiStep).length,
      supportedFormats: Array.from(allFormats),
      documentTypes: this.getSupportedTypes()
    };
  }

  /**
   * Reset factory (useful for testing)
   */
  reset(): void {
    this.processors.clear();
    this.initializeTypeInfos();
  }
}

// Export singleton instance
export const documentProcessorFactory = DocumentProcessorFactory.getInstance();