// Packing List specific types

export interface PackingListItem {
  item_number?: number;
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
  // Legacy fields for backward compatibility
  numero_item?: number;
  descricao?: string;
  qnts_por_caixa?: number;
  qnts_de_caixas?: number;
  peso_bruto?: number;
  peso_liquido?: number;
  peso_unit_bruto?: number;
  peso_unit_liquido?: number;
  // Group display fields
  _isGrouped?: boolean;
  _groupDetails?: string;
  _groupedItemsCount?: number;
  _childItemNumbers?: number[];
  _isGroupMaster?: boolean;
  _isGroupChild?: boolean;
  _groupType?: 'shared_box' | 'duplicated_items';
  _groupId?: string;
  _childIndex?: number;
}

export interface PackingListHeader {
  invoice?: string;
  consignee?: string;
  notify_party?: string;
  date?: string;
  load_port?: string;
  destination?: string;
  contracted_company?: string;
  contracted_email?: string;
  package_total?: number;
  items_qty_total?: number;
  total_gw?: number;
  total_containers?: number;
  quantidade_de_pacotes?: number;
  peso_bruto?: number;
  volume?: number;
  total_itens?: number;
}

export interface PackingListContainer {
  id?: string;
  invoice?: string;
  container?: string;
  booking?: string;
  tipo_container?: string;
  quantidade_de_pacotes?: number;
  peso_bruto?: number;
  volume?: number;
  from_package?: number;
  to_package?: number;
  from_item?: number | string;
  to_item?: number | string;
  peso_bruto_container?: number;
  peso_liquido_container?: number;
  volume_container?: number;
  quantidade_pacotes_container?: number;
}

export interface PackingListProcessingResult {
  header?: PackingListHeader;
  containers?: PackingListContainer[];
  items_por_container?: PackingListItem[];
  // Multi-step processing support
  extractedData?: any; // Can be array (multi-prompt) or object (single-prompt)
  multiPrompt?: {
    documentType?: string;
    totalSteps?: number;
    steps?: Array<{
      step: number;
      stepName: string;
      result: string;
    }>;
  };
}

export interface PackingListPrompts {
  prompt1_general_data: string;
  prompt2_containers_mapping: string;
  prompt3_disposition_explanation: string;
  prompt4_final_distribution: string;
}

export interface PackingListValidationRules {
  requireHeader: boolean;
  requireContainers: boolean;
  requireItems: boolean;
  validateContainerNumbers: boolean;
  validateWeightConsistency: boolean;
  validatePackageConsistency: boolean;
  validateItemNumberSequence: boolean;
}

export interface PackingListProcessingOptions {
  useMultiStep?: boolean;
  validateData?: boolean;
  saveToStorage?: boolean;
  enableGrouping?: boolean;
  autoDetectSharedBoxes?: boolean;
  enableWeightDistribution?: boolean;
}

// Grouping and shared boxes types
export interface SharedBoxGroup {
  id: string;
  masterItem: PackingListItem;
  masterIndex: number;
  sharedItems: PackingListItem[];
  sharedIndexes: number[];
  startIndex: number;
  endIndex: number;
  totalSharedItems: number;
  totalWeight: number;
  isEdited: boolean;
  groupType: 'shared_box' | 'duplicated_items';
  isSuperGroup?: boolean;
  originalGroups?: string[];
  canMergeWith?: string[];
}

export interface GroupRelation {
  id: string;
  masterId: string; // item_number of master item
  childIds: string[]; // item_numbers of child items
  groupType: 'shared_box' | 'duplicated_items';
  createdAt: string;
  metadata?: {
    originalMasterPackages?: number;
    totalChildItems?: number;
  };
}

export interface EditAction {
  type: 'separate' | 'merge' | 'weight_update' | 'quantity_update';
  timestamp: string;
  groupId: string;
  oldData: any;
  newData: any;
  description: string;
}

export interface EditedPackingListData {
  originalData: PackingListItem[];
  editedData: PackingListItem[];
  sharedBoxGroups: SharedBoxGroup[];
  editHistory: EditAction[];
  lastModified: string;
  documentId: string;
  groupRelations?: GroupRelation[];
}