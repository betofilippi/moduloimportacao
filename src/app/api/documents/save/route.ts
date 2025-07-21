import { NextRequest, NextResponse } from 'next/server';
import { getDocumentSaveService } from '@/services/documents/DocumentSaveService';
import { DocumentType } from '@/services/documents/base/types';
import { getSession } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    // Get user session
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    let { documentType, data, fileHash, processId } = body;
    
    // Handle case where data fields are JSON strings
    if (data && typeof data.header === 'string') {
      try {
        data.header = JSON.parse(data.header);
      } catch (e) {
        console.error('Error parsing header:', e);
      }
    }
    
    if (data && typeof data.items === 'string') {
      try {
        data.items = JSON.parse(data.items);
      } catch (e) {
        console.error('Error parsing items:', e);
      }
    }
    
    // Handle nested data structure from OCR (header.data, items.data)
    if (data.header && data.header.data) {
      data.header = data.header.data;
    }
    if (data.items && data.items.data) {
      data.items = data.items.data;
    }
    
    console.log('Processed data structure:', {
      hasHeader: !!data.header,
      headerFields: data.header ? Object.keys(data.header) : [],
      hasItems: !!data.items,
      itemCount: Array.isArray(data.items) ? data.items.length : 0
    });

    // Validate required fields
    if (!documentType || !data) {
      return NextResponse.json(
        { error: 'Missing required fields: documentType and data' },
        { status: 400 }
      );
    }

    // Validate document type
    const validTypes: DocumentType[] = [
      'commercial_invoice',
      'di',
      'packing_list',
      'proforma_invoice',
      'swift',
      'numerario',
      'nota_fiscal'
    ];

    if (!validTypes.includes(documentType)) {
      return NextResponse.json(
        { error: `Invalid document type: ${documentType}` },
        { status: 400 }
      );
    }

    // Get save service
    const saveService = getDocumentSaveService();
    
    console.log('Saving document:', {
      documentType,
      fileHash,
      processId,
      userId: session.user.id,
      dataStructure: {
        hasHeader: !!data.header,
        hasItems: !!data.items,
        itemCount: data.items ? data.items.length : 0
      }
    });

    // Save document based on type
    let result;
    const saveOptions = {
      fileHash,
      userId: session.user.id,
      processId
    };

    switch (documentType) {
      case 'proforma_invoice':
        result = await saveService.saveProformaInvoice(data, saveOptions);
        break;
      case 'commercial_invoice':
        result = await saveService.saveCommercialInvoice(data, saveOptions);
        break;
      case 'packing_list':
        result = await saveService.savePackingList(data, saveOptions);
        break;
      case 'di':
        result = await saveService.saveDI(data, saveOptions);
        break;
      case 'swift':
        result = await saveService.saveSwift(data, saveOptions);
        break;
      case 'numerario':
        result = await saveService.saveNumerario(data, saveOptions);
        break;
      case 'nota_fiscal':
        result = await saveService.saveNotaFiscal(data, saveOptions);
        break;
      default:
        return NextResponse.json(
          { error: `Unsupported document type: ${documentType}` },
          { status: 400 }
        );
    }

    // Return save result
    if (result.success) {
      return NextResponse.json({
        success: true,
        documentId: result.documentId,
        details: result.details,
        message: `${documentType} saved successfully`
      });
    } else {
      return NextResponse.json(
        { 
          success: false,
          error: result.error || 'Failed to save document',
          details: result.details 
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in document save API:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}