/**
 * Document Cache Service
 *
 * Service to check if documents have been processed before
 * and reconstruct their data from NocoDB to avoid reprocessing
 */

import { getNocoDBService } from "@/lib/services/nocodb";
import {
  NOCODB_TABLES,
  TABLE_FIELD_MAPPINGS,
  transformFromNocoDBFormat,
  unflattenSwiftData,
} from "@/config/nocodb-tables";
import { NocoDBQueryParams } from "@/types/nocodb";

export interface CachedUpload {
  id: string;
  hashArquivo: string;
  caminhoArmazenamento: string;
  urlPublica: string;
  nomeOriginal: string;
  tamanhoArquivo: number;
  tipoMime: string;
  tipoDocumento: string;
  idUsuario: string;
  emailUsuario: string;
  dataUpload: string;
  statusProcessamento: string;
  dataProcessamento?: string;
  idDocumento?: string;
}

export class DocumentCacheService {
  private nocodb = getNocoDBService();

  /**
   * Check if document data already exists in the database
   */
  async isDocumentSaved(
    fileHash: string,
    documentType: string
  ): Promise<boolean> {
    try {
      let tableToCheck = "";
      let whereClause = "";

      switch (documentType.toLowerCase()) {
        case "di":
          tableToCheck = NOCODB_TABLES.DI.HEADERS;
          whereClause = `(hash_arquivo_origem,eq,${fileHash})`;
          break;

        case "commercial_invoice":
          tableToCheck = NOCODB_TABLES.COMMERCIAL_INVOICE.HEADERS;
          whereClause = `(hash_arquivo_origem,eq,${fileHash})`;
          break;

        case "packing_list":
          tableToCheck = NOCODB_TABLES.PACKING_LIST.HEADERS;
          whereClause = `(hash_arquivo_origem,eq,${fileHash})`;
          break;

        case "proforma_invoice":
          tableToCheck = NOCODB_TABLES.PROFORMA_INVOICE.HEADERS;
          whereClause = `(hash_arquivo_origem,eq,${fileHash})`;
          break;

        case "swift":
          tableToCheck = NOCODB_TABLES.SWIFT.HEADERS;
          whereClause = `(hash_arquivo_origem,eq,${fileHash})`;
          break;

        case "numerario":
          tableToCheck = NOCODB_TABLES.NUMERARIO.DI_INFO;
          whereClause = `(hash_arquivo_origem,eq,${fileHash})`;
          break;

        case "nota_fiscal":
          tableToCheck = NOCODB_TABLES.NOTA_FISCAL.HEADERS;
          whereClause = `(hash_arquivo_origem,eq,${fileHash})`;
          break;

        default:
          console.warn(
            `Document type ${documentType} not supported for save check`
          );
          return false;
      }

      const result = await this.nocodb.find(tableToCheck, {
        where: whereClause,
        limit: 1,
      });

      return result.list.length > 0;
    } catch (error) {
      console.error("Error checking if document is saved:", error);
      return false;
    }
  }

  /**
   * Find uploaded document by original filename
   */
  async findByOriginalName(originalName: string): Promise<CachedUpload | null> {
    try {
      const params: NocoDBQueryParams = {
        where: `(nomeOriginal,eq,${originalName})`,
        limit: 1,
        sort: "-dataUpload", // Most recent first
      };

      const uploads = await this.nocodb.find(
        NOCODB_TABLES.DOCUMENT_UPLOADS,
        params
      );

      console.log(uploads);
      if (uploads.list.length === 0) return null;

      const upload = uploads.list[0] as CachedUpload;

      // Only return if processing is complete
      if (upload.statusProcessamento !== "completo") return null;

      return upload;
    } catch (error) {
      console.error("Error finding document by name:", error);
      return null;
    }
  }

  /**
   * Reconstruct structuredResult from stored data
   */
  async reconstructStructuredResult(
    upload: CachedUpload,
    documentType: string
  ): Promise<any | null> {
    try {
      switch (documentType.toLowerCase()) {
        case "di":
          return await this.reconstructDI(upload);

        case "commercial_invoice":
          return await this.reconstructCommercialInvoice(upload);

        case "packing_list":
          return await this.reconstructPackingList(upload);

        case "proforma_invoice":
          return await this.reconstructProformaInvoice(upload);

        case "swift":
          return await this.reconstructSwift(upload);

        case "numerario":
          return await this.reconstructNumerario(upload);

        case "nota_fiscal":
          return await this.reconstructNotaFiscal(upload);

        default:
          console.warn(
            `Document type ${documentType} not supported for cache reconstruction`
          );
          return null;
      }
    } catch (error) {
      console.error("Error reconstructing structured result:", error);
      return null;
    }
  }

  /**
   * Reconstruct DI data
   */
  private async reconstructDI(upload: CachedUpload): Promise<any> {
    // Search for DI header using document ID
    console.log(upload.hashArquivo);
    const diHeaders = await this.nocodb.find(NOCODB_TABLES.DI.HEADERS, {
      where: `(hash_arquivo_origem,eq,${upload.hashArquivo})`,
      limit: 1,
    });
    if (!diHeaders.list.length) return null;

    const header = diHeaders.list[0];
    const numeroDI = header.numero_DI || header.numero_di;

    // Search for items
    const items = await this.nocodb.find(NOCODB_TABLES.DI.ITEMS, {
      where: `(hash_arquivo_origem,eq,${upload.hashArquivo})`,
    });

    // Search for tax info
    const taxInfo = await this.nocodb.find(NOCODB_TABLES.DI.TAX_INFO, {
      where: `(hash_arquivo_origem,eq,${upload.hashArquivo})`,
    });

    return {
      header: header,
      items: items.list,
      taxInfo: taxInfo.list,
      documentType: upload.tipoDocumento,
    };
  }

  /**
   * Reconstruct Commercial Invoice data
   */
  private async reconstructCommercialInvoice(
    upload: CachedUpload
  ): Promise<any> {
    // Search for header using hash_arquivo_origem
    const ciHeaders = await this.nocodb.find(
      NOCODB_TABLES.COMMERCIAL_INVOICE.HEADERS,
      {
        where: `(hash_arquivo_origem,eq,${upload.hashArquivo})`,
        limit: 1,
      }
    );

    if (!ciHeaders.list.length) return null;

    const header = ciHeaders.list[0];

    // Transform header back to original format
    const transformedHeader = transformFromNocoDBFormat(
      header,
      TABLE_FIELD_MAPPINGS.COMMERCIAL_INVOICE_HEADER
    );

    // Search for items using hash_arquivo_origem
    const items = await this.nocodb.find(
      NOCODB_TABLES.COMMERCIAL_INVOICE.ITEMS,
      {
        where: `(hash_arquivo_origem,eq,${upload.hashArquivo})`,
        limit: 1000,
      }
    );

    // Transform each item back to original format
    const transformedItems = items.list.map((item) =>
      transformFromNocoDBFormat(
        item,
        TABLE_FIELD_MAPPINGS.COMMERCIAL_INVOICE_ITEM
      )
    );

    return {
      header: transformedHeader,
      items: transformedItems,
      documentType: upload.tipoDocumento,
    };
  }

  /**
   * Reconstruct Packing List data
   */
  private async reconstructPackingList(upload: CachedUpload): Promise<any> {
    // Search for header using hash_arquivo_origem
    const plHeaders = await this.nocodb.find(
      NOCODB_TABLES.PACKING_LIST.HEADERS,
      {
        where: `(hash_arquivo_origem,eq,${upload.hashArquivo})`,
        limit: 1,
      }
    );

    if (!plHeaders.list.length) return null;

    const header = plHeaders.list[0];

    // Transform header back to original format
    const transformedHeader = transformFromNocoDBFormat(
      header,
      TABLE_FIELD_MAPPINGS.PACKING_LIST_HEADER
    );

    // Search for containers using hash_arquivo_origem
    const containers = await this.nocodb.find(NOCODB_TABLES.PACKING_LIST.CONTAINER, {
      where: `(hash_arquivo_origem,eq,${upload.hashArquivo})`,
      limit: 1000,
    });

    // Transform each container back to original format
    const transformedContainers = containers.list.map((container) =>
      transformFromNocoDBFormat(container, TABLE_FIELD_MAPPINGS.PACKING_LIST_CONTAINER)
    );

    // Search for items using hash_arquivo_origem
    const items = await this.nocodb.find(NOCODB_TABLES.PACKING_LIST.ITEMS, {
      where: `(hash_arquivo_origem,eq,${upload.hashArquivo})`,
      limit: 1000,
    });

    // Transform each item back to original format
    const transformedItems = items.list.map((item) =>
      transformFromNocoDBFormat(item, TABLE_FIELD_MAPPINGS.PACKING_LIST_ITEM)
    );

    return {
      header: transformedHeader,
      containers: transformedContainers,
      items: transformedItems,
      documentType: upload.tipoDocumento,
    };
  }

  /**
   * Reconstruct Proforma Invoice data
   */
  private async reconstructProformaInvoice(upload: CachedUpload): Promise<any> {
    // Search for header using hash_arquivo_origem
    const piHeaders = await this.nocodb.find(
      NOCODB_TABLES.PROFORMA_INVOICE.HEADERS,
      {
        where: `(hash_arquivo_origem,eq,${upload.hashArquivo})`,
        limit: 1,
      }
    );

    if (!piHeaders.list.length) return null;

    const header = piHeaders.list[0];

    // Transform header back to original format
    const transformedHeader = transformFromNocoDBFormat(
      header,
      TABLE_FIELD_MAPPINGS.PROFORMA_INVOICE_HEADER
    );

    // Search for items using hash_arquivo_origem
    const items = await this.nocodb.find(NOCODB_TABLES.PROFORMA_INVOICE.ITEMS, {
      where: `(hash_arquivo_origem,eq,${upload.hashArquivo})`,
      limit: 1000,
    });

    // Transform each item back to original format
    const transformedItems = items.list.map((item) =>
      transformFromNocoDBFormat(
        item,
        TABLE_FIELD_MAPPINGS.PROFORMA_INVOICE_ITEM
      )
    );

    return {
      header: transformedHeader,
      items: transformedItems,
      documentType: upload.tipoDocumento,
    };
  }

  /**
   * Reconstruct Swift data
   */
  private async reconstructSwift(upload: CachedUpload): Promise<any> {
    // Swift is a single table - search using hash_arquivo_origem
    const swiftData = await this.nocodb.find(NOCODB_TABLES.SWIFT, {
      where: `(hash_arquivo_origem,eq,${upload.hashArquivo})`,
      limit: 1,
    });
    console.log("BANCO DE DADOS SWIFT", swiftData);

    if (!swiftData.list.length) return null;

    // Transform data back to original format
    const transformedData = transformFromNocoDBFormat(
      swiftData.list[0],
      TABLE_FIELD_MAPPINGS.SWIFT
    );
    console.log("Transformed flat data:", transformedData);
    
    // Unflatten the data to restore nested structure
    const unflattenedData = unflattenSwiftData(transformedData);
    console.log("Unflattened data:", unflattenedData);

    return {
      header: unflattenedData,
      documentType: upload.tipoDocumento,
    };
  }

  /**
   * Reconstruct Numerario data
   */
  private async reconstructNumerario(upload: CachedUpload): Promise<any> {
    // Numerario is a single table - search using hash_arquivo_origem
    const numerarioData = await this.nocodb.find(NOCODB_TABLES.NUMERARIO, {
      where: `(hash_arquivo_origem,eq,${upload.hashArquivo})`,
      limit: 1,
    });

    if (!numerarioData.list.length) return null;

    const header = numerarioData.list[0];

    // Transform data back to original format
    const transformedHeader = transformFromNocoDBFormat(
      header,
      TABLE_FIELD_MAPPINGS.NUMERARIO
    );

    // Return data in diInfo to match expected structure
    return {
      diInfo: transformedHeader,  // All data goes here
      header: {},  // Empty for compatibility
      items: [],
      documentType: upload.tipoDocumento,
    };
  }

  /**
   * Reconstruct Nota Fiscal data
   */
  private async reconstructNotaFiscal(upload: CachedUpload): Promise<any> {
    // Search for header using hash_arquivo_origem
    const nfHeaders = await this.nocodb.find(
      NOCODB_TABLES.NOTA_FISCAL.HEADERS,
      {
        where: `(hash_arquivo_origem,eq,${upload.hashArquivo})`,
        limit: 1,
      }
    );

    if (!nfHeaders.list.length) return null;

    const header = nfHeaders.list[0];

    // Transform header back to original format
    const transformedHeader = transformFromNocoDBFormat(
      header,
      TABLE_FIELD_MAPPINGS.NOTA_FISCAL_HEADER
    );

    // Search for items using hash_arquivo_origem
    const items = await this.nocodb.find(NOCODB_TABLES.NOTA_FISCAL.ITEMS, {
      where: `(hash_arquivo_origem,eq,${upload.hashArquivo})`,
      limit: 1000,
    });

    // Transform each item back to original format
    const transformedItems = items.list.map((item) =>
      transformFromNocoDBFormat(
        item,
        TABLE_FIELD_MAPPINGS.NOTA_FISCAL_ITEM
      )
    );

    return {
      header: transformedHeader,
      items: transformedItems,
      documentType: upload.tipoDocumento,
    };
  }

  /**
   * Update upload status after successful processing
   */
  async updateUploadStatus(
    uploadId: string,
    documentId: string,
    status: "completo" | "erro" = "completo"
  ): Promise<void> {
    try {
      await this.nocodb.update(NOCODB_TABLES.DOCUMENT_UPLOADS, uploadId, {
        statusProcessamento: status,
        dataProcessamento: new Date().toISOString(),
        idDocumento: documentId, // Now properly updating the document ID
        Id: uploadId,
      });
    } catch (error) {
      console.error("Error updating upload status:", error);
      throw error;
    }
  }

  /**
   * Mark upload as error
   */
  async markUploadError(uploadId: string, errorMessage: string): Promise<void> {
    try {
      await this.nocodb.update(NOCODB_TABLES.DOCUMENT_UPLOADS, uploadId, {
        statusProcessamento: "erro",
        dataProcessamento: new Date().toISOString(),
        Id: uploadId,
      });
    } catch (error) {
      console.error("Error marking upload as error:", error);
      throw error;
    }
  }
}

// Export singleton instance
let documentCacheService: DocumentCacheService | null = null;

export function getDocumentCacheService(): DocumentCacheService {
  if (!documentCacheService) {
    documentCacheService = new DocumentCacheService();
  }
  return documentCacheService;
}
