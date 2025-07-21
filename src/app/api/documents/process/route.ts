import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/supabase-server';
import { DocumentType } from '@/services/documents/base/types';

/**
 * STEP 2: Process document with identified type
 * - Receives storage path and document type
 * - Runs OCR with specific document prompts
 * - Returns extracted structured data
 */
export async function POST(request: NextRequest) {
  console.log('🔄 [PROCESS] Starting document processing with identified type');
  
  try {
    // Check authentication
    const session = await getSession();
    if (!session?.user) {
      console.log('❌ [PROCESS] Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { storagePath, documentType, fileHash, originalFileName } = body;

    console.log('📋 [PROCESS] Request received:', {
      storagePath,
      documentType,
      fileHash,
      originalFileName
    });

    // Validate inputs
    if (!storagePath || !documentType || !fileHash) {
      console.log('❌ [PROCESS] Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields: storagePath, documentType, fileHash' },
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
      console.log(`🎯 [PROCESS] Processing as ${documentType}...`);

      // Call extract-claude-multi with the correct document type
      const extractData = {
        storagePath,
        fileType: '.pdf',
        documentType,
        fileHash
      };

      const extractResponse = await fetch(
        new URL('/api/ocr/extract-claude-multi', request.url).toString(),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': request.headers.get('cookie') || ''
          },
          body: JSON.stringify(extractData)
        }
      );

      if (!extractResponse.ok) {
        const errorData = await extractResponse.json();
        console.log('❌ [PROCESS] OCR extraction failed:', errorData);
        throw new Error(errorData.error || 'Failed to extract document data');
      }

      const extractResult = await extractResponse.json();
      console.log('✅ [PROCESS] OCR extraction successful');

      // Parse extracted data based on document type
      let structuredData;
      if (extractResult.data?.structuredResult) {
        structuredData = extractResult.data.structuredResult;
        console.log('📊 [PROCESS] Using structured result from multi-step extraction');
      } else if (extractResult.data?.extractedData) {
        structuredData = extractResult.data.extractedData;
        console.log('📊 [PROCESS] Using extracted data');
      } else {
        console.log('⚠️ [PROCESS] No structured data found, using raw text');
        structuredData = { rawText: extractResult.data?.rawText || '' };
      }

      // Log key fields based on document type
      console.log('🔍 [PROCESS] Extracted key fields:', getKeyFields(documentType, structuredData));

      // Prepare response
      const response = {
        success: true,
        documentType,
        extractedData: structuredData,
        metadata: {
          storagePath,
          fileHash,
          originalFileName,
          processingTime: extractResult.data?.metadata?.processingTime,
          tokenUsage: extractResult.data?.metadata?.tokenUsage,
          multiStep: extractResult.data?.metadata?.multiPrompt || false
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
      return {
        diNumber: data.diInfo?.data?.di_number,
        nfeNumber: data.header?.data?.nfe_number,
        totalAmount: data.header?.data?.total_value
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