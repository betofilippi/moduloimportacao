import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/supabase-server';
import { DocumentSaveService } from '@/services/documents/DocumentSaveService';
import { DocumentType } from '@/services/documents/base/types';

/**
 * STEP 3: Save extracted document data to database
 * - Receives structured data and document type
 * - Saves to appropriate NocoDB table
 * - Returns save confirmation with document ID
 */
export async function POST(request: NextRequest) {
  console.log('💾 [SAVE] Starting document save process');
  
  try {
    // Check authentication
    const session = await getSession();
    if (!session?.user) {
      console.log('❌ [SAVE] Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { documentType, extractedData, metadata } = body;

    console.log('📋 [SAVE] Save request received:', {
      documentType,
      hasExtractedData: !!extractedData,
      metadata: {
        fileHash: metadata?.fileHash,
        originalFileName: metadata?.originalFileName,
        storagePath: metadata?.storagePath
      }
    });

    // Validate inputs
    if (!documentType || !extractedData) {
      console.log('❌ [SAVE] Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields: documentType, extractedData' },
        { status: 400 }
      );
    }

    // Validate document type
    if (!Object.values(DocumentType).includes(documentType as DocumentType)) {
      console.log('❌ [SAVE] Invalid document type:', documentType);
      return NextResponse.json(
        { error: `Invalid document type: ${documentType}` },
        { status: 400 }
      );
    }

    try {
      console.log(`🎯 [SAVE] Saving ${documentType} to database...`);

      // Initialize save service
      const saveService = new DocumentSaveService();
      
      // Prepare data based on document structure
      // Handle multi-step extraction structure (data comes from process endpoint)
      let dataToSave: any;
      
      // Check if extractedData has the multi-step structure
      if (extractedData.header || extractedData.items || extractedData.containers) {
        // Multi-step structure - pass as is
        dataToSave = {
          ...extractedData,
          fileHash: metadata?.fileHash,
          originalFileName: metadata?.originalFileName,
          storagePath: metadata?.storagePath
        };
      } else {
        // Simple structure - wrap in expected format
        dataToSave = {
          ...extractedData,
          fileHash: metadata?.fileHash,
          originalFileName: metadata?.originalFileName,
          storagePath: metadata?.storagePath
        };
      }
      
      console.log(`📊 [SAVE] Data structure for ${documentType}:`, {
        hasHeader: !!dataToSave.header,
        hasItems: !!dataToSave.items,
        hasContainers: !!dataToSave.containers,
        directFields: Object.keys(dataToSave).filter(k => !['header', 'items', 'containers', 'fileHash', 'originalFileName', 'storagePath'].includes(k))
      });

      // Save to database using specific save method for each document type
      let saveResult: any;
      
      switch (documentType) {
        case DocumentType.DI:
          saveResult = await saveService.saveDI(dataToSave, {
            userId: session.user.id
          });
          break;
          
        case DocumentType.COMMERCIAL_INVOICE:
          saveResult = await saveService.saveCommercialInvoice(dataToSave, {
            userId: session.user.id
          });
          break;
          
        case DocumentType.PACKING_LIST:
          saveResult = await saveService.savePackingList(dataToSave, {
            userId: session.user.id
          });
          break;
          
        case DocumentType.PROFORMA_INVOICE:
          saveResult = await saveService.saveProformaInvoice(dataToSave, {
            userId: session.user.id
          });
          break;
          
        case DocumentType.SWIFT:
          saveResult = await saveService.saveSwift(dataToSave, {
            userId: session.user.id
          });
          break;
          
        case DocumentType.NUMERARIO:
          saveResult = await saveService.saveNumerario(dataToSave, {
            userId: session.user.id
          });
          break;
          
        case DocumentType.NOTA_FISCAL:
          saveResult = await saveService.saveNotaFiscal(dataToSave, {
            userId: session.user.id
          });
          break;
          
        default:
          saveResult = {
            success: false,
            error: `Save method not implemented for document type: ${documentType}`
          };
      }

      if (!saveResult.success) {
        console.log('❌ [SAVE] Save failed:', saveResult.error);
        throw new Error(saveResult.error || 'Failed to save document');
      }

      console.log('✅ [SAVE] Document saved successfully:', {
        documentId: saveResult.documentId,
        documentType,
        tableUsed: getTableName(documentType)
      });

      // Log saved fields for debugging
      if (saveResult.details?.saved) {
        const savedFields = Object.keys(saveResult.details.saved);
        console.log('📊 [SAVE] Saved fields:', savedFields.slice(0, 10), 
          savedFields.length > 10 ? `... and ${savedFields.length - 10} more` : '');
      }

      // Prepare response
      const response = {
        success: true,
        documentId: saveResult.documentId,
        documentType,
        savedAt: new Date().toISOString(),
        message: `${documentType} salvo com sucesso`,
        details: {
          tableUsed: getTableName(documentType),
          fieldsCount: saveResult.details?.saved ? Object.keys(saveResult.details.saved).length : 0
        }
      };

      console.log('✅ [SAVE] Save complete:', {
        success: true,
        documentId: saveResult.documentId,
        documentType
      });

      return NextResponse.json(response);

    } catch (saveError) {
      console.error('❌ [SAVE] Save error:', saveError);
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to save document',
          details: saveError instanceof Error ? saveError.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ [SAVE] General error:', error);
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
 * Get table name for document type (for logging)
 */
function getTableName(documentType: string): string {
  const tableMap: Record<string, string> = {
    [DocumentType.PROFORMA_INVOICE]: 'ProformaInvoice',
    [DocumentType.COMMERCIAL_INVOICE]: 'CommercialInvoice',
    [DocumentType.PACKING_LIST]: 'PackingList',
    [DocumentType.SWIFT]: 'Swift',
    [DocumentType.DI]: 'DI',
    [DocumentType.NUMERARIO]: 'Numerario',
    [DocumentType.NOTA_FISCAL]: 'NotaFiscal'
  };
  
  return tableMap[documentType] || 'Unknown';
}