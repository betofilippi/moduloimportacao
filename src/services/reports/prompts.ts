import { DocumentType } from '../documents/base/types';

/**
 * Interface for comparison prompt configuration
 */
export interface ComparisonPromptConfig {
  sourceDocumentType: DocumentType;
  targetDocumentType: DocumentType;
  comparisonType: ComparisonType;
  focusAreas: string[];
  outputFormat: OutputFormat;
}

/**
 * Types of comparisons available
 */
export enum ComparisonType {
  CONTAINER_VS_ITEMS = 'container_vs_items',
  FISCAL_TAX_ANALYSIS = 'fiscal_tax_analysis',
  VALUE_RECONCILIATION = 'value_reconciliation',
  QUANTITY_VERIFICATION = 'quantity_verification',
  DOCUMENT_COMPLETENESS = 'document_completeness',
  CUSTOM = 'custom'
}

/**
 * Output format options for comparison results
 */
export enum OutputFormat {
  DETAILED_REPORT = 'detailed_report',
  SUMMARY_TABLE = 'summary_table',
  DISCREPANCY_LIST = 'discrepancy_list',
  VALIDATION_CHECKLIST = 'validation_checklist'
}

/**
 * Interface for comparison results
 */
export interface ComparisonResult {
  comparisonType: ComparisonType;
  timestamp: string;
  summary: {
    totalDiscrepancies: number;
    criticalIssues: number;
    warnings: number;
    matchRate: number; // Percentage of matching data
  };
  details: ComparisonDetail[];
  recommendations?: string[];
}

/**
 * Interface for individual comparison detail
 */
export interface ComparisonDetail {
  field: string;
  sourceValue: any;
  targetValue: any;
  status: 'match' | 'mismatch' | 'missing_in_source' | 'missing_in_target';
  severity: 'critical' | 'warning' | 'info';
  description: string;
  impact?: string;
}

/**
 * Container vs Items Analysis Prompt
 * Compares packing list containers with commercial invoice items
 */
export const containerVsItemsAnalysisPrompt = `You are an expert in import/export documentation analysis. Your task is to compare container information from a Packing List with item details from a Commercial Invoice.

OBJECTIVE: Verify that all items declared in the Commercial Invoice are properly allocated to containers in the Packing List.

INPUT DATA:
1. Packing List Data:
   - Container information (container numbers, types, packages, weights, volumes)
   - Item distribution across containers
   - Package details per item

2. Commercial Invoice Data:
   - Complete item list with quantities
   - Item descriptions (English and Chinese)
   - Unit prices and total values
   - Reference codes

ANALYSIS REQUIREMENTS:

1. ITEM VERIFICATION:
   - Check if ALL commercial invoice items appear in the packing list
   - Verify item descriptions match between documents
   - Compare quantities declared vs distributed in containers
   - Identify any items missing from either document

2. CONTAINER ALLOCATION:
   - Verify each container's capacity vs allocated items
   - Check if item distribution makes logical sense (weight/volume)
   - Identify any over-allocated or under-utilized containers
   - Flag items split across multiple containers

3. QUANTITY RECONCILIATION:
   - Total quantity per item in commercial invoice
   - Sum of quantities distributed across all containers
   - Identify any quantity discrepancies
   - Calculate variance percentages

4. REFERENCE MATCHING:
   - Match item references between documents
   - Flag items with missing or mismatched references
   - Group items by reference for consistency check

OUTPUT FORMAT:
{
  "comparisonType": "container_vs_items",
  "timestamp": "ISO 8601 format",
  "summary": {
    "totalDiscrepancies": number,
    "criticalIssues": number,
    "warnings": number,
    "matchRate": number (0-100)
  },
  "details": [
    {
      "field": "item_allocation",
      "sourceValue": "Item X in Container A",
      "targetValue": "Item X quantity in invoice",
      "status": "match|mismatch|missing_in_source|missing_in_target",
      "severity": "critical|warning|info",
      "description": "Clear description of the finding",
      "impact": "Business impact of this discrepancy"
    }
  ],
  "recommendations": [
    "Actionable recommendations to resolve issues"
  ]
}

CRITICAL CHECKS:
- No item should be missing from packing list if declared in invoice
- Total quantities must match exactly
- Container capacity should not be exceeded
- Items with same reference should be grouped consistently`;

/**
 * Fiscal/Tax Analysis Prompt
 * Compares DI tax information with Nota Fiscal
 */
export const fiscalTaxAnalysisPrompt = `You are an expert in Brazilian import tax and fiscal documentation. Your task is to compare tax information from a DI (Declaração de Importação) with a Nota Fiscal.

OBJECTIVE: Ensure tax calculations and fiscal information are consistent between customs declaration and fiscal invoice.

INPUT DATA:
1. DI (Declaração de Importação) Data:
   - Import taxes (II, IPI, PIS, COFINS, ICMS)
   - Tax calculation bases (VMLE, VMLD)
   - Exchange rate used
   - NCM codes and descriptions
   - Freight and insurance values

2. Nota Fiscal Data:
   - Product values
   - Tax values (ICMS, IPI, PIS, COFINS)
   - Total invoice value
   - NCM codes
   - CFOP codes

ANALYSIS REQUIREMENTS:

1. TAX VALUE VERIFICATION:
   - Compare each tax type between DI and NF
   - Verify calculation bases are consistent
   - Check if exemptions/suspensions are properly reflected
   - Validate total tax amounts

2. NCM CODE MATCHING:
   - Ensure NCM codes match between documents
   - Verify descriptions align with NCM classifications
   - Flag any NCM discrepancies that could affect tax rates

3. VALUE RECONCILIATION:
   - Compare product values (considering exchange rate)
   - Verify freight and insurance allocation
   - Check total invoice value calculation
   - Validate CIF value consistency

4. COMPLIANCE CHECKS:
   - Verify CFOP codes match import operation type
   - Check if tax rates applied are correct for NCM
   - Validate special tax regimes if applicable
   - Ensure proper documentation for tax benefits

OUTPUT FORMAT:
{
  "comparisonType": "fiscal_tax_analysis",
  "timestamp": "ISO 8601 format",
  "summary": {
    "totalDiscrepancies": number,
    "criticalIssues": number,
    "warnings": number,
    "matchRate": number (0-100)
  },
  "details": [
    {
      "field": "tax_field_name",
      "sourceValue": "DI value",
      "targetValue": "NF value",
      "status": "match|mismatch|missing_in_source|missing_in_target",
      "severity": "critical|warning|info",
      "description": "Clear description of the finding",
      "impact": "Fiscal/compliance impact"
    }
  ],
  "recommendations": [
    "Specific actions to ensure fiscal compliance"
  ]
}

CRITICAL VALIDATIONS:
- All tax values must reconcile within acceptable tolerance (0.01%)
- NCM codes must match exactly (affects tax rates)
- Exchange rate must be consistently applied
- Total tax burden should match between documents`;

/**
 * General Comparison Template
 * Extensible template for custom document comparisons
 */
export const generalComparisonTemplate = `You are an expert in document analysis and data validation. Your task is to compare data between two import/export documents.

OBJECTIVE: {{COMPARISON_OBJECTIVE}}

INPUT DATA:
1. Source Document ({{SOURCE_TYPE}}):
   {{SOURCE_FIELDS}}

2. Target Document ({{TARGET_TYPE}}):
   {{TARGET_FIELDS}}

ANALYSIS REQUIREMENTS:

1. FIELD MATCHING:
   - Compare specified fields between documents
   - Identify exact matches and discrepancies
   - Calculate match percentages where applicable
   - Flag missing data in either document

2. BUSINESS RULE VALIDATION:
   {{BUSINESS_RULES}}

3. DATA CONSISTENCY:
   - Verify data formats are consistent
   - Check calculated fields for accuracy
   - Validate referential integrity
   - Ensure logical consistency

4. COMPLIANCE VERIFICATION:
   {{COMPLIANCE_CHECKS}}

OUTPUT FORMAT:
{
  "comparisonType": "{{COMPARISON_TYPE}}",
  "timestamp": "ISO 8601 format",
  "summary": {
    "totalDiscrepancies": number,
    "criticalIssues": number,
    "warnings": number,
    "matchRate": number (0-100)
  },
  "details": [
    {
      "field": "field_name",
      "sourceValue": any,
      "targetValue": any,
      "status": "match|mismatch|missing_in_source|missing_in_target",
      "severity": "critical|warning|info",
      "description": "Clear description of the finding",
      "impact": "Business or compliance impact"
    }
  ],
  "recommendations": [
    "Actionable recommendations"
  ]
}

ANALYSIS GUIDELINES:
- Be precise in identifying discrepancies
- Provide clear descriptions of issues found
- Prioritize findings by business impact
- Suggest practical resolutions`;

/**
 * Helper function to build comparison prompt
 */
export function buildComparisonPrompt(
  config: ComparisonPromptConfig,
  sourceData: any,
  targetData: any
): string {
  switch (config.comparisonType) {
    case ComparisonType.CONTAINER_VS_ITEMS:
      return `${containerVsItemsAnalysisPrompt}

SOURCE DATA (Packing List):
${JSON.stringify(sourceData, null, 2)}

TARGET DATA (Commercial Invoice):
${JSON.stringify(targetData, null, 2)}

Please perform the analysis and return the results in the specified JSON format.`;

    case ComparisonType.FISCAL_TAX_ANALYSIS:
      return `${fiscalTaxAnalysisPrompt}

SOURCE DATA (DI):
${JSON.stringify(sourceData, null, 2)}

TARGET DATA (Nota Fiscal):
${JSON.stringify(targetData, null, 2)}

Please perform the analysis and return the results in the specified JSON format.`;

    case ComparisonType.CUSTOM:
      // Build custom prompt from template
      return buildCustomPrompt(config, sourceData, targetData);

    default:
      throw new Error(`Unsupported comparison type: ${config.comparisonType}`);
  }
}

/**
 * Build custom prompt from template
 */
function buildCustomPrompt(
  config: ComparisonPromptConfig,
  sourceData: any,
  targetData: any
): string {
  let prompt = generalComparisonTemplate;
  
  // Replace placeholders
  prompt = prompt.replace('{{COMPARISON_OBJECTIVE}}', config.focusAreas.join(', '));
  prompt = prompt.replace('{{SOURCE_TYPE}}', config.sourceDocumentType);
  prompt = prompt.replace('{{TARGET_TYPE}}', config.targetDocumentType);
  prompt = prompt.replace('{{COMPARISON_TYPE}}', config.comparisonType);
  
  // Add source and target fields
  const sourceFields = Object.keys(sourceData).join(', ');
  const targetFields = Object.keys(targetData).join(', ');
  prompt = prompt.replace('{{SOURCE_FIELDS}}', sourceFields);
  prompt = prompt.replace('{{TARGET_FIELDS}}', targetFields);
  
  // Add default business rules and compliance checks if not specified
  prompt = prompt.replace('{{BUSINESS_RULES}}', config.focusAreas.join('\\n   '));
  prompt = prompt.replace('{{COMPLIANCE_CHECKS}}', '- Verify data integrity\\n   - Check mandatory fields\\n   - Validate format compliance');
  
  // Append data
  prompt += `

SOURCE DATA:
${JSON.stringify(sourceData, null, 2)}

TARGET DATA:
${JSON.stringify(targetData, null, 2)}

Please perform the analysis and return the results in the specified JSON format.`;
  
  return prompt;
}

/**
 * Specialized prompts for specific comparison scenarios
 */
export const specializedPrompts = {
  /**
   * Swift vs Commercial Invoice payment verification
   */
  swiftPaymentVerification: `Compare SWIFT payment details with Commercial Invoice to ensure:
- Payment amount matches invoice total
- Beneficiary details are correct
- Currency and exchange rates align
- Payment terms are satisfied`,

  /**
   * Proforma vs Commercial Invoice comparison
   */
  proformaVsCommercial: `Compare Proforma Invoice with Commercial Invoice to verify:
- Item descriptions and quantities match
- Prices remain consistent or explain variations
- Terms and conditions are maintained
- Any additional charges are justified`,

  /**
   * Multi-document value reconciliation
   */
  valueReconciliation: `Reconcile values across all import documents:
- FOB/CIF values consistency
- Freight and insurance allocation
- Tax calculation bases
- Final costs vs initial quotations`,

  /**
   * Document completeness check
   */
  documentCompleteness: `Verify all required information is present:
- Mandatory fields per document type
- Cross-referenced data consistency
- Supporting document references
- Regulatory compliance requirements`
};

/**
 * Validation rules for different comparison types
 */
export const comparisonValidationRules = {
  [ComparisonType.CONTAINER_VS_ITEMS]: {
    critical: [
      'All invoice items must be in packing list',
      'Total quantities must match exactly',
      'Container capacity cannot be exceeded'
    ],
    warning: [
      'Item descriptions should be consistent',
      'Reference codes should match',
      'Weight distribution should be logical'
    ]
  },
  [ComparisonType.FISCAL_TAX_ANALYSIS]: {
    critical: [
      'Tax values must match within 0.01% tolerance',
      'NCM codes must be identical',
      'Exchange rate must be consistently applied'
    ],
    warning: [
      'Tax calculation bases should align',
      'CFOP codes should match operation type',
      'Special regimes should be properly documented'
    ]
  }
};

/**
 * Export all prompts and utilities
 */
export const reportPrompts = {
  containerVsItemsAnalysisPrompt,
  fiscalTaxAnalysisPrompt,
  generalComparisonTemplate,
  specializedPrompts,
  comparisonValidationRules,
  buildComparisonPrompt
};