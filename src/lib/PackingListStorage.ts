import { EditedPackingListData, SharedBoxGroup, EditAction, GroupRelation } from '@/services/ocr/SharedBoxDetector';

const STORAGE_KEY = 'editedPackingListData';

export class PackingListStorage {
  /**
   * Save edited packing list data to localStorage
   */
  static saveEditedData(data: EditedPackingListData): void {
    try {
      const serializedData = JSON.stringify(data);
      localStorage.setItem(`${STORAGE_KEY}_${data.documentId}`, serializedData);
      
      // Also save a list of all document IDs for cleanup
      this.updateDocumentIdsList(data.documentId);
      
      console.log('📦 Saved edited packing list data to localStorage:', data.documentId);
    } catch (error) {
      console.error('❌ Failed to save edited packing list data:', error);
    }
  }

  /**
   * Load edited packing list data from localStorage
   */
  static loadEditedData(documentId: string): EditedPackingListData | null {
    try {
      const serializedData = localStorage.getItem(`${STORAGE_KEY}_${documentId}`);
      if (serializedData) {
        const data = JSON.parse(serializedData) as EditedPackingListData;
        console.log('📂 Loaded edited packing list data from localStorage:', documentId);
        return data;
      }
    } catch (error) {
      console.error('❌ Failed to load edited packing list data:', error);
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
      console.log('🗑️ Deleted edited packing list data:', documentId);
    } catch (error) {
      console.error('❌ Failed to delete edited packing list data:', error);
    }
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
   * Clear all edited data (useful for cleanup)
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
      
      console.log('🧹 Cleared all edited packing list data');
    } catch (error) {
      console.error('❌ Failed to clear all edited data:', error);
    }
  }

  /**
   * Get storage usage statistics
   */
  static getStorageStats(): {
    totalDocuments: number;
    totalSizeKB: number;
    lastModified: string | null;
  } {
    const documentIds = this.getAllDocumentIds();
    let totalSize = 0;
    let lastModified: string | null = null;

    documentIds.forEach(id => {
      const data = localStorage.getItem(`${STORAGE_KEY}_${id}`);
      if (data) {
        totalSize += data.length;
        
        try {
          const parsedData = JSON.parse(data) as EditedPackingListData;
          if (!lastModified || parsedData.lastModified > lastModified) {
            lastModified = parsedData.lastModified;
          }
        } catch (error) {
          // Ignore parsing errors for stats
        }
      }
    });

    return {
      totalDocuments: documentIds.length,
      totalSizeKB: Math.round((totalSize * 2) / 1024), // Approximate size in KB (UTF-16 encoding)
      lastModified
    };
  }

  /**
   * Export edited data for a document (for sending to backend)
   */
  static exportEditedData(documentId: string): {
    documentId: string;
    editedItems: any[];
    editHistory: EditAction[];
    summary: any;
  } | null {
    const data = this.loadEditedData(documentId);
    if (!data) return null;

    return {
      documentId,
      editedItems: data.editedData,
      editHistory: data.editHistory,
      summary: {
        totalItems: data.editedData.length,
        sharedBoxGroups: data.sharedBoxGroups.length,
        totalEdits: data.editHistory.length,
        lastModified: data.lastModified
      }
    };
  }

  /**
   * Merge original data with edited data
   */
  static mergeWithEditedData(originalItems: any[], documentId: string): {
    items: any[];
    hasEdits: boolean;
    editedGroups: SharedBoxGroup[];
  } {
    const editedData = this.loadEditedData(documentId);
    
    if (!editedData) {
      return {
        items: originalItems,
        hasEdits: false,
        editedGroups: []
      };
    }

    return {
      items: editedData.editedData,
      hasEdits: true,
      editedGroups: editedData.sharedBoxGroups
    };
  }

  /**
   * Auto-cleanup old edited data (older than 30 days)
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
        console.log(`🧹 Cleaned up ${cleanedCount} old edited data entries`);
      }
    } catch (error) {
      console.error('❌ Failed to cleanup old data:', error);
    }
  }

  /**
   * Save group relations for a document
   */
  static saveGroupRelations(documentId: string, relations: GroupRelation[]): void {
    try {
      const data = this.loadEditedData(documentId);
      if (data) {
        data.groupRelations = relations;
        data.lastModified = new Date().toISOString();
        this.saveEditedData(data);
        console.log('🔗 Saved group relations:', relations.length);
      }
    } catch (error) {
      console.error('❌ Failed to save group relations:', error);
    }
  }

  /**
   * Load group relations for a document
   */
  static loadGroupRelations(documentId: string): GroupRelation[] {
    try {
      const data = this.loadEditedData(documentId);
      return data?.groupRelations || [];
    } catch (error) {
      console.error('❌ Failed to load group relations:', error);
      return [];
    }
  }

  /**
   * Add a new group relation
   */
  static addGroupRelation(documentId: string, relation: Omit<GroupRelation, 'id' | 'createdAt'>): void {
    try {
      const relations = this.loadGroupRelations(documentId);
      const newRelation: GroupRelation = {
        ...relation,
        id: `rel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString()
      };
      
      relations.push(newRelation);
      this.saveGroupRelations(documentId, relations);
    } catch (error) {
      console.error('❌ Failed to add group relation:', error);
    }
  }

  /**
   * Remove a group relation
   */
  static removeGroupRelation(documentId: string, relationId: string): void {
    try {
      const relations = this.loadGroupRelations(documentId);
      const updatedRelations = relations.filter(r => r.id !== relationId);
      this.saveGroupRelations(documentId, updatedRelations);
    } catch (error) {
      console.error('❌ Failed to remove group relation:', error);
    }
  }

  /**
   * Update a group relation
   */
  static updateGroupRelation(documentId: string, relationId: string, updates: Partial<GroupRelation>): void {
    try {
      const relations = this.loadGroupRelations(documentId);
      const index = relations.findIndex(r => r.id === relationId);
      
      if (index !== -1) {
        relations[index] = {
          ...relations[index],
          ...updates,
          id: relations[index].id, // Preserve original ID
          createdAt: relations[index].createdAt // Preserve original creation time
        };
        this.saveGroupRelations(documentId, relations);
      }
    } catch (error) {
      console.error('❌ Failed to update group relation:', error);
    }
  }

  /**
   * Find relation by master item
   */
  static findRelationByMaster(documentId: string, masterId: string): GroupRelation | null {
    try {
      const relations = this.loadGroupRelations(documentId);
      return relations.find(r => r.masterId === masterId) || null;
    } catch (error) {
      console.error('❌ Failed to find relation:', error);
      return null;
    }
  }
}