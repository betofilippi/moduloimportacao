/**
 * Business Rules Service for Import Processes
 * 
 * This service implements all business rules for managing import process stages
 * and document requirements according to the defined workflow.
 */

import { KANBAN_CONFIG } from '@/config/nocodb-tables';

export interface DocumentType {
  type: string;
  name: string;
  isRequired: boolean;
  stage?: string;
}

export interface ProcessDocument {
  tipo_documento: string;
  hash_arquivo: string;
  data_anexo: string;
  nome_arquivo: string;
}

export interface RuleViolation {
  ruleId: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  requiredDocuments?: string[];
  currentStage?: string;
  suggestedStage?: string;
}

export interface StageTransition {
  fromStage: string;
  toStage: string;
  allowed: boolean;
  violations: RuleViolation[];
  requiredDocuments: string[];
}

export class ProcessBusinessRules {
  // Document types mapping
  private static readonly DOCUMENT_TYPES: Record<string, DocumentType> = {
    PROFORMA_INVOICE: { 
      type: 'proforma_invoice', 
      name: 'Proforma Invoice', 
      isRequired: true,
      stage: 'solicitado'
    },
    COMMERCIAL_INVOICE: { 
      type: 'commercial_invoice', 
      name: 'Commercial Invoice', 
      isRequired: false,
      stage: 'solicitado'
    },
    NUMERARIO: { 
      type: 'numerario', 
      name: 'Numerário', 
      isRequired: false,
      stage: 'solicitado'
    },
    CONTRATO_CAMBIO: { 
      type: 'contrato_cambio', 
      name: 'Contrato de Câmbio', 
      isRequired: false,
      stage: 'solicitado'
    },
    SWIFT: { 
      type: 'swift', 
      name: 'SWIFT', 
      isRequired: false,
      stage: 'solicitado'
    },
    PACKING_LIST: { 
      type: 'packing_list', 
      name: 'Packing List', 
      isRequired: false,
      stage: 'solicitado'
    },
    BL: { 
      type: 'bl', 
      name: 'Bill of Lading (BL)', 
      isRequired: true,
      stage: 'em_transporte_internacional'
    },
    DI: { 
      type: 'di', 
      name: 'Declaração de Importação (DI)', 
      isRequired: true,
      stage: 'processamento_nacional'
    },
    NOTA_FISCAL: { 
      type: 'nota_fiscal', 
      name: 'Nota Fiscal', 
      isRequired: true,
      stage: 'recebido'
    }
  };

  // Stage requirements mapping
  private static readonly STAGE_REQUIREMENTS: Record<string, string[]> = {
    solicitado: ['proforma_invoice'], // At minimum
    em_transporte_internacional: ['proforma_invoice', 'bl'],
    processamento_nacional: ['proforma_invoice', 'bl', 'di'],
    em_transporte_local: ['proforma_invoice', 'bl', 'di'], // Manual transition
    recebido: ['proforma_invoice', 'bl', 'di', 'nota_fiscal'],
    auditado: ['proforma_invoice', 'bl', 'di', 'nota_fiscal'] // All documents
  };

  /**
   * RN-01: Check if process has required Proforma Invoice
   */
  static checkProformaInvoiceRule(documents: ProcessDocument[]): RuleViolation | null {
    const hasProforma = documents.some(doc => doc.tipo_documento === 'proforma_invoice');
    
    if (!hasProforma) {
      return {
        ruleId: 'RN-01',
        severity: 'error',
        message: 'Um processo de importação deve conter o anexo da Proforma Invoice',
        requiredDocuments: ['proforma_invoice']
      };
    }
    
    return null;
  }

  /**
   * RN-02 & RN-03: Check stage "Solicitado" requirements
   */
  static checkSolicitadoStageRules(currentStage: string, documents: ProcessDocument[]): RuleViolation[] {
    const violations: RuleViolation[] = [];
    
    if (currentStage !== 'solicitado') {
      return violations;
    }

    const hasProforma = documents.some(doc => doc.tipo_documento === 'proforma_invoice');
    const hasCommercial = documents.some(doc => doc.tipo_documento === 'commercial_invoice');
    
    if (!hasProforma && !hasCommercial) {
      violations.push({
        ruleId: 'RN-02',
        severity: 'warning',
        message: 'A etapa Solicitado requer Proforma Invoice ou Commercial Invoice',
        requiredDocuments: ['proforma_invoice', 'commercial_invoice']
      });
    }
    
    return violations;
  }

  /**
   * RN-04: Check transition from "Solicitado" to "Em Transporte Internacional"
   */
  static checkTransportInternacionalTransition(
    currentStage: string, 
    documents: ProcessDocument[]
  ): RuleViolation[] {
    const violations: RuleViolation[] = [];
    
    if (currentStage === 'solicitado') {
      const hasBL = documents.some(doc => doc.tipo_documento === 'bl');
      
      if (hasBL) {
        violations.push({
          ruleId: 'RN-04',
          severity: 'info',
          message: 'BL detectado - processo pode avançar para "Em Transporte Internacional"',
          suggestedStage: 'em_transporte_internacional'
        });
      }
    }
    
    return violations;
  }

  /**
   * RN-05: Check transition to "Processamento Nacional"
   */
  static checkProcessamentoNacionalTransition(
    currentStage: string,
    documents: ProcessDocument[]
  ): RuleViolation[] {
    const violations: RuleViolation[] = [];
    
    if (currentStage === 'em_transporte_internacional') {
      const hasDI = documents.some(doc => doc.tipo_documento === 'di');
      
      if (hasDI) {
        violations.push({
          ruleId: 'RN-05',
          severity: 'info',
          message: 'DI detectada - processo pode avançar para "Processamento Nacional"',
          suggestedStage: 'processamento_nacional'
        });
      }
    }
    
    return violations;
  }

  /**
   * RN-07: Check "Recebido" stage requirements
   */
  static checkRecebidoStageRequirements(
    currentStage: string,
    documents: ProcessDocument[]
  ): RuleViolation[] {
    const violations: RuleViolation[] = [];
    
    if (currentStage === 'em_transporte_local' || currentStage === 'processamento_nacional') {
      const hasNF = documents.some(doc => doc.tipo_documento === 'nota_fiscal');
      
      if (hasNF) {
        violations.push({
          ruleId: 'RN-07',
          severity: 'info',
          message: 'Nota Fiscal detectada - processo pode avançar para "Recebido"',
          suggestedStage: 'recebido'
        });
      }
    }
    
    return violations;
  }

  /**
   * RN-10: Check if all requirements are met for "Auditado" stage
   */
  static checkAuditadoRequirements(documents: ProcessDocument[]): RuleViolation[] {
    const violations: RuleViolation[] = [];
    const requiredDocs = ['proforma_invoice', 'bl', 'di', 'nota_fiscal'];
    const missingDocs: string[] = [];
    
    requiredDocs.forEach(docType => {
      if (!documents.some(doc => doc.tipo_documento === docType)) {
        missingDocs.push(docType);
      }
    });
    
    if (missingDocs.length > 0) {
      violations.push({
        ruleId: 'RN-10',
        severity: 'warning',
        message: 'Para finalizar auditoria, todos os documentos devem estar anexados',
        requiredDocuments: missingDocs
      });
    }
    
    return violations;
  }

  /**
   * Get all rule violations for a process
   */
  static getAllViolations(
    currentStage: string,
    documents: ProcessDocument[]
  ): RuleViolation[] {
    const violations: RuleViolation[] = [];
    
    // Always check critical violations regardless of current stage
    // RN-01: Proforma Invoice requirement (critical - always check)
    const proformaViolation = this.checkProformaInvoiceRule(documents);
    if (proformaViolation) {
      violations.push(proformaViolation);
    }
    
    // Get stage order to check cumulative violations
    const stageOrder = ['solicitado', 'em_transporte_internacional', 'processamento_nacional', 'em_transporte_local', 'recebido', 'auditado'];
    const currentStageIndex = stageOrder.indexOf(currentStage);
    
    // Check violations for current stage and all previous stages
    for (let i = 0; i <= currentStageIndex; i++) {
      const checkStage = stageOrder[i];
      
      switch (checkStage) {
        case 'solicitado':
          // RN-02 & RN-03: Solicitado stage rules
          if (i === currentStageIndex) {
            violations.push(...this.checkSolicitadoStageRules(checkStage, documents));
          }
          break;
          
        case 'em_transporte_internacional':
          // RN-04: Should have BL if reached this stage
          if (i < currentStageIndex && !documents.some(doc => doc.tipo_documento === 'bl')) {
            violations.push({
              ruleId: 'RN-04',
              severity: 'error',
              message: 'Processo avançou sem Bill of Lading (BL)',
              requiredDocuments: ['bl']
            });
          }
          break;
          
        case 'processamento_nacional':
          // RN-05: Should have DI if reached this stage
          if (i < currentStageIndex && !documents.some(doc => doc.tipo_documento === 'di')) {
            violations.push({
              ruleId: 'RN-05',
              severity: 'error',
              message: 'Processo avançou sem Declaração de Importação (DI)',
              requiredDocuments: ['di']
            });
          }
          break;
          
        case 'recebido':
          // RN-07: Should have NF if reached this stage
          if (i < currentStageIndex && !documents.some(doc => doc.tipo_documento === 'nota_fiscal')) {
            violations.push({
              ruleId: 'RN-07',
              severity: 'error',
              message: 'Processo avançou sem Nota Fiscal',
              requiredDocuments: ['nota_fiscal']
            });
          }
          break;
      }
    }
    
    // Check current stage specific violations
    switch (currentStage) {
      case 'em_transporte_internacional':
        violations.push(...this.checkTransportInternacionalTransition(currentStage, documents));
        break;
        
      case 'processamento_nacional':
        violations.push(...this.checkProcessamentoNacionalTransition(currentStage, documents));
        break;
        
      case 'recebido':
        violations.push(...this.checkRecebidoStageRequirements(currentStage, documents));
        break;
        
      case 'auditado':
        violations.push(...this.checkAuditadoRequirements(documents));
        break;
    }
    
    return violations;
  }

  /**
   * Check if a stage transition is allowed
   */
  static checkStageTransition(
    fromStage: string,
    toStage: string,
    documents: ProcessDocument[],
    forceTransition: boolean = false
  ): StageTransition {
    const violations: RuleViolation[] = [];
    
    // Get stage order to determine if it's a forward or backward transition
    const stageOrder = ['solicitado', 'em_transporte_internacional', 'processamento_nacional', 'em_transporte_local', 'recebido', 'auditado'];
    const fromIndex = stageOrder.indexOf(fromStage);
    const toIndex = stageOrder.indexOf(toStage);
    const isBackwardTransition = toIndex < fromIndex;
    
    // Allow all backward transitions without checking documents
    if (isBackwardTransition) {
      return {
        fromStage,
        toStage,
        allowed: true,
        violations: [],
        requiredDocuments: []
      };
    }
    
    // For forward transitions, check required documents
    const requiredDocs = this.STAGE_REQUIREMENTS[toStage] || [];
    const missingDocs: string[] = [];
    
    // Check required documents for target stage
    requiredDocs.forEach(docType => {
      if (!documents.some(doc => doc.tipo_documento === docType)) {
        missingDocs.push(docType);
      }
    });
    
    // RN-08: Allow manual transitions with warnings
    if (missingDocs.length > 0 && !forceTransition) {
      violations.push({
        ruleId: 'RN-08',
        severity: 'warning',
        message: `Documentos faltantes para a etapa "${toStage}": ${missingDocs.join(', ')}`,
        requiredDocuments: missingDocs,
        currentStage: fromStage,
        suggestedStage: fromStage
      });
    }
    
    // Check if transition is in allowed transitions
    const allowedTransitions = KANBAN_CONFIG.TRANSITIONS[fromStage as keyof typeof KANBAN_CONFIG.TRANSITIONS] || [];
    const isAllowedTransition = allowedTransitions.includes(toStage) || forceTransition;
    
    return {
      fromStage,
      toStage,
      allowed: isAllowedTransition && (missingDocs.length === 0 || forceTransition),
      violations,
      requiredDocuments: missingDocs
    };
  }

  /**
   * Get suggested stage based on available documents
   */
  static getSuggestedStage(documents: ProcessDocument[]): string {
    const hasProforma = documents.some(doc => doc.tipo_documento === 'proforma_invoice');
    const hasBL = documents.some(doc => doc.tipo_documento === 'bl');
    const hasDI = documents.some(doc => doc.tipo_documento === 'di');
    const hasNF = documents.some(doc => doc.tipo_documento === 'nota_fiscal');
    
    // Check from most advanced to least
    if (hasProforma && hasBL && hasDI && hasNF) {
      return 'recebido'; // Can be manually moved to 'auditado'
    }
    
    if (hasProforma && hasBL && hasDI) {
      return 'processamento_nacional';
    }
    
    if (hasProforma && hasBL) {
      return 'em_transporte_internacional';
    }
    
    if (hasProforma) {
      return 'solicitado';
    }
    
    // Default to solicitado if no documents
    return 'solicitado';
  }

  /**
   * Get document type information
   */
  static getDocumentTypeInfo(documentType: string): DocumentType | undefined {
    return Object.values(this.DOCUMENT_TYPES).find(doc => doc.type === documentType);
  }

  /**
   * Get all document types
   */
  static getAllDocumentTypes(): DocumentType[] {
    return Object.values(this.DOCUMENT_TYPES);
  }

  /**
   * Get required documents for a stage
   */
  static getStageRequiredDocuments(stage: string): DocumentType[] {
    const requiredTypes = this.STAGE_REQUIREMENTS[stage] || [];
    return requiredTypes
      .map(type => this.getDocumentTypeInfo(type))
      .filter((doc): doc is DocumentType => doc !== undefined);
  }

  /**
   * Format violation message for UI
   */
  static formatViolationMessage(violation: RuleViolation): string {
    let message = violation.message;
    
    if (violation.requiredDocuments && violation.requiredDocuments.length > 0) {
      const docNames = violation.requiredDocuments
        .map(type => this.getDocumentTypeInfo(type)?.name || type)
        .join(', ');
      message += ` (${docNames})`;
    }
    
    return message;
  }
}