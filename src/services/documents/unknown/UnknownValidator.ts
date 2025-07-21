import { DocumentValidator } from '../base/DocumentValidator';
import { ValidationResult, ValidationError, ValidationWarning } from '../base/types';
import { UnknownDocumentProcessingResult } from './types';

/**
 * Validator for Unknown Document Processing Results
 */
export class UnknownDocumentValidator extends DocumentValidator {
  validate(data: UnknownDocumentProcessingResult): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check if identification was successful
    if (!data.identification) {
      errors.push({
        field: 'identification',
        message: 'Identificação do documento falhou',
        code: 'IDENTIFICATION_FAILED'
      });
    } else {
      // Validate identification confidence
      if (data.identification.confidence < 0.5) {
        warnings.push({
          field: 'confidence',
          message: `Confiança baixa na identificação: ${(data.identification.confidence * 100).toFixed(0)}%`,
          suggestion: 'Verifique manualmente o tipo de documento'
        });
      }

      // Check if type was identified
      if (data.identification.identifiedType === 'other') {
        warnings.push({
          field: 'type',
          message: 'Tipo de documento não reconhecido',
          suggestion: 'Selecione manualmente o tipo de documento'
        });
      }
    }

    // Validate references extraction
    if (!data.rawData?.references?.primary_reference) {
      warnings.push({
        field: 'references',
        message: 'Nenhuma referência principal encontrada no documento',
        suggestion: 'Verifique se o documento possui número de invoice ou referência'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate if document can be processed as identified type
   */
  validateForProcessing(data: UnknownDocumentProcessingResult): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Must have high confidence
    if (data.identification.confidence < 0.7) {
      errors.push({
        field: 'confidence',
        message: 'Confiança insuficiente para processamento automático',
        code: 'LOW_CONFIDENCE'
      });
    }

    // Must not be 'other' type
    if (data.identification.identifiedType === 'other') {
      errors.push({
        field: 'type',
        message: 'Tipo de documento desconhecido não pode ser processado automaticamente',
        code: 'UNKNOWN_TYPE'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}