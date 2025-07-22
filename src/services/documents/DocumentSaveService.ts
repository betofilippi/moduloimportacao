/**
 * Document Save Service
 * 
 * Centralized service for saving all document types to NocoDB
 * Handles complex document structures with multiple related tables
 */

import { NocoDBService } from '@/lib/services/NocoDBService';
import { getNocoDBService } from '@/lib/services/nocodb';
import { 
  NOCODB_TABLES, 
  TABLE_FIELD_MAPPINGS, 
  transformToNocoDBFormat 
} from '@/config/nocodb-tables';
import { DIProcessingResult } from '@/services/documents/di/types';
import { CommercialInvoiceProcessingResult } from '@/services/documents/commercial-invoice/types';
import { PackingListProcessingResult } from '@/services/documents/packing-list/types';
import { ProformaInvoiceProcessingResult } from '@/services/documents/proforma-invoice/types';
import { SwiftData } from '@/services/documents/swift/types';
import { NumerarioProcessingResult } from '@/services/documents/numerario/types';
import { NotaFiscalProcessingResult } from '@/services/documents/nota-fiscal/types';
import { BLProcessingResult } from '@/services/documents/bl/types';
import { ContratoCambioProcessingResult } from '@/services/documents/contrato-cambio/types';
import { da } from 'date-fns/locale';

export interface SaveResult {
  success: boolean;
  documentId?: string;
  error?: string;
  details?: {
    headers?: any;
    items?: any[];
    taxInfo?: any[];
    containers?: any[];
  };
}

export interface SaveOptions {
  userId?: string;
  overwrite?: boolean;
  validateBeforeSave?: boolean;
  fileHash?: string;
}

export class DocumentSaveService {
  private nocodb: NocoDBService;

  constructor() {
    this.nocodb = getNocoDBService();
  }

  /**
   * Extract data from multi-step or direct structure
   * Handles both { data: actualData } and direct data formats
   */
  private extractData(data: any, fallback: any = null): any {
    // If data has .data property, extract it
    if (data && data.data !== undefined) {
      return data.data;
    }
    // Otherwise return the data itself or fallback
    return data || fallback;
  }

  /**
   * Reset document data by deleting all related records
   */
  async resetDocumentData(fileHash: string, documentType: string): Promise<SaveResult> {
    try {
      console.log(`Resetting data for document type: ${documentType}, hash: ${fileHash}`);
      
      let resetResult: SaveResult;
      
      switch(documentType.toLowerCase()) {
        case 'di':
          resetResult = await this.resetDI(fileHash);
          break;
          
        case 'commercial_invoice':
          resetResult = await this.resetCommercialInvoice(fileHash);
          break;
          
        case 'packing_list':
          resetResult = await this.resetPackingList(fileHash);
          break;
          
        case 'proforma_invoice':
          resetResult = await this.resetProformaInvoice(fileHash);
          break;
          
        case 'swift':
          resetResult = await this.resetSwift(fileHash);
          break;
          
        case 'numerario':
          resetResult = await this.resetNumerario(fileHash);
          break;
          
        case 'nota_fiscal':
          resetResult = await this.resetNotaFiscal(fileHash);
          break;
          
        case 'bl':
          resetResult = await this.resetBL(fileHash);
          break;
          
        case 'contrato_cambio':
          resetResult = await this.resetContratoCambio(fileHash);
          break;
          
        default:
          resetResult = {
            success: false,
            error: `Tipo de documento não suportado: ${documentType}`
          };
      }
      
      // If reset was successful, update document status to pending
      if (resetResult.success) {
        const statusUpdateResult = await this.updateDocumentStatusToPending(fileHash);
        
        if (!statusUpdateResult.success) {
          console.warn('Data deleted successfully but failed to update status:', statusUpdateResult.error);
        } else {
          console.log('Document data reset and status updated to pending');
        }
      }
      
      return resetResult;
    } catch (error) {
      console.error('Error resetting document data:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao resetar dados'
      };
    }
  }

  private async resetDI(fileHash: string): Promise<SaveResult> {
    // Delete tax info first (child records)
    await this.deleteRecords(NOCODB_TABLES.DI.TAX_INFO, fileHash);
    
    // Delete items
    await this.deleteRecords(NOCODB_TABLES.DI.ITEMS, fileHash);
    
    // Delete header last
    await this.deleteRecords(NOCODB_TABLES.DI.HEADERS, fileHash);
    
    return { success: true };
  }

  private async resetCommercialInvoice(fileHash: string): Promise<SaveResult> {
    // Delete items first
    await this.deleteRecords(NOCODB_TABLES.COMMERCIAL_INVOICE.ITEMS, fileHash);
    
    // Delete header
    await this.deleteRecords(NOCODB_TABLES.COMMERCIAL_INVOICE.HEADERS, fileHash);
    
    return { success: true };
  }

  private async resetPackingList(fileHash: string): Promise<SaveResult> {
    // Delete items first
    await this.deleteRecords(NOCODB_TABLES.PACKING_LIST.ITEMS, fileHash);
    
    // Delete containers
    await this.deleteRecords(NOCODB_TABLES.PACKING_LIST.CONTAINER, fileHash);
    
    // Delete header
    await this.deleteRecords(NOCODB_TABLES.PACKING_LIST.HEADERS, fileHash);
    
    return { success: true };
  }

  private async resetProformaInvoice(fileHash: string): Promise<SaveResult> {
    // Delete items first
    await this.deleteRecords(NOCODB_TABLES.PROFORMA_INVOICE.ITEMS, fileHash);
    
    // Delete header
    await this.deleteRecords(NOCODB_TABLES.PROFORMA_INVOICE.HEADERS, fileHash);
    
    return { success: true };
  }

  private async resetSwift(fileHash: string): Promise<SaveResult> {
    // Swift only has header
    await this.deleteRecords(NOCODB_TABLES.SWIFT, fileHash);
    
    return { success: true };
  }

  private async resetNumerario(fileHash: string): Promise<SaveResult> {
    // Numerario only has single table
    await this.deleteRecords(NOCODB_TABLES.NUMERARIO, fileHash);
    
    return { success: true };
  }

  private async resetNotaFiscal(fileHash: string): Promise<SaveResult> {
    // Delete items first
    await this.deleteRecords(NOCODB_TABLES.NOTA_FISCAL.ITEMS, fileHash);
    
    // Delete header
    await this.deleteRecords(NOCODB_TABLES.NOTA_FISCAL.HEADERS, fileHash);
    
    return { success: true };
  }
  
  private async resetBL(fileHash: string): Promise<SaveResult> {
    // Delete containers first
    await this.deleteRecords(NOCODB_TABLES.BL.CONTAINERS, fileHash);
    
    // Delete header
    await this.deleteRecords(NOCODB_TABLES.BL.HEADERS, fileHash);
    
    return { success: true };
  }
  
  private async resetContratoCambio(fileHash: string): Promise<SaveResult> {
    // Contrato de Câmbio only has single table
    await this.deleteRecords(NOCODB_TABLES.CONTRATO_CAMBIO, fileHash);
    
    return { success: true };
  }

  private async deleteRecords(tableName: string, fileHash: string): Promise<void> {
    try {
      // Find all records with the file hash
      console.log('LOG FIND INIT DELET RECORD')
      const records = await this.nocodb.find(tableName, {
        where: `(hash_arquivo_origem,eq,${fileHash})`,
        limit:1000
      });
      console.log(records);
      // Delete each record
      for (const record of records.list) {
        await this.nocodb.delete(tableName, record.Id);
      }
      
      console.log(`Deleted ${records.list.length} records from ${tableName}`);
    } catch (error) {
      console.error(`Error deleting records from ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Save DI (Declaração de Importação) document
   */
  async saveDI(data: DIProcessingResult, options: SaveOptions = {}): Promise<SaveResult> {
    try {
      const { userId = 'system' } = options;
      const timestamp = new Date().toISOString();
      console.log('LOG DATA NOCODB INSERT DI')
      console.log(data)
      
      // Extract header data - handle multi-step structure
      const headerSource = data.header || data.structuredResult?.header || {};
      const extractedHeader = this.extractData(headerSource, {});
      
      // Prepare header data
      const headerData = {
        ...extractedHeader,
        createdAt: timestamp,
        updatedAt: timestamp,
        createdBy: userId,
      };

      console.log('HEADER DATA',headerData)

      // Transform to NocoDB format
      const transformedHeader = transformToNocoDBFormat(
        headerData,
        TABLE_FIELD_MAPPINGS.DI_HEADER
      );
      
      // Add file hash
      console.log(options.fileHash)
      if (options.fileHash) {
        transformedHeader.hash_arquivo_origem = options.fileHash;
      }

      // Save header
      console.log('DADO TRANFORMADO PAR NOCODB',transformedHeader)
      const savedHeader = await this.nocodb.create(
        NOCODB_TABLES.DI.HEADERS,
        transformedHeader
      );

      const numeroDI = savedHeader.numero_DI || savedHeader.numero_di;

      // Extract and save items
      const itemsSource = data.items || data.structuredResult?.items || [];
      const itemsArray = this.extractData(itemsSource, []);
      const savedItems = [];
      if (Array.isArray(itemsArray) && itemsArray.length > 0) {
        for (const item of itemsArray) {
          const itemData = {
            ...item,
            numero_di: numeroDI, // Use the field name expected by mapping
          };
          console.log('ITEM A SER TRNASFORMADO',itemData)
          const transformedItem = transformToNocoDBFormat(
            itemData,
            TABLE_FIELD_MAPPINGS.DI_ITEM
          );
          
          // Add file hash
          if (options.fileHash) {
            transformedItem.hash_arquivo_origem = options.fileHash;
          }

          const savedItem = await this.nocodb.create(
            NOCODB_TABLES.DI.ITEMS,
            transformedItem
          );
          savedItems.push(savedItem);
        }
      }
      // Extract and save tax info
      const taxInfoArray = this.extractData(data.taxInfo, []);
      const savedTaxInfo = [];
      if (Array.isArray(taxInfoArray) && taxInfoArray.length > 0) {
        for (const item of taxInfoArray) {
          const itemData = {
            ...item,
            numero_di: numeroDI, // Use the field name expected by mapping (not used in tax mapping but kept for consistency)
          };

          const transformedItemTax = transformToNocoDBFormat(
            itemData,
            TABLE_FIELD_MAPPINGS.DI_TAX_ITEM
          );
          
          // Add file hash
          if (options.fileHash) {
            transformedItemTax.hash_arquivo_origem = options.fileHash;
          }

          const savedTax = await this.nocodb.create(
            NOCODB_TABLES.DI.TAX_INFO,
            transformedItemTax
          );
          savedTaxInfo.push(savedTax);
        }
      }

      

      return {
        success: true,
        documentId: numeroDI,
        details: {
          headers: savedHeader,
          items: savedItems,
          taxInfo: savedTaxInfo,
        },
      };
    } catch (error) {
      console.error('Error saving DI:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Save Commercial Invoice document
   */
  async saveCommercialInvoice(data: CommercialInvoiceProcessingResult, options: SaveOptions = {}): Promise<SaveResult> {
    try {
      console.log("INICIADO SAVE COMMERCIAL", data);
      
      // Extract header data - handle multi-step structure
      const headerSource = data.header || data.structuredResult?.header || {};
      const headerData = this.extractData(headerSource, data);
      console.log('DADOS HEADER EXTRAÍDOS:', headerData);
      // Transform to NocoDB format
      const transformedHeader = transformToNocoDBFormat(
        headerData,
        TABLE_FIELD_MAPPINGS.COMMERCIAL_INVOICE_HEADER
      );
      
      // Add file hash
      if (options.fileHash) {
        transformedHeader.hash_arquivo_origem = options.fileHash;
      }
      
      console.log('DADOS TREANFORMADOS',transformedHeader)

      // Save header
      const savedHeader = await this.nocodb.create(
        NOCODB_TABLES.COMMERCIAL_INVOICE.HEADERS,
        transformedHeader
      );

      const invoiceNumber = savedHeader.invoiceNumber || savedHeader.invoice_number;

      // Extract items - handle multi-step structure
      const itemsSource = data.items || data.structuredResult?.items || [];
      const itemsArray = this.extractData(itemsSource, []);
      console.log(`ITEMS EXTRAÍDOS: ${Array.isArray(itemsArray) ? itemsArray.length : 0} items`);

      // Save items
      const savedItems = [];
      if (itemsArray.length > 0) {
        for (let i = 0; i < itemsArray.length; i++) {
          const item = itemsArray[i];
          const itemData = {
            invoice_number: invoiceNumber, // Use the OCR field name that maps to invoiceNumber in DB
            item_number: i + 1, // Map lineNumber to item_number
            ...item,
          };

          const COMMERCIAL_INVOICE_ITEM = transformToNocoDBFormat(itemData, TABLE_FIELD_MAPPINGS.COMMERCIAL_INVOICE_ITEM);
          
          // Add file hash
          if (options.fileHash) {
            COMMERCIAL_INVOICE_ITEM.hash_arquivo_origem = options.fileHash;
          }

          const savedItem = await this.nocodb.create(
            NOCODB_TABLES.COMMERCIAL_INVOICE.ITEMS,
            COMMERCIAL_INVOICE_ITEM
          );
          savedItems.push(savedItem);
        }
      }

      return {
        success: true,
        documentId: invoiceNumber,
        details: {
          headers: savedHeader,
          items: savedItems,
        },
      };
    } catch (error) {
      console.error('Error saving Commercial Invoice:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Save Packing List document
   */
  async savePackingList(data: PackingListProcessingResult, options: SaveOptions = {}): Promise<SaveResult> {
    try {
      const { userId = 'system' } = options;
      const timestamp = new Date().toISOString();

      // Extract header data - handle multi-step structure
      const headerSource = data.header || data.structuredResult?.header || {};
      const extractedHeader = this.extractData(headerSource, {});
      
      // Prepare header data using the correct field mappings
      const headerData = {
        consignee: extractedHeader.consignee,
        contracted_company: extractedHeader.contracted_company,
        contracted_email: extractedHeader.contracted_email,
        date: extractedHeader.date,
        destination: extractedHeader.destination,
        invoice: extractedHeader.invoice,
        items_qty_total: extractedHeader.items_qty_total,
        load_port: extractedHeader.load_port,
        notify_party: extractedHeader.notify_party,
        package_total: extractedHeader.package_total,
        total_gw: extractedHeader.total_gw
      };

      // Transform to NocoDB format
      const transformedHeader = transformToNocoDBFormat(
        headerData,
        TABLE_FIELD_MAPPINGS.PACKING_LIST_HEADER
      );
      
      // Add file hash
      if (options.fileHash) {
        transformedHeader.hash_arquivo_origem = options.fileHash;
      }

      // Save header
      const savedHeader = await this.nocodb.create(
        NOCODB_TABLES.PACKING_LIST.HEADERS,
        transformedHeader
      );

      const invoiceNumber = savedHeader.invoiceNumber || savedHeader.invoice;

      // Extract and save containers
      const containersArray = this.extractData(data.containers, []);
      const savedContainers = [];
      if (Array.isArray(containersArray) && containersArray.length > 0) {
        for (const container of containersArray) {
          const containerData = {
            booking: container.booking,
            container: container.container,
            from_item: container.from_item,
            from_package: container.from_package,
            invoice: container.invoice,
            peso_bruto: container.peso_bruto,
            quantidade_de_pacotes: container.quantidade_de_pacotes,
            tipo_container: container.tipo_container,
            to_item: container.to_item,
            to_package: container.to_package,
            volume: container.volume
          };

          const transformedContainer = transformToNocoDBFormat(
            containerData,
            TABLE_FIELD_MAPPINGS.PACKING_LIST_CONTAINER
          );

          if (options.fileHash) {
            transformedContainer.hash_arquivo_origem = options.fileHash;
          }

          const savedContainer = await this.nocodb.create(
            NOCODB_TABLES.PACKING_LIST.CONTAINER,
            transformedContainer
          );
          savedContainers.push(savedContainer);
        }
      }

      // Extract and save items
      const itemsArray = this.extractData(data.items_por_container || data.items, []);
      const savedItems = [];
      if (Array.isArray(itemsArray) && itemsArray.length > 0) {
        for (const item of itemsArray) {
          const itemData = {
            altura_pacote: item.altura_pacote,
            comprimento_pacote: item.comprimento_pacote,
            container: item.container,
            descricao_chines: item.descricao_chines,
            descricao_ingles: item.descricao_ingles,
            numero_item: item.item_number || item.numero_item, // Map item_number to numero_item
            largura_pacote: item.largura_pacote,
            marcacao_do_pacote: item.marcacao_do_pacote,
            peso_bruto_por_pacote: item.peso_bruto_por_pacote,
            peso_bruto_total: item.peso_bruto_total,
            peso_liquido_por_pacote: item.peso_liquido_por_pacote,
            peso_liquido_total: item.peso_liquido_total,
            quantidade_de_pacotes: item.quantidade_de_pacotes,
            quantidade_por_pacote: item.quantidade_por_pacote,
            quantidade_total: item.quantidade_total,
            reference: item.reference
          };

          // Transform to NocoDB format
          const transformedItem = transformToNocoDBFormat(
            itemData,
            TABLE_FIELD_MAPPINGS.PACKING_LIST_ITEM
          );

          // Add file hash
          if (options.fileHash) {
            transformedItem.hash_arquivo_origem = options.fileHash;
          }
          
          const savedItem = await this.nocodb.create(
            NOCODB_TABLES.PACKING_LIST.ITEMS,
            transformedItem
          );
          savedItems.push(savedItem);
        }
      }

      return {
        success: true,
        documentId: invoiceNumber,
        details: {
          headers: savedHeader,
          items: savedItems,
          containers: savedContainers,
        },
      };
    } catch (error) {
      console.error('Error saving Packing List:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Save Proforma Invoice document
   */
  async saveProformaInvoice(data: ProformaInvoiceProcessingResult, options: SaveOptions = {}): Promise<SaveResult> {
    try {
      const { userId = 'system' } = options;
      const timestamp = new Date().toISOString();

      console.log('SaveProformaInvoice - Input data:', JSON.stringify(data, null, 2));
      
      // Extract header data - handle multi-step structure
      const headerSource = data.header || data.structuredResult?.header || {};
      const extractedHeader = this.extractData(headerSource, {});
      console.log('SaveProformaInvoice - Extracted header:', extractedHeader);

      // Prepare header data with proper field mapping
      const headerData = {
        invoice_number: extractedHeader.invoice_number || extractedHeader.proforma_number || '',
        contracted_company: extractedHeader.contracted_company || extractedHeader.seller,
        contracted_email: extractedHeader.contracted_email,
        date: extractedHeader.date || extractedHeader.invoice_date,
        load_port: extractedHeader.load_port,
        destination: extractedHeader.destination,
        total_price: extractedHeader.total_price || extractedHeader.total_amount,
        payment_terms: extractedHeader.payment_terms,
        package: extractedHeader.package,
        createdAt: timestamp,
        updatedAt: timestamp,
        createdBy: userId,
      };
      
      console.log('SaveProformaInvoice - Prepared headerData:', headerData);

      // Transform to NocoDB format
      const transformedHeader = transformToNocoDBFormat(
        headerData,
        TABLE_FIELD_MAPPINGS.PROFORMA_INVOICE_HEADER
      );
      
      console.log('SaveProformaInvoice - Transformed header:', transformedHeader);

      // Add file hash
      if (options.fileHash) {
        transformedHeader.hash_arquivo_origem = options.fileHash;
      }
      
      // Save header
      const savedHeader = await this.nocodb.create(
        NOCODB_TABLES.PROFORMA_INVOICE.HEADERS,
        transformedHeader
      );

      const proformaNumber = savedHeader.invoiceNumber || savedHeader.invoice_number || headerData.invoice_number;

      // Extract and save items (from containers in proforma invoice)
      const savedItems = [];
      const itemsSource = data.containers || data.items || data.structuredResult?.items || [];
      const itemsArray = this.extractData(itemsSource, []);
      if (itemsArray.length > 0) {
        for (let i = 0; i < itemsArray.length; i++) {
          const item = itemsArray[i];
          const itemData = {
            // Note: invoiceNumber is not in the mapping, so we add it directly to transformed data
            item_number: item.item_number || (i + 1),
            item: item.item || '',
            description_in_english: item.description_in_english || '',
            description_in_chinese: item.description_in_chinese || '',
            specifications: item.specifications || '',
            quantity: item.quantity,
            unit_price: item.unit_price,
            package: item.package || '',
          };

          // Transform to NocoDB format
          const transformedItem = transformToNocoDBFormat(
            itemData,
            TABLE_FIELD_MAPPINGS.PROFORMA_INVOICE_ITEM
          );

          // Add file hash and invoice number (not in mapping)
          if (options.fileHash) {
            transformedItem.hash_arquivo_origem = options.fileHash;
          }
          transformedItem.invoiceNumber = proformaNumber; // Add directly since not in mapping
          
          const savedItem = await this.nocodb.create(
            NOCODB_TABLES.PROFORMA_INVOICE.ITEMS,
            transformedItem
          );
          savedItems.push(savedItem);
        }
      }

      // Update document upload status to complete if fileHash provided
      if (options.fileHash) {
        try {
          const uploads = await this.nocodb.find(NOCODB_TABLES.UPLOADS, {
            where: `(fileHash,eq,${options.fileHash})`,
            limit: 1
          });
          
          if (uploads.list.length > 0) {
            await this.nocodb.update(
              NOCODB_TABLES.UPLOADS,
              uploads.list[0].Id,
              {
                statusProcessamento: 'completo',
                dataProcessamento: timestamp,
                resultadoProcessamento: JSON.stringify({
                  documentId: proformaNumber,
                  savedAt: timestamp
                })
              }
            );
          }
        } catch (uploadError) {
          console.error('Error updating upload status:', uploadError);
          // Don't fail the save operation due to upload status update failure
        }
      }

      return {
        success: true,
        documentId: proformaNumber,
        details: {
          headers: savedHeader,
          items: savedItems,
        },
      };
    } catch (error) {
      console.error('Error saving Proforma Invoice:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Flatten Swift nested data structure for database storage
   */
  private flattenSwiftData(data: any): Record<string, any> {
    const flattened: Record<string, any> = {};
    
    // Simple fields
    flattened.message_type = data.message_type;
    flattened.senders_reference = data.senders_reference;
    flattened.transaction_reference = data.transaction_reference;
    flattened.uetr = data.uetr;
    flattened.bank_operation_code = data.bank_operation_code;
    flattened.value_date = data.value_date || data.data_valor;
    flattened.currency = data.currency;
    flattened.amount = data.amount;
    flattened.fatura = data.fatura || data.invoiceNumber;
    flattened.details_of_charges = data.details_of_charges;
    flattened.remittance_information = data.remittance_information;
    flattened.account_with_institution_bic = data.account_with_institution_bic;
    
    // Flatten ordering_customer
    if (data.ordering_customer) {
      flattened.ordering_customer_name = data.ordering_customer.name || '';
      flattened.ordering_customer_address = data.ordering_customer.address || '';
    }
    
    // Flatten ordering_institution
    if (data.ordering_institution) {
      flattened.ordering_institution_name = data.ordering_institution.name || '';
      flattened.ordering_institution_bic = data.ordering_institution.bic || '';
      flattened.ordering_institution_address = data.ordering_institution.address || '';
    }
    
    // Flatten receiver_institution
    if (data.receiver_institution) {
      flattened.receiver_institution_name = data.receiver_institution.name || '';
      flattened.receiver_institution_bic = data.receiver_institution.bic || '';
    }
    
    // Flatten beneficiary
    if (data.beneficiary) {
      flattened.beneficiary_account = data.beneficiary.account || '';
      flattened.beneficiary_name = data.beneficiary.name || '';
      flattened.beneficiary_address = data.beneficiary.address || '';
    }
    
    return flattened;
  }

  /**
   * Prepare Swift data for saving by flattening nested structure
   */
  private prepareSwiftData(data: SwiftData): Record<string, any> {
    // Extract the actual data - handle multiple possible structures
    const swiftInfo = this.extractData(data.header, data);
    
    // Flatten the nested structure
    return this.flattenSwiftData(swiftInfo);
  }

  /**
   * Save Swift document
   */
  async saveSwift(data: SwiftData, options: SaveOptions = {}): Promise<SaveResult> {
    try {
      const { userId = 'system' } = options;
      const timestamp = new Date().toISOString();

        console.log('antes de preparar',data);
      // Prepare data with proper structure
      const preparedData = this.prepareSwiftData(data);
      
console.log('depois de preparar',preparedData);

      const swiftData = {
        ...preparedData,
        createdAt: timestamp,
        updatedAt: timestamp,
        createdBy: userId,
      };

      // Transform to NocoDB format - now with proper nested object support
      const transformedData = transformToNocoDBFormat(
        swiftData,
        TABLE_FIELD_MAPPINGS.SWIFT
      );
      
      // Add file hash
      if (options.fileHash) {
        transformedData.hash_arquivo_origem = options.fileHash;
      }

      // Save to single table
      const savedSwift = await this.nocodb.create(
        NOCODB_TABLES.SWIFT,
        transformedData
      );

      return {
        success: true,
        documentId: savedSwift.Id || savedSwift.id || savedSwift.invoiceNumber,
        details: {
          headers: savedSwift,
        },
      };
    } catch (error) {
      console.error('Error saving Swift:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Prepare Numerario data for saving
   */
  private prepareNumerarioData(data: any): Record<string, any> {
    console.log('🔍 prepareNumerarioData - full data:', data);
    console.log('🔍 prepareNumerarioData - data keys:', Object.keys(data));
    
    // Extract data from multi-step structure
    const diInfo = this.extractData(data.diInfo, {});
    const header = this.extractData(data.header, {});
    const items = this.extractData(data.items, []);
    
    console.log('📦 Extracted data - diInfo:', diInfo);
    console.log('📦 Extracted data - header:', header);
    console.log('📦 Extracted data - items count:', Array.isArray(items) ? items.length : 0);
    
    // Merge all relevant data
    const preparedData = {
      ...diInfo,
      ...header,
      items: items,
      hash_arquivo_origem: data.fileHash || data.hash_arquivo_origem || '',
      criado_por: data.userId || 'sistema',
      atualizado_por: data.userId || 'sistema'
    };
    
    console.log('✅ Prepared data for NocoDB:', preparedData);
    return preparedData;
  }

  /**
   * Save Numerario document
   */
  async saveNumerario(data: NumerarioProcessingResult, options: SaveOptions = {}): Promise<SaveResult> {
    try {
      const { userId = 'system' } = options;
      const timestamp = new Date().toISOString();

      // Prepare data with correct structure
      const preparedData = this.prepareNumerarioData(data);
      
      const numerarioData = {
        ...preparedData,
        createdAt: timestamp,
        updatedAt: timestamp,
        createdBy: userId,
      };

      // Transform to NocoDB format
      const transformedData = transformToNocoDBFormat(
        numerarioData,
        TABLE_FIELD_MAPPINGS.NUMERARIO
      );
      
      // Add file hash
      if (options.fileHash) {
        transformedData.hash_arquivo_origem = options.fileHash;
      }

      // Save to single table
      const savedNumerario = await this.nocodb.create(
        NOCODB_TABLES.NUMERARIO,
        transformedData
      );

      return {
        success: true,
        documentId: savedNumerario.invoiceNumber || savedNumerario.id,
        details: {
          headers: savedNumerario,
        },
      };
    } catch (error) {
      console.error('Error saving Numerario:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Save BL (Bill of Lading) document
   */
  async saveBL(data: BLProcessingResult, options: SaveOptions = {}): Promise<SaveResult> {
    try {
      const { userId = 'system' } = options;
      const timestamp = new Date().toISOString();

      console.log('saveBL - Raw data received:', data);
      console.log('saveBL - Header data:', data.header);
      console.log('saveBL - Containers data:', data.containers);
      console.log('saveBL - fileHash:', options.fileHash);

      // Save header
      const headerData = {
        ...data.header,
        createdAt: timestamp,
        updatedAt: timestamp,
        createdBy: userId,
      };

      // Transform header to NocoDB format
      const transformedHeader = transformToNocoDBFormat(
        headerData,
        TABLE_FIELD_MAPPINGS.BL_HEADER
      );
      
      // Add file hash
      if (options.fileHash) {
        transformedHeader.hash_arquivo_origem = options.fileHash;
      }

      console.log('saveBL - Transformed header:', transformedHeader);

      // Save header
      const savedHeader = await this.nocodb.create(
        NOCODB_TABLES.BL.HEADERS,
        transformedHeader
      );

      console.log('✅ Saved BL header');

      // Save containers if present
      const savedContainers = [];
      if (data.containers && data.containers.length > 0) {
        for (const container of data.containers) {
          const containerData = {
            ...container,
            bl_number: data.header?.bl_number || savedHeader.bl_number,
          };
          
          const transformedContainer = transformToNocoDBFormat(
            containerData,
            TABLE_FIELD_MAPPINGS.BL_CONTAINER
          );
          
          // Add file hash
          if (options.fileHash) {
            transformedContainer.hash_arquivo_origem = options.fileHash;
          }

          const savedContainer = await this.nocodb.create(
            NOCODB_TABLES.BL.CONTAINERS,
            transformedContainer
          );
          savedContainers.push(savedContainer);
        }
      }

      console.log('✅ Saved BL containers:', savedContainers.length);

      return {
        success: true,
        documentId: savedHeader.bl_number || savedHeader.Id,
        details: {
          headers: savedHeader,
          containers: savedContainers,
        },
      };
    } catch (error) {
      console.error('Error saving BL:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao salvar BL',
      };
    }
  }

  /**
   * Save Contrato de Câmbio document
   */
  async saveContratoCambio(data: ContratoCambioProcessingResult, options: SaveOptions = {}): Promise<SaveResult> {
    try {
      const { userId = 'system' } = options;
      const timestamp = new Date().toISOString();

      console.log('saveContratoCambio - Raw data received:', JSON.stringify(data, null, 2));
      console.log('saveContratoCambio - Data structure:', {
        hasSteps: !!(data.steps && data.steps.length > 0),
        hasData: !!data.data,
        directKeys: Object.keys(data || {})
      });
      console.log('saveContratoCambio - fileHash:', options.fileHash);

      // Extract contract data - handle multi-step OCR format
      let cambioData;
      
      // Check for structuredResult format first (most common from OCR)
      if (data.structuredResult?.header?.data) {
        console.log('saveContratoCambio - Using structuredResult.header.data format');
        cambioData = data.structuredResult.header.data;
      } else if (data.header?.data) {
        console.log('saveContratoCambio - Using header.data format');
        // Multi-step format with header.data structure
        cambioData = data.header.data;
      } else if (data.steps && data.steps.length > 0 && data.steps[0].result) {
        console.log('saveContratoCambio - Using multi-step format');
        // Multi-step format from OCR
        cambioData = typeof data.steps[0].result === 'string' 
          ? JSON.parse(data.steps[0].result) 
          : data.steps[0].result;
      } else if (data.multiPrompt?.steps && data.multiPrompt.steps.length > 0 && data.multiPrompt.steps[0].result) {
        console.log('saveContratoCambio - Using multiPrompt.steps format');
        // Multi-prompt format from OCR
        cambioData = typeof data.multiPrompt.steps[0].result === 'string' 
          ? JSON.parse(data.multiPrompt.steps[0].result) 
          : data.multiPrompt.steps[0].result;
      } else if (data.data) {
        console.log('saveContratoCambio - Using wrapped data format');
        // Data wrapped in 'data' property
        cambioData = data.data;
      } else {
        console.log('saveContratoCambio - Using direct data format');
        // Direct data format
        cambioData = data;
      }
      
      console.log('saveContratoCambio - Extracted data:', JSON.stringify(cambioData, null, 2));

      // Prepare the contract data with all fields
      const contractData = {
        contrato: cambioData.contrato,
        data: cambioData.data,
        corretora: cambioData.corretora,
        moeda: cambioData.moeda,
        valor_estrangeiro: cambioData.valor_estrangeiro,
        taxa_cambial: cambioData.taxa_cambial,
        valor_nacional: cambioData.valor_nacional,
        fatura: cambioData.fatura,
        recebedor: cambioData.recebedor,
        pais: cambioData.pais,
        endereco: cambioData.endereco,
        conta_bancaria: cambioData.conta_bancaria,
        swift: cambioData.swift,
        banco_beneficiario: cambioData.banco_beneficiario,
        createdAt: timestamp,
        updatedAt: timestamp,
        createdBy: userId,
      };

      // Transform to NocoDB format
      const transformedData = transformToNocoDBFormat(
        contractData,
        TABLE_FIELD_MAPPINGS.CONTRATO_CAMBIO
      );
      
      // Add file hash
      if (options.fileHash) {
        transformedData.hash_arquivo_origem = options.fileHash;
      }

      console.log('saveContratoCambio - Transformed data:', transformedData);

      // Save to single table
      const savedContract = await this.nocodb.create(
        NOCODB_TABLES.CONTRATO_CAMBIO,
        transformedData
      );

      return {
        success: true,
        documentId: savedContract.contrato || savedContract.Id,
        details: {
          headers: savedContract,
        },
      };
    } catch (error) {
      console.error('Error saving Contrato de Câmbio:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao salvar Contrato de Câmbio',
      };
    }
  }

  /**
   * Generic save method that routes to specific save methods
   */
  async saveDocument(
    documentType: string, 
    data: any, 
    options: SaveOptions = {}
  ): Promise<SaveResult> {
    const normalizedType = documentType.toLowerCase().replace(/[_\s]/g, '');
    console.log("TIPO DE ARQWUIVO",normalizedType)
    switch (normalizedType) {
      case 'di':
        return this.saveDI(data as DIProcessingResult, options);
      case 'commercialinvoice':
        return this.saveCommercialInvoice(data as CommercialInvoiceProcessingResult, options);
      case 'packinglist':
        return this.savePackingList(data as PackingListProcessingResult, options);
      case 'proformainvoice':
        return this.saveProformaInvoice(data as ProformaInvoiceProcessingResult, options);
      case 'swift':
        return this.saveSwift(data as SwiftData, options);
      case 'numerario':
        return this.saveNumerario(data as NumerarioProcessingResult, options);
      case 'notafiscal':
        return this.saveNotaFiscal(data as NotaFiscalProcessingResult, options);
      case 'bl':
        return this.saveBL(data as BLProcessingResult, options);
      case 'contratocambio':
        return this.saveContratoCambio(data as ContratoCambioProcessingResult, options);
      default:
        return {
          success: false,
          error: `Unknown document type: ${documentType}`,
        };
    }
  }

  /**
   * Save audit log for document operations
   */
  async saveAuditLog(
    operation: 'create' | 'update' | 'delete',
    documentType: string,
    documentId: string,
    userId: string,
    details?: any
  ): Promise<void> {
    try {
      await this.nocodb.create(NOCODB_TABLES.AUDIT.DOCUMENT_SAVES, {
        operation,
        document_type: documentType,
        document_id: documentId,
        user_id: userId,
        details: JSON.stringify(details || {}),
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error saving audit log:', error);
      // Don't throw - audit logging should not break main operations
    }
  }

  /**
   * Update DI (Declaração de Importação) document
   */
  async updateDI(data: DIProcessingResult, fileHash: string): Promise<SaveResult> {
    try {
      // Find existing header by hash
      const headers = await this.nocodb.find(NOCODB_TABLES.DI.HEADERS, {
        where: `(hash_arquivo_origem,eq,${fileHash})`,
        limit: 1
      });
      
      if (headers.list.length === 0) {
        return { success: false, error: 'Documento DI não encontrado para atualização' };
      }
      
      const headerId = headers.list[0].Id;
      const numeroDI = headers.list[0].numero_DI || headers.list[0].numero_di;
      
      // Update header
      const headerData = {
        ...data.header,
        updatedAt: new Date().toISOString(),
      };
      
      const transformedHeader = transformToNocoDBFormat(
        headerData,
        TABLE_FIELD_MAPPINGS.DI_HEADER
      );
      
      // Add ID for update
      transformedHeader.Id = headerId;
      
      await this.nocodb.update(
        NOCODB_TABLES.DI.HEADERS,
        headerId,
        transformedHeader
      );
      
      // Delete existing items and tax info
      await this.deleteRecords(NOCODB_TABLES.DI.ITEMS, fileHash);
      await this.deleteRecords(NOCODB_TABLES.DI.TAX_INFO, fileHash);
      
      // Re-insert items
      const savedItems = [];
      if (data.items && data.items.length > 0) {
        for (const item of data.items) {
          const itemData = {
            ...item,
            numeroDI,
          };
          
          const transformedItem = transformToNocoDBFormat(
            itemData,
            TABLE_FIELD_MAPPINGS.DI_ITEM
          );
          
          transformedItem.hash_arquivo_origem = fileHash;
          
          const savedItem = await this.nocodb.create(
            NOCODB_TABLES.DI.ITEMS,
            transformedItem
          );
          savedItems.push(savedItem);
        }
      }
      
      // Re-insert tax info
      const savedTaxInfo = [];
      if (data.taxInfo && data.taxInfo.length > 0) {
        for (const item of data.taxInfo) {
          const itemData = {
            ...item,
            numeroDI,
          };
          
          const transformedItemTax = transformToNocoDBFormat(
            itemData,
            TABLE_FIELD_MAPPINGS.DI_TAX_ITEM
          );
          
          transformedItemTax.hash_arquivo_origem = fileHash;
          
          const savedTax = await this.nocodb.create(
            NOCODB_TABLES.DI.TAX_INFO,
            transformedItemTax
          );
          savedTaxInfo.push(savedTax);
        }
      }
      
      return {
        success: true,
        documentId: numeroDI,
        details: {
          headers: headers.list[0],
          items: savedItems,
          taxInfo: savedTaxInfo,
        },
      };
    } catch (error) {
      console.error('Error updating DI:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao atualizar DI',
      };
    }
  }

  /**
   * Update Commercial Invoice document
   */
  async updateCommercialInvoice(data: CommercialInvoiceProcessingResult, fileHash: string): Promise<SaveResult> {
    try {
      console.log('LOG COMMERCIAL',data );
      // Find existing header by hash
      const headers = await this.nocodb.find(NOCODB_TABLES.COMMERCIAL_INVOICE.HEADERS, {
        where: `(hash_arquivo_origem,eq,${fileHash})`,
        limit: 1
      });
      
      if (headers.list.length === 0) {
        return { success: false, error: 'Commercial Invoice não encontrada para atualização' };
      }
      
      const headerId = headers.list[0].Id;
      const invoiceNumber = headers.list[0].invoiceNumber || headers.list[0].invoice_number;
      
      // Update header
      const headerData = {
        ...data.header,
      };
      
      const transformedHeader = transformToNocoDBFormat(
        headerData,
        TABLE_FIELD_MAPPINGS.COMMERCIAL_INVOICE_HEADER
      );
      
      // Add ID for update
      transformedHeader.Id = headerId;
      
      await this.nocodb.update(
        NOCODB_TABLES.COMMERCIAL_INVOICE.HEADERS,
        headerId,
        transformedHeader
      );
      
      // Delete existing items
      await this.deleteRecords(NOCODB_TABLES.COMMERCIAL_INVOICE.ITEMS, fileHash);
      
      // Re-insert items
      const savedItems = [];
      if (data.items && data.items.length > 0) {
        for (let i = 0; i < data.items.length; i++) {
          const item = data.items[i];
          const itemData = {
            invoiceNumber,
            lineNumber: i + 1,
            ...item,
          };
          
          const transformedItem = transformToNocoDBFormat(
            itemData, 
            TABLE_FIELD_MAPPINGS.COMMERCIAL_INVOICE_ITEM
          );
          
          transformedItem.hash_arquivo_origem = fileHash;
          
          const savedItem = await this.nocodb.create(
            NOCODB_TABLES.COMMERCIAL_INVOICE.ITEMS,
            transformedItem
          );
          savedItems.push(savedItem);
        }
      }
      
      return {
        success: true,
        documentId: invoiceNumber,
        details: {
          headers: headers.list[0],
          items: savedItems,
        },
      };
    } catch (error) {
      console.error('Error updating Commercial Invoice:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao atualizar Commercial Invoice',
      };
    }
  }

  /**
   * Update Packing List document
   */
  async updatePackingList(data: PackingListProcessingResult, fileHash: string): Promise<SaveResult> {
    try {
      // Find existing header by hash
      const headers = await this.nocodb.find(NOCODB_TABLES.PACKING_LIST.HEADERS, {
        where: `(hash_arquivo_origem,eq,${fileHash})`,
        limit: 1
      });
      
      if (headers.list.length === 0) {
        return { success: false, error: 'Packing List não encontrada para atualização' };
      }
      
      const headerId = headers.list[0].Id;
      const invoiceNumber = headers.list[0].invoiceNumber || headers.list[0].invoice;
      
      // Prepare header data using the correct field mappings
      const headerData = {
        consignee: data.header?.consignee,
        contracted_company: data.header?.contracted_company,
        contracted_email: data.header?.contracted_email,
        date: data.header?.date,
        destination: data.header?.destination,
        invoice: data.header?.invoice || invoiceNumber,
        items_qty_total: data.header?.items_qty_total,
        load_port: data.header?.load_port,
        notify_party: data.header?.notify_party,
        package_total: data.header?.package_total,
        total_gw: data.header?.total_gw,
        updatedAt: new Date().toISOString(),
      };
      
      const transformedHeader = transformToNocoDBFormat(
        headerData,
        TABLE_FIELD_MAPPINGS.PACKING_LIST_HEADER
      );
      
      // Add ID for update
      transformedHeader.Id = headerId;
      
      await this.nocodb.update(
        NOCODB_TABLES.PACKING_LIST.HEADERS,
        headerId,
        transformedHeader
      );
      
      // Delete existing containers and items
      await this.deleteRecords(NOCODB_TABLES.PACKING_LIST.CONTAINER, fileHash);
      await this.deleteRecords(NOCODB_TABLES.PACKING_LIST.ITEMS, fileHash);
      
      // Re-insert containers
      const savedContainers = [];
      if (data.containers && data.containers.length > 0) {
        for (const container of data.containers) {
          const containerData = {
            booking: container.booking,
            container: container.container,
            from_item: container.from_item,
            from_package: container.from_package,
            invoice: container.invoice,
            peso_bruto: container.peso_bruto,
            quantidade_de_pacotes: container.quantidade_de_pacotes,
            tipo_container: container.tipo_container,
            to_item: container.to_item,
            to_package: container.to_package,
            volume: container.volume
          };

          const transformedContainer = transformToNocoDBFormat(
            containerData,
            TABLE_FIELD_MAPPINGS.PACKING_LIST_CONTAINER
          );

          transformedContainer.hash_arquivo_origem = fileHash;

          const savedContainer = await this.nocodb.create(
            NOCODB_TABLES.PACKING_LIST.CONTAINER,
            transformedContainer
          );
          savedContainers.push(savedContainer);
        }
      }
      
      // Re-insert items
      const savedItems = [];
      if (data.items_por_container && data.items_por_container.length > 0) {
        for (const item of data.items_por_container) {
          const itemData = {
            altura_pacote: item.altura_pacote,
            comprimento_pacote: item.comprimento_pacote,
            container: item.container,
            descricao_chines: item.descricao_chines,
            descricao_ingles: item.descricao_ingles,
            item_number: item.item_number,
            largura_pacote: item.largura_pacote,
            marcacao_do_pacote: item.marcacao_do_pacote,
            peso_bruto_por_pacote: item.peso_bruto_por_pacote,
            peso_bruto_total: item.peso_bruto_total,
            peso_liquido_por_pacote: item.peso_liquido_por_pacote,
            peso_liquido_total: item.peso_liquido_total,
            quantidade_de_pacotes: item.quantidade_de_pacotes,
            quantidade_por_pacote: item.quantidade_por_pacote,
            quantidade_total: item.quantidade_total,
            reference: item.reference
          };
          
          const transformedItem = transformToNocoDBFormat(
            itemData,
            TABLE_FIELD_MAPPINGS.PACKING_LIST_ITEM
          );
          
          transformedItem.hash_arquivo_origem = fileHash;
          
          const savedItem = await this.nocodb.create(
            NOCODB_TABLES.PACKING_LIST.ITEMS,
            transformedItem
          );
          savedItems.push(savedItem);
        }
      }
      
      return {
        success: true,
        documentId: invoiceNumber,
        details: {
          headers: headers.list[0],
          items: savedItems,
          containers: savedContainers,
        },
      };
    } catch (error) {
      console.error('Error updating Packing List:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao atualizar Packing List',
      };
    }
  }

  /**
   * Update Proforma Invoice document
   */
  async updateProformaInvoice(data: ProformaInvoiceProcessingResult, fileHash: string): Promise<SaveResult> {
    try {
      // Find existing header by hash
      const headers = await this.nocodb.find(NOCODB_TABLES.PROFORMA_INVOICE.HEADERS, {
        where: `(hash_arquivo_origem,eq,${fileHash})`,
        limit: 1
      });
      
      if (headers.list.length === 0) {
        return { success: false, error: 'Proforma Invoice não encontrada para atualização' };
      }
      
      const headerId = headers.list[0].Id;
      const proformaNumber = headers.list[0].invoiceNumber || headers.list[0].invoice_number;
      
      // Prepare header data
      const headerData = {
        invoiceNumber: data.header?.invoice_number || proformaNumber,
        contracted_company: data.header?.contracted_company,
        contracted_email: data.header?.contracted_email,
        invoice_number: data.header?.invoice_number || proformaNumber,
        date: data.header?.date,
        load_port: data.header?.load_port,
        destination: data.header?.destination,
        total_price: data.header?.total_price,
        payment_terms: data.header?.payment_terms,
        package: data.header?.package,
        updatedAt: new Date().toISOString(),
      };
      
      const transformedHeader = transformToNocoDBFormat(
        headerData,
        TABLE_FIELD_MAPPINGS.PROFORMA_INVOICE_HEADER
      );
      
      // Add ID for update
      transformedHeader.Id = headerId;
      
      await this.nocodb.update(
        NOCODB_TABLES.PROFORMA_INVOICE.HEADERS,
        headerId,
        transformedHeader
      );
      
      // Delete existing items
      await this.deleteRecords(NOCODB_TABLES.PROFORMA_INVOICE.ITEMS, fileHash);
      
      // Re-insert items
      const savedItems = [];
      const itemsArray = data.containers || data.items || [];
      if (itemsArray.length > 0) {
        for (let i = 0; i < itemsArray.length; i++) {
          const item = itemsArray[i];
          const itemData = {
            invoiceNumber: proformaNumber,
            item_number: item.item_number || (i + 1),
            item: item.item || '',
            description_in_english: item.description_in_english || '',
            description_in_chinese: item.description_in_chinese || '',
            specifications: item.specifications || '',
            quantity: item.quantity,
            unit_price: item.unit_price,
            package: item.package || '',
          };
          
          const transformedItem = transformToNocoDBFormat(
            itemData,
            TABLE_FIELD_MAPPINGS.PROFORMA_INVOICE_ITEM
          );
          
          transformedItem.hash_arquivo_origem = fileHash;
          
          const savedItem = await this.nocodb.create(
            NOCODB_TABLES.PROFORMA_INVOICE.ITEMS,
            transformedItem
          );
          savedItems.push(savedItem);
        }
      }
      
      return {
        success: true,
        documentId: proformaNumber,
        details: {
          headers: headers.list[0],
          items: savedItems,
        },
      };
    } catch (error) {
      console.error('Error updating Proforma Invoice:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao atualizar Proforma Invoice',
      };
    }
  }

  /**
   * Update Swift document
   */
  async updateSwift(data: SwiftData, fileHash: string): Promise<SaveResult> {
    try {
      // Find existing record by hash

      const records = await this.nocodb.find(NOCODB_TABLES.SWIFT, {
        where: `(hash_arquivo_origem,eq,${fileHash})`,
        limit: 1
      });
      
      if (records.list.length === 0) {
        return { success: false, error: 'Swift não encontrado para atualização' };
      }
      
      const recordId = records.list[0].Id;
      
       console.log('antes de preparar',data);
      // Prepare data with proper structure
      const preparedData = this.prepareSwiftData(data);
      
       console.log('depois de preparar',preparedData);
      const swiftData = {
        ...preparedData,
        updatedAt: new Date().toISOString(),
      };
      
      // Transform to NocoDB format - now with proper nested object support
      const transformedData = transformToNocoDBFormat(
        swiftData,
        TABLE_FIELD_MAPPINGS.SWIFT
      );
      
      // Add ID for update
      transformedData.Id = recordId;
      
      await this.nocodb.update(
        NOCODB_TABLES.SWIFT,
        recordId,
        transformedData
      );
      
      return {
        success: true,
        documentId: recordId,
        details: {
          headers: records.list[0],
        },
      };
    } catch (error) {
      console.error('Error updating Swift:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao atualizar Swift',
      };
    }
  }

  /**
   * Update Numerario document
   */
  async updateNumerario(data: NumerarioProcessingResult, fileHash: string): Promise<SaveResult> {
    try {
      // Find existing record by hash
      const records = await this.nocodb.find(NOCODB_TABLES.NUMERARIO, {
        where: `(hash_arquivo_origem,eq,${fileHash})`,
        limit: 1
      });
      
      if (records.list.length === 0) {
        return { success: false, error: 'Numerário não encontrado para atualização' };
      }
      
      const recordId = records.list[0].Id;
      
      // Prepare numerario data using the existing method
      const preparedData = this.prepareNumerarioData(data);
      
      // Add update timestamp
      preparedData.atualizado_em = new Date().toISOString();
      preparedData.atualizado_por = preparedData.atualizado_por || 'sistema';
      
      console.log('🔄 Update Numerario - prepared data:', preparedData);
      
      // Transform to NocoDB format
      const transformedData = transformToNocoDBFormat(
        preparedData,
        TABLE_FIELD_MAPPINGS.NUMERARIO
      );
      
      // Add ID for update
      transformedData.Id = recordId;
      
      console.log('📤 Update Numerario - transformed data:', transformedData);
      
      await this.nocodb.update(
        NOCODB_TABLES.NUMERARIO,
        recordId,
        transformedData
      );
      
      return {
        success: true,
        documentId: recordId.toString(),
        details: {
          numerario: transformedData,
        },
      };
    } catch (error) {
      console.error('Error updating Numerario:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao atualizar Numerário',
      };
    }
  }

  /**
   * Update document status to pending for reprocessing
   */
  async updateDocumentStatusToPending(fileHash: string): Promise<SaveResult> {
    try {
      // Find document by hash
      const records = await this.nocodb.find(NOCODB_TABLES.DOCUMENT_UPLOADS, {
        where: `(hashArquivo,eq,${fileHash})`,
        limit: 1
      });
      
      if (records.list.length === 0) {
        return {
          success: false,
          error: 'Documento não encontrado'
        };
      }
      
      const document = records.list[0];
      
      // Update status to pending
      await this.nocodb.update(NOCODB_TABLES.DOCUMENT_UPLOADS, document.Id, {
        statusProcessamento: 'pendente',  // Clear previous processing date
        Id: document.Id
      });
      
      console.log(`Document status updated to pending - ID: ${document.Id}, Hash: ${fileHash}`);
      
      return {
        success: true,
        documentId: document.Id,
        details: {
          previousStatus: document.statusProcessamento,
          newStatus: 'pendente',
          fileHash: fileHash
        }
      };
    } catch (error) {
      console.error('Error updating document status to pending:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao atualizar status do documento'
      };
    }
  }

  /**
   * Save Nota Fiscal document
   */
  async saveNotaFiscal(data: NotaFiscalProcessingResult, options: SaveOptions = {}): Promise<SaveResult> {
    try {
      const { userId = 'system' } = options;
      const timestamp = new Date().toISOString();

      console.log('🔵 Saving Nota Fiscal - data:', data);

      // Extract header data - handle multi-step structure
      const headerSource = data.header || data.structuredResult?.header || {};
      const extractedHeader = this.extractData(headerSource, {});
      
      // Prepare header data
      const headerData = {
        ...extractedHeader,
        createdAt: timestamp,
        updatedAt: timestamp,
        createdBy: userId,
      };

      // Transform to NocoDB format
      const transformedHeader = transformToNocoDBFormat(
        headerData,
        TABLE_FIELD_MAPPINGS.NOTA_FISCAL_HEADER
      );
      
      // Add file hash
      if (options.fileHash) {
        transformedHeader.hash_arquivo_origem = options.fileHash;
      }

      // Save header
      const savedHeader = await this.nocodb.create(
        NOCODB_TABLES.NOTA_FISCAL.HEADERS,
        transformedHeader
      );

      console.log('✅ Saved Nota Fiscal header:', savedHeader);

      const invoiceNumber = savedHeader.invoiceNumber || savedHeader.numeroNF;
      const chaveAcesso = savedHeader.chaveAcesso || extractedHeader.chave_acesso || '';

      // Extract and save items
      const itemsSource = data.items || data.structuredResult?.items || [];
      const itemsArray = this.extractData(itemsSource, []);
      const savedItems = [];
      if (Array.isArray(itemsArray) && itemsArray.length > 0) {
        for (const item of itemsArray) {
          const itemData = {
            ...item,
            invoiceNumber: invoiceNumber,
            
          };

          const transformedItem = transformToNocoDBFormat(
            itemData,
            TABLE_FIELD_MAPPINGS.NOTA_FISCAL_ITEM
          );
          
          transformedItem.chaveAcesso = chaveAcesso;
          // Add file hash
          if (options.fileHash) {
            transformedItem.hash_arquivo_origem = options.fileHash;
          }

          const savedItem = await this.nocodb.create(
            NOCODB_TABLES.NOTA_FISCAL.ITEMS,
            transformedItem
          );
          savedItems.push(savedItem);
        }
      }

      console.log('✅ Saved Nota Fiscal items:', savedItems.length);

      return {
        success: true,
        documentId: invoiceNumber,
        details: {
          headers: savedHeader,
          items: savedItems,
        },
      };
    } catch (error) {
      console.error('❌ Error saving Nota Fiscal:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao salvar Nota Fiscal',
      };
    }
  }

  /**
   * Update Nota Fiscal document
   */
  async updateNotaFiscal(data: NotaFiscalProcessingResult, fileHash: string): Promise<SaveResult> {
    try {
      console.log('🔵 Updating Nota Fiscal - data:', data);

      // Find existing header by hash
      const headers = await this.nocodb.find(NOCODB_TABLES.NOTA_FISCAL.HEADERS, {
        where: `(hash_arquivo_origem,eq,${fileHash})`,
        limit: 1
      });
      
      if (headers.list.length === 0) {
        return { success: false, error: 'Nota Fiscal não encontrada para atualização' };
      }
      
      const headerId = headers.list[0].Id;
      const invoiceNumber = headers.list[0].invoiceNumber || headers.list[0].numeroNF;
      
      // Update header
      const headerData = {
        ...data.header,
        updatedAt: new Date().toISOString(),
      };
      
      const transformedHeader = transformToNocoDBFormat(
        headerData,
        TABLE_FIELD_MAPPINGS.NOTA_FISCAL_HEADER
      );
      
      // Add ID for update
      transformedHeader.Id = headerId;
      
      await this.nocodb.update(
        NOCODB_TABLES.NOTA_FISCAL.HEADERS,
        headerId,
        transformedHeader
      );
      
      console.log('✅ Updated Nota Fiscal header');

      // Get chaveAcesso from updated header
      const chaveAcesso = transformedHeader.chaveAcesso || data.header.chave_acesso || '';

      // Delete existing items
      await this.deleteRecords(NOCODB_TABLES.NOTA_FISCAL.ITEMS, fileHash);
      
      // Re-insert items
      const savedItems = [];
      if (data.items && data.items.length > 0) {
        for (const item of data.items) {
          const itemData = {
            ...item,
            invoiceNumber: invoiceNumber,
            
          };
          
          const transformedItem = transformToNocoDBFormat(
            itemData,
            TABLE_FIELD_MAPPINGS.NOTA_FISCAL_ITEM
          );
          
          transformedItem.hash_arquivo_origem = fileHash;
          transformedItem.chaveAcesso = chaveAcesso;

          const savedItem = await this.nocodb.create(
            NOCODB_TABLES.NOTA_FISCAL.ITEMS,
            transformedItem
          );
          savedItems.push(savedItem);
        }
      }
      
      console.log('✅ Updated Nota Fiscal items:', savedItems.length);

      return {
        success: true,
        documentId: invoiceNumber,
        details: {
          headers: headers.list[0],
          items: savedItems,
        },
      };
    } catch (error) {
      console.error('❌ Error updating Nota Fiscal:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao atualizar Nota Fiscal',
      };
    }
  }

  /**
   * Update BL (Bill of Lading) document
   */
  async updateBL(data: BLProcessingResult, fileHash: string): Promise<SaveResult> {
    try {
      // Find existing header by hash
      const headers = await this.nocodb.find(NOCODB_TABLES.BL.HEADERS, {
        where: `(hash_arquivo_origem,eq,${fileHash})`,
        limit: 1
      });
      
      if (headers.list.length === 0) {
        return { success: false, error: 'BL não encontrada para atualização' };
      }
      
      const headerId = headers.list[0].Id;
      const blNumber = headers.list[0].bl_number;
      
      // Update header
      const headerData = {
        ...data.header,
        updatedAt: new Date().toISOString(),
      };
      
      const transformedHeader = transformToNocoDBFormat(
        headerData,
        TABLE_FIELD_MAPPINGS.BL_HEADER
      );
      
      // Add ID for update
      transformedHeader.Id = headerId;
      
      await this.nocodb.update(
        NOCODB_TABLES.BL.HEADERS,
        headerId,
        transformedHeader
      );
      
      console.log('✅ Updated BL header');

      // Delete existing containers
      await this.deleteRecords(NOCODB_TABLES.BL.CONTAINERS, fileHash);
      
      // Re-insert containers
      const savedContainers = [];
      if (data.containers && data.containers.length > 0) {
        for (const container of data.containers) {
          const containerData = {
            ...container,
            bl_number: blNumber || data.header?.bl_number,
          };
          
          const transformedContainer = transformToNocoDBFormat(
            containerData,
            TABLE_FIELD_MAPPINGS.BL_CONTAINER
          );
          
          transformedContainer.hash_arquivo_origem = fileHash;

          const savedContainer = await this.nocodb.create(
            NOCODB_TABLES.BL.CONTAINERS,
            transformedContainer
          );
          savedContainers.push(savedContainer);
        }
      }
      
      console.log('✅ Updated BL containers:', savedContainers.length);

      return {
        success: true,
        documentId: blNumber,
        details: {
          headers: headers.list[0],
          containers: savedContainers,
        },
      };
    } catch (error) {
      console.error('❌ Error updating BL:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao atualizar BL',
      };
    }
  }

  /**
   * Update Contrato de Câmbio document
   */
  async updateContratoCambio(data: ContratoCambioProcessingResult, fileHash: string): Promise<SaveResult> {
    try {
      // Find existing record by hash
      const records = await this.nocodb.find(NOCODB_TABLES.CONTRATO_CAMBIO, {
        where: `(hash_arquivo_origem,eq,${fileHash})`,
        limit: 1
      });
      
      if (records.list.length === 0) {
        return { success: false, error: 'Contrato de Câmbio não encontrado para atualização' };
      }
      
      const recordId = records.list[0].Id;
      
      console.log('updateContratoCambio - Raw data received:', JSON.stringify(data, null, 2));
      console.log('updateContratoCambio - Data structure:', {
        hasSteps: !!(data.steps && data.steps.length > 0),
        hasData: !!data.data,
        directKeys: Object.keys(data || {})
      });

      // Extract contract data - handle multi-step OCR format
      let cambioData;
      
      if (data.header?.data) {
        console.log('updateContratoCambio - Using header.data format (from structuredResult)');
        // Multi-step format with header.data structure
        cambioData = data.header.data;
      } else if (data.steps && data.steps.length > 0 && data.steps[0].result) {
        console.log('updateContratoCambio - Using multi-step format');
        // Multi-step format from OCR
        cambioData = typeof data.steps[0].result === 'string' 
          ? JSON.parse(data.steps[0].result) 
          : data.steps[0].result;
      } else if (data.data) {
        console.log('updateContratoCambio - Using wrapped data format');
        // Data wrapped in 'data' property
        cambioData = data.data;
      } else {
        console.log('updateContratoCambio - Using direct data format');
        // Direct data format
        cambioData = data;
      }
      
      console.log('updateContratoCambio - Extracted data:', JSON.stringify(cambioData, null, 2));

      // Prepare the contract data with all fields
      const contractData = {
        contrato: cambioData.contrato,
        data: cambioData.data,
        corretora: cambioData.corretora,
        moeda: cambioData.moeda,
        valor_estrangeiro: cambioData.valor_estrangeiro,
        taxa_cambial: cambioData.taxa_cambial,
        valor_nacional: cambioData.valor_nacional,
        fatura: cambioData.fatura,
        recebedor: cambioData.recebedor,
        pais: cambioData.pais,
        endereco: cambioData.endereco,
        conta_bancaria: cambioData.conta_bancaria,
        swift: cambioData.swift,
        banco_beneficiario: cambioData.banco_beneficiario,
        updatedAt: new Date().toISOString(),
      };
      
      // Transform to NocoDB format
      const transformedData = transformToNocoDBFormat(
        contractData,
        TABLE_FIELD_MAPPINGS.CONTRATO_CAMBIO
      );
      
      // Add ID for update
      transformedData.Id = recordId;
      
      console.log('updateContratoCambio - Transformed data:', transformedData);
      
      await this.nocodb.update(
        NOCODB_TABLES.CONTRATO_CAMBIO,
        recordId,
        transformedData
      );
      
      return {
        success: true,
        documentId: records.list[0].contrato || recordId.toString(),
        details: {
          headers: transformedData,
        },
      };
    } catch (error) {
      console.error('Error updating Contrato de Câmbio:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao atualizar Contrato de Câmbio',
      };
    }
  }
}

// Export singleton instance
let documentSaveService: DocumentSaveService | null = null;

export function getDocumentSaveService(): DocumentSaveService {
  if (!documentSaveService) {
    documentSaveService = new DocumentSaveService();
  }
  return documentSaveService;
}
