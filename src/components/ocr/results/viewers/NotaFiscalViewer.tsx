'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  FileText, 
  DollarSign, 
  Calendar, 
  Building,
  User,
  Hash,
  Package,
  Truck,
  Calculator,
  Receipt,
  Edit2,
  Save,
  X,
  RefreshCw,
  Plus,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';

// Import standardized components
import { 
  BaseViewerProps, 
  useViewerState, 
  viewerUtils,
  ExtractedData 
} from '../components/BaseViewer';
import { FieldSection } from '../components/FieldSection';
import { HeaderField } from '../components/HeaderSection';

interface NotaFiscalData extends ExtractedData {
  header?: any;
  items?: any[];
}

export function NotaFiscalViewer(props: BaseViewerProps) {
  const {
    variant = 'detailed',
    readonly = false,
    onSaveToDatabase,
    className
  } = props;
  
  console.log('🎯 NotaFiscalViewer - props recebidas:', props);

  const { formatCurrency } = viewerUtils;

  // Extract Nota Fiscal data
  const extractNotaFiscalData = (data: any) => {
    console.log('🔍 NotaFiscalViewer - extracting data from:', data);
    
    // Check for structured result with header.data (OCR format)
    if (data?.structuredResult?.header?.data) {
      console.log('✅ Found data in structuredResult.header.data');
      return data.structuredResult.header.data;
    }
    
    // Check for header.data directly (OCR format)
    if (data?.header?.data) {
      console.log('✅ Found data in data.header.data');
      return data.header.data;
    }
    
    // Check for header in data (DB format)
    if (data?.header && Object.keys(data.header).length > 0) {
      console.log('✅ Found data in data.header');
      return data.header;
    }
    
    // Check for direct data
    if (data?.numero_nf || data?.invoice_number) {
      console.log('✅ Found data in data directly');
      return data;
    }
    
    // Default empty object
    console.log('⚠️ No data found, returning empty object');
    return {};
  };

  // Extract items data
  const extractItemsData = (data: any) => {
    console.log('🔍 NotaFiscalViewer - extracting items from:', data);
    
    // Check for structured result with items.data (OCR format)
    if (data?.structuredResult?.items?.data) {
      console.log('✅ Found items in structuredResult.items.data');
      return data.structuredResult.items.data;
    }
    
    // Check for structured result with containers.data (temporary OCR format)
    if (data?.structuredResult?.containers?.data) {
      console.log('✅ Found items in structuredResult.containers.data (using containers as items)');
      return data.structuredResult.containers.data;
    }
    
    // Check for items.data directly (OCR format)
    if (data?.items?.data) {
      console.log('✅ Found items in data.items.data');
      return data.items.data;
    }
    
    // Check for containers.data directly (temporary OCR format)
    if (data?.containers?.data) {
      console.log('✅ Found items in data.containers.data (using containers as items)');
      return data.containers.data;
    }
    
    // Check for items array (DB format)
    if (Array.isArray(data?.items)) {
      console.log('✅ Found items array');
      return data.items;
    }
    
    // Default empty array
    console.log('⚠️ No items found, returning empty array');
    return [];
  };

  // Extract initial data for useViewerState
  const initialData = React.useMemo(() => {
    const header = extractNotaFiscalData(props.data);
    const items = extractItemsData(props.data);
    return { header, items };
  }, [props.data]);

  const {
    isEditing,
    editedData,
    handleEdit,
    handleSave,
    handleCancel,
    updateField,
    updateData,
    setEditedData
  } = useViewerState<NotaFiscalData>(
    initialData,
    props
  );

  // Define header fields
  const generalFields: HeaderField[] = [
    {
      key: 'numero_nf',
      label: 'Número da NF-e',
      type: 'text',
      icon: <FileText className="h-5 w-5 text-muted-foreground" />
    },
    {
      key: 'serie',
      label: 'Série',
      type: 'text',
      icon: <Hash className="h-5 w-5 text-muted-foreground" />
    },
    {
      key: 'data_emissao',
      label: 'Data de Emissão',
      type: 'date',
      icon: <Calendar className="h-5 w-5 text-muted-foreground" />
    },
    {
      key: 'data_saida',
      label: 'Data de Saída',
      type: 'date',
      icon: <Calendar className="h-5 w-5 text-muted-foreground" />
    },
    {
      key: 'chave_acesso',
      label: 'Chave de Acesso',
      type: 'text',
      icon: <Hash className="h-5 w-5 text-muted-foreground" />
    },
    {
      key: 'natureza_operacao',
      label: 'Natureza da Operação',
      type: 'text',
      icon: <Receipt className="h-5 w-5 text-muted-foreground" />
    }
  ];

  const companyFields: HeaderField[] = [
    {
      key: 'emitente_razao_social',
      label: 'Emitente',
      type: 'text',
      icon: <Building className="h-5 w-5 text-muted-foreground" />
    },
    {
      key: 'destinatario_razao_social',
      label: 'Destinatário',
      type: 'text',
      icon: <User className="h-5 w-5 text-muted-foreground" />
    }
  ];

  const financialFields: HeaderField[] = [
    {
      key: 'valor_total_produtos',
      label: 'Valor Total dos Produtos',
      type: 'text',
      icon: <DollarSign className="h-5 w-5 text-muted-foreground" />,
      format: (value: any) => formatCurrency(value?.toString().replace(/\./g, '').replace(',', '.'), 'BRL')
    },
    {
      key: 'valor_total_nota',
      label: 'Valor Total da Nota',
      type: 'text',
      icon: <DollarSign className="h-5 w-5 text-muted-foreground" />,
      format: (value: any) => formatCurrency(value?.toString().replace(/\./g, '').replace(',', '.'), 'BRL')
    },
    {
      key: 'valor_icms',
      label: 'Valor ICMS',
      type: 'text',
      icon: <Calculator className="h-5 w-5 text-muted-foreground" />,
      format: (value: any) => formatCurrency(value?.toString().replace(/\./g, '').replace(',', '.'), 'BRL')
    },
    {
      key: 'valor_total_ipi',
      label: 'Valor Total IPI',
      type: 'text',
      icon: <Calculator className="h-5 w-5 text-muted-foreground" />,
      format: (value: any) => formatCurrency(value?.toString().replace(/\./g, '').replace(',', '.'), 'BRL')
    },
    {
      key: 'valor_frete',
      label: 'Valor Frete',
      type: 'text',
      icon: <Truck className="h-5 w-5 text-muted-foreground" />,
      format: (value: any) => formatCurrency(value?.toString().replace(/\./g, '').replace(',', '.'), 'BRL')
    },
    {
      key: 'desconto',
      label: 'Desconto',
      type: 'text',
      icon: <DollarSign className="h-5 w-5 text-muted-foreground" />,
      format: (value: any) => value ? formatCurrency(value?.toString().replace(/\./g, '').replace(',', '.'), 'BRL') : 'N/A'
    }
  ];

  const transportFields: HeaderField[] = [
    {
      key: 'frete_por_conta',
      label: 'Frete por Conta',
      type: 'text',
      icon: <Truck className="h-5 w-5 text-muted-foreground" />
    },
    {
      key: 'quantidade_volumes',
      label: 'Quantidade de Volumes',
      type: 'text',
      icon: <Package className="h-5 w-5 text-muted-foreground" />
    },
    {
      key: 'especie_volumes',
      label: 'Espécie dos Volumes',
      type: 'text',
      icon: <Package className="h-5 w-5 text-muted-foreground" />
    },
    {
      key: 'peso_bruto',
      label: 'Peso Bruto',
      type: 'text',
      icon: <Package className="h-5 w-5 text-muted-foreground" />
    },
    {
      key: 'peso_liquido',
      label: 'Peso Líquido',
      type: 'text',
      icon: <Package className="h-5 w-5 text-muted-foreground" />
    }
  ];

  const additionalFields: HeaderField[] = [
    {
      key: 'informacoes_complementares',
      label: 'Informações Complementares',
      type: 'textarea',
      icon: <FileText className="h-5 w-5 text-muted-foreground" />
    },
    {
      key: 'informacoes_fisco',
      label: 'Informações para o Fisco',
      type: 'textarea',
      icon: <FileText className="h-5 w-5 text-muted-foreground" />
    },
    {
      key: 'di_number',
      label: 'Número da DI',
      type: 'text',
      icon: <Hash className="h-5 w-5 text-muted-foreground" />
    }
  ];

  const handleSaveClick = () => {
    handleSave();
    toast.success('Dados salvos com sucesso');
  };

  const handleReset = () => {
    handleCancel();
    toast.info('Dados restaurados');
  };

  if (variant === 'summary') {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Resumo Nota Fiscal
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {editedData.header?.numero_nf || 'N/A'}
              </Badge>
              <Badge variant="secondary">
                Série {editedData.header?.serie || 'N/A'}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Data Emissão</p>
              <p className="font-medium">{editedData.header?.data_emissao || 'N/A'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Emitente</p>
              <p className="font-medium truncate" title={editedData.header?.emitente_razao_social}>
                {editedData.header?.emitente_razao_social || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Valor Total</p>
              <p className="font-medium text-green-600">
                {formatCurrency(
                  editedData.header?.valor_total_nota?.toString().replace(/\./g, '').replace(',', '.'), 
                  'BRL'
                )}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Itens</p>
              <p className="font-medium">{editedData.items.length || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Detalhes da Nota Fiscal Eletrônica
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                NF-e {editedData.header?.numero_nf || 'N/A'}
              </Badge>
              <Badge variant="secondary">
                Série {editedData.header?.serie || 'N/A'}
              </Badge>
              {!readonly && !isEditing && (
                <Button size="sm" variant="outline" onClick={handleEdit}>
                  <Edit2 className="h-4 w-4 mr-1" />
                  Editar
                </Button>
              )}
              {isEditing && (
                <>
                  <Button size="sm" variant="outline" onClick={handleReset}>
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Resetar
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleCancel}>
                    <X className="h-4 w-4 mr-1" />
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={handleSaveClick}>
                    <Save className="h-4 w-4 mr-1" />
                    Salvar
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* General Information */}
          <FieldSection
            title="Informações Gerais"
            fields={generalFields}
            data={editedData.header}
            isEditing={isEditing}
            onChange={(field, value) => updateField('header', field, value)}
          />

          {/* Company Information */}
          <div className="border-t pt-6">
            <FieldSection
              title="Informações das Empresas"
              fields={companyFields}
              data={editedData.header}
              isEditing={isEditing}
              onChange={(field, value) => updateField('header', field, value)}
            />
          </div>

          {/* Financial Information */}
          <div className="border-t pt-6">
            <FieldSection
              title="Informações Financeiras"
              fields={financialFields}
              data={editedData.header}
              isEditing={isEditing}
              onChange={(field, value) => updateField('header', field, value)}
            />
          </div>

          {/* Transport Information */}
          <div className="border-t pt-6">
            <FieldSection
              title="Informações de Transporte"
              fields={transportFields}
              data={editedData.header}
              isEditing={isEditing}
              onChange={(field, value) => updateField('header', field, value)}
            />
          </div>

          {/* Additional Information */}
          <div className="border-t pt-6">
            <FieldSection
              title="Informações Adicionais"
              fields={additionalFields}
              data={editedData.header}
              isEditing={isEditing}
              onChange={(field, value) => updateField('header', field, value)}
            />
          </div>

          {/* Items Summary */}
          <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-lg flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Itens da Nota Fiscal ({editedData.items.length})
                </h3>
                {isEditing && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const newItem = {
                        codigo_produto: '',
                        descricao_produto: '',
                        ncm_sh: '',
                        cfop: '',
                        unidade: '',
                        quantidade: '',
                        valor_unitario: '',
                        valor_total_produto: '',
                        aliquota_icms: '',
                        aliquota_ipi: '',
                        invoice_number: editedData.header?.invoice_number || editedData.header?.numero_nf || ''
                      };
                      setEditedData(prev => ({
                        ...prev,
                        items: [...(prev.items || []), newItem]
                      }));
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar Item
                  </Button>
                )}
              </div>
              
              {editedData.items.length > 0 && (
                <>
                  <div className="bg-muted/30 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Total de Itens</p>
                        <p className="font-medium text-lg">{editedData.items.length}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Valor Total dos Produtos</p>
                        <p className="font-medium text-lg text-green-600">
                          {formatCurrency(
                            editedData.header?.valor_total_produtos?.toString().replace(/\./g, '').replace(',', '.'), 
                            'BRL'
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Valor Total da Nota</p>
                        <p className="font-bold text-xl text-green-600">
                          {formatCurrency(
                            editedData.header?.valor_total_nota?.toString().replace(/\./g, '').replace(',', '.'), 
                            'BRL'
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Items Table */}
                  <div className="mt-4 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Código</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-center">NCM/SH</TableHead>
                      <TableHead className="text-center">CFOP</TableHead>
                      <TableHead className="text-center">Un.</TableHead>
                      <TableHead className="text-right">Qtd.</TableHead>
                      <TableHead className="text-right">V. Unit.</TableHead>
                      <TableHead className="text-right">V. Total</TableHead>
                      <TableHead className="text-right">ICMS %</TableHead>
                      <TableHead className="text-right">IPI %</TableHead>
                      {isEditing && <TableHead className="w-[50px]"></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {editedData.items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono text-xs">
                          {isEditing ? (
                            <Input
                              type="text"
                              value={item.codigo_produto || ''}
                              onChange={(e) => {
                                const newItems = [...editedData.items];
                                newItems[index] = { ...newItems[index], codigo_produto: e.target.value };
                                updateData({ items: newItems });
                              }}
                              className="w-full h-8 text-xs"
                            />
                          ) : (
                            item.codigo_produto || 'N/A'
                          )}
                        </TableCell>
                        <TableCell className="max-w-[300px]">
                          {isEditing ? (
                            <Input
                              type="text"
                              value={item.descricao_produto || ''}
                              onChange={(e) => {
                                const newItems = [...editedData.items];
                                newItems[index] = { ...newItems[index], descricao_produto: e.target.value };
                                updateData({ items: newItems });
                              }}
                              className="w-full h-8 text-xs"
                            />
                          ) : (
                            <span className="truncate block" title={item.descricao_produto}>
                              {item.descricao_produto || 'N/A'}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center font-mono text-xs">
                          {isEditing ? (
                            <Input
                              type="text"
                              value={item.ncm_sh || ''}
                              onChange={(e) => {
                                const newItems = [...editedData.items];
                                newItems[index] = { ...newItems[index], ncm_sh: e.target.value };
                                updateData({ items: newItems });
                              }}
                              className="w-24 h-8 text-xs text-center"
                            />
                          ) : (
                            item.ncm_sh || 'N/A'
                          )}
                        </TableCell>
                        <TableCell className="text-center font-mono text-xs">
                          {isEditing ? (
                            <Input
                              type="text"
                              value={item.cfop || ''}
                              onChange={(e) => {
                                const newItems = [...editedData.items];
                                newItems[index] = { ...newItems[index], cfop: e.target.value };
                                updateData({ items: newItems });
                              }}
                              className="w-16 h-8 text-xs text-center"
                            />
                          ) : (
                            item.cfop || 'N/A'
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {isEditing ? (
                            <Input
                              type="text"
                              value={item.unidade || ''}
                              onChange={(e) => {
                                const newItems = [...editedData.items];
                                newItems[index] = { ...newItems[index], unidade: e.target.value };
                                updateData({ items: newItems });
                              }}
                              className="w-12 h-8 text-xs text-center"
                            />
                          ) : (
                            item.unidade || 'N/A'
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {isEditing ? (
                            <Input
                              type="text"
                              value={item.quantidade || ''}
                              onChange={(e) => {
                                const newItems = [...editedData.items];
                                newItems[index] = { ...newItems[index], quantidade: e.target.value };
                                updateData({ items: newItems });
                              }}
                              className="w-20 h-8 text-xs text-right"
                            />
                          ) : (
                            item.quantidade || '0'
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {isEditing ? (
                            <Input
                              type="text"
                              value={item.valor_unitario || ''}
                              onChange={(e) => {
                                const newItems = [...editedData.items];
                                newItems[index] = { ...newItems[index], valor_unitario: e.target.value };
                                updateData({ items: newItems });
                              }}
                              className="w-24 h-8 text-xs text-right"
                            />
                          ) : (
                            formatCurrency(
                              item.valor_unitario?.toString().replace(/\./g, '').replace(',', '.') || '0',
                              'BRL'
                            )
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {isEditing ? (
                            <Input
                              type="text"
                              value={item.valor_total_produto || ''}
                              onChange={(e) => {
                                const newItems = [...editedData.items];
                                newItems[index] = { ...newItems[index], valor_total_produto: e.target.value };
                                updateData({ items: newItems });
                              }}
                              className="w-24 h-8 text-xs text-right"
                            />
                          ) : (
                            formatCurrency(
                              item.valor_total_produto?.toString().replace(/\./g, '').replace(',', '.') || '0',
                              'BRL'
                            )
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {isEditing ? (
                            <Input
                              type="text"
                              value={item.aliquota_icms || ''}
                              onChange={(e) => {
                                const newItems = [...editedData.items];
                                newItems[index] = { ...newItems[index], aliquota_icms: e.target.value };
                                updateData({ items: newItems });
                              }}
                              className="w-16 h-8 text-xs text-right"
                            />
                          ) : (
                            `${item.aliquota_icms || '0'}%`
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {isEditing ? (
                            <Input
                              type="text"
                              value={item.aliquota_ipi || ''}
                              onChange={(e) => {
                                const newItems = [...editedData.items];
                                newItems[index] = { ...newItems[index], aliquota_ipi: e.target.value };
                                updateData({ items: newItems });
                              }}
                              className="w-16 h-8 text-xs text-right"
                            />
                          ) : (
                            `${item.aliquota_ipi || '0'}%`
                          )}
                        </TableCell>
                        {isEditing && (
                          <TableCell>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                const newItems = editedData.items.filter((_, i) => i !== index);
                                updateData({ items: newItems });
                              }}
                              className="h-8 w-8 p-0"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                  </div>
                </>
              )}
            
            {/* Show message when no items */}
            {editedData.items.length === 0 && (
              <div className="bg-muted/30 rounded-lg p-8 text-center">
                <Package className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground mb-3">Nenhum item encontrado</p>
                {isEditing && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const newItem = {
                        codigo_produto: '',
                        descricao_produto: '',
                        ncm_sh: '',
                        cfop: '',
                        unidade: '',
                        quantidade: '',
                        valor_unitario: '',
                        valor_total_produto: '',
                        aliquota_icms: '',
                        aliquota_ipi: '',
                        invoice_number: editedData.header?.invoice_number || editedData.header?.numero_nf || ''
                      };
                      updateData({ items: [newItem] });
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar Primeiro Item
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}