interface PackingListItem {
  item_number: number;
  reference?: string;
  descricao_ingles?: string;
  descricao_chines?: string;
  quantidade_de_pacotes?: number;
  quantidade_por_pacote?: number;
  quantidade_total?: number;
  marcacao_do_pacote?: string;
  peso_bruto_por_pacote?: number;
  peso_bruto_total?: number;
  peso_liquido_por_pacote?: number;
  peso_liquido_total?: number;
  comprimento_pacote?: number;
  largura_pacote?: number;
  altura_pacote?: number;
  container?: string;
}

export interface SharedBoxGroup {
  id: string; // Unique identifier for the group
  masterItem: PackingListItem; // Item with weight (reference)
  masterIndex: number; // Index of master item in original array
  sharedItems: PackingListItem[]; // Items without weight or duplicated items
  sharedIndexes: number[]; // Indexes of shared items in original array
  startIndex: number; // First index of the group (master)
  endIndex: number; // Last index of the group (last shared item)
  totalSharedItems: number; // Number of items sharing the box or duplicated
  totalWeight: number; // Combined weight that should be distributed
  isEdited: boolean; // Flag to track if group has been manually edited
  groupType: 'shared_box' | 'duplicated_items'; // Type of grouping detected
  isSuperGroup?: boolean; // Flag for super-groups (merged adjacent groups)
  originalGroups?: string[]; // IDs of original groups that were merged
  canMergeWith?: string[]; // IDs of adjacent groups that can be merged
}

export interface EditAction {
  type: 'separate' | 'merge' | 'weight_update' | 'quantity_update';
  timestamp: string;
  groupId: string;
  oldData: any;
  newData: any;
  description: string;
}

export interface GroupRelation {
  id: string;
  masterId: string; // item_number of master item
  childIds: string[]; // item_numbers of child items
  groupType: 'shared_box' | 'duplicated_items';
  createdAt: string;
  metadata?: {
    originalMasterPackages?: number; // Original package count before grouping
    totalChildItems?: number;
  };
}

export interface EditedPackingListData {
  originalData: PackingListItem[];
  editedData: PackingListItem[];
  sharedBoxGroups: SharedBoxGroup[];
  editHistory: EditAction[];
  lastModified: string;
  documentId: string; // hash of original document
  groupRelations?: GroupRelation[]; // New: master-child relationships
}

export class SharedBoxDetector {
  /**
   * Detect shared box groups in packing list data
   * @param items - Array of packing list items
   * @returns Array of detected shared box groups
   */
  static detectSharedBoxGroups(items: PackingListItem[]): SharedBoxGroup[] {
    const groups: SharedBoxGroup[] = [];
    let currentGroup: SharedBoxGroup | null = null;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const isZeroWeight = this.isZeroWeightItem(item);
      const isSinglePackage = item.quantidade_de_pacotes === 1;
      
      // Check if current item has same quantity and weight as previous item
      const previousItem = i > 0 ? items[i - 1] : null;
      const isDuplicate = previousItem && this.hasSameQuantityAndWeight(item, previousItem);

      if ((isZeroWeight && isSinglePackage) || isDuplicate) {
        if (!currentGroup) {
          if (isZeroWeight && isSinglePackage) {
            // Shared box: look for the master item (previous item with weight)
            const masterIndex = this.findMasterItem(items, i);
            if (masterIndex !== -1) {
              const masterItem = items[masterIndex];
              currentGroup = {
                id: `shared_${masterIndex}_${Date.now()}`,
                masterItem,
                masterIndex,
                sharedItems: [item],
                sharedIndexes: [i],
                startIndex: masterIndex,
                endIndex: i,
                totalSharedItems: 1,
                totalWeight: 0, // Not used anymore - keep original data
                isEdited: false,
                groupType: 'shared_box'
              };
            }
          } else if (isDuplicate) {
            // Duplicated items: previous item becomes master
            const masterIndex = i - 1;
            const masterItem = items[masterIndex];
            currentGroup = {
              id: `duplicate_${masterIndex}_${Date.now()}`,
              masterItem,
              masterIndex,
              sharedItems: [item],
              sharedIndexes: [i],
              startIndex: masterIndex,
              endIndex: i,
              totalSharedItems: 1,
              totalWeight: 0, // Not used anymore - keep original data
              isEdited: false,
              groupType: 'duplicated_items'
            };
          }
        } else {
          // Add to existing group (check if it's the same type)
          const isCompatible = (
            (currentGroup.groupType === 'shared_box' && isZeroWeight && isSinglePackage) ||
            (currentGroup.groupType === 'duplicated_items' && isDuplicate)
          );
          
          if (isCompatible) {
            currentGroup.sharedItems.push(item);
            currentGroup.sharedIndexes.push(i);
            currentGroup.endIndex = i;
            currentGroup.totalSharedItems++;
            // No longer updating totalWeight - keeping original data
          } else {
            // End current group and potentially start new one
            if (currentGroup.totalSharedItems > 0) {
              groups.push(currentGroup);
            }
            currentGroup = null;
            i--; // Reprocess current item
          }
        }
      } else {
        // Item doesn't match grouping criteria - end current group if exists
        if (currentGroup && currentGroup.totalSharedItems > 0) {
          groups.push(currentGroup);
          currentGroup = null;
        }
      }
    }

    // Add the last group if it exists
    if (currentGroup && currentGroup.totalSharedItems > 0) {
      groups.push(currentGroup);
    }

    return groups;
  }

  /**
   * Check if an item has zero weight (indicating shared box)
   */
  private static isZeroWeightItem(item: PackingListItem): boolean {
    return (
      (item.peso_bruto_por_pacote === 0 || item.peso_bruto_por_pacote === null || item.peso_bruto_por_pacote === undefined) &&
      (item.peso_bruto_total === 0 || item.peso_bruto_total === null || item.peso_bruto_total === undefined) &&
      (item.peso_liquido_por_pacote === 0 || item.peso_liquido_por_pacote === null || item.peso_liquido_por_pacote === undefined) &&
      (item.peso_liquido_total === 0 || item.peso_liquido_total === null || item.peso_liquido_total === undefined)
    );
  }

  /**
   * Check if two items have identical quantity and weight data
   */
  private static hasSameQuantityAndWeight(item1: PackingListItem, item2: PackingListItem): boolean {
    return (
      item1.quantidade_de_pacotes === item2.quantidade_de_pacotes &&
      item1.peso_bruto_por_pacote === item2.peso_bruto_por_pacote &&
      item1.peso_bruto_total === item2.peso_bruto_total &&
      item1.peso_liquido_por_pacote === item2.peso_liquido_por_pacote &&
      item1.peso_liquido_total === item2.peso_liquido_total
    );
  }

  /**
   * Check if two master items have compatible product data for merging
   */
  static canMergeGroups(group1: SharedBoxGroup, group2: SharedBoxGroup): boolean {
    const master1 = group1.masterItem;
    const master2 = group2.masterItem;
    
    return (
      // Same product description
      master1.descricao_ingles === master2.descricao_ingles &&
      // Same container
      master1.container === master2.container &&
      // Same weight per package
      master1.peso_bruto_por_pacote === master2.peso_bruto_por_pacote &&
      // Same quantity per package
      master1.quantidade_de_pacotes === master2.quantidade_de_pacotes &&
      // Groups are adjacent
      group1.endIndex + 1 === group2.startIndex &&
      // Same group type
      group1.groupType === group2.groupType &&
      // Neither is already a super group
      !group1.isSuperGroup && !group2.isSuperGroup
    );
  }

  /**
   * Detect adjacent groups that can be merged after user interactions
   */
  static detectAdjacentMergeableGroups(groups: SharedBoxGroup[]): SharedBoxGroup[] {
    const updatedGroups = [...groups];
    
    // Sort groups by start index to ensure proper adjacency checking
    updatedGroups.sort((a, b) => a.startIndex - b.startIndex);
    
    // Check each group for potential merges with the next group
    for (let i = 0; i < updatedGroups.length - 1; i++) {
      const currentGroup = updatedGroups[i];
      const nextGroup = updatedGroups[i + 1];
      
      if (this.canMergeGroups(currentGroup, nextGroup)) {
        // Add merge capability flag
        if (!currentGroup.canMergeWith) {
          currentGroup.canMergeWith = [];
        }
        if (!currentGroup.canMergeWith.includes(nextGroup.id)) {
          currentGroup.canMergeWith.push(nextGroup.id);
        }
      }
    }
    
    return updatedGroups;
  }

  /**
   * Merge two adjacent groups into a super-group
   */
  static mergeAdjacentGroups(group1: SharedBoxGroup, group2: SharedBoxGroup): SharedBoxGroup {
    if (!this.canMergeGroups(group1, group2)) {
      throw new Error('Groups cannot be merged - they are not compatible');
    }
    
    // Create super-group combining both groups
    const superGroup: SharedBoxGroup = {
      id: `super_${group1.id}_${group2.id}_${Date.now()}`,
      masterItem: group1.masterItem,
      masterIndex: group1.masterIndex,
      sharedItems: [...group1.sharedItems, group2.masterItem, ...group2.sharedItems],
      sharedIndexes: [...group1.sharedIndexes, group2.masterIndex, ...group2.sharedIndexes],
      startIndex: group1.startIndex,
      endIndex: group2.endIndex,
      totalSharedItems: group1.totalSharedItems + group2.totalSharedItems + 1, // +1 for group2's master
      totalWeight: group1.totalWeight + group2.totalWeight,
      isEdited: false,
      groupType: group1.groupType,
      isSuperGroup: true,
      originalGroups: [group1.id, group2.id],
      canMergeWith: []
    };
    
    return superGroup;
  }

  /**
   * Split a super-group back into its original groups
   */
  static splitSuperGroup(superGroup: SharedBoxGroup, originalGroups: SharedBoxGroup[]): SharedBoxGroup[] {
    if (!superGroup.isSuperGroup || !superGroup.originalGroups) {
      throw new Error('Group is not a super-group or missing original group data');
    }
    
    // Return the original groups
    return originalGroups.filter(group => 
      superGroup.originalGroups!.includes(group.id)
    );
  }

  /**
   * Find the master item (previous item with weight) for a shared box group
   */
  private static findMasterItem(items: PackingListItem[], currentIndex: number): number {
    // Look backwards for an item with weight
    for (let i = currentIndex - 1; i >= 0; i--) {
      const item = items[i];
      if (!this.isZeroWeightItem(item) && item.quantidade_de_pacotes === 1) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Generate a hash for document identification
   */
  static generateDocumentId(items: PackingListItem[]): string {
    const dataString = JSON.stringify(items.map(item => ({
      item_number: item.item_number,
      descricao_ingles: item.descricao_ingles,
      quantidade_de_pacotes: item.quantidade_de_pacotes
    })));
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < dataString.length; i++) {
      const char = dataString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `doc_${Math.abs(hash)}`;
  }

  /**
   * Distribute weight among shared items in a group
   */
  static distributeWeight(group: SharedBoxGroup, totalWeight: number): PackingListItem[] {
    const totalItems = group.totalSharedItems;
    const weightPerItem = totalWeight / totalItems;
    
    return group.sharedItems.map(item => ({
      ...item,
      peso_bruto_por_pacote: weightPerItem,
      peso_bruto_total: weightPerItem,
      peso_liquido_por_pacote: weightPerItem * 0.95, // Assume 5% tare weight
      peso_liquido_total: weightPerItem * 0.95
    }));
  }

  /**
   * Separate shared items into individual boxes
   */
  static separateSharedBoxes(group: SharedBoxGroup, weights: number[]): PackingListItem[] {
    if (weights.length !== group.totalSharedItems) {
      throw new Error('Weight array length must match number of shared items');
    }

    return group.sharedItems.map((item, index) => ({
      ...item,
      peso_bruto_por_pacote: weights[index],
      peso_bruto_total: weights[index],
      peso_liquido_por_pacote: weights[index] * 0.95,
      peso_liquido_total: weights[index] * 0.95
    }));
  }

  /**
   * Get summary statistics for shared box groups
   */
  static getGroupsSummary(groups: SharedBoxGroup[]): {
    totalGroups: number;
    totalSharedItems: number;
    totalEditedGroups: number;
    averageItemsPerGroup: number;
  } {
    const totalSharedItems = groups.reduce((sum, group) => sum + group.totalSharedItems, 0);
    const totalEditedGroups = groups.filter(group => group.isEdited).length;

    return {
      totalGroups: groups.length,
      totalSharedItems,
      totalEditedGroups,
      averageItemsPerGroup: groups.length > 0 ? totalSharedItems / groups.length : 0
    };
  }
}