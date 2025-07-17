export interface ProformaInvoiceData {
  documentId: string;
  originalData: {
    header: any;
    items: any[];
  };
  editedData: {
    header: any;
    items: any[];
  };
  hasEdits: boolean;
  lastModified: string;
}

const STORAGE_KEY = 'editedProformaInvoiceData';

export class ProformaInvoiceStorage {
  /**
   * Generate a unique document ID based on invoice data
   */
  static generateDocumentId(data: any): string {
    const header = data?.header || data?.structuredResult?.header?.data || {};
    const timestamp = Date.now();
    const invoiceNumber = header.invoice_number || 'unknown';
    return `proforma_${invoiceNumber}_${timestamp}`;
  }

  /**
   * Save edited proforma invoice data to localStorage
   */
  static saveEditedData(data: ProformaInvoiceData): void {
    try {
      const serializedData = JSON.stringify(data);
      localStorage.setItem(`${STORAGE_KEY}_${data.documentId}`, serializedData);
      
      // Update document IDs list
      this.updateDocumentIdsList(data.documentId);
      
      console.log('💾 Saved edited proforma invoice data:', data.documentId);
    } catch (error) {
      console.error('❌ Failed to save proforma invoice data:', error);
    }
  }

  /**
   * Load edited proforma invoice data from localStorage
   */
  static loadEditedData(documentId: string): ProformaInvoiceData | null {
    try {
      const serializedData = localStorage.getItem(`${STORAGE_KEY}_${documentId}`);
      if (serializedData) {
        const data = JSON.parse(serializedData) as ProformaInvoiceData;
        console.log('📂 Loaded edited proforma invoice data:', documentId);
        return data;
      }
    } catch (error) {
      console.error('❌ Failed to load proforma invoice data:', error);
    }
    return null;
  }

  /**
   * Check if edited data exists for a document
   */
  static hasEditedData(documentId: string): boolean {
    return localStorage.getItem(`${STORAGE_KEY}_${documentId}`) !== null;
  }

  /**
   * Delete edited data for a specific document
   */
  static deleteEditedData(documentId: string): void {
    try {
      localStorage.removeItem(`${STORAGE_KEY}_${documentId}`);
      this.removeFromDocumentIdsList(documentId);
      console.log('🗑️ Deleted edited proforma invoice data:', documentId);
    } catch (error) {
      console.error('❌ Failed to delete proforma invoice data:', error);
    }
  }

  /**
   * Reset document to original data
   */
  static resetToOriginal(documentId: string): ProformaInvoiceData | null {
    const data = this.loadEditedData(documentId);
    if (data) {
      data.editedData = JSON.parse(JSON.stringify(data.originalData));
      data.hasEdits = false;
      data.lastModified = new Date().toISOString();
      this.saveEditedData(data);
      return data;
    }
    return null;
  }

  /**
   * Get all document IDs that have edited data
   */
  static getAllDocumentIds(): string[] {
    try {
      const idsData = localStorage.getItem(`${STORAGE_KEY}_document_ids`);
      return idsData ? JSON.parse(idsData) : [];
    } catch (error) {
      console.error('❌ Failed to get document IDs:', error);
      return [];
    }
  }

  /**
   * Update the list of document IDs
   */
  private static updateDocumentIdsList(documentId: string): void {
    const ids = this.getAllDocumentIds();
    if (!ids.includes(documentId)) {
      ids.push(documentId);
      localStorage.setItem(`${STORAGE_KEY}_document_ids`, JSON.stringify(ids));
    }
  }

  /**
   * Remove document ID from the list
   */
  private static removeFromDocumentIdsList(documentId: string): void {
    const ids = this.getAllDocumentIds();
    const updatedIds = ids.filter(id => id !== documentId);
    localStorage.setItem(`${STORAGE_KEY}_document_ids`, JSON.stringify(updatedIds));
  }

  /**
   * Clear all edited data
   */
  static clearAllEditedData(): void {
    try {
      const documentIds = this.getAllDocumentIds();
      
      // Remove all document-specific data
      documentIds.forEach(id => {
        localStorage.removeItem(`${STORAGE_KEY}_${id}`);
      });
      
      // Remove the document IDs list
      localStorage.removeItem(`${STORAGE_KEY}_document_ids`);
      
      console.log('🧹 Cleared all edited proforma invoice data');
    } catch (error) {
      console.error('❌ Failed to clear all edited data:', error);
    }
  }

  /**
   * Get storage statistics
   */
  static getStorageStats(): {
    totalDocuments: number;
    totalSizeKB: number;
    documentsWithEdits: number;
  } {
    const documentIds = this.getAllDocumentIds();
    let totalSize = 0;
    let documentsWithEdits = 0;

    documentIds.forEach(id => {
      const data = localStorage.getItem(`${STORAGE_KEY}_${id}`);
      if (data) {
        totalSize += data.length;
        
        try {
          const parsedData = JSON.parse(data) as ProformaInvoiceData;
          if (parsedData.hasEdits) {
            documentsWithEdits++;
          }
        } catch (error) {
          // Ignore parsing errors
        }
      }
    });

    return {
      totalDocuments: documentIds.length,
      totalSizeKB: Math.round((totalSize * 2) / 1024),
      documentsWithEdits
    };
  }

  /**
   * Auto-cleanup old data (older than specified days)
   */
  static cleanupOldData(daysOld: number = 30): void {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      const cutoffTimestamp = cutoffDate.toISOString();

      const documentIds = this.getAllDocumentIds();
      let cleanedCount = 0;

      documentIds.forEach(id => {
        const data = this.loadEditedData(id);
        if (data && data.lastModified < cutoffTimestamp) {
          this.deleteEditedData(id);
          cleanedCount++;
        }
      });

      if (cleanedCount > 0) {
        console.log(`🧹 Cleaned up ${cleanedCount} old proforma invoice entries`);
      }
    } catch (error) {
      console.error('❌ Failed to cleanup old data:', error);
    }
  }

  /**
   * Check if data has been modified
   */
  static hasModifications(documentId: string): boolean {
    const data = this.loadEditedData(documentId);
    if (!data) return false;
    
    return JSON.stringify(data.originalData) !== JSON.stringify(data.editedData);
  }

  /**
   * Get edit summary
   */
  static getEditSummary(documentId: string): {
    headerChanges: string[];
    itemsAdded: number;
    itemsRemoved: number;
    itemsModified: number;
  } | null {
    const data = this.loadEditedData(documentId);
    if (!data) return null;

    const headerChanges: string[] = [];
    const originalHeader = data.originalData.header;
    const editedHeader = data.editedData.header;

    // Check header changes
    Object.keys(editedHeader).forEach(key => {
      if (originalHeader[key] !== editedHeader[key]) {
        headerChanges.push(key);
      }
    });

    // Check items changes
    const originalItems = data.originalData.items;
    const editedItems = data.editedData.items;
    
    const itemsAdded = Math.max(0, editedItems.length - originalItems.length);
    const itemsRemoved = Math.max(0, originalItems.length - editedItems.length);
    
    let itemsModified = 0;
    const minLength = Math.min(originalItems.length, editedItems.length);
    for (let i = 0; i < minLength; i++) {
      if (JSON.stringify(originalItems[i]) !== JSON.stringify(editedItems[i])) {
        itemsModified++;
      }
    }

    return {
      headerChanges,
      itemsAdded,
      itemsRemoved,
      itemsModified
    };
  }
}