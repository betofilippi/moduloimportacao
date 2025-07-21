import { getNocoDBService } from './nocodb';
import { NOCODB_TABLES, TABLE_FIELD_MAPPINGS } from '@/config/nocodb-tables';
import { DocumentType } from '@/types/processo-importacao';

export interface ProcessDocumentRelation {
  id?: string;
  processo_importacao: string;
  hash_arquivo_upload: string;
  created_at?: string;
  updated_at?: string;
}

export interface DocumentInfo {
  hashArquivo: string;
  tipoDocumento: DocumentType;
  nomeOriginal: string;
  dataUpload: string;
  statusProcessamento: string;
  idDocumento?: string;
}

export interface ProcessDocuments {
  processId: string;
  documents: {
    [key in DocumentType]?: DocumentInfo;
  };
}

class ProcessDocumentService {
  private static instance: ProcessDocumentService;
  private nocodb = getNocoDBService();

  private constructor() {}

  static getInstance(): ProcessDocumentService {
    if (!ProcessDocumentService.instance) {
      ProcessDocumentService.instance = new ProcessDocumentService();
    }
    return ProcessDocumentService.instance;
  }

  /**
   * Link a document to a process
   */
  async linkDocumentToProcess(
    processId: string,
    fileHash: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if relation already exists
      const existing = await this.nocodb.find(NOCODB_TABLES.PROCESSO_DOCUMENTO_REL, {
        where: `(processo_importacao,eq,${processId})~and(hash_arquivo_upload,eq,${fileHash})`,
        limit: 1
      });

      if (existing.list && existing.list.length > 0) {
        return { success: true }; // Already linked
      }

      // Create new relation
      const relation: ProcessDocumentRelation = {
        processo_importacao: processId,
        hash_arquivo_upload: fileHash
      };

      await this.nocodb.create(NOCODB_TABLES.PROCESSO_DOCUMENTO_REL, relation);
      
      return { success: true };
    } catch (error) {
      console.error('Error linking document to process:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Link a document to a process with additional metadata
   */
  async linkDocumentWithMetadata(
    processId: string,
    fileHash: string,
    documentType: DocumentType,
    documentId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // First link the document
      const linkResult = await this.linkDocumentToProcess(processId, fileHash);
      
      if (!linkResult.success) {
        return linkResult;
      }

      // Update process with document metadata
      try {
        const processes = await this.nocodb.find(NOCODB_TABLES.PROCESSOS_IMPORTACAO, {
          where: `(numero_processo,eq,${processId})`,
          limit: 1
        });

        if (processes.list && processes.list.length > 0) {
          const process = processes.list[0];
          
          // Parse existing pipeline or create new
          let pipeline = [];
          try {
            pipeline = JSON.parse(process.documentsPipeline || '[]');
          } catch (e) {
            pipeline = [];
          }

          // Update or add document in pipeline
          const existingIndex = pipeline.findIndex((doc: any) => doc.documentType === documentType);
          const pipelineEntry = {
            documentType,
            status: 'completed',
            documentId,
            fileHash,
            uploadedAt: new Date().toISOString(),
            processedAt: new Date().toISOString()
          };

          if (existingIndex >= 0) {
            pipeline[existingIndex] = pipelineEntry;
          } else {
            pipeline.push(pipelineEntry);
          }

          // Update process with special field for proforma
          const updateData: any = {
            documentsPipeline: JSON.stringify(pipeline)
          };

          if (documentType === 'proforma_invoice') {
            updateData.proforma_invoice_doc_id = documentId;
          }

          await this.nocodb.update(NOCODB_TABLES.PROCESSOS_IMPORTACAO, process.Id, updateData);
        }
      } catch (error) {
        console.error('Error updating process metadata:', error);
        // Don't fail the main operation
      }

      return { success: true };
    } catch (error) {
      console.error('Error linking document with metadata:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get all documents for a process
   */
  async getProcessDocuments(processId: string): Promise<ProcessDocuments> {
    try {
      // Get all relations for the process
      const relations = await this.nocodb.find(NOCODB_TABLES.PROCESSO_DOCUMENTO_REL, {
        where: `(processo_importacao,eq,${processId})`,
        limit: 100
      });

      if (!relations.list || relations.list.length === 0) {
        return { processId, documents: {} };
      }

      // Get document details for each hash
      const documents: ProcessDocuments['documents'] = {};
      
      for (const relation of relations.list) {
        const uploadInfo = await this.nocodb.find(NOCODB_TABLES.DOCUMENT_UPLOADS, {
          where: `(hashArquivo,eq,${relation.hash_arquivo_upload})`,
          limit: 1
        });

        if (uploadInfo.list && uploadInfo.list.length > 0) {
          const doc = uploadInfo.list[0];
          documents[doc.tipoDocumento as DocumentType] = {
            hashArquivo: doc.hashArquivo,
            tipoDocumento: doc.tipoDocumento,
            nomeOriginal: doc.nomeOriginal,
            dataUpload: doc.dataUpload,
            statusProcessamento: doc.statusProcessamento,
            idDocumento: doc.idDocumento
          };
        }
      }

      return { processId, documents };
    } catch (error) {
      console.error('Error getting process documents:', error);
      return { processId, documents: {} };
    }
  }

  /**
   * Get all processes for a document
   */
  async getDocumentProcesses(fileHash: string): Promise<string[]> {
    try {
      const relations = await this.nocodb.find(NOCODB_TABLES.PROCESSO_DOCUMENTO_REL, {
        where: `(hash_arquivo_upload,eq,${fileHash})`,
        limit: 100
      });

      if (!relations.list || relations.list.length === 0) {
        return [];
      }

      return relations.list.map(rel => rel.processo_importacao);
    } catch (error) {
      console.error('Error getting document processes:', error);
      return [];
    }
  }

  /**
   * Remove document from process
   */
  async unlinkDocumentFromProcess(
    processId: string,
    fileHash: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const existing = await this.nocodb.find(NOCODB_TABLES.PROCESSO_DOCUMENTO_REL, {
        where: `(processo_importacao,eq,${processId})~and(hash_arquivo_upload,eq,${fileHash})`,
        limit: 1
      });

      if (existing.list && existing.list.length > 0) {
        await this.nocodb.delete(NOCODB_TABLES.PROCESSO_DOCUMENTO_REL, existing.list[0].Id);
      }

      return { success: true };
    } catch (error) {
      console.error('Error unlinking document from process:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Check if process has specific document types
   */
  async checkProcessDocumentTypes(
    processId: string,
    documentTypes: DocumentType[]
  ): Promise<Record<DocumentType, boolean>> {
    const processDocuments = await this.getProcessDocuments(processId);
    const result: Record<DocumentType, boolean> = {} as any;

    for (const docType of documentTypes) {
      result[docType] = !!processDocuments.documents[docType];
    }

    return result;
  }

  /**
   * Get process completion status based on documents
   */
  async getProcessCompletionStatus(processId: string): Promise<{
    totalDocuments: number;
    completedDocuments: number;
    pendingDocuments: DocumentType[];
    completedDocumentTypes: DocumentType[];
    canProcessPhysicalReceipt: boolean;
    canProcessFiscal: boolean;
  }> {
    const processDocuments = await this.getProcessDocuments(processId);
    const allDocumentTypes: DocumentType[] = [
      'proforma_invoice',
      'commercial_invoice', 
      'packing_list',
      'swift',
      'di',
      'numerario',
      'nota_fiscal'
    ];

    const completedDocumentTypes = Object.keys(processDocuments.documents) as DocumentType[];
    const pendingDocuments = allDocumentTypes.filter(
      type => !completedDocumentTypes.includes(type)
    );

    // Check specific conditions
    const hasPackingList = !!processDocuments.documents.packing_list;
    const hasCommercialInvoice = !!processDocuments.documents.commercial_invoice;
    const hasDI = !!processDocuments.documents.di;
    const hasNotaFiscal = !!processDocuments.documents.nota_fiscal;

    return {
      totalDocuments: allDocumentTypes.length,
      completedDocuments: completedDocumentTypes.length,
      pendingDocuments,
      completedDocumentTypes,
      canProcessPhysicalReceipt: hasPackingList && hasCommercialInvoice,
      canProcessFiscal: hasDI && hasNotaFiscal
    };
  }
}

export function getProcessDocumentService(): ProcessDocumentService {
  return ProcessDocumentService.getInstance();
}