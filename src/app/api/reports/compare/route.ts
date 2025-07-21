import { NextRequest, NextResponse } from 'next/server';
import { getProcessDocumentService } from '@/lib/services/ProcessDocumentService';
import { getNocoDBService } from '@/lib/services/nocodb';
import { NOCODB_TABLES, TABLE_FIELD_MAPPINGS } from '@/config/nocodb-tables';
import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export type ComparisonType = 
  | 'proforma_vs_commercial' 
  | 'commercial_vs_packing' 
  | 'di_vs_nota_fiscal'
  | 'full_process';

interface ComparisonRequest {
  processId: string;
  comparisonType: ComparisonType;
  exportFormat?: 'json' | 'csv';
  includeDetails?: boolean;
}

interface ComparisonField {
  field: string;
  proforma?: any;
  commercial?: any;
  packing?: any;
  di?: any;
  notaFiscal?: any;
  match: boolean;
  discrepancy?: string;
}

interface ComparisonResult {
  processId: string;
  comparisonType: ComparisonType;
  timestamp: string;
  summary: {
    totalFields: number;
    matchingFields: number;
    discrepancies: number;
    matchPercentage: number;
  };
  fields: ComparisonField[];
  aiAnalysis?: {
    summary: string;
    criticalDiscrepancies: string[];
    recommendations: string[];
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: ComparisonRequest = await request.json();
    const { processId, comparisonType, exportFormat = 'json', includeDetails = true } = body;

    // Validate request
    if (!processId) {
      return NextResponse.json(
        { success: false, error: 'Process ID is required' },
        { status: 400 }
      );
    }

    if (!comparisonType) {
      return NextResponse.json(
        { success: false, error: 'Comparison type is required' },
        { status: 400 }
      );
    }

    // Get document service
    const processDocService = getProcessDocumentService();
    const nocodb = getNocoDBService();

    // Get all documents for the process
    const processDocuments = await processDocService.getProcessDocuments(processId);

    if (!processDocuments.documents || Object.keys(processDocuments.documents).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No documents found for this process' },
        { status: 404 }
      );
    }

    // Fetch document data based on comparison type
    const documentsData: Record<string, any> = {};
    
    const fetchDocument = async (docType: string, tableId: string) => {
      const docInfo = processDocuments.documents[docType as keyof typeof processDocuments.documents];
      if (docInfo?.idDocumento) {
        const result = await nocodb.findById(tableId, docInfo.idDocumento);
        if (result) {
          documentsData[docType] = result;
        }
      }
    };

    // Fetch required documents based on comparison type
    switch (comparisonType) {
      case 'proforma_vs_commercial':
        await Promise.all([
          fetchDocument('proforma_invoice', NOCODB_TABLES.PROFORMA_INVOICE),
          fetchDocument('commercial_invoice', NOCODB_TABLES.COMMERCIAL_INVOICE)
        ]);
        break;
      
      case 'commercial_vs_packing':
        await Promise.all([
          fetchDocument('commercial_invoice', NOCODB_TABLES.COMMERCIAL_INVOICE),
          fetchDocument('packing_list', NOCODB_TABLES.PACKING_LIST)
        ]);
        break;
      
      case 'di_vs_nota_fiscal':
        await Promise.all([
          fetchDocument('di', NOCODB_TABLES.DI),
          fetchDocument('nota_fiscal', NOCODB_TABLES.NOTA_FISCAL)
        ]);
        break;
      
      case 'full_process':
        await Promise.all([
          fetchDocument('proforma_invoice', NOCODB_TABLES.PROFORMA_INVOICE),
          fetchDocument('commercial_invoice', NOCODB_TABLES.COMMERCIAL_INVOICE),
          fetchDocument('packing_list', NOCODB_TABLES.PACKING_LIST),
          fetchDocument('di', NOCODB_TABLES.DI),
          fetchDocument('nota_fiscal', NOCODB_TABLES.NOTA_FISCAL)
        ]);
        break;
    }

    // Perform comparison
    const comparisonResult = await performComparison(
      processId,
      comparisonType,
      documentsData,
      includeDetails
    );

    // Export to CSV if requested
    if (exportFormat === 'csv') {
      const csv = convertToCSV(comparisonResult);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="comparison_${processId}_${comparisonType}.csv"`
        }
      });
    }

    // Return JSON response
    return NextResponse.json({
      success: true,
      result: comparisonResult
    });

  } catch (error) {
    console.error('Document comparison error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error during document comparison',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function performComparison(
  processId: string,
  comparisonType: ComparisonType,
  documentsData: Record<string, any>,
  includeDetails: boolean
): Promise<ComparisonResult> {
  const fields: ComparisonField[] = [];
  
  // Define comparison fields based on type
  const comparisonFields = getComparisonFields(comparisonType);
  
  // Perform field-by-field comparison
  for (const fieldDef of comparisonFields) {
    const field: ComparisonField = {
      field: fieldDef.name,
      match: true
    };
    
    // Extract values from each document type
    if (fieldDef.proforma && documentsData.proforma_invoice) {
      field.proforma = getNestedValue(documentsData.proforma_invoice, fieldDef.proforma);
    }
    
    if (fieldDef.commercial && documentsData.commercial_invoice) {
      field.commercial = getNestedValue(documentsData.commercial_invoice, fieldDef.commercial);
    }
    
    if (fieldDef.packing && documentsData.packing_list) {
      field.packing = getNestedValue(documentsData.packing_list, fieldDef.packing);
    }
    
    if (fieldDef.di && documentsData.di) {
      field.di = getNestedValue(documentsData.di, fieldDef.di);
    }
    
    if (fieldDef.notaFiscal && documentsData.nota_fiscal) {
      field.notaFiscal = getNestedValue(documentsData.nota_fiscal, fieldDef.notaFiscal);
    }
    
    // Check for matches
    const values = [field.proforma, field.commercial, field.packing, field.di, field.notaFiscal]
      .filter(v => v !== undefined);
    
    if (values.length > 1) {
      // Compare values (handle numbers, strings, dates)
      const normalizedValues = values.map(v => normalizeValue(v));
      field.match = normalizedValues.every(v => v === normalizedValues[0]);
      
      if (!field.match) {
        field.discrepancy = `Values differ: ${values.join(' vs ')}`;
      }
    }
    
    fields.push(field);
  }
  
  // Calculate summary
  const totalFields = fields.length;
  const matchingFields = fields.filter(f => f.match).length;
  const discrepancies = totalFields - matchingFields;
  const matchPercentage = totalFields > 0 ? (matchingFields / totalFields) * 100 : 100;
  
  const result: ComparisonResult = {
    processId,
    comparisonType,
    timestamp: new Date().toISOString(),
    summary: {
      totalFields,
      matchingFields,
      discrepancies,
      matchPercentage
    },
    fields: includeDetails ? fields : []
  };
  
  // Get AI analysis if there are discrepancies
  if (discrepancies > 0 && includeDetails) {
    try {
      const aiAnalysis = await getAIAnalysis(comparisonType, fields, documentsData);
      result.aiAnalysis = aiAnalysis;
    } catch (error) {
      console.error('Error getting AI analysis:', error);
    }
  }
  
  return result;
}

async function getAIAnalysis(
  comparisonType: ComparisonType,
  fields: ComparisonField[],
  documentsData: Record<string, any>
): Promise<ComparisonResult['aiAnalysis']> {
  const discrepancies = fields.filter(f => !f.match);
  
  const prompt = `
Analyze the following discrepancies found in import document comparison:

Comparison Type: ${comparisonType}
Number of Discrepancies: ${discrepancies.length}

Discrepant Fields:
${discrepancies.map(d => `- ${d.field}: ${d.discrepancy}`).join('\n')}

Document Context:
${JSON.stringify(documentsData, null, 2)}

Please provide:
1. A brief summary of the discrepancies found
2. List critical discrepancies that could impact the import process
3. Recommendations to resolve these discrepancies

Format your response as JSON with the following structure:
{
  "summary": "brief summary text",
  "criticalDiscrepancies": ["discrepancy 1", "discrepancy 2"],
  "recommendations": ["recommendation 1", "recommendation 2"]
}
`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1
    });

    const content = response.content[0];
    if (content.type === 'text') {
      const parsed = JSON.parse(content.text);
      return {
        summary: parsed.summary || 'No summary available',
        criticalDiscrepancies: parsed.criticalDiscrepancies || [],
        recommendations: parsed.recommendations || []
      };
    }
  } catch (error) {
    console.error('Error calling Claude API:', error);
  }

  return {
    summary: 'Unable to generate AI analysis',
    criticalDiscrepancies: [],
    recommendations: []
  };
}

function getComparisonFields(comparisonType: ComparisonType): Array<{
  name: string;
  proforma?: string;
  commercial?: string;
  packing?: string;
  di?: string;
  notaFiscal?: string;
}> {
  switch (comparisonType) {
    case 'proforma_vs_commercial':
      return [
        { name: 'Invoice Number', proforma: 'invoice_number', commercial: 'invoice_number' },
        { name: 'Supplier', proforma: 'exporter_name', commercial: 'supplier_name' },
        { name: 'Total FOB', proforma: 'total_fob_value', commercial: 'fob_total' },
        { name: 'Currency', proforma: 'currency', commercial: 'currency' },
        { name: 'Payment Terms', proforma: 'payment_terms', commercial: 'payment_terms' },
        { name: 'Incoterm', proforma: 'incoterm', commercial: 'incoterms' },
        { name: 'Country of Origin', proforma: 'country_of_origin', commercial: 'country_of_origin' }
      ];
    
    case 'commercial_vs_packing':
      return [
        { name: 'Invoice Number', commercial: 'invoice_number', packing: 'invoice_number' },
        { name: 'Total Packages', commercial: 'total_packages', packing: 'total_packages' },
        { name: 'Gross Weight', commercial: 'gross_weight', packing: 'gross_weight' },
        { name: 'Net Weight', commercial: 'net_weight', packing: 'net_weight' },
        { name: 'Container Number', commercial: 'container_number', packing: 'container_number' }
      ];
    
    case 'di_vs_nota_fiscal':
      return [
        { name: 'DI Number', di: 'di_number', notaFiscal: 'di_number' },
        { name: 'Total Value', di: 'total_customs_value', notaFiscal: 'total_value' },
        { name: 'NCM Codes', di: 'ncm_codes', notaFiscal: 'ncm_codes' },
        { name: 'Import Date', di: 'registration_date', notaFiscal: 'emission_date' }
      ];
    
    case 'full_process':
      return [
        { 
          name: 'Invoice Number', 
          proforma: 'invoice_number', 
          commercial: 'invoice_number',
          packing: 'invoice_number'
        },
        {
          name: 'Total FOB Value',
          proforma: 'total_fob_value',
          commercial: 'fob_total'
        },
        {
          name: 'Currency',
          proforma: 'currency',
          commercial: 'currency'
        },
        {
          name: 'Gross Weight',
          commercial: 'gross_weight',
          packing: 'gross_weight'
        },
        {
          name: 'Net Weight', 
          commercial: 'net_weight',
          packing: 'net_weight'
        },
        {
          name: 'Total Customs Value',
          di: 'total_customs_value',
          notaFiscal: 'total_value'
        }
      ];
    
    default:
      return [];
  }
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

function normalizeValue(value: any): string {
  if (value === null || value === undefined) return '';
  
  // Handle numbers
  if (typeof value === 'number') {
    return value.toFixed(2);
  }
  
  // Handle dates
  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }
  
  // Handle date strings
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.split('T')[0];
  }
  
  // Handle arrays (like NCM codes)
  if (Array.isArray(value)) {
    return value.sort().join(',');
  }
  
  // Default to string
  return String(value).trim().toLowerCase();
}

function convertToCSV(result: ComparisonResult): string {
  const headers = ['Field', 'Match'];
  const docTypes: string[] = [];
  
  // Determine which document types are present
  if (result.fields.length > 0) {
    const firstField = result.fields[0];
    if (firstField.proforma !== undefined) {
      headers.push('Proforma Invoice');
      docTypes.push('proforma');
    }
    if (firstField.commercial !== undefined) {
      headers.push('Commercial Invoice');
      docTypes.push('commercial');
    }
    if (firstField.packing !== undefined) {
      headers.push('Packing List');
      docTypes.push('packing');
    }
    if (firstField.di !== undefined) {
      headers.push('DI');
      docTypes.push('di');
    }
    if (firstField.notaFiscal !== undefined) {
      headers.push('Nota Fiscal');
      docTypes.push('notaFiscal');
    }
  }
  
  headers.push('Discrepancy');
  
  // Build CSV rows
  const rows = [headers.join(',')];
  
  // Add summary row
  rows.push(`\nSummary,${result.summary.matchPercentage.toFixed(1)}% match`);
  rows.push(`Total Fields,${result.summary.totalFields}`);
  rows.push(`Matching,${result.summary.matchingFields}`);
  rows.push(`Discrepancies,${result.summary.discrepancies}\n`);
  
  // Add field comparisons
  for (const field of result.fields) {
    const row = [
      field.field,
      field.match ? 'Yes' : 'No'
    ];
    
    for (const docType of docTypes) {
      row.push(field[docType as keyof ComparisonField] || '');
    }
    
    row.push(field.discrepancy || '');
    rows.push(row.map(v => `"${v}"`).join(','));
  }
  
  // Add AI analysis if available
  if (result.aiAnalysis) {
    rows.push('\n\nAI Analysis');
    rows.push(`Summary,"${result.aiAnalysis.summary}"`);
    rows.push('\nCritical Discrepancies');
    result.aiAnalysis.criticalDiscrepancies.forEach(d => {
      rows.push(`,"${d}"`);
    });
    rows.push('\nRecommendations');
    result.aiAnalysis.recommendations.forEach(r => {
      rows.push(`,"${r}"`);
    });
  }
  
  return rows.join('\n');
}

// GET endpoint to retrieve comparison types
export async function GET(request: NextRequest) {
  return NextResponse.json({
    comparisonTypes: [
      {
        value: 'proforma_vs_commercial',
        label: 'Proforma vs Commercial Invoice',
        description: 'Compare proforma invoice with commercial invoice'
      },
      {
        value: 'commercial_vs_packing',
        label: 'Commercial Invoice vs Packing List',
        description: 'Compare commercial invoice with packing list'
      },
      {
        value: 'di_vs_nota_fiscal',
        label: 'DI vs Nota Fiscal',
        description: 'Compare import declaration with fiscal note'
      },
      {
        value: 'full_process',
        label: 'Full Process Comparison',
        description: 'Compare all documents in the import process'
      }
    ]
  });
}