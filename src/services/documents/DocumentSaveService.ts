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
    await this.deleteRecords(NOCODB_TABLES.SWIFT.HEADERS, fileHash);
    
    return { success: true };
  }

  private async resetNumerario(fileHash: string): Promise<SaveResult> {
    // Numerario only has single table
    await this.deleteRecords(NOCODB_TABLES.NUMERARIO, fileHash);
    
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
      // Prepare header data
      const headerData = {
        ...data.header,
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

      const numeroDI = savedHeader.numero_di;

      // Save items
      const savedItems = [];
      if (data.items && data.items.length > 0) {
        for (const item of data.items) {
          const itemData = {
            ...item,
            numeroDI,
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
      // Save tax info
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
    console.log("INICIADO SABER COMEMRCIAL", data)        
      // Prepare header data
      const headerData = {
      ...data.header,
      };
      console.log('DADOS HEADER',headerData)
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

      const invoiceNumber = savedHeader.invoice_number;

      // Save items
      const savedItems = [];
      if (data.items && data.items.length > 0) {
        for (let i = 0; i < data.items.length; i++) {
          const item = data.items[i];
          const itemData = {
            invoiceNumber,
            lineNumber: i + 1,
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

      // Prepare header data using the correct field mappings
      const headerData = {
        consignee: data.header?.consignee,
        contracted_company: data.header?.contracted_company,
        contracted_email: data.header?.contracted_email,
        date: data.header?.date,
        destination: data.header?.destination,
        invoice: data.header?.invoice,
        items_qty_total: data.header?.items_qty_total,
        load_port: data.header?.load_port,
        notify_party: data.header?.notify_party,
        package_total: data.header?.package_total,
        total_gw: data.header?.total_gw
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

      // Save containers
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

      // Save items
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

      // Prepare header data with proper field mapping
      const headerData = {
        invoiceNumber: data.header?.invoice_number || ``, // Use extracted invoice number or generate
        contracted_company: data.header?.contracted_company,
        contracted_email: data.header?.contracted_email,
        invoice_number: data.header?.invoice_number || '', // Include the actual invoice number field
        date: data.header?.date,
        load_port: data.header?.load_port,
        destination: data.header?.destination,
        total_price: data.header?.total_price,
        payment_terms: data.header?.payment_terms,
        package: data.header?.package,
        createdAt: timestamp,
        updatedAt: timestamp,
        createdBy: userId,
      };

      // Transform to NocoDB format
      const transformedHeader = transformToNocoDBFormat(
        headerData,
        TABLE_FIELD_MAPPINGS.PROFORMA_INVOICE_HEADER
      );

      // Add file hash
      if (options.fileHash) {
        transformedHeader.hash_arquivo_origem = options.fileHash;
      }
      
      // Save header
      const savedHeader = await this.nocodb.create(
        NOCODB_TABLES.PROFORMA_INVOICE.HEADERS,
        transformedHeader
      );

      const proformaNumber = savedHeader.invoice_number;

      // Save items (from containers in proforma invoice)
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

          // Transform to NocoDB format
          const transformedItem = transformToNocoDBFormat(
            itemData,
            TABLE_FIELD_MAPPINGS.PROFORMA_INVOICE_ITEM
          );

          // Add file hash
          if (options.fileHash) {
            transformedItem.hash_arquivo_origem = options.fileHash;
          }
          
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
   * Save Swift document
   */
  async saveSwift(data: SwiftData, options: SaveOptions = {}): Promise<SaveResult> {
    try {
      const { userId = 'system' } = options;
      const timestamp = new Date().toISOString();

      const swiftData = {
        ...data,
        createdAt: timestamp,
        updatedAt: timestamp,
        createdBy: userId,
      };

      // Transform to NocoDB format
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
        documentId: savedSwift.id,
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
   * Save Numerario document
   */
  async saveNumerario(data: NumerarioProcessingResult, options: SaveOptions = {}): Promise<SaveResult> {
    try {
      const { userId = 'system' } = options;
      const timestamp = new Date().toISOString();

      const numerarioData = {
        numeroRE: data.diInfo?.numero_di || data.header?.di_number || '',
        dataOperacao: data.header?.data_emissao || '',
        tipoOperacao: data.header?.natureza_operacao || '',
        moeda: 'BRL',
        valorMoedaEstrangeira: 0,
        taxaCambio: 0,
        valorReais: parseFloat(data.header?.valor_total_nota || '0'),
        bancoComprador: '',
        agenciaComprador: '',
        contaComprador: '',
        cpfCnpjComprador: '',
        nomeComprador: data.header?.destinatario_razao_social || '',
        enderecoComprador: '',
        finalidade: data.header?.natureza_operacao || '',
        observacoes: data.header?.informacoes_complementares || '',
        numeroContrato: '',
        dataContrato: '',
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
        documentId: savedNumerario.numero_re,
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
      
      const swiftData = {
        ...data,
        updatedAt: new Date().toISOString(),
      };
      
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
      const numeroRE = records.list[0].numero_re;
      
      const numerarioData = {
        numeroRE: data.diInfo?.numero_di || data.header?.di_number || numeroRE,
        dataOperacao: data.header?.data_emissao || '',
        tipoOperacao: data.header?.natureza_operacao || '',
        moeda: 'BRL',
        valorMoedaEstrangeira: 0,
        taxaCambio: 0,
        valorReais: parseFloat(data.header?.valor_total_nota || '0'),
        bancoComprador: '',
        agenciaComprador: '',
        contaComprador: '',
        cpfCnpjComprador: '',
        nomeComprador: data.header?.destinatario_razao_social || '',
        enderecoComprador: '',
        finalidade: data.header?.natureza_operacao || '',
        observacoes: data.header?.informacoes_complementares || '',
        numeroContrato: '',
        dataContrato: '',
        updatedAt: new Date().toISOString(),
      };
      
      const transformedData = transformToNocoDBFormat(
        numerarioData,
        TABLE_FIELD_MAPPINGS.NUMERARIO
      );
      
      // Add ID for update
      transformedData.Id = recordId;
      
      await this.nocodb.update(
        NOCODB_TABLES.NUMERARIO,
        recordId,
        transformedData
      );
      
      return {
        success: true,
        documentId: numeroRE,
        details: {
          headers: records.list[0],
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
}

// Export singleton instance
let documentSaveService: DocumentSaveService | null = null;

export function getDocumentSaveService(): DocumentSaveService {
  if (!documentSaveService) {
    documentSaveService = new DocumentSaveService();
  }
  return documentSaveService;
}
