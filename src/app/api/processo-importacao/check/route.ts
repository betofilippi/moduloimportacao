import { NextRequest, NextResponse } from 'next/server';
import { getSecureSession } from '@/lib/supabase-server';
import { getNocoDBService } from '@/lib/services/nocodb';
import { NOCODB_TABLES } from '@/config/nocodb-tables';

/**
 * Check import process details including related documents
 * Returns process data, related documents, and upload details
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const auth = await getSecureSession();
    if (!auth?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    let body;
    try {
      const text = await request.text();
      if (!text) {
        return NextResponse.json(
          { error: 'Empty request body' },
          { status: 400 }
        );
      }
      body = JSON.parse(text);
    } catch (parseError) {
      console.error('❌ [CHECK PROCESS] JSON parse error:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    
    const { processId } = body;

    if (!processId) {
      return NextResponse.json(
        { error: 'Process ID is required' },
        { status: 400 }
      );
    }

    console.log('🔍 [CHECK PROCESS] Checking process:', processId);

    const nocodb = getNocoDBService();

    // 1. Get process data
    const processData = await nocodb.findOne(
      NOCODB_TABLES.PROCESSOS_IMPORTACAO,
      processId
    );

    if (!processData) {
      return NextResponse.json(
        { error: 'Process not found' },
        { status: 404 }
      );
    }

    // 2. Get related documents from relationship table
    const relatedDocs = await nocodb.find(NOCODB_TABLES.PROCESSO_DOCUMENTO_REL, {
      where: `(processo_importacao,eq,${processId})`,
      limit: 100
    });

    console.log(`📊 [CHECK PROCESS] Found ${relatedDocs.list.length} related documents`);

    // 3. Get document details from uploads table and their headers
    const documentDetails = [];
    const documentHeaders: Record<string, any> = {};
    
    if (relatedDocs.list.length > 0) {
      // Get unique file hashes
      const fileHashes = [...new Set(relatedDocs.list.map(doc => doc.hash_arquivo_upload))];
      
      // Fetch upload details for each hash
      for (const hash of fileHashes) {
        if (hash) {
          try {
            const uploadRecord = await nocodb.find(NOCODB_TABLES.DOCUMENT_UPLOADS, {
              where: `(hashArquivo,eq,${hash})`,
              limit: 1
            });
            
            if (uploadRecord.list && uploadRecord.list.length > 0) {
              const doc = uploadRecord.list[0];
              documentDetails.push(doc);
              
              // Fetch document header data based on type
              if (doc.tipoDocumento && doc.tipoDocumento !== 'unknown') {
                try {
                  console.log(`🔍 [CHECK PROCESS] Fetching header for ${doc.tipoDocumento} - hash: ${hash}`);
                  
                  const tableMap: Record<string, any> = {
                    'proforma_invoice': NOCODB_TABLES.PROFORMA_INVOICE,
                    'commercial_invoice': NOCODB_TABLES.COMMERCIAL_INVOICE,
                    'packing_list': NOCODB_TABLES.PACKING_LIST,
                    'swift': NOCODB_TABLES.SWIFT,
                    'di': NOCODB_TABLES.DI,
                    'numerario': NOCODB_TABLES.NUMERARIO,
                    'nota_fiscal': NOCODB_TABLES.NOTA_FISCAL,
                    'bl': NOCODB_TABLES.BL,
                    'contrato_cambio': NOCODB_TABLES.CONTRATO_CAMBIO
                  };
                  
                  const tableConfig = tableMap[doc.tipoDocumento];
                  let headerData = null;
                  
                  if (tableConfig) {
                    // Check if it's a multi-table document
                    if (tableConfig.HEADERS) {
                      // Multi-table document (DI, BL) - search in headers by hash
                      console.log(`🔍 [CHECK PROCESS] Searching in multi-table ${doc.tipoDocumento}.HEADERS with hash ${hash}`);
                      const result = await nocodb.find(tableConfig.HEADERS, {
                        where: `(hash_arquivo_origem,eq,${hash})`,
                        limit: 1
                      });
                      
                      if (result.list && result.list.length > 0) {
                        headerData = result.list[0];
                        console.log(`✅ [CHECK PROCESS] Found header data for ${doc.tipoDocumento}`);
                      } else {
                        console.log(`⚠️ [CHECK PROCESS] No header found for ${doc.tipoDocumento} with hash ${hash}`);
                      }
                    } else {
                      // Single table document - search by hash first, then by idDocumento
                      console.log(`🔍 [CHECK PROCESS] Searching in single table ${doc.tipoDocumento} with hash ${hash}`);
                      
                      // Try to find by hash first
                      const result = await nocodb.find(tableConfig, {
                        where: `(hash_arquivo_origem,eq,${hash})`,
                        limit: 1
                      });
                      
                      if (result.list && result.list.length > 0) {
                        headerData = result.list[0];
                        console.log(`✅ [CHECK PROCESS] Found data by hash for ${doc.tipoDocumento}`);
                      } else if (doc.idDocumento) {
                        // Fallback to idDocumento if hash not found
                        console.log(`🔍 [CHECK PROCESS] Trying with idDocumento ${doc.idDocumento}`);
                        headerData = await nocodb.findOne(tableConfig, doc.idDocumento);
                        if (headerData) {
                          console.log(`✅ [CHECK PROCESS] Found data by ID for ${doc.tipoDocumento}`);
                        }
                      }
                    }
                    
                    if (headerData) {
                      // Store complete header data
                      documentHeaders[hash] = {
                        tipoDocumento: doc.tipoDocumento,
                        fullData: headerData,
                        ...extractKeyHeaderFields(doc.tipoDocumento, headerData)
                      };
                      console.log(`✅ [CHECK PROCESS] Stored header data for ${doc.tipoDocumento} with ${Object.keys(headerData).length} fields`);
                    } else {
                      console.log(`❌ [CHECK PROCESS] No data found for ${doc.tipoDocumento}`);
                    }
                  }
                } catch (error) {
                  console.error(`❌ [CHECK PROCESS] Error fetching header for ${doc.tipoDocumento}:`, error);
                }
              }
            }
          } catch (error) {
            console.error(`Error fetching upload for hash ${hash}:`, error);
          }
        }
      }
    }

    console.log(`✅ [CHECK PROCESS] Retrieved ${documentDetails.length} document details`);
    console.log(`📊 [CHECK PROCESS] Headers found: ${Object.keys(documentHeaders).length}`);
    
    // Log a sample of headers for debugging
    Object.entries(documentHeaders).slice(0, 2).forEach(([hash, header]) => {
      console.log(`📄 [CHECK PROCESS] Sample header for ${header.tipoDocumento}:`, {
        hasFullData: !!header.fullData,
        keyFields: Object.keys(header).filter(k => k !== 'fullData'),
        sampleData: header.invoiceNumber || header.proformaNumber || header.diNumber || header.blNumber || 'No key field'
      });
    });

    // 4. Count documents by type
    const documentCounts: Record<string, number> = {};
    const documentTypes: string[] = [];
    
    documentDetails.forEach(doc => {
      if (doc.tipoDocumento && doc.tipoDocumento !== 'unknown') {
        documentCounts[doc.tipoDocumento] = (documentCounts[doc.tipoDocumento] || 0) + 1;
        if (!documentTypes.includes(doc.tipoDocumento)) {
          documentTypes.push(doc.tipoDocumento);
        }
      }
    });

    // 5. Check for missing documents (common import documents)
    const expectedDocuments = [
      'proforma_invoice',
      'commercial_invoice', 
      'packing_list',
      'swift',
      'di',
      'bl'
    ];
    
    const missingDocuments = expectedDocuments.filter(
      docType => !documentTypes.includes(docType)
    );

    // 6. Calculate process stage based on documents
    const processStage = calculateProcessStage(documentTypes);

    // Prepare response
    const response = {
      success: true,
      process: {
        id: processData.Id,
        numero_processo: processData.numero_processo,
        empresa: processData.empresa,
        descricao: processData.descricao,
        responsavel: processData.responsavel,
        status: processData.status,
        data_inicio: processData.data_inicio,
        invoiceNumber: processData.invoiceNumber,
        stage: processStage
      },
      documents: {
        total: documentDetails.length,
        byType: documentCounts,
        types: documentTypes,
        missingTypes: missingDocuments,
        details: documentDetails.map(doc => ({
          id: doc.Id,
          hashArquivo: doc.hashArquivo,
          nomeArquivoOriginal: doc.nomeArquivoOriginal,
          tipoDocumento: doc.tipoDocumento,
          statusProcessamento: doc.statusProcessamento,
          dataUpload: doc.dataUpload,
          idDocumento: doc.idDocumento,
          header: documentHeaders[doc.hashArquivo] || null
        }))
      },
      alerts: {
        missingDocumentsCount: missingDocuments.length,
        hasAllRequiredDocs: missingDocuments.length === 0
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ [CHECK PROCESS] Error:', error);
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
 * Extract key header fields based on document type
 */
function extractKeyHeaderFields(docType: string, headerData: any): Record<string, any> {
  if (!headerData) return {};
  
  // Common fields that might exist in any document
  const commonFields: Record<string, any> = {};
  if (headerData.hash_arquivo_origem) commonFields.hashArquivoOrigem = headerData.hash_arquivo_origem;
  if (headerData.CreatedAt) commonFields.createdAt = headerData.CreatedAt;
  if (headerData.UpdatedAt) commonFields.updatedAt = headerData.UpdatedAt;
  
  switch (docType) {
    case 'proforma_invoice':
      return {
        ...commonFields,
        proformaNumber: headerData.proforma_number,
        supplierName: headerData.supplier_name,
        buyerName: headerData.buyer_name,
        totalAmount: headerData.total_amount,
        issueDate: headerData.issue_date,
        portOfLoading: headerData.port_of_loading,
        portOfDischarge: headerData.port_of_discharge,
        paymentTerms: headerData.payment_terms,
        currency: headerData.currency,
        incoterms: headerData.incoterms
      };
    
    case 'commercial_invoice':
      return {
        ...commonFields,
        invoiceNumber: headerData.invoice_number,
        supplierName: headerData.supplier_name,
        buyerName: headerData.buyer_name,
        totalAmount: headerData.total_amount,
        issueDate: headerData.issue_date,
        paymentTerms: headerData.payment_terms,
        currency: headerData.currency,
        portOfLoading: headerData.port_of_loading,
        portOfDischarge: headerData.port_of_discharge
      };
    
    case 'packing_list':
      return {
        ...commonFields,
        packingListNumber: headerData.packing_list_number,
        invoiceNumber: headerData.invoice_number,
        totalPackages: headerData.total_packages,
        grossWeight: headerData.gross_weight,
        netWeight: headerData.net_weight,
        issueDate: headerData.issue_date,
        shipper: headerData.shipper,
        consignee: headerData.consignee
      };
    
    case 'swift':
      return {
        ...commonFields,
        swiftCode: headerData.swift_code,
        amount: headerData.amount,
        currency: headerData.currency,
        beneficiary: headerData.beneficiary,
        beneficiaryBank: headerData.beneficiary_bank,
        senderBank: headerData.sender_bank,
        valueDate: headerData.value_date,
        referenceNumber: headerData.reference_number,
        remittanceInformation: headerData.remittance_information
      };
    
    case 'di':
      return {
        ...commonFields,
        diNumber: headerData.di_number,
        registrationDate: headerData.registration_date,
        clearanceLocation: headerData.clearance_location,
        importerName: headerData.importer_name,
        importerCnpj: headerData.importer_cnpj,
        totalValue: headerData.total_value,
        channel: headerData.channel,
        transportMode: headerData.transport_mode,
        arrivalDate: headerData.arrival_date
      };
    
    case 'bl':
      return {
        ...commonFields,
        blNumber: headerData.bl_number,
        issueDate: headerData.issue_date,
        shipper: headerData.shipper,
        consignee: headerData.consignee,
        notifyParty: headerData.notify_party,
        vesselName: headerData.vessel_name,
        voyageNumber: headerData.voyage_number,
        portOfLoading: headerData.port_of_loading,
        portOfDischarge: headerData.port_of_discharge,
        carrierName: headerData.carrier_name,
        placeOfReceipt: headerData.place_of_receipt,
        placeOfDelivery: headerData.place_of_delivery
      };
    
    case 'contrato_cambio':
      return {
        ...commonFields,
        contrato: headerData.contrato,
        valorEstrangeiro: headerData.valor_estrangeiro,
        data: headerData.data,
        taxa: headerData.taxa,
        valorReal: headerData.valor_real,
        banco: headerData.banco,
        importador: headerData.importador,
        exportador: headerData.exportador,
        fatura: headerData.fatura,
        operacao: headerData.operacao
      };
    
    case 'numerario':
      return {
        ...commonFields,
        diNumber: headerData.di_number,
        nfeNumber: headerData.numero_nf || headerData.nfe_number,
        totalValue: headerData.valor_liquido || headerData.total_value,
        invoiceNumber: headerData.invoice_number,
        cnpjCpf: headerData.cnpj_cpf,
        tipoDocumento: headerData.tipo_documento,
        dataEmissao: headerData.data_emissao,
        description: headerData.descricao
      };
      
    case 'nota_fiscal':
      return {
        ...commonFields,
        nfeNumber: headerData.nfe_number,
        issuerName: headerData.issuer_name,
        issuerCnpj: headerData.issuer_cnpj,
        recipientName: headerData.recipient_name,
        recipientCnpj: headerData.recipient_cnpj,
        totalValue: headerData.total_value,
        issueDate: headerData.issue_date,
        operationType: headerData.operation_type,
        serie: headerData.serie
      };
    
    default:
      // Return all fields for unknown types
      return {
        ...commonFields,
        ...headerData
      };
  }
}

/**
 * Calculate process stage based on available documents
 */
function calculateProcessStage(documentTypes: string[]): string {
  if (documentTypes.includes('di')) {
    return 'nacionalizacao';
  } else if (documentTypes.includes('bl')) {
    return 'transporte';
  } else if (documentTypes.includes('swift')) {
    return 'pagamento';
  } else if (documentTypes.includes('commercial_invoice') || documentTypes.includes('proforma_invoice')) {
    return 'negociacao';
  } else {
    return 'inicial';
  }
}