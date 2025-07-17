/**
 * Document prompts wrapper
 * This file provides access to document prompts from the main documents service
 */

import { DocumentType } from '@/services/documents/base/types';
import { documentProcessorFactory } from '@/services/documents';

/**
 * Get document prompt for a specific document type
 * @param documentType - Type of document
 * @returns The prompt string for the document type
 */
export function getDocumentPrompt(documentType: DocumentType): string {
  try {
    const processor = documentProcessorFactory.getProcessor(documentType);
    const prompts = processor.getPrompts();
    
    // Return the first prompt (main prompt) or a default message
    return prompts[0] || `Process document of type: ${documentType}`;
  } catch (error) {
    console.error(`Error getting prompt for document type ${documentType}:`, error);
    // Return a generic prompt as fallback
    return `Extract all relevant information from this ${documentType.replace('_', ' ')} document in JSON format.`;
  }
}

/**
 * Get all prompts for a document type (for multi-step processing)
 * @param documentType - Type of document
 * @returns Array of prompts
 */
export function getAllDocumentPrompts(documentType: DocumentType): string[] {
  try {
    const processor = documentProcessorFactory.getProcessor(documentType);
    return processor.getPrompts();
  } catch (error) {
    console.error(`Error getting prompts for document type ${documentType}:`, error);
    return [];
  }
}

/**
 * Check if a document type has multi-step processing
 * @param documentType - Type of document
 * @returns boolean indicating if multi-step processing is available
 */
export function hasMultiStepProcessing(documentType: DocumentType): boolean {
  try {
    const processor = documentProcessorFactory.getProcessor(documentType);
    return processor.hasMultiStep;
  } catch (error) {
    console.error(`Error checking multi-step for document type ${documentType}:`, error);
    return false;
  }
}