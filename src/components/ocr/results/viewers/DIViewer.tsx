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
  User,
  Ship,
  DollarSign,
  Calculator,
  Hash,
  Globe,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';

// Import our new components
import { 
  BaseViewerProps, 
  useViewerState, 
  viewerUtils,
  ExtractedData 
} from '../components/BaseViewer';
import { HeaderSection, HeaderField } from '../components/HeaderSection';
import { TableViewLayout, TableEditLayout, ColumnDefinition, EditColumnDefinition } from '../layout';
import { diFieldAccessors, getFieldValue, normalizeMonetaryValue } from '../utils/fieldMapping';

interface DIData extends ExtractedData {
  header: any;
  items: any[];
  taxInfo: any[];
}

export function DIViewer(props: BaseViewerProps) {
  const {
    variant = 'detailed',
    readonly = false,
    onSaveToDatabase,
    className
  } = props;
  
  console.log('🎯 DIViewer - props recebidas:', props);

  const {
    isEditing,
    editedData,
    handleEdit,
    handleSave,
    handleCancel,
    updateData,
    updateField,
    updateItem
  } = useViewerState<DIData>(
    {
      header: {},
      items: [],
      taxInfo: []
    },
    props
  );

  const { formatCurrency, safeReplace } = viewerUtils;

  // Define header fields
  const headerFields: HeaderField[] = [
    {
      key: 'numero_DI',
      label: 'Número da DI',
      type: 'text',
      icon: <Hash className="h-5 w-5 text-muted-foreground" />
    },
    {
      key: 'data_registro_DI',
      label: 'Data de Registro',
      type: 'date',
      icon: <Calendar className="h-5 w-5 text-muted-foreground" />
    },
    {
      key: 'recinto_aduaneiro',
      label: 'Recinto Aduaneiro',
      type: 'text',
      icon: <Building className="h-5 w-5 text-muted-foreground" />
    },
    {
      key: 'numero_BL',
      label: 'Número BL',
      type: 'text',
      icon: <FileText className="h-5 w-5 text-muted-foreground" />
    },
    {
      key: 'nome_navio',
      label: 'Nome do Navio',
      type: 'text',
      icon: <Ship className="h-5 w-5 text-muted-foreground" />
    },
    {
      key: 'modalidade_despacho',
      label: 'Modalidade Despacho',
      type: 'text'
    }
  ];

  // Define financial fields
  const financialFields: HeaderField[] = [
    {
      key: 'VMLE_usd',
      label: 'VMLE Total (USD)',
      type: 'text',
      format: (value) => formatCurrency(normalizeMonetaryValue(value), 'USD'),
      icon: <DollarSign className="h-5 w-5 text-muted-foreground" />
    },
    {
      key: 'valor_total_impostos_recolhidos',
      label: 'Total Impostos (BRL)',
      type: 'text',
      format: (value) => formatCurrency(normalizeMonetaryValue(value), 'BRL'),
      icon: <Calculator className="h-5 w-5 text-muted-foreground" />
    },
    {
      key: 'taxa_dolar',
      label: 'Taxa de Câmbio',
      type: 'text',
      format: (value) => `R$ ${normalizeMonetaryValue(value)}`,
      icon: <TrendingUp className="h-5 w-5 text-muted-foreground" />
    }
  ];

  // Define columns for items table with flexible accessors
  // Define columns for items table - separated for view and edit
  const itemViewColumns: ColumnDefinition[] = [
    {
      key: 'numero_adicao',
      header: 'Adição',
      className: 'w-[100px]',
      accessor: diFieldAccessors.items.numero_adicao
    },
    {
      key: 'NCM',
      header: 'NCM',
      className: 'w-[120px] font-mono',
      accessor: diFieldAccessors.items.NCM
    },
    {
      key: 'descricao_mercadoria',
      header: 'Descrição',
      className: 'min-w-[300px]',
      accessor: diFieldAccessors.items.descricao_mercadoria
    },
    {
      key: 'quantidade_produto',
      header: 'Quantidade',
      className: 'w-[100px] text-right',
      accessor: (item) => item.quantidade_produto || item.quantidade_unidade_medida?.split(' ')[0]
    },
    {
      key: 'unidade_comercial_produto',
      header: 'Unidade',
      className: 'w-[80px]',
      accessor: (item) => item.unidade_comercial_produto || item.quantidade_unidade_medida?.split(' ').slice(1).join(' ')
    },
    {
      key: 'VMLE_usd',
      header: 'VMLE (USD)',
      className: 'w-[150px] text-right',
      accessor: diFieldAccessors.items.VMLE_usd,
      render: (value) => formatCurrency(normalizeMonetaryValue(value), 'USD')
    },
    {
      key: 'condicao_venda',
      header: 'Cond. Venda',
      className: 'w-[100px]',
      accessor: diFieldAccessors.items.condicao_venda
    }
  ];

  const itemEditColumns: EditColumnDefinition[] = [
    {
      key: 'numero_adicao',
      header: 'Adição',
      className: 'w-[100px]',
      accessor: diFieldAccessors.items.numero_adicao,
      readOnly: true
    },
    {
      key: 'ncm_completa',
      header: 'NCM',
      className: 'w-[120px] font-mono',
      inputType: 'text'
    },
    {
      key: 'descricao_completa_detalhada_produto',
      header: 'Descrição',
      className: 'min-w-[300px]',
      inputType: 'textarea'
    },
    {
      key: 'quantidade_produto',
      header: 'Quantidade',
      className: 'w-[100px] text-right',
      inputType: 'text'
    },
    {
      key: 'unidade_comercial_produto',
      header: 'Unidade',
      className: 'w-[80px]',
      inputType: 'text'
    },
    {
      key: 'valor_total_item_usd',
      header: 'VMLE (USD)',
      className: 'w-[150px] text-right',
      inputType: 'number'
    },
    {
      key: 'incoterm',
      header: 'Cond. Venda',
      className: 'w-[100px]',
      inputType: 'text'
    }
  ];

  // Define columns for tax info table - separated for view and edit
  const taxViewColumns: ColumnDefinition[] = [
    {
      key: 'numero_adicao',
      header: 'Adição',
      className: 'w-[80px]'
    },
    {
      key: 'codigo_item',
      header: 'Item',
      className: 'w-[100px]'
    },
    {
      key: 'valor_ii_recolhido',
      header: 'II (R$)',
      className: 'w-[120px] text-right',
      render: (value) => formatCurrency(normalizeMonetaryValue(value), 'BRL')
    },
    {
      key: 'valor_ipi_recolhido',
      header: 'IPI (R$)',
      className: 'w-[120px] text-right',
      render: (value) => formatCurrency(normalizeMonetaryValue(value), 'BRL')
    },
    {
      key: 'valor_pis_recolhido',
      header: 'PIS (R$)',
      className: 'w-[120px] text-right',
      render: (value) => formatCurrency(normalizeMonetaryValue(value), 'BRL')
    },
    {
      key: 'valor_cofins_recolhido',
      header: 'COFINS (R$)',
      className: 'w-[120px] text-right',
      render: (value) => formatCurrency(normalizeMonetaryValue(value), 'BRL')
    },
    {
      key: 'valor_total_tributos',
      header: 'Total (R$)',
      className: 'w-[140px] text-right font-semibold',
      render: (value) => formatCurrency(normalizeMonetaryValue(value), 'BRL')
    }
  ];

  const taxEditColumns: EditColumnDefinition[] = [
    {
      key: 'numero_adicao',
      header: 'Adição',
      className: 'w-[80px]',
      readOnly: true
    },
    {
      key: 'codigo_item',
      header: 'Item',
      className: 'w-[100px]',
      readOnly: true
    },
    {
      key: 'valor_ii_recolhido',
      header: 'II (R$)',
      className: 'w-[120px] text-right',
      inputType: 'number'
    },
    {
      key: 'valor_ipi_recolhido',
      header: 'IPI (R$)',
      className: 'w-[120px] text-right',
      inputType: 'number'
    },
    {
      key: 'valor_pis_recolhido',
      header: 'PIS (R$)',
      className: 'w-[120px] text-right',
      inputType: 'number'
    },
    {
      key: 'valor_cofins_recolhido',
      header: 'COFINS (R$)',
      className: 'w-[120px] text-right',
      inputType: 'number'
    },
    {
      key: 'valor_total_tributos',
      header: 'Total (R$)',
      className: 'w-[140px] text-right font-semibold',
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

  // Action renderer for edit mode
  const actionRenderer = isEditing ? undefined : (item: any, index: number) => (
    <div className="flex gap-1">
      {/* Add specific actions if needed */}
    </div>
  );

  // Summary view - return null to hide
  if (variant === 'summary') {
    return null;
  }

  // Detailed view
  return (
    <div className={className}>
      <Card className="mb-6">
        <HeaderSection
          title="Declaração de Importação (DI)"
          titleIcon={<FileText className="h-5 w-5" />}
          fields={headerFields}
          data={editedData.header}
          isEditing={isEditing}
          onEdit={!readonly ? handleEdit : undefined}
          onSave={handleSave}
          onCancel={handleCancel}
          onChange={(field, value) => updateField('header', field, value)}
          badge={<Badge variant="outline" className="text-lg">{getFieldValue(editedData.header, diFieldAccessors.header.numero_DI) || 'N/A'}</Badge>}
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
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Mercadorias ({editedData.items.length} itens)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <TableEditLayout
              columns={itemEditColumns}
              data={editedData.items}
              onDataChange={(updatedItems) => updateData({ items: updatedItems })}
              actionRenderer={actionRenderer}
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

      {/* Tax Information */}
      {editedData.taxInfo.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Informações Tributárias
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <TableEditLayout
                columns={taxEditColumns}
                data={editedData.taxInfo}
                onDataChange={(updatedTaxInfo) => updateData({ taxInfo: updatedTaxInfo })}
              />
            ) : (
              <TableViewLayout
                columns={taxViewColumns}
                data={editedData.taxInfo}
              />
            )}
          </CardContent>
        </Card>
      )}

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