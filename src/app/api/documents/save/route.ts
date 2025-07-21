import { NextRequest, NextResponse } from 'next/server';
import { getSecureSession } from '@/lib/supabase-server';
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
    const auth = await getSecureSession();
    if (!auth?.user) {
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
            userId: auth.user.id,
            fileHash: metadata?.fileHash
          });
          break;
          
        case DocumentType.COMMERCIAL_INVOICE:
          saveResult = await saveService.saveCommercialInvoice(dataToSave, {
            userId: auth.user.id,
            fileHash: metadata?.fileHash
          });
          break;
          
        case DocumentType.PACKING_LIST:
          saveResult = await saveService.savePackingList(dataToSave, {
            userId: auth.user.id,
            fileHash: metadata?.fileHash
          });
          break;
          
        case DocumentType.PROFORMA_INVOICE:
          saveResult = await saveService.saveProformaInvoice(dataToSave, {
            userId: auth.user.id,
            fileHash: metadata?.fileHash
          });
          break;
          
        case DocumentType.SWIFT:
          saveResult = await saveService.saveSwift(dataToSave, {
            userId: auth.user.id,
            fileHash: metadata?.fileHash
          });
          break;
          
        case DocumentType.NUMERARIO:
          saveResult = await saveService.saveNumerario(dataToSave, {
            userId: auth.user.id,
            fileHash: metadata?.fileHash
          });
          break;
          
        case DocumentType.NOTA_FISCAL:
          saveResult = await saveService.saveNotaFiscal(dataToSave, {
            userId: auth.user.id,
            fileHash: metadata?.fileHash
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

      // Update document type in DOCUMENT_UPLOADS table if fileHash is provided
      if (metadata?.fileHash) {
        try {
          console.log('🔄 [SAVE] Updating document type in DOCUMENT_UPLOADS table...');
          console.log('🔍 [SAVE] Looking for document with hash:', metadata.fileHash);
          
          const { getNocoDBService } = await import('@/lib/services/nocodb');
          const { NOCODB_TABLES } = await import('@/config/nocodb-tables');
          const nocodb = getNocoDBService();
          
          // Find upload record by hash
          const uploadRecords = await nocodb.find(NOCODB_TABLES.DOCUMENT_UPLOADS, {
            where: `(hashArquivo,eq,${metadata.fileHash})`,
            limit: 1
          });
          
          console.log('📊 [SAVE] Upload records found:', uploadRecords.list?.length || 0);
          
          if (uploadRecords.list && uploadRecords.list.length > 0) {
            const uploadRecord = uploadRecords.list[0];
            console.log('📋 [SAVE] Current upload record:', {
              Id: uploadRecord.Id,
              currentType: uploadRecord.tipoDocumento,
              currentStatus: uploadRecord.statusProcessamento
            });
            
            // Update document type from 'unknown' to the identified type
            const updateResult = await nocodb.update(
              NOCODB_TABLES.DOCUMENT_UPLOADS,
              uploadRecord.Id,
              {
                Id: uploadRecord.Id,  // NocoDB expects ID in the body
                tipoDocumento: documentType,
                statusProcessamento: 'completo',
                idDocumento: saveResult.documentId || null
              }
            );
            
            console.log(`✅ [SAVE] Updated document type to '${documentType}' for upload ID: ${uploadRecord.Id}`, updateResult);
          } else {
            console.log('⚠️ [SAVE] No upload record found for hash:', metadata.fileHash);
          }
        } catch (error) {
          console.error('❌ [SAVE] Error updating document type in uploads table:', error);
          // Don't fail the save operation due to this
        }
      } else {
        console.log('⚠️ [SAVE] No fileHash provided in metadata, skipping document type update');
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