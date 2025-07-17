'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  DollarSign, 
  Calendar, 
  Building,
  User,
  CreditCard,
  Receipt,
  Calculator,
  Edit2,
  Save,
  X,
  RefreshCw,
  AlertCircle,
  Percent,
  Briefcase
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
import { numerarioFieldAccessors, getFieldValue, normalizeMonetaryValue } from '../utils/fieldMapping';

interface NumerarioData extends ExtractedData {
  numerarioData?: any;
  diInfo?: any;
}

export function NumerarioViewer(props: BaseViewerProps) {
  const {
    variant = 'detailed',
    readonly = false,
    onSaveToDatabase,
    className
  } = props;
  
  console.log('🎯 NumerarioViewer - props recebidas:', props);

  const {
    isEditing,
    editedData,
    handleEdit,
    handleSave,
    handleCancel,
    updateData,
    updateField,
    setEditedData
  } = useViewerState<NumerarioData>(
    {
      numerarioData: {},
      diInfo: {}
    },
    props
  );

  const { formatCurrency } = viewerUtils;

  // Extract Numerário data - support multiple formats
  const extractNumerarioData = () => {
    // Check for diInfo structure (from OCR)
    if (editedData.diInfo?.data) {
      return editedData.diInfo.data;
    }
    // Check for numerarioData
    if (editedData.numerarioData) {
      return editedData.numerarioData;
    }
    // Check direct data
    if (editedData.numero_fatura || editedData.invoice_number) {
      return editedData;
    }
    // Default empty object
    return {};
  };

  const numerarioData = extractNumerarioData();

  // Define header fields using field accessors
  const headerFields: HeaderField[] = [
    {
      key: 'numero_fatura',
      label: 'Número da Fatura',
      type: 'text',
      icon: <FileText className="h-5 w-5 text-muted-foreground" />,
      accessor: numerarioFieldAccessors.numero_fatura
    },
    {
      key: 'tipo_documento',
      label: 'Tipo de Documento',
      type: 'text',
      icon: <Receipt className="h-5 w-5 text-muted-foreground" />,
      accessor: numerarioFieldAccessors.tipo_documento
    },
    {
      key: 'data_documento',
      label: 'Data do Documento',
      type: 'date',
      icon: <Calendar className="h-5 w-5 text-muted-foreground" />,
      accessor: numerarioFieldAccessors.data_documento
    },
    {
      key: 'nome_cliente',
      label: 'Nome do Cliente',
      type: 'text',
      icon: <User className="h-5 w-5 text-muted-foreground" />,
      accessor: numerarioFieldAccessors.nome_cliente
    },
    {
      key: 'cnpj_cliente',
      label: 'CNPJ do Cliente',
      type: 'text',
      icon: <Building className="h-5 w-5 text-muted-foreground" />,
      accessor: numerarioFieldAccessors.cnpj_cliente
    },
    {
      key: 'vendedor',
      label: 'Vendedor',
      type: 'text',
      icon: <Building className="h-5 w-5 text-muted-foreground" />,
      accessor: numerarioFieldAccessors.vendedor
    }
  ];

  // Financial fields
  const financialFields: HeaderField[] = [
    {
      key: 'taxa_cambio',
      label: 'Taxa de Câmbio',
      type: 'text',
      icon: <DollarSign className="h-5 w-5 text-muted-foreground" />,
      accessor: numerarioFieldAccessors.taxa_cambio,
      format: (value: any) => `R$ ${normalizeMonetaryValue(value)}`
    },
    {
      key: 'valor_reais',
      label: 'Valor em Reais',
      type: 'currency',
      icon: <DollarSign className="h-5 w-5 text-muted-foreground" />,
      accessor: numerarioFieldAccessors.valor_reais,
      format: (value: any) => formatCurrency(normalizeMonetaryValue(value), 'BRL')
    },
    {
      key: 'impostos',
      label: 'Impostos',
      type: 'currency',
      icon: <Percent className="h-5 w-5 text-muted-foreground" />,
      accessor: numerarioFieldAccessors.impostos,
      format: (value: any) => formatCurrency(normalizeMonetaryValue(value), 'BRL')
    },
    {
      key: 'taxas',
      label: 'Taxas',
      type: 'currency',
      icon: <Calculator className="h-5 w-5 text-muted-foreground" />,
      accessor: numerarioFieldAccessors.taxas,
      format: (value: any) => formatCurrency(normalizeMonetaryValue(value), 'BRL')
    },
    {
      key: 'desconto',
      label: 'Desconto',
      type: 'currency',
      icon: <Percent className="h-5 w-5 text-muted-foreground" />,
      accessor: numerarioFieldAccessors.desconto,
      format: (value: any) => value ? formatCurrency(normalizeMonetaryValue(value), 'BRL') : 'N/A'
    },
    {
      key: 'valor_liquido',
      label: 'Valor Líquido',
      type: 'currency',
      icon: <DollarSign className="h-5 w-5 text-muted-foreground" />,
      accessor: numerarioFieldAccessors.valor_liquido,
      format: (value: any) => formatCurrency(normalizeMonetaryValue(value), 'BRL')
    }
  ];

  // Payment fields
  const paymentFields: HeaderField[] = [
    {
      key: 'banco',
      label: 'Banco',
      type: 'text',
      icon: <Building className="h-5 w-5 text-muted-foreground" />,
      accessor: numerarioFieldAccessors.banco
    },
    {
      key: 'conta_destino',
      label: 'Conta Destino',
      type: 'text',
      icon: <CreditCard className="h-5 w-5 text-muted-foreground" />,
      accessor: numerarioFieldAccessors.conta_destino
    },
    {
      key: 'forma_pagamento',
      label: 'Forma de Pagamento',
      type: 'text',
      icon: <CreditCard className="h-5 w-5 text-muted-foreground" />,
      accessor: numerarioFieldAccessors.forma_pagamento
    },
    {
      key: 'parcelas',
      label: 'Parcelas',
      type: 'text',
      icon: <Calculator className="h-5 w-5 text-muted-foreground" />,
      accessor: numerarioFieldAccessors.parcelas
    }
  ];

  // Additional fields
  const additionalFields: HeaderField[] = [
    {
      key: 'referencia_pedido',
      label: 'Referência do Pedido',
      type: 'text',
      icon: <Briefcase className="h-5 w-5 text-muted-foreground" />,
      accessor: numerarioFieldAccessors.referencia_pedido
    },
    {
      key: 'categoria',
      label: 'Categoria',
      type: 'text',
      icon: <Receipt className="h-5 w-5 text-muted-foreground" />,
      accessor: numerarioFieldAccessors.categoria
    },
    {
      key: 'observacoes',
      label: 'Observações',
      type: 'textarea',
      icon: <FileText className="h-5 w-5 text-muted-foreground" />,
      accessor: numerarioFieldAccessors.observacoes
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
              Resumo Numerário
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {getFieldValue(numerarioData, numerarioFieldAccessors.numero_fatura) || 'N/A'}
              </Badge>
              {getFieldValue(numerarioData, numerarioFieldAccessors.nf_emitida) && (
                <Badge variant="secondary">NF Emitida</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Data</p>
              <p className="font-medium">
                {getFieldValue(numerarioData, numerarioFieldAccessors.data_documento) || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Cliente</p>
              <p className="font-medium truncate" title={getFieldValue(numerarioData, numerarioFieldAccessors.nome_cliente)}>
                {getFieldValue(numerarioData, numerarioFieldAccessors.nome_cliente) || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Valor Líquido</p>
              <p className="font-medium text-green-600">
                {formatCurrency(
                  normalizeMonetaryValue(getFieldValue(numerarioData, numerarioFieldAccessors.valor_liquido)), 
                  'BRL'
                )}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Impostos + Taxas</p>
              <p className="font-medium text-orange-600">
                {formatCurrency(
                  parseFloat(normalizeMonetaryValue(getFieldValue(numerarioData, numerarioFieldAccessors.impostos) || '0')) +
                  parseFloat(normalizeMonetaryValue(getFieldValue(numerarioData, numerarioFieldAccessors.taxas) || '0')),
                  'BRL'
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Detalhes do Numerário
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {getFieldValue(numerarioData, numerarioFieldAccessors.tipo_documento) || 'Numerário'}
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
        <HeaderSection
          title="Informações Gerais"
          fields={headerFields}
          data={numerarioData}
          isEditing={isEditing}
          onFieldChange={(field, value) => {
            const newData = extractNumerarioData();
            newData[field] = value;
            
            if (editedData.diInfo?.data) {
              setEditedData(prev => ({
                ...prev,
                diInfo: {
                  ...prev.diInfo,
                  data: newData
                }
              }));
            } else if (editedData.numerarioData) {
              setEditedData(prev => ({
                ...prev,
                numerarioData: newData
              }));
            } else {
              setEditedData(newData);
            }
          }}
        />

        {/* Financial Information */}
        <div className="border-t pt-6">
          <HeaderSection
            title="Informações Financeiras"
            fields={financialFields}
            data={numerarioData}
            isEditing={isEditing}
            onFieldChange={(field, value) => {
              const newData = extractNumerarioData();
              newData[field] = value;
              
              if (editedData.diInfo?.data) {
                setEditedData(prev => ({
                  ...prev,
                  diInfo: {
                    ...prev.diInfo,
                    data: newData
                  }
                }));
              } else if (editedData.numerarioData) {
                setEditedData(prev => ({
                  ...prev,
                  numerarioData: newData
                }));
              } else {
                setEditedData(newData);
              }
            }}
          />
        </div>

        {/* Financial Summary */}
        <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Resumo Financeiro
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Valor Total</p>
              <p className="font-semibold text-lg">
                {formatCurrency(
                  normalizeMonetaryValue(getFieldValue(numerarioData, numerarioFieldAccessors.valor_reais)), 
                  'BRL'
                )}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Impostos + Taxas</p>
              <p className="font-semibold text-lg text-orange-600">
                {formatCurrency(
                  parseFloat(normalizeMonetaryValue(getFieldValue(numerarioData, numerarioFieldAccessors.impostos) || '0')) +
                  parseFloat(normalizeMonetaryValue(getFieldValue(numerarioData, numerarioFieldAccessors.taxas) || '0')),
                  'BRL'
                )}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Valor Líquido</p>
              <p className="font-bold text-xl text-green-600">
                {formatCurrency(
                  normalizeMonetaryValue(getFieldValue(numerarioData, numerarioFieldAccessors.valor_liquido)), 
                  'BRL'
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Payment Information */}
        <div className="border-t pt-6">
          <HeaderSection
            title="Informações de Pagamento"
            fields={paymentFields}
            data={numerarioData}
            isEditing={isEditing}
            onFieldChange={(field, value) => {
              const newData = extractNumerarioData();
              newData[field] = value;
              
              if (editedData.diInfo?.data) {
                setEditedData(prev => ({
                  ...prev,
                  diInfo: {
                    ...prev.diInfo,
                    data: newData
                  }
                }));
              } else if (editedData.numerarioData) {
                setEditedData(prev => ({
                  ...prev,
                  numerarioData: newData
                }));
              } else {
                setEditedData(newData);
              }
            }}
          />
        </div>

        {/* Additional Information */}
        <div className="border-t pt-6">
          <HeaderSection
            title="Informações Adicionais"
            fields={additionalFields}
            data={numerarioData}
            isEditing={isEditing}
            onFieldChange={(field, value) => {
              const newData = extractNumerarioData();
              newData[field] = value;
              
              if (editedData.diInfo?.data) {
                setEditedData(prev => ({
                  ...prev,
                  diInfo: {
                    ...prev.diInfo,
                    data: newData
                  }
                }));
              } else if (editedData.numerarioData) {
                setEditedData(prev => ({
                  ...prev,
                  numerarioData: newData
                }));
              } else {
                setEditedData(newData);
              }
            }}
          />
        </div>

        {/* Audit Information */}
        {(getFieldValue(numerarioData, numerarioFieldAccessors.criado_por) || 
          getFieldValue(numerarioData, numerarioFieldAccessors.atualizado_por)) && (
          <div className="border-t pt-6">
            <h3 className="font-medium text-sm text-muted-foreground mb-3">Informações de Auditoria</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {getFieldValue(numerarioData, numerarioFieldAccessors.criado_por) && (
                <div>
                  <p className="text-muted-foreground">Criado por</p>
                  <p className="font-medium">
                    {getFieldValue(numerarioData, numerarioFieldAccessors.criado_por)}
                  </p>
                </div>
              )}
              {getFieldValue(numerarioData, numerarioFieldAccessors.atualizado_por) && (
                <div>
                  <p className="text-muted-foreground">Atualizado por</p>
                  <p className="font-medium">
                    {getFieldValue(numerarioData, numerarioFieldAccessors.atualizado_por)}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}