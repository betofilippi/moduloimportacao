import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/supabase-server';
import { DocumentType } from '@/services/documents/base/types';

/**
 * STEP 2: Process document with already extracted data
 * - Receives extracted data from OCR
 * - Validates and prepares data for saving
 * - Returns structured data ready for database
 */
export async function POST(request: NextRequest) {
  console.log('🔄 [PROCESS] Processing document with extracted data');
  
  try {
    // Check authentication
    const session = await getSession();
    if (!session?.user) {
      console.log('❌ [PROCESS] Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { documentType, extractedData, fileHash, originalFileName, storagePath } = body;

    console.log('📋 [PROCESS] Request received:', {
      documentType,
      hasExtractedData: !!extractedData,
      fileHash,
      originalFileName,
      storagePath
    });
    
    console.log('📊 [PROCESS] ExtractedData structure:', {
      hasStructuredResult: !!extractedData?.structuredResult,
      hasSteps: !!extractedData?.steps,
      hasExtractedData: !!extractedData?.extractedData,
      keys: Object.keys(extractedData || {}),
      firstStepResult: extractedData?.steps?.[0]?.result ? 
        (typeof extractedData.steps[0].result === 'string' ? 'string' : 'object') : 
        'no steps'
    });

    // Validate inputs
    if (!documentType || !extractedData || !fileHash) {
      console.log('❌ [PROCESS] Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields: documentType, extractedData, fileHash' },
        { status: 400 }
      );
    }

    // Validate document type
    if (!Object.values(DocumentType).includes(documentType as DocumentType)) {
      console.log('❌ [PROCESS] Invalid document type:', documentType);
      return NextResponse.json(
        { error: `Invalid document type: ${documentType}` },
        { status: 400 }
      );
    }

    try {
      console.log(`🎯 [PROCESS] Processing ${documentType} data...`);

      // Parse and validate extracted data structure
      let structuredData;
      if (extractedData.structuredResult) {
        structuredData = extractedData.structuredResult;
        console.log('📊 [PROCESS] Using structured result from multi-step extraction');
      } else if (extractedData.steps && extractedData.steps.length > 0) {
        // Handle multi-step OCR format
        structuredData = extractedData;
        console.log('📊 [PROCESS] Using multi-step OCR format with steps');
      } else if (extractedData.extractedData) {
        structuredData = extractedData.extractedData;
        console.log('📊 [PROCESS] Using extracted data');
      } else {
        // Direct data format
        structuredData = extractedData;
        console.log('📊 [PROCESS] Using direct data format');
      }

      // Log the actual structured data for debugging
      console.log('🔍 [PROCESS] Structured data:', JSON.stringify(structuredData, null, 2));
      
      // Log key fields based on document type
      console.log('🔍 [PROCESS] Processing key fields:', getKeyFields(documentType, structuredData));

      // Validate the structure based on document type
      const validationErrors = validateDocumentData(documentType, structuredData);
      if (validationErrors.length > 0) {
        console.log('❌ [PROCESS] Validation errors:', validationErrors);
        return NextResponse.json(
          { 
            success: false,
            error: 'Data validation failed',
            validationErrors
          },
          { status: 400 }
        );
      }

      // Prepare response
      const response = {
        success: true,
        documentType,
        extractedData: structuredData,
        metadata: {
          storagePath,
          fileHash,
          originalFileName,
          processingTime: extractedData.metadata?.processingTime,
          tokenUsage: extractedData.metadata?.tokenUsage,
          multiStep: extractedData.metadata?.multiPrompt || false
        },
        readyToSave: true,
        message: `Documento ${documentType} processado com sucesso`
      };

      console.log('✅ [PROCESS] Processing complete:', {
        success: true,
        documentType,
        hasData: !!structuredData,
        readyToSave: true
      });

      return NextResponse.json(response);

    } catch (processingError) {
      console.error('❌ [PROCESS] Processing error:', processingError);
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to process document',
          details: processingError instanceof Error ? processingError.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ [PROCESS] General error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

/**
 * Validate document data structure
 */
function validateDocumentData(documentType: string, data: any): string[] {
  const errors: string[] = [];
  
  if (!data) {
    errors.push('No data provided');
    return errors;
  }

  // Basic validation based on document type
  switch (documentType) {
    case DocumentType.PROFORMA_INVOICE:
      if (!data.header?.data) errors.push('Missing header data');
      if (!data.items?.data || !Array.isArray(data.items.data)) errors.push('Missing or invalid items data');
      break;
      
    case DocumentType.COMMERCIAL_INVOICE:
      if (!data.header?.data) errors.push('Missing header data');
      if (!data.items?.data || !Array.isArray(data.items.data)) errors.push('Missing or invalid items data');
      break;
      
    case DocumentType.PACKING_LIST:
      if (!data.header?.data) errors.push('Missing header data');
      break;
      
    case DocumentType.SWIFT:
      // Swift can have direct fields or header.data structure
      // Check for message_type (new format) or swift_code (legacy)
      if (!data.swift_code && !data.header?.data?.swift_code && 
          !data.message_type && !data.header?.data?.message_type) {
        errors.push('Missing SWIFT message type or code');
      }
      break;
      
    case DocumentType.DI:
      if (!data.header?.data) errors.push('Missing header data');
      break;
      
    case DocumentType.NUMERARIO:
      // Numerário pode ter dados em diInfo.data ou header.data
      if (!data.diInfo?.data && !data.header?.data) {
        errors.push('Missing numerario data (expected in diInfo or header)');
      }
      break;
      
    case DocumentType.NOTA_FISCAL:
      if (!data.header?.data) errors.push('Missing header data');
      break;
      
    case DocumentType.BL:
      // BL uses multi-step with header and containers
      if (!data.header?.data) errors.push('Missing header data');
      break;
      
    case DocumentType.CONTRATO_CAMBIO:
      // Contrato de Câmbio can have data in various structures
      const hasContractData = data.header?.data || data.data || data.contrato || 
                             (data.steps && data.steps.length > 0 && data.steps[0].result) ||
                             data.valor_estrangeiro; // Direct fields
      if (!hasContractData) errors.push('Missing contract data');
      break;
  }
  
  return errors;
}

/**
 * Extract key fields for logging based on document type
 */
function getKeyFields(documentType: string, data: any): Record<string, any> {
  switch (documentType) {
    case DocumentType.PROFORMA_INVOICE:
      return {
        proformaNumber: data.header?.data?.proforma_number,
        supplierName: data.header?.data?.supplier_name,
        totalAmount: data.header?.data?.total_amount,
        itemCount: data.items?.data?.length || 0
      };
    
    case DocumentType.COMMERCIAL_INVOICE:
      return {
        invoiceNumber: data.header?.data?.invoice_number,
        totalAmount: data.header?.data?.total_amount,
        itemCount: data.items?.data?.length || 0
      };
    
    case DocumentType.PACKING_LIST:
      return {
        packingListNumber: data.header?.data?.packing_list_number,
        containerCount: data.containers?.data?.length || 0,
        itemCount: data.items?.data?.length || 0
      };
    
    case DocumentType.SWIFT:
      return {
        swiftCode: data.swift_code || data.header?.data?.swift_code || 
                   data.message_type || data.header?.data?.message_type,
        messageType: data.message_type || data.header?.data?.message_type,
        amount: data.amount || data.header?.data?.amount,
        currency: data.currency || data.header?.data?.currency,
        sendersReference: data.senders_reference || data.header?.data?.senders_reference,
        transactionReference: data.transaction_reference || data.header?.data?.transaction_reference
      };
    
    case DocumentType.DI:
      return {
        diNumber: data.header?.data?.di_number,
        registrationDate: data.header?.data?.registration_date,
        itemCount: data.items?.data?.length || 0
      };
    
    case DocumentType.NUMERARIO:
      // Numerário tem estrutura especial com diInfo
      const numerarioData = data.diInfo?.data || data.header?.data || {};
      return {
        diNumber: numerarioData.di_number,
        nfeNumber: numerarioData.numero_nf || numerarioData.nfe_number,
        totalAmount: numerarioData.valor_liquido || numerarioData.total_value,
        invoiceNumber: numerarioData.invoice_number,
        tipoDocumento: numerarioData.tipo_documento
      };
    
    case DocumentType.NOTA_FISCAL:
      return {
        nfeNumber: data.header?.data?.nfe_number,
        issuerCNPJ: data.header?.data?.issuer_cnpj,
        totalValue: data.header?.data?.total_value
      };
    
    case DocumentType.BL:
      return {
        blNumber: data.header?.data?.bl_number,
        issueDate: data.header?.data?.issue_date,
        shipper: data.header?.data?.shipper,
        consignee: data.header?.data?.consignee,
        containerCount: data.containers?.data?.length || 0
      };
    
    case DocumentType.CONTRATO_CAMBIO:
      // Handle multiple possible data structures for Contrato de Câmbio
      let contractData;
      if (data.header?.data) {
        // Multi-step format with header.data structure (from structuredResult)
        contractData = data.header.data;
      } else if (data.steps && data.steps.length > 0 && data.steps[0].result) {
        // Multi-step format with steps array
        contractData = typeof data.steps[0].result === 'string' 
          ? JSON.parse(data.steps[0].result) 
          : data.steps[0].result;
      } else if (data.data?.data) {
        contractData = data.data.data;
      } else if (data.data) {
        contractData = data.data;
      } else {
        contractData = data;
      }
      
      return {
        contrato: contractData.contrato,
        data: contractData.data,
        valorEstrangeiro: contractData.valor_estrangeiro,
        fatura: contractData.fatura
      };
    
    default:
      return { documentType, hasData: !!data };
  }
}