'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  Package, 
  Calendar, 
  Building,
  Ship,
  DollarSign,
  AlertTriangle,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';

// Import our standardized components
import { 
  BaseViewerProps, 
  useViewerState, 
  viewerUtils,
  ExtractedData 
} from '../components/BaseViewer';
import { HeaderSection, HeaderField } from '../components/HeaderSection';
import { TableViewLayout, TableEditLayout, ColumnDefinition, EditColumnDefinition } from '../layout';
import { normalizeMonetaryValue } from '../utils/fieldMapping';
import { PriceDivisionModal } from '../modals/PriceDivisionModal';

interface CommercialInvoiceData extends ExtractedData {
  header: any;
  items: any[];
  containers?: any[]; // Support both items and containers
}

export function CommercialInvoiceViewer(props: BaseViewerProps) {
  const {
    variant = 'detailed',
    readonly = false,
    onSaveToDatabase,
    className
  } = props;
  
  console.log('🎯 CommercialInvoiceViewer - props recebidas:', props);

  const {
    isEditing,
    editedData,
    handleEdit,
    handleSave,
    handleCancel,
    updateData,
    updateField,
    updateItem,
    setEditedData
  } = useViewerState<CommercialInvoiceData>(
    {
      header: {},
      items: []
    },
    props
  );

  const { formatCurrency, safeReplace } = viewerUtils;
  const [divisionModalItem, setDivisionModalItem] = React.useState<any | null>(null);

  // Define header fields
  const headerFields: HeaderField[] = [
    {
      key: 'invoice_number',
      label: 'Número da Invoice',
      type: 'text',
      icon: <FileText className="h-5 w-5 text-muted-foreground" />
    },
    {
      key: 'invoice_date',
      label: 'Data',
      type: 'date',
      icon: <Calendar className="h-5 w-5 text-muted-foreground" />
    },
    {
      key: 'shipper_company',
      label: 'Exportador',
      type: 'text',
      icon: <Building className="h-5 w-5 text-muted-foreground" />
    },
    {
      key: 'consignee_company',
      label: 'Importador',
      type: 'text',
      icon: <Building className="h-5 w-5 text-muted-foreground" />
    },
    {
      key: 'load_port',
      label: 'Porto de Embarque',
      type: 'text',
      icon: <Ship className="h-5 w-5 text-muted-foreground" />
    },
    {
      key: 'destination_port',
      label: 'Porto de Destino',
      type: 'text',
      icon: <Ship className="h-5 w-5 text-muted-foreground" />
    }
  ];

  // Define financial fields
  const financialFields: HeaderField[] = [
    {
      key: 'total_amount_usd',
      label: 'Valor Total (USD)',
      type: 'text',
      format: (value) => formatCurrency(normalizeMonetaryValue(value), 'USD'),
      icon: <DollarSign className="h-5 w-5 text-muted-foreground" />
    },
    {
      key: 'total_amount_words',
      label: 'Valor por Extenso',
      type: 'text',
      icon: <FileText className="h-5 w-5 text-muted-foreground" />
    }
  ];

  // Helper functions for blank price detection
  const hasBlankPrices = (item: any): boolean => {
    const unitPrice = item.unit_price_usd || item.precoUnitarioUsd;
    const totalPrice = item.amount_usd || item.valorTotalUsd;
    
    return (!unitPrice || unitPrice === "" || parseFloat(unitPrice) === 0) && 
           (!totalPrice || totalPrice === "" || parseFloat(totalPrice) === 0);
  };

  const getItemsWithBlankPrices = (): any[] => {
    return editedData.items.filter(hasBlankPrices);
  };

  // Define columns for items table - separated for view and edit
  const itemViewColumns: ColumnDefinition[] = [
    {
      key: 'item_number',
      header: '#',
      className: 'w-[60px]',
      accessor: (item) => item.item_number || item.numeroItem || item.lineNumber
    },
    {
      key: 'reference',
      header: 'Referência',
      className: 'w-[120px]',
      accessor: (item) => item.reference || item.referencia
    },
    {
      key: 'name_english',
      header: 'Descrição',
      className: 'min-w-[250px]',
      accessor: (item) => item.name_english || item.nomeIngles || item.description
    },
    {
      key: 'name_chinese',
      header: 'Descrição (CN)',
      className: 'min-w-[200px]',
      accessor: (item) => item.name_chinese || item.nomeChinês || item.descriptionChinese
    },
    {
      key: 'quantity',
      header: 'Qtd',
      className: 'w-[80px] text-right',
      accessor: (item) => item.quantity || item.quantidade
    },
    {
      key: 'unit',
      header: 'Un.',
      className: 'w-[60px]',
      accessor: (item) => item.unit || item.unidade
    },
    {
      key: 'unit_price_usd',
      header: 'Preço Unit.',
      className: 'w-[120px] text-right',
      accessor: (item) => item.unit_price_usd || item.precoUnitarioUsd,
      render: (value, item) => {
        if (hasBlankPrices(item)) {
          return (
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <span className="text-muted-foreground">-</span>
            </div>
          );
        }
        return formatCurrency(normalizeMonetaryValue(value), 'USD');
      }
    },
    {
      key: 'amount_usd',
      header: 'Total',
      className: 'w-[120px] text-right',
      accessor: (item) => item.amount_usd || item.valorTotalUsd,
      render: (value, item) => {
        if (hasBlankPrices(item)) {
          return (
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <span className="text-muted-foreground">-</span>
            </div>
          );
        }
        return formatCurrency(normalizeMonetaryValue(value), 'USD');
      }
    }
  ];

  const itemEditColumns: EditColumnDefinition[] = [
    {
      key: 'item_number',
      header: '#',
      className: 'w-[60px]',
      inputType: 'text',
      readOnly: true
    },
    {
      key: 'reference',
      header: 'Referência',
      className: 'w-[120px]',
      inputType: 'text'
    },
    {
      key: 'name_english',
      header: 'Descrição',
      className: 'min-w-[250px]',
      inputType: 'textarea'
    },
    {
      key: 'name_chinese',
      header: 'Descrição (CN)',
      className: 'min-w-[200px]',
      inputType: 'textarea'
    },
    {
      key: 'quantity',
      header: 'Qtd',
      className: 'w-[80px] text-right',
      inputType: 'number'
    },
    {
      key: 'unit',
      header: 'Un.',
      className: 'w-[60px]',
      inputType: 'text'
    },
    {
      key: 'unit_price_usd',
      header: 'Preço Unit.',
      className: 'w-[120px] text-right',
      inputType: 'number'
    },
    {
      key: 'amount_usd',
      header: 'Total',
      className: 'w-[120px] text-right',
      inputType: 'number'
    }
  ];

  // Handle save to NocoDB
  const handleSaveToNocoDB = () => {
    if (onSaveToDatabase) {
      onSaveToDatabase(editedData);
    } else {
      toast.error('Função de salvamento no banco de dados não disponível');
    }
  };

  // Handle price division
  const handlePriceDivision = (item: any) => {
    setDivisionModalItem(item);
  };

  const handlePriceDivisionSave = (item: any, direction: 'above' | 'below') => {
    // Find the source item based on direction
    const currentIndex = editedData.items.findIndex((i: any) => 
      i.item_number === item.item_number
    );
    
    if (currentIndex === -1) return;
    
    const sourceIndex = direction === 'above' ? currentIndex - 1 : currentIndex + 1;
    const sourceItem = editedData.items[sourceIndex];
    
    if (!sourceItem) return;
    
    // Calculate divided prices
    const dividedUnitPrice = (parseFloat(sourceItem.unit_price_usd || '0') / 2).toFixed(2);
    const dividedTotalPrice = (parseFloat(sourceItem.amount_usd || '0') / 2).toFixed(2);
    
    // Update both items
    const updatedItems = editedData.items.map((i: any, index: number) => {
      if (index === currentIndex) {
        // Update current item with divided prices
        return {
          ...i,
          unit_price_usd: dividedUnitPrice,
          amount_usd: dividedTotalPrice
        };
      } else if (index === sourceIndex) {
        // Update source item with divided prices
        return {
          ...i,
          unit_price_usd: dividedUnitPrice,
          amount_usd: dividedTotalPrice
        };
      }
      return i;
    });
    
    updateData({ items: updatedItems });
    setDivisionModalItem(null);
    
    // Propagar mudanças para o nível superior sem alterar o estado de edição
    if (props.onSave) {
      // Criar dados atualizados para enviar
      const updatedData = {
        ...editedData,
        items: updatedItems
      };
      props.onSave(updatedData);
    }
    
    toast.success('Preços divididos com sucesso');
  };

  // Action renderer for items with blank prices
  const actionRenderer = (item: any, index: number) => {
    if (!isEditing && hasBlankPrices(item)) {
      return (
        <Button 
          size="sm" 
          variant="outline"
          onClick={() => handlePriceDivision(item)}
        >
          Dividir Preço
        </Button>
      );
    }
    return null;
  };

  // Get data quality metrics
  const getDataQualityMetrics = () => {
    const blankPriceItems = getItemsWithBlankPrices();
    return {
      totalItems: editedData.items.length,
      blankPriceItems: blankPriceItems.length,
      blankPricePercentage: editedData.items.length > 0 
        ? Math.round((blankPriceItems.length / editedData.items.length) * 100) 
        : 0
    };
  };

  // Summary view
  if (variant === 'summary') {
    const { header, items } = editedData;
    const metrics = getDataQualityMetrics();
    const totalValue = normalizeMonetaryValue(header.total_amount_usd || '0');

    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Commercial Invoice
            </CardTitle>
            <Badge variant="outline">{header.invoice_number || 'N/A'}</Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Data</p>
              <p className="font-medium">{header.invoice_date || 'N/A'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Total Itens</p>
              <p className="font-medium">{metrics.totalItems}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Valor Total</p>
              <p className="font-medium text-green-600">
                {formatCurrency(totalValue, 'USD')}
              </p>
            </div>
            {metrics.blankPriceItems > 0 && (
              <div>
                <p className="text-muted-foreground">Itens s/ Preço</p>
                <p className="font-medium text-yellow-600 flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  {metrics.blankPriceItems} ({metrics.blankPricePercentage}%)
                </p>
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
      <Card className="mb-6">
        <HeaderSection
          title="Commercial Invoice"
          titleIcon={<FileText className="h-5 w-5" />}
          fields={headerFields}
          data={editedData.header}
          isEditing={isEditing}
          onEdit={!readonly ? handleEdit : undefined}
          onSave={handleSave}
          onCancel={handleCancel}
          onChange={(field, value) => updateField('header', field, value)}
          badge={<Badge variant="outline" className="text-lg">{editedData.header.invoice_number || 'N/A'}</Badge>}
          variant="card"
        />
      </Card>

      {/* Financial Information */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Informações Financeiras
          </CardTitle>
        </CardHeader>
        <CardContent>
          <HeaderSection
            title=""
            fields={financialFields}
            data={editedData.header}
            isEditing={isEditing}
            onChange={(field, value) => updateField('header', field, value)}
            variant="flat"
          />
        </CardContent>
      </Card>

      {/* Items Table */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Itens ({editedData.items.length})
            </CardTitle>
            {getItemsWithBlankPrices().length > 0 && !isEditing && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" />
                {getItemsWithBlankPrices().length} itens sem preço
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <TableEditLayout
              columns={itemEditColumns}
              data={editedData.items}
              onDataChange={(updatedItems) => updateData({ items: updatedItems })}
            />
          ) : (
            <TableViewLayout
              columns={itemViewColumns}
              data={editedData.items}
              actionRenderer={actionRenderer}
            />
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}


      {/* Price Division Modal */}
      {divisionModalItem && (() => {
        const currentIndex = editedData.items.findIndex((i: any) => 
          i.item_number === divisionModalItem.item_number
        );
        
        // Normalize items for the modal
        const normalizeItem = (item: any) => {
          if (!item) return null;
          console.log('NORMALIZACAO ITEM',item);
          return {
            ...item,
            lineNumber: parseInt(item.item_number || item.numeroItem || '0'),
            description: item.name_english || item.nomeIngles || item.description,
            descriptionChinese: item.name_chinese || item.nomeChinês || item.descriptionChinese,
            unitPrice: parseFloat(normalizeMonetaryValue(item.unit_price_usd || item.precoUnitarioUsd || '0')),
            totalPrice: parseFloat(normalizeMonetaryValue(item.amount_usd || item.valorTotalUsd || '0'))
          };
        };
        
        return (
          <PriceDivisionModal
            item={normalizeItem(divisionModalItem)}
            itemAbove={normalizeItem(editedData.items[currentIndex - 1])}
            itemBelow={normalizeItem(editedData.items[currentIndex + 1])}
            onDivide={handlePriceDivisionSave}
            onCancel={() => setDivisionModalItem(null)}
          />
        );
      })()}
    </div>
  );
}