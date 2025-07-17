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
  Mail,
  CreditCard
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
import { normalizeMonetaryValue } from '../utils/fieldMapping';

interface ProformaInvoiceData extends ExtractedData {
  header: any;
  items: any[];
}

export function ProformaInvoiceViewer(props: BaseViewerProps) {
  const {
    variant = 'detailed',
    readonly = false,
    onSaveToDatabase,
    className
  } = props;
  
  console.log('🎯 ProformaInvoiceViewer - props recebidas:', props);

  const {
    isEditing,
    editedData,
    handleEdit,
    handleSave,
    handleCancel,
    updateData,
    updateField,
    updateItem
  } = useViewerState<ProformaInvoiceData>(
    {
      header: {},
      items: []
    },
    props
  );

  const { formatCurrency, safeReplace } = viewerUtils;

  // Define header fields
  const headerFields: HeaderField[] = [
    {
      key: 'invoice_number',
      label: 'Número da Invoice',
      type: 'text',
      icon: <FileText className="h-5 w-5 text-muted-foreground" />
    },
    {
      key: 'date',
      label: 'Data',
      type: 'date',
      icon: <Calendar className="h-5 w-5 text-muted-foreground" />
    },
    {
      key: 'contracted_company',
      label: 'Empresa Contratada',
      type: 'text',
      icon: <Building className="h-5 w-5 text-muted-foreground" />
    },
    {
      key: 'contracted_email',
      label: 'E-mail',
      type: 'text',
      icon: <Mail className="h-5 w-5 text-muted-foreground" />
    },
    {
      key: 'load_port',
      label: 'Porto de Embarque',
      type: 'text',
      icon: <Ship className="h-5 w-5 text-muted-foreground" />
    },
    {
      key: 'destination',
      label: 'Destino',
      type: 'text',
      icon: <Ship className="h-5 w-5 text-muted-foreground" />
    }
  ];

  // Define financial fields
  const financialFields: HeaderField[] = [
    {
      key: 'total_price',
      label: 'Preço Total (USD)',
      type: 'text',
      format: (value) => formatCurrency(normalizeMonetaryValue(value), 'USD'),
      icon: <DollarSign className="h-5 w-5 text-muted-foreground" />
    },
    {
      key: 'payment_terms',
      label: 'Termos de Pagamento',
      type: 'textarea',
      icon: <CreditCard className="h-5 w-5 text-muted-foreground" />
    },
    {
      key: 'package',
      label: 'Embalagem',
      type: 'textarea',
      icon: <Package className="h-5 w-5 text-muted-foreground" />
    }
  ];

  // Define columns for items table - view mode
  const itemViewColumns: ColumnDefinition[] = [
    {
      key: 'item_number',
      header: '#',
      className: 'w-[60px]',
      accessor: (item) => item.item_number || item.lineNumber || (editedData.items.indexOf(item) + 1)
    },
    {
      key: 'item',
      header: 'Item',
      className: 'w-[150px]',
      accessor: (item) => item.item
    },
    {
      key: 'description_in_english',
      header: 'Descrição (EN)',
      className: 'min-w-[250px]',
      accessor: (item) => item.description_in_english
    },
    {
      key: 'description_in_chinese',
      header: 'Descrição (CN)',
      className: 'min-w-[200px]',
      accessor: (item) => item.description_in_chinese
    },
    {
      key: 'specifications',
      header: 'Especificações',
      className: 'min-w-[200px]',
      accessor: (item) => item.specifications
    },
    {
      key: 'quantity',
      header: 'Qtd',
      className: 'w-[80px] text-right',
      accessor: (item) => item.quantity
    },
    {
      key: 'unit_price',
      header: 'Preço Unit.',
      className: 'w-[120px] text-right',
      accessor: (item) => item.unit_price,
      render: (value) => formatCurrency(normalizeMonetaryValue(value), 'USD')
    },
    {
      key: 'total',
      header: 'Total',
      className: 'w-[120px] text-right',
      render: (value, item) => {
        const total = (item.quantity || 0) * (item.unit_price || 0);
        return formatCurrency(total, 'USD');
      }
    }
  ];

  // Define columns for items table - edit mode
  const itemEditColumns: EditColumnDefinition[] = [
    {
      key: 'item_number',
      header: '#',
      className: 'w-[60px]',
      inputType: 'text',
      readOnly: true
    },
    {
      key: 'item',
      header: 'Item',
      className: 'w-[150px]',
      inputType: 'text'
    },
    {
      key: 'description_in_english',
      header: 'Descrição (EN)',
      className: 'min-w-[250px]',
      inputType: 'textarea'
    },
    {
      key: 'description_in_chinese',
      header: 'Descrição (CN)',
      className: 'min-w-[200px]',
      inputType: 'textarea'
    },
    {
      key: 'specifications',
      header: 'Especificações',
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
      key: 'unit_price',
      header: 'Preço Unit.',
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

  // Summary view - return null to not show duplicate content
  if (variant === 'summary') {
    return null;
  }

  // Detailed view
  return (
    <div className={className}>
      <Card className="mb-6">
        <HeaderSection
          title="Cabeçalho da Proforma Invoice"
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
            Informações Financeiras e Detalhes da Embalagem
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
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Itens ({editedData.items.length})
          </CardTitle>
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
            />
          )}
          
          {/* Total calculation */}
          <div className="mt-4 text-right">
            <div className="text-lg font-semibold">
              Total: {formatCurrency(
                editedData.items.reduce((sum, item) => 
                  sum + ((item.quantity || 0) * (item.unit_price || 0)), 0
                ), 'USD'
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      {!readonly && !isEditing && onSaveToDatabase && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-end">
              <Button onClick={handleSaveToNocoDB}>
                Salvar no Banco de Dados
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}