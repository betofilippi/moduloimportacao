'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  Package, 
  Ship, 
  Box, 
  AlertTriangle, 
  Copy, 
  Link, 
  Edit2,
  Scale,
  Hash
} from 'lucide-react';
import { toast } from 'sonner';

// Import standardized components
import { 
  BaseViewerProps, 
  useViewerState, 
  viewerUtils,
  ExtractedData 
} from '../components/BaseViewer';
import { HeaderSection, HeaderField } from '../components/HeaderSection';
import { TableViewLayout, TableEditLayout, ColumnDefinition, EditColumnDefinition } from '../layout';
import { SharedBoxDetector, SharedBoxGroup, GroupRelation } from '@/services/ocr/SharedBoxDetector';
import { PackingListStorage } from '@/lib/PackingListStorage';
import { SharedBoxEditor } from '../modals/SharedBoxEditor';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface PackingListItem {
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
  // Legacy fields
  numero_item?: number;
  descricao?: string;
  qnts_por_caixa?: number;
  qnts_de_caixas?: number;
  peso_bruto?: number;
  peso_liquido?: number;
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

interface PackingListData extends ExtractedData {
  header: any;
  items: PackingListItem[];
  containers?: any[];
  dispositionExplanation?: string;
  processingSummary?: any;
}

// Function to filter columns based on data density
function filterValidColumns(data: any[], threshold: number = 0.2): string[] {
  if (!data || data.length === 0) return [];
  
  const sampleItem = data[0];
  const allKeys = Object.keys(sampleItem);
  const validColumns: string[] = [];
  
  for (const key of allKeys) {
    let validCount = 0;
    for (const item of data) {
      const value = item[key];
      if (value !== null && value !== undefined && value !== '' && value !== 0) {
        validCount++;
      }
    }
    
    const density = validCount / data.length;
    if (density >= threshold) {
      validColumns.push(key);
    }
  }
  
  return validColumns;
}

export function PackingListViewer(props: BaseViewerProps) {
  const {
    variant = 'detailed',
    readonly = false,
    onSaveToDatabase,
    className
  } = props;
  
  console.log('🎯 PackingListViewer - props recebidas:', props);

  // Extract multi-prompt information
  const isMultiPrompt = (props.data?.multiPrompt?.totalSteps || 0) > 0;
  const structuredResult = (props.data as any)?.structuredResult;
  
  // State for viewer
  const {
    isEditing,
    editedData,
    handleEdit,
    handleSave,
    handleCancel,
    updateData,
    updateField,
    updateItem
  } = useViewerState<PackingListData>(
    {
      header: {},
      items: [],
      containers: []
    },
    props
  );

  const { formatCurrency } = viewerUtils;

  // Define header fields for editing
  const headerFields: HeaderField[] = [
    {
      key: 'invoice',
      label: 'Invoice',
      type: 'text',
      icon: <FileText className="h-5 w-5 text-muted-foreground" />
    },
    {
      key: 'items_qty_total',
      label: 'Total de Itens',
      type: 'number',
      icon: <Package className="h-5 w-5 text-muted-foreground" />
    },
    {
      key: 'total_gw',
      label: 'Peso Total (KG)',
      type: 'number',
      icon: <Scale className="h-5 w-5 text-muted-foreground" />
    }
  ];

  // State for shared box detection
  const [sharedBoxGroups, setSharedBoxGroups] = useState<SharedBoxGroup[]>([]);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [editingGroup, setEditingGroup] = useState<SharedBoxGroup | null>(null);
  const [displayItems, setDisplayItems] = useState<PackingListItem[]>([]);

  // Initialize shared box detection
  useEffect(() => {
    const items = editedData.items || [];
    if (items.length > 0) {
      // Detect shared box groups
      const detectedGroups = SharedBoxDetector.detectSharedBoxGroups(items as any);
      console.log('🔍 Detected shared box groups:', detectedGroups);
      
      // Detect adjacent mergeable groups
      const groupsWithMergeInfo = SharedBoxDetector.detectAdjacentMergeableGroups(detectedGroups);
      setSharedBoxGroups(groupsWithMergeInfo);
      
      // Load collapsed groups preference
      const docId = SharedBoxDetector.generateDocumentId(items as any);
      const savedCollapsed = localStorage.getItem(`collapsed_groups_${docId}`);
      if (savedCollapsed) {
        setCollapsedGroups(new Set(JSON.parse(savedCollapsed)));
      }
    }
  }, [editedData.items]);

  // Process items for display (handle collapsed groups)
  useEffect(() => {
    const items = editedData.items || [];
    // When editing, use original items without grouping
    if (isEditing) {
      setDisplayItems(items);
    } else {
      const processedItems = getDisplayItems(items, sharedBoxGroups, collapsedGroups);
      setDisplayItems(processedItems);
    }
  }, [editedData.items, sharedBoxGroups, collapsedGroups, isEditing]);

  // Expand all groups when entering edit mode
  useEffect(() => {
    if (isEditing && collapsedGroups.size > 0) {
      setCollapsedGroups(new Set());
      toast.info('Grupos expandidos para edição');
    }
  }, [isEditing]);

  // Handle group collapse/expand toggle
  const handleToggleGroup = (groupId: string) => {
    const newCollapsedGroups = new Set(collapsedGroups);
    const group = sharedBoxGroups.find(g => g.id === groupId);
    
    if (newCollapsedGroups.has(groupId)) {
      newCollapsedGroups.delete(groupId);
      const groupType = group?.isSuperGroup 
        ? 'Super-grupo' 
        : group?.groupType === 'shared_box' 
          ? 'Caixas compartilhadas' 
          : 'Itens duplicados';
      toast.success(`${groupType} expandido`);
      
      // Remove group relation when expanding
      if (group) {
        const docId = SharedBoxDetector.generateDocumentId(editedData.items as any);
        const existingRelation = PackingListStorage.findRelationByMaster(docId, String(group.masterItem.item_number));
        if (existingRelation) {
          PackingListStorage.removeGroupRelation(docId, existingRelation.id);
        }
      }
    } else {
      newCollapsedGroups.add(groupId);
      const groupType = group?.isSuperGroup 
        ? 'Super-grupo' 
        : group?.groupType === 'shared_box' 
          ? 'Caixas compartilhadas' 
          : 'Itens duplicados';
      toast.success(`${groupType} unificado`);
      
      // Save group relation when collapsing
      if (group) {
        const docId = SharedBoxDetector.generateDocumentId(editedData.items as any);
        const relation: Omit<GroupRelation, 'id' | 'createdAt'> = {
          masterId: String(group.masterItem.item_number),
          childIds: group.sharedItems.map(item => String(item.item_number)),
          groupType: group.groupType,
          metadata: {
            originalMasterPackages: group.masterItem.quantidade_de_pacotes,
            totalChildItems: group.totalSharedItems
          }
        };
        PackingListStorage.addGroupRelation(docId, relation);
      }
    }
    
    setCollapsedGroups(newCollapsedGroups);
    
    // Re-evaluate adjacent groups
    reEvaluateAdjacentGroups(newCollapsedGroups);
    
    // Save preference
    const docId = SharedBoxDetector.generateDocumentId(editedData.items as any);
    localStorage.setItem(`collapsed_groups_${docId}`, JSON.stringify(Array.from(newCollapsedGroups)));
  };

  // Handle merging adjacent groups
  const handleMergeGroups = (groupId: string) => {
    const group = sharedBoxGroups.find(g => g.id === groupId);
    if (!group || !group.canMergeWith || group.canMergeWith.length === 0) return;
    
    const adjacentGroupId = group.canMergeWith[0];
    const adjacentGroup = sharedBoxGroups.find(g => g.id === adjacentGroupId);
    
    if (!adjacentGroup) return;
    
    try {
      // Create super-group
      const superGroup = SharedBoxDetector.mergeAdjacentGroups(group, adjacentGroup);
      
      // Update groups list
      const updatedGroups = sharedBoxGroups.filter(g => g.id !== groupId && g.id !== adjacentGroupId);
      updatedGroups.push(superGroup);
      
      // Update collapsed groups
      const newCollapsedGroups = new Set(collapsedGroups);
      const bothWereCollapsed = newCollapsedGroups.has(groupId) && newCollapsedGroups.has(adjacentGroupId);
      
      newCollapsedGroups.delete(groupId);
      newCollapsedGroups.delete(adjacentGroupId);
      
      if (bothWereCollapsed) {
        newCollapsedGroups.add(superGroup.id);
      }
      
      setSharedBoxGroups(updatedGroups);
      setCollapsedGroups(newCollapsedGroups);
      
      toast.success('Grupos adjacentes unidos em super-grupo');
      
      // Save preference
      const docId = SharedBoxDetector.generateDocumentId(editedData.items as any);
      localStorage.setItem(`collapsed_groups_${docId}`, JSON.stringify(Array.from(newCollapsedGroups)));
    } catch (error) {
      toast.error('Erro ao unir grupos adjacentes');
      console.error('Error merging groups:', error);
    }
  };

  // Re-evaluate adjacent groups
  const reEvaluateAdjacentGroups = (currentCollapsedGroups: Set<string>) => {
    const collapsedGroupsList = sharedBoxGroups.filter(g => currentCollapsedGroups.has(g.id));
    
    if (collapsedGroupsList.length < 2) return;
    
    const updatedGroups = SharedBoxDetector.detectAdjacentMergeableGroups(sharedBoxGroups);
    setSharedBoxGroups(updatedGroups);
  };

  // Process items for display
  const getDisplayItems = (items: PackingListItem[], groups: SharedBoxGroup[], collapsed: Set<string>): PackingListItem[] => {
    if (collapsed.size === 0) {
      return items; // No groups collapsed
    }

    const displayItems: PackingListItem[] = [];
    const processedIndexes = new Set<number>();

    for (let i = 0; i < items.length; i++) {
      if (processedIndexes.has(i)) continue;

      const item = items[i];
      const itemNumber = item.item_number || item.numero_item;
      
      // Check if this item is a master of a collapsed group
      const collapsedGroup = groups.find(group => 
        group.masterItem.item_number === itemNumber && collapsed.has(group.id)
      );

      if (collapsedGroup) {
        // Create unified group item
        const isSharedBox = collapsedGroup.groupType === 'shared_box';
        const isDuplicated = collapsedGroup.groupType === 'duplicated_items';
        
        let groupDescription: string;
        let groupDetails: string;
        
        if (collapsedGroup.isSuperGroup) {
          const totalEntries = collapsedGroup.totalSharedItems + 1;
          groupDescription = `🔗 Super-Grupo: ${collapsedGroup.masterItem.descricao_ingles} (${totalEntries} itens agrupados)`;
          groupDetails = `${collapsedGroup.originalGroups?.length || 0} grupos adjacentes unidos`;
        } else if (isSharedBox) {
          groupDescription = `📦 Caixa Mestre: ${collapsedGroup.masterItem.descricao_ingles} (+${collapsedGroup.totalSharedItems} itens compartilhados)`;
          groupDetails = `Contém: ${collapsedGroup.sharedItems.map(si => si.descricao_ingles || (si as any).descricao || `Item ${si.item_number}`).join(', ')}`;
        } else {
          const totalEntries = collapsedGroup.totalSharedItems + 1;
          groupDescription = `📋 Itens Agrupados: ${collapsedGroup.masterItem.descricao_ingles} (${totalEntries} itens similares)`;
          groupDetails = `${totalEntries} itens com características idênticas`;
        }
        
        const groupItem: PackingListItem = {
          ...collapsedGroup.masterItem,
          descricao_ingles: groupDescription,
          _isGrouped: true,
          _groupDetails: groupDetails,
          _groupedItemsCount: collapsedGroup.totalSharedItems + 1,
          _childItemNumbers: collapsedGroup.sharedItems.map(si => si.item_number)
        };

        displayItems.push(groupItem);
        
        // Mark all group items as processed
        processedIndexes.add(collapsedGroup.masterIndex);
        collapsedGroup.sharedIndexes.forEach(idx => processedIndexes.add(idx));
      } else {
        // Check if this item is part of an expanded group
        const expandedGroup = groups.find(group => {
          const itemNumber = item.item_number || item.numero_item;
          return !collapsed.has(group.id) && (
            group.masterItem.item_number === itemNumber ||
            group.sharedItems.some(si => si.item_number === itemNumber)
          );
        });
        
        if (expandedGroup) {
          if (expandedGroup.masterItem.item_number === (item.item_number || item.numero_item)) {
            // Add master item
            displayItems.push({
              ...item,
              _isGroupMaster: true,
              _groupType: expandedGroup.groupType,
              _groupId: expandedGroup.id
            });
            processedIndexes.add(i);
            
            // Add all child items
            expandedGroup.sharedItems.forEach((childItem, childIndex) => {
              const childItemIndex = expandedGroup.sharedIndexes[childIndex];
              displayItems.push({
                ...items[childItemIndex],
                _isGroupChild: true,
                _groupId: expandedGroup.id,
                _childIndex: childIndex + 1
              });
              processedIndexes.add(childItemIndex);
            });
          }
        } else {
          // Regular item
          displayItems.push(item);
          processedIndexes.add(i);
        }
      }
    }

    return displayItems;
  };

  // Define columns for items table with group support
  const createItemColumns = (): ColumnDefinition[] => {
    return [
      {
        key: 'item_number',
        header: '#',
        className: 'w-[80px] text-center',
        render: (value: any, item: any) => {
          const itemNumber = value || item.numero_item || 'N/A';
          
          // If this is a child item, show with indentation
          if (item._isGroupChild) {
            return (
              <div className="flex items-center gap-1 pl-4">
                <span className="text-gray-400">↳</span>
                <span className="text-gray-600">{itemNumber}</span>
              </div>
            );
          }
          
          // Check if this item is a master item for a shared box group
          const masterGroup = sharedBoxGroups.find(group => 
            group.masterItem.item_number === itemNumber
          );
          
          if (masterGroup) {
            const isCollapsed = collapsedGroups.has(masterGroup.id);
            const isSharedBox = masterGroup.groupType === 'shared_box';
            const isDuplicated = masterGroup.groupType === 'duplicated_items';
            const isSuperGroup = masterGroup.isSuperGroup;
            const canMerge = isCollapsed && masterGroup.canMergeWith && masterGroup.canMergeWith.length > 0;
            
            let colors = isCollapsed 
              ? 'text-blue-600 hover:text-blue-700' 
              : isSuperGroup
                ? 'text-green-600 hover:text-green-700'
                : isSharedBox 
                  ? 'text-orange-600 hover:text-orange-700'
                  : 'text-purple-600 hover:text-purple-700';
            
            let Icon = isCollapsed 
              ? Box 
              : isSuperGroup
                ? Link
                : isSharedBox 
                  ? AlertTriangle 
                  : Copy;
            
            let tooltipText = '';
            if (isCollapsed) {
              if (isSuperGroup) {
                tooltipText = `Super-grupo (${masterGroup.originalGroups?.length || 0} grupos unidos) - clique para expandir`;
              } else if (canMerge) {
                tooltipText = `Grupo unificado - clique para expandir | Grupos adjacentes disponíveis para unir`;
              } else {
                tooltipText = `Grupo unificado - clique para expandir`;
              }
            } else {
              if (isSuperGroup) {
                tooltipText = `Super-grupo com ${masterGroup.totalSharedItems + 1} itens - clique para unificar`;
              } else if (isSharedBox) {
                tooltipText = `Caixa compartilhada com +${masterGroup.totalSharedItems} itens - clique para unificar`;
              } else {
                tooltipText = `Itens duplicados: ${masterGroup.totalSharedItems + 1} entradas idênticas - clique para unificar`;
              }
            }
            
            return (
              <div className="flex items-center gap-1">
                <span>{itemNumber}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className={`h-6 w-6 p-0 ${colors}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleGroup(masterGroup.id);
                  }}
                  title={tooltipText}
                >
                  <Icon className="h-4 w-4" />
                </Button>
                
                {/* Merge button for adjacent groups */}
                {canMerge && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-green-600 hover:text-green-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMergeGroups(masterGroup.id);
                    }}
                    title="Unir com grupo adjacente idêntico"
                  >
                    <Link className="h-3 w-3" />
                  </Button>
                )}
                
                {/* Edit button for shared box groups */}
                {isSharedBox && !isCollapsed && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingGroup(masterGroup);
                    }}
                    title="Editar distribuição de peso"
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            );
          }
          
          return itemNumber;
        },
      },
      {
        key: 'reference',
        header: 'Referência',
        className: 'min-w-[100px]',
      },
      {
        key: 'descricao_ingles',
        header: 'Descrição (EN)',
        className: 'min-w-[200px]',
        render: (value, item) => {
          const description = value || item.descricao || 'N/A';
          
          // Check if this is a grouped item with additional details
          if (item._isGrouped && item._groupDetails) {
            return (
              <div className="space-y-1">
                <div className="font-medium">{description}</div>
                <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded border-l-2 border-blue-200">
                  {item._groupDetails}
                </div>
              </div>
            );
          }
          
          // If this is a child item, show with muted style
          if (item._isGroupChild) {
            return (
              <div className="text-gray-600 pl-4">
                {description}
              </div>
            );
          }
          
          return description;
        },
      },
      {
        key: 'descricao_chines',
        header: 'Descrição (CN)',
        className: 'min-w-[150px]',
      },
      {
        key: 'quantidade_de_pacotes',
        header: 'Qtd Pacotes',
        className: 'text-right w-[100px]',
        render: (value, item) => value || item.qnts_de_caixas || 'N/A'
      },
      {
        key: 'quantidade_por_pacote',
        header: 'Qtd/Pacote',
        className: 'text-right w-[100px]',
        render: (value, item) => value || item.qnts_por_caixa || 'N/A',
      },
      {
        key: 'quantidade_total',
        header: 'Qtd Total',
        className: 'text-right w-[100px]',
      },
      {
        key: 'marcacao_do_pacote',
        header: 'Marcação',
        className: 'min-w-[120px]',
      },
      {
        key: 'peso_bruto_por_pacote',
        header: 'Peso Bruto/Pacote',
        className: 'text-right w-[130px]',
        render: (value) => value ? `${value} KG` : 'N/A',
      },
      {
        key: 'peso_bruto_total',
        header: 'Peso Bruto Total',
        className: 'text-right w-[130px]',
        render: (value, item) => {
          const finalValue = value || item.peso_bruto;
          return finalValue ? `${finalValue} KG` : 'N/A';
        },
      },
      {
        key: 'peso_liquido_por_pacote',
        header: 'Peso Líq/Pacote',
        className: 'text-right w-[130px]',
        render: (value) => value ? `${value} KG` : 'N/A',
      },
      {
        key: 'peso_liquido_total',
        header: 'Peso Líq Total',
        className: 'text-right w-[130px]',
        render: (value, item) => {
          const finalValue = value || item.peso_liquido;
          return finalValue ? `${finalValue} KG` : 'N/A';
        },
      },
      {
        key: 'comprimento_pacote',
        header: 'Compr. (mm)',
        className: 'text-right w-[100px]',
        render: (value) => value || 'N/A',
      },
      {
        key: 'largura_pacote',
        header: 'Larg. (mm)',
        className: 'text-right w-[100px]',
        render: (value) => value || 'N/A',
      },
      {
        key: 'altura_pacote',
        header: 'Alt. (mm)',
        className: 'text-right w-[100px]',
        render: (value) => value || 'N/A',
      },
      {
        key: 'container',
        header: 'Container',
        className: 'min-w-[120px]',
      },
    ];
  };

  // Define columns for items table in edit mode
  const createItemEditColumns = (): EditColumnDefinition[] => {
    return [
      {
        key: 'item_number',
        header: '#',
        className: 'w-[80px] text-center',
        inputType: 'number',
        readOnly: true, // Keep item numbers read-only
      },
      {
        key: 'reference',
        header: 'Referência',
        className: 'min-w-[100px]',
        inputType: 'text',
      },
      {
        key: 'descricao_ingles',
        header: 'Descrição (EN)',
        className: 'min-w-[200px]',
        inputType: 'textarea',
      },
      {
        key: 'descricao_chines',
        header: 'Descrição (CN)',
        className: 'min-w-[150px]',
        inputType: 'textarea',
      },
      {
        key: 'quantidade_de_pacotes',
        header: 'Qtd Pacotes',
        className: 'text-right w-[100px]',
        inputType: 'number',
      },
      {
        key: 'quantidade_por_pacote',
        header: 'Qtd/Pacote',
        className: 'text-right w-[100px]',
        inputType: 'number',
      },
      {
        key: 'quantidade_total',
        header: 'Qtd Total',
        className: 'text-right w-[100px]',
        inputType: 'number',
      },
      {
        key: 'marcacao_do_pacote',
        header: 'Marcação',
        className: 'min-w-[120px]',
        inputType: 'text',
      },
      {
        key: 'peso_bruto_por_pacote',
        header: 'Peso Bruto/Pacote',
        className: 'text-right w-[130px]',
        inputType: 'number',
      },
      {
        key: 'peso_bruto_total',
        header: 'Peso Bruto Total',
        className: 'text-right w-[130px]',
        inputType: 'number',
      },
      {
        key: 'peso_liquido_por_pacote',
        header: 'Peso Líq/Pacote',
        className: 'text-right w-[130px]',
        inputType: 'number',
      },
      {
        key: 'peso_liquido_total',
        header: 'Peso Líq Total',
        className: 'text-right w-[130px]',
        inputType: 'number',
      },
      {
        key: 'comprimento_pacote',
        header: 'Compr. (mm)',
        className: 'text-right w-[100px]',
        inputType: 'number',
      },
      {
        key: 'largura_pacote',
        header: 'Larg. (mm)',
        className: 'text-right w-[100px]',
        inputType: 'number',
      },
      {
        key: 'altura_pacote',
        header: 'Alt. (mm)',
        className: 'text-right w-[100px]',
        inputType: 'number',
      },
      {
        key: 'container',
        header: 'Container',
        className: 'min-w-[120px]',
        inputType: 'text',
      },
    ];
  };

  // Get filtered columns based on data density
  const allColumns = createItemColumns();
  const allEditColumns = createItemEditColumns();
  const validColumnKeys = filterValidColumns(displayItems, 0.2);
  const filteredColumns = allColumns.filter(col => 
    validColumnKeys.includes(col.key) || col.key === 'item_number' || col.key === 'descricao_ingles'
  );
  const filteredEditColumns = allEditColumns.filter(col => 
    validColumnKeys.includes(col.key) || col.key === 'item_number' || col.key === 'descricao_ingles'
  );

  // Calculate summary data
  const totalItems = editedData.items.length;
  const uniqueContainers = new Set(editedData.items.map(item => item.container).filter(Boolean)).size;
  const totalWeight = editedData.header?.total_gw || 
    editedData.items.reduce((sum, item) => {
      const weight = item.peso_bruto_total || item.peso_bruto || 0;
      return sum + (typeof weight === 'number' ? weight : 0);
    }, 0);

  // Summary view
  if (variant === 'summary') {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Packing List - Resumo {isMultiPrompt && '(Multi-Prompt)'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Invoice</p>
              <p className="font-semibold">{editedData.header?.invoice || 'N/A'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Total de Itens</p>
              <p className="font-semibold">{totalItems}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Containers</p>
              <p className="font-semibold">{uniqueContainers || editedData.containers?.length || 0}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Peso Total</p>
              <p className="font-semibold">{totalWeight ? `${totalWeight} KG` : 'N/A'}</p>
            </div>
            {isMultiPrompt && (
              <div>
                <p className="text-muted-foreground">Colunas com Dados</p>
                <p className="font-semibold">{filteredColumns.length}/{allColumns.length}</p>
              </div>
            )}
            {sharedBoxGroups.length > 0 && (
              <div>
                <p className="text-muted-foreground">Caixas Compartilhadas</p>
                <p className="font-semibold text-orange-600">{sharedBoxGroups.length} grupos</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Detailed view
  return (
    <div className={className}>
      {/* Header Section with general data */}
      <Card className="mb-6">
        <HeaderSection
          title="Informações Gerais"
          titleIcon={<FileText className="h-5 w-5" />}
          fields={headerFields}
          data={editedData.header}
          isEditing={isEditing}
          onEdit={!readonly ? handleEdit : undefined}
          onSave={handleSave}
          onCancel={handleCancel}
          onChange={(field, value) => updateField('header', field, value)}
          badge={<Badge variant="outline" className="text-lg">{editedData.header?.invoice || 'N/A'}</Badge>}
          variant="card"
        />
      </Card>

      {/* Processing info header */}
      {isMultiPrompt && (
        <Card className="mb-6 bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-blue-800">
              <FileText className="h-5 w-5" />
              <span className="font-medium">
                Processado com Multi-Prompt (4 etapas) • {filteredColumns.length} colunas com dados suficientes (≥20%)
              </span>
            </div>
            {structuredResult && (
              <div className="text-sm text-blue-700 mt-2">
                <span className="font-medium">Fontes dos dados:</span>{' '}
                Header (Etapa {structuredResult.header?.metadata?.step || '?'}), 
                Containers (Etapa {structuredResult.containers?.metadata?.step || '?'}), 
                Items (Etapa {structuredResult.items?.metadata?.step || '?'})
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Container Summary */}
      {uniqueContainers > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ship className="h-5 w-5" />
              Resumo de Containers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Containers Únicos</p>
                <p className="font-semibold">{uniqueContainers}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Itens</p>
                <p className="font-semibold">{totalItems}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Peso Total</p>
                <p className="font-semibold">{totalWeight ? `${totalWeight} KG` : 'N/A'}</p>
              </div>
            </div>
            {uniqueContainers > 0 && (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground mb-2">Containers identificados:</p>
                <div className="flex flex-wrap gap-2">
                  {Array.from(new Set(editedData.items.map(item => item.container).filter(Boolean))).map((container, index) => (
                    <Badge key={index} variant="secondary">
                      {container}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Detailed Containers */}
      {editedData.containers && editedData.containers.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ship className="h-5 w-5" />
              Containers Detalhados
              {structuredResult?.containers && (
                <span className="text-sm text-muted-foreground ml-2">
                  • Dados da Etapa {structuredResult.containers.metadata.step}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {editedData.containers.map((container: any, index: number) => (
                <div key={index} className="rounded-lg border p-4 hover:shadow-md transition-shadow">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Container</span>
                      {isEditing ? (
                        <Input
                          value={container.container || ''}
                          onChange={(e) => {
                            const updatedContainers = [...editedData.containers];
                            updatedContainers[index] = { ...container, container: e.target.value };
                            updateData({ containers: updatedContainers });
                          }}
                          className="w-32 text-right"
                        />
                      ) : (
                        <span className="font-semibold">{container.container || 'N/A'}</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Booking</span>
                      {isEditing ? (
                        <Input
                          value={container.booking || ''}
                          onChange={(e) => {
                            const updatedContainers = [...editedData.containers];
                            updatedContainers[index] = { ...container, booking: e.target.value };
                            updateData({ containers: updatedContainers });
                          }}
                          className="w-32 text-right"
                        />
                      ) : (
                        <span className="font-medium text-sm">{container.booking || 'N/A'}</span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                      <div>
                        <p className="text-xs text-muted-foreground">Tipo</p>
                        {isEditing ? (
                          <Input
                            value={container.tipo_container || ''}
                            onChange={(e) => {
                              const updatedContainers = [...editedData.containers];
                              updatedContainers[index] = { ...container, tipo_container: e.target.value };
                              updateData({ containers: updatedContainers });
                            }}
                            className="w-full"
                          />
                        ) : (
                          <p className="text-sm font-medium">{container.tipo_container || 'N/A'}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Pacotes</p>
                        {isEditing ? (
                          <Input
                            type="number"
                            value={container.quantidade_de_pacotes || 0}
                            onChange={(e) => {
                              const updatedContainers = [...editedData.containers];
                              updatedContainers[index] = { ...container, quantidade_de_pacotes: parseInt(e.target.value) || 0 };
                              updateData({ containers: updatedContainers });
                            }}
                            className="w-full"
                          />
                        ) : (
                          <p className="text-sm font-medium">{container.quantidade_de_pacotes || 0}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Peso</p>
                        {isEditing ? (
                          <Input
                            type="number"
                            value={container.peso_bruto || 0}
                            onChange={(e) => {
                              const updatedContainers = [...editedData.containers];
                              updatedContainers[index] = { ...container, peso_bruto: parseFloat(e.target.value) || 0 };
                              updateData({ containers: updatedContainers });
                            }}
                            className="w-full"
                            placeholder="KG"
                          />
                        ) : (
                          <p className="text-sm font-medium">
                            {container.peso_bruto ? `${container.peso_bruto} KG` : 'N/A'}
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Volume</p>
                        {isEditing ? (
                          <Input
                            type="number"
                            value={container.volume || 0}
                            onChange={(e) => {
                              const updatedContainers = [...editedData.containers];
                              updatedContainers[index] = { ...container, volume: parseFloat(e.target.value) || 0 };
                              updateData({ containers: updatedContainers });
                            }}
                            className="w-full"
                            placeholder="CBM"
                          />
                        ) : (
                          <p className="text-sm font-medium">
                            {container.volume ? `${container.volume} CBM` : 'N/A'}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                      <div>
                        <p className="text-xs text-muted-foreground">Pacotes: {container.from_package}-{container.to_package}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Itens: {container.from_item}-{container.to_item}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Shared Box Groups Info */}
      {sharedBoxGroups.length > 0 && (
        <Card className="mb-6 bg-blue-50 border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-blue-800">
              <Box className="h-4 w-4" />
              Grupos Detectados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm text-blue-700">
                Detectados <strong>{sharedBoxGroups.length} grupos</strong> afetando{' '}
                <strong>{sharedBoxGroups.reduce((sum, g) => sum + g.totalSharedItems, 0)} itens</strong>:
              </p>
              <div className="grid grid-cols-1 gap-2 text-sm">
                {(() => {
                  const sharedBoxCount = sharedBoxGroups.filter(g => g.groupType === 'shared_box' && !g.isSuperGroup).length;
                  const duplicateCount = sharedBoxGroups.filter(g => g.groupType === 'duplicated_items' && !g.isSuperGroup).length;
                  const superGroupCount = sharedBoxGroups.filter(g => g.isSuperGroup).length;
                  const mergeableGroups = sharedBoxGroups.filter(g => g.canMergeWith && g.canMergeWith.length > 0).length;
                  
                  return (
                    <>
                      {sharedBoxCount > 0 && (
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-3 w-3 text-orange-600" />
                          <span><strong>{sharedBoxCount}</strong> caixas compartilhadas (peso zero)</span>
                        </div>
                      )}
                      {duplicateCount > 0 && (
                        <div className="flex items-center gap-2">
                          <Copy className="h-3 w-3 text-purple-600" />
                          <span><strong>{duplicateCount}</strong> grupos de itens duplicados</span>
                        </div>
                      )}
                      {superGroupCount > 0 && (
                        <div className="flex items-center gap-2">
                          <Link className="h-3 w-3 text-green-600" />
                          <span><strong>{superGroupCount}</strong> super-grupos (adjacentes unidos)</span>
                        </div>
                      )}
                      {mergeableGroups > 0 && (
                        <div className="flex items-center gap-2 text-green-700">
                          <Link className="h-3 w-3" />
                          <span><strong>{mergeableGroups}</strong> grupos podem ser unidos</span>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
              <p className="text-xs text-blue-600">
                Clique nos ícones da tabela para unificar/expandir. Use 🔗 para unir grupos adjacentes.
              </p>
              <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800 border-blue-300">
                {collapsedGroups.size} grupo(s) unificado(s)
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Items Table */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Itens ({editedData.items.length} total, {displayItems.length} exibidos)
            {isMultiPrompt && (
              <span className="text-sm text-muted-foreground ml-2">
                • {filteredColumns.length} colunas relevantes
              </span>
            )}
            {sharedBoxGroups.length > 0 && (
              <div className="flex gap-1 ml-auto">
                {sharedBoxGroups.filter(g => g.groupType === 'shared_box').length > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {sharedBoxGroups.filter(g => g.groupType === 'shared_box').length} compartilhadas
                  </Badge>
                )}
                {sharedBoxGroups.filter(g => g.groupType === 'duplicated_items' && !g.isSuperGroup).length > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {sharedBoxGroups.filter(g => g.groupType === 'duplicated_items' && !g.isSuperGroup).length} duplicadas
                  </Badge>
                )}
                {collapsedGroups.size > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {collapsedGroups.size} unificados
                  </Badge>
                )}
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <TableEditLayout
              columns={filteredEditColumns}
              data={editedData.items}
              onDataChange={(updatedItems) => updateData({ items: updatedItems })}
            />
          ) : (
            <TableViewLayout
              columns={filteredColumns}
              data={displayItems}
            />
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      {!readonly && !isEditing && onSaveToDatabase && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-end">
              <Button onClick={() => onSaveToDatabase(editedData)}>
                Salvar no Banco de Dados
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SharedBox Editor Modal */}
      {editingGroup && (
        <SharedBoxEditor
          group={editingGroup}
          isOpen={!!editingGroup}
          onClose={() => setEditingGroup(null)}
          onSave={(updatedGroup, action) => {
            // Update the group in sharedBoxGroups
            const updatedGroups = sharedBoxGroups.map(g => 
              g.id === updatedGroup.id ? updatedGroup : g
            );
            setSharedBoxGroups(updatedGroups);
            
            // Save to localStorage
            const docId = SharedBoxDetector.generateDocumentId(editedData.items as any);
            const storedData = PackingListStorage.loadEditedData(docId) || {
              originalData: editedData.items,
              editedData: editedData.items,
              sharedBoxGroups: updatedGroups,
              editHistory: [],
              lastModified: new Date().toISOString(),
              documentId: docId
            };
            
            // Update edited data with new groups
            storedData.sharedBoxGroups = updatedGroups;
            storedData.lastModified = new Date().toISOString();
            
            // Add edit action to history
            (storedData.editHistory as any).push({
              type: action === 'distribute' ? 'weight_update' : action === 'separate' ? 'separate' : 'weight_update',
              timestamp: new Date().toISOString(),
              groupId: updatedGroup.id,
              oldData: editingGroup,
              newData: updatedGroup,
              description: `${action} weight for group ${updatedGroup.id}`
            });
            
            PackingListStorage.saveEditedData(storedData as any);
            
            toast.success('Distribuição de peso atualizada');
            setEditingGroup(null);
          }}
        />
      )}
    </div>
  );
}