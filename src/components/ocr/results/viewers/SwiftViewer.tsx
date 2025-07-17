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
  Hash,
  ArrowRightLeft,
  CreditCard,
  FileCode,
  Banknote,
  Send,
  UserCheck,
  Edit2,
  Save,
  X,
  RefreshCw
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
import { swiftFieldAccessors, getFieldValue, normalizeMonetaryValue } from '../utils/fieldMapping';

interface SwiftData extends ExtractedData {
  swiftData?: any;
}

export function SwiftViewer(props: BaseViewerProps) {
  const {
    variant = 'detailed',
    readonly = false,
    onSaveToDatabase,
    className
  } = props;
  
  console.log('🎯 SwiftViewer - props recebidas:', props);

  const {
    isEditing,
    editedData,
    handleEdit,
    handleSave,
    handleCancel,
    updateData,
    updateField,
    setEditedData
  } = useViewerState<SwiftData>(
    {
      swiftData: {}
    },
    props
  );

  const { formatCurrency } = viewerUtils;

  // Extract Swift data
  const swiftData = editedData.swiftData || editedData || {};

  // Define header fields using field accessors
  const headerFields: HeaderField[] = [
    {
      key: 'tipo_mensagem',
      label: 'Tipo de Mensagem',
      type: 'text',
      icon: <Banknote className="h-5 w-5 text-muted-foreground" />,
      accessor: swiftFieldAccessors.tipo_mensagem
    },
    {
      key: 'referencia_remetente',
      label: 'Referência do Remetente',
      type: 'text',
      icon: <Hash className="h-5 w-5 text-muted-foreground" />,
      accessor: swiftFieldAccessors.referencia_remetente
    },
    {
      key: 'referencia_transacao',
      label: 'Referência da Transação',
      type: 'text',
      icon: <Hash className="h-5 w-5 text-muted-foreground" />,
      accessor: swiftFieldAccessors.referencia_transacao
    },
    {
      key: 'data_valor',
      label: 'Data Valor',
      type: 'date',
      icon: <Calendar className="h-5 w-5 text-muted-foreground" />,
      accessor: swiftFieldAccessors.data_valor
    },
    {
      key: 'moeda',
      label: 'Moeda',
      type: 'text',
      icon: <DollarSign className="h-5 w-5 text-muted-foreground" />,
      accessor: swiftFieldAccessors.moeda
    },
    {
      key: 'valor',
      label: 'Valor',
      type: 'currency',
      icon: <DollarSign className="h-5 w-5 text-muted-foreground" />,
      accessor: swiftFieldAccessors.valor,
      format: (value: any) => formatCurrency(value, getFieldValue(swiftData, swiftFieldAccessors.moeda) || 'USD')
    },
    {
      key: 'numero_fatura',
      label: 'Número da Fatura',
      type: 'text',
      icon: <FileText className="h-5 w-5 text-muted-foreground" />,
      accessor: swiftFieldAccessors.numero_fatura
    },
    {
      key: 'detalhes_tarifas',
      label: 'Detalhes das Tarifas',
      type: 'text',
      icon: <CreditCard className="h-5 w-5 text-muted-foreground" />,
      accessor: swiftFieldAccessors.detalhes_tarifas,
      format: (value: string) => {
        if (!value) return 'N/A';
        const labels: Record<string, string> = {
          'OUR': 'OUR (Remetente paga)',
          'SHA': 'SHA (Compartilhado)',
          'BEN': 'BEN (Beneficiário paga)'
        };
        return labels[value] || value;
      }
    }
  ];

  const formatBIC = (bic: string) => {
    if (!bic) return 'N/A';
    // Format BIC: AAAA BB CC DDD
    if (bic.length === 11) {
      return `${bic.slice(0, 4)} ${bic.slice(4, 6)} ${bic.slice(6, 8)} ${bic.slice(8)}`;
    } else if (bic.length === 8) {
      return `${bic.slice(0, 4)} ${bic.slice(4, 6)} ${bic.slice(6)}`;
    }
    return bic;
  };

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
              <Banknote className="h-5 w-5" />
              Resumo SWIFT
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{getFieldValue(swiftData, swiftFieldAccessors.tipo_mensagem) || 'SWIFT'}</Badge>
              <Badge variant="secondary">{getFieldValue(swiftData, swiftFieldAccessors.moeda) || 'USD'}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Referência</p>
              <p className="font-medium">{getFieldValue(swiftData, swiftFieldAccessors.referencia_remetente) || 'N/A'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Data Valor</p>
              <p className="font-medium">{getFieldValue(swiftData, swiftFieldAccessors.data_valor) || 'N/A'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Valor</p>
              <p className="font-medium text-green-600">
                {formatCurrency(
                  getFieldValue(swiftData, swiftFieldAccessors.valor), 
                  getFieldValue(swiftData, swiftFieldAccessors.moeda)
                )}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Fatura</p>
              <p className="font-medium">{getFieldValue(swiftData, swiftFieldAccessors.numero_fatura) || 'N/A'}</p>
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
            <Banknote className="h-5 w-5" />
            Detalhes da Transação SWIFT
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{getFieldValue(swiftData, swiftFieldAccessors.tipo_mensagem) || 'SWIFT'}</Badge>
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
        {/* Header Information */}
        <HeaderSection
          title="Informações da Transação"
          fields={headerFields}
          data={swiftData}
          isEditing={isEditing}
          onFieldChange={(field, value) => {
            setEditedData(prev => ({
              ...prev,
              swiftData: {
                ...prev.swiftData,
                [field]: value
              }
            }));
          }}
        />

        {/* UETR */}
        {getFieldValue(swiftData, swiftFieldAccessors.uetr) && (
          <div className="border-t pt-4">
            <div className="flex items-start gap-3">
              <FileCode className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">UETR (Unique End-to-end Transaction Reference)</p>
                <p className="font-mono text-xs">{getFieldValue(swiftData, swiftFieldAccessors.uetr)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Transaction Flow */}
        <div className="border-t pt-6">
          <h3 className="font-medium text-lg mb-4 text-center">Fluxo da Transação</h3>
          
          <div className="relative">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr,auto,1fr] gap-4 lg:gap-8 items-start">
              {/* Beneficiary Side */}
              <div className="space-y-4">
                <div className="bg-green-50 dark:bg-green-950/20 rounded-xl p-6 border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-4">
                    <UserCheck className="h-5 w-5 text-green-600" />
                    <h4 className="font-semibold text-green-900 dark:text-green-100">BENEFICIÁRIO</h4>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="bg-background rounded-lg p-4 space-y-3">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Nome</p>
                        <p className="font-semibold text-lg">
                          {getFieldValue(swiftData, swiftFieldAccessors.beneficiario.nome) || 'N/A'}
                        </p>
                      </div>
                      {getFieldValue(swiftData, swiftFieldAccessors.beneficiario.conta) && (
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider">Conta</p>
                          <p className="font-mono font-medium">
                            {getFieldValue(swiftData, swiftFieldAccessors.beneficiario.conta)}
                          </p>
                        </div>
                      )}
                      {getFieldValue(swiftData, swiftFieldAccessors.beneficiario.endereco) && (
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider">Endereço</p>
                          <p className="text-sm">
                            {getFieldValue(swiftData, swiftFieldAccessors.beneficiario.endereco)}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    <div className="bg-background rounded-lg p-4 space-y-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Building className="h-4 w-4 text-green-600" />
                        <p className="font-medium text-sm">Instituição Receptora</p>
                      </div>
                      <div>
                        <p className="font-medium">
                          {getFieldValue(swiftData, swiftFieldAccessors.instituicao_receptora.nome) || 'N/A'}
                        </p>
                        {getFieldValue(swiftData, swiftFieldAccessors.instituicao_receptora.bic) && (
                          <p className="text-sm font-mono text-muted-foreground mt-1">
                            BIC: {formatBIC(getFieldValue(swiftData, swiftFieldAccessors.instituicao_receptora.bic))}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Center Arrow */}
              <div className="hidden lg:flex items-center justify-center">
                <div className="bg-background border-2 border-primary rounded-full p-3">
                  <ArrowRightLeft className="h-8 w-8 text-primary" />
                </div>
              </div>

              {/* Sender Side */}
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-950/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-4">
                    <Send className="h-5 w-5 text-blue-600" />
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100">ORDENANTE</h4>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="bg-background rounded-lg p-4 space-y-3">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Cliente Ordenante</p>
                        <p className="font-semibold text-lg">
                          {getFieldValue(swiftData, swiftFieldAccessors.cliente_ordenante.nome) || 'N/A'}
                        </p>
                      </div>
                      {getFieldValue(swiftData, swiftFieldAccessors.cliente_ordenante.endereco) && (
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider">Endereço</p>
                          <p className="text-sm">
                            {getFieldValue(swiftData, swiftFieldAccessors.cliente_ordenante.endereco)}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    <div className="bg-background rounded-lg p-4 space-y-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Building className="h-4 w-4 text-blue-600" />
                        <p className="font-medium text-sm">Instituição Ordenante</p>
                      </div>
                      <div>
                        <p className="font-medium">
                          {getFieldValue(swiftData, swiftFieldAccessors.instituicao_ordenante.nome) || 'N/A'}
                        </p>
                        {getFieldValue(swiftData, swiftFieldAccessors.instituicao_ordenante.bic) && (
                          <p className="text-sm font-mono text-muted-foreground mt-1">
                            BIC: {formatBIC(getFieldValue(swiftData, swiftFieldAccessors.instituicao_ordenante.bic))}
                          </p>
                        )}
                        {getFieldValue(swiftData, swiftFieldAccessors.instituicao_ordenante.endereco) && (
                          <p className="text-sm text-muted-foreground mt-2">
                            {getFieldValue(swiftData, swiftFieldAccessors.instituicao_ordenante.endereco)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Information */}
        {getFieldValue(swiftData, swiftFieldAccessors.informacoes_remessa) && (
          <div className="border-t pt-6">
            <h3 className="font-medium text-lg mb-4">Informações de Remessa</h3>
            <div className="bg-muted/30 rounded-lg p-4 border-l-4 border-primary">
              <p className="text-sm">{getFieldValue(swiftData, swiftFieldAccessors.informacoes_remessa)}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}