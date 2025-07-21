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
      } else if (extractedData.extractedData) {
        structuredData = extractedData.extractedData;
        console.log('📊 [PROCESS] Using extracted data');
      } else {
        // Direct data format
        structuredData = extractedData;
        console.log('📊 [PROCESS] Using direct data format');
      }

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
      if (!data.swift_code && !data.header?.data?.swift_code) errors.push('Missing SWIFT code');
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
        swiftCode: data.swift_code || data.header?.data?.swift_code,
        amount: data.amount || data.header?.data?.amount,
        currency: data.currency || data.header?.data?.currency
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
    
    default:
      return { documentType, hasData: !!data };
  }
}