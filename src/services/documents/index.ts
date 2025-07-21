// Main entry point for the document processing system

// Base exports
export * from './base/types';
export * from './base/DocumentProcessor';
export * from './base/DocumentValidator';

// Factory
export * from './DocumentProcessorFactory';
export { documentProcessorFactory } from './DocumentProcessorFactory';

// Packing List
export * from './packing-list/types';
export * from './packing-list/PackingListProcessor';
export * from './packing-list/PackingListValidator';

// Commercial Invoice
export * from './commercial-invoice/types';
export * from './commercial-invoice/CommercialInvoiceProcessor';
export * from './commercial-invoice/CommercialInvoiceValidator';

// Proforma Invoice
export * from './proforma-invoice/types';
export * from './proforma-invoice/ProformaInvoiceProcessor';
export * from './proforma-invoice/ProformaInvoiceValidator';

// Swift
export * from './swift/types';
export * from './swift/SwiftProcessor';
export * from './swift/SwiftValidator';

// DI
export * from './di/types';
export * from './di/DIProcessor';
export * from './di/DIValidator';

// Numerario
export * from './numerario/types';
export * from './numerario/NumerarioProcessor';
export * from './numerario/NumerarioValidator';

// Nota Fiscal
export * from './nota-fiscal/types';
export * from './nota-fiscal/NotaFiscalProcessor';
export * from './nota-fiscal/NotaFiscalValidator';

// Unknown Document (for auto-identification)
export * from './unknown/types';
export * from './unknown/UnknownProcessor';
export * from './unknown/UnknownValidator';

// Auto-register processors
import { documentProcessorFactory } from './DocumentProcessorFactory';
import { PackingListProcessor } from './packing-list/PackingListProcessor';
import { CommercialInvoiceProcessor } from './commercial-invoice/CommercialInvoiceProcessor';
import { ProformaInvoiceProcessor } from './proforma-invoice/ProformaInvoiceProcessor';
import { SwiftProcessor } from './swift/SwiftProcessor';
import { DIProcessor } from './di/DIProcessor';
import { NumerarioProcessor } from './numerario/NumerarioProcessor';
import { NotaFiscalProcessor } from './nota-fiscal/NotaFiscalProcessor';
import { UnknownDocumentProcessor } from './unknown/UnknownProcessor';
import { DocumentType } from './base/types';

/**
 * Initialize and register all document processors
 * This should be called during application startup
 */
export function initializeDocumentProcessors(): void {
  console.log('🚀 Initializing document processors...');

  try {
    // Register Packing List processor
    const packingListProcessor = new PackingListProcessor();
    documentProcessorFactory.register(DocumentType.PACKING_LIST, packingListProcessor);

    // Register Commercial Invoice processor
    const commercialInvoiceProcessor = new CommercialInvoiceProcessor();
    documentProcessorFactory.register(DocumentType.COMMERCIAL_INVOICE, commercialInvoiceProcessor);

    // Register Proforma Invoice processor
    const proformaInvoiceProcessor = new ProformaInvoiceProcessor();
    documentProcessorFactory.register(DocumentType.PROFORMA_INVOICE, proformaInvoiceProcessor);

    // Register Swift processor
    const swiftProcessor = new SwiftProcessor();
    documentProcessorFactory.register(DocumentType.SWIFT, swiftProcessor);

    // Register DI processor
    const diProcessor = new DIProcessor();
    documentProcessorFactory.register(DocumentType.DI, diProcessor);

    // Register Numerário processor
    const numerarioProcessor = new NumerarioProcessor();
    documentProcessorFactory.register(DocumentType.NUMERARIO, numerarioProcessor);

    // Register Nota Fiscal processor
    const notaFiscalProcessor = new NotaFiscalProcessor();
    documentProcessorFactory.register(DocumentType.NOTA_FISCAL, notaFiscalProcessor);

    // Register Unknown Document processor (for auto-identification)
    const unknownProcessor = new UnknownDocumentProcessor();
    documentProcessorFactory.register(DocumentType.UNKNOWN, unknownProcessor);

    // TODO: Register other processors as they are implemented
    // documentProcessorFactory.register(DocumentType.BILL_OF_LADING, new BillOfLadingProcessor());
    // etc...

    const stats = documentProcessorFactory.getStatistics();
    console.log('✅ Document processors initialized successfully:', stats);

  } catch (error) {
    console.error('❌ Error initializing document processors:', error);
    throw error;
  }
}

/**
 * Get a processor for a specific document type
 */
export function getDocumentProcessor(type: DocumentType) {
  return documentProcessorFactory.getProcessor(type);
}

/**
 * Check if a processor is available for a document type
 */
export function hasDocumentProcessor(type: DocumentType): boolean {
  return documentProcessorFactory.hasProcessor(type);
}

/**
 * Get all supported document types
 */
export function getSupportedDocumentTypes(): DocumentType[] {
  return documentProcessorFactory.getSupportedTypes();
}

/**
 * Get type information for all supported document types
 */
export function getAllDocumentTypeInfos() {
  return documentProcessorFactory.getAllTypeInfos();
}

/**
 * Process a document file
 */
export async function processDocument(
  file: File, 
  documentType: DocumentType, 
  options: any = {}
) {
  const processor = getDocumentProcessor(documentType);
  return await processor.process(file, options);
}

/**
 * Validate document data
 */
export function validateDocument(data: any, documentType: DocumentType) {
  const processor = getDocumentProcessor(documentType);
  return processor.validate(data);
}

/**
 * Get prompts for a document type
 */
export function getDocumentPrompts(documentType: DocumentType): string[] {
  const processor = getDocumentProcessor(documentType);
  return processor.getPrompts();
}

/**
 * Get processing steps for a document type
 */
export function getDocumentSteps(documentType: DocumentType) {
  const processor = getDocumentProcessor(documentType);
  return processor.getSteps();
}

/**
 * Get supported file formats for a document type
 */
export function getSupportedFormats(documentType: DocumentType): string[] {
  return documentProcessorFactory.getSupportedFormats(documentType);
}

/**
 * Check if a file format is supported for a document type
 */
export function isFormatSupported(documentType: DocumentType, fileExtension: string): boolean {
  return documentProcessorFactory.isFormatSupported(documentType, fileExtension);
}

/**
 * Reset the factory (useful for testing)
 */
export function resetDocumentProcessors(): void {
  documentProcessorFactory.reset();
}

// Auto-initialize processors when this module is imported
// This ensures processors are available immediately
let initialized = false;

export function ensureInitialized(): void {
  if (!initialized) {
    initializeDocumentProcessors();
    initialized = true;
  }
}

// Initialize on module load
ensureInitialized();