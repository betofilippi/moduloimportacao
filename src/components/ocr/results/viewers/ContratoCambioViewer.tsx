'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit2, Save, X, FileText, Building2, Globe, DollarSign, Calendar, CreditCard } from 'lucide-react';
import { BaseViewerProps, useViewerState } from '../components/BaseViewer';
import { HeaderSection } from '../components/HeaderSection';
import { FieldSection } from '../components/FieldSection';

interface ContratoCambioData {
  contrato?: string;
  data?: string;
  corretora?: string;
  moeda?: string;
  valor_estrangeiro?: string;
  taxa_cambial?: string;
  valor_nacional?: string;
  fatura?: string;
  recebedor?: string;
  pais?: string;
  endereco?: string;
  conta_bancaria?: string;
  swift?: string;
  banco_beneficiario?: string;
}

export function ContratoCambioViewer(props: BaseViewerProps) {
  const {
    data: rawData,
    variant = 'detailed',
    readonly = false,
    className,
    onUpdate
  } = props;

  // Extract the data from the nested structure
  // The data comes in as structuredResult.header.data
  const extractData = (data: any): ContratoCambioData => {
    if (data?.structuredResult?.header?.data) {
      return data.structuredResult.header.data;
    }
    if (data?.header?.data) {
      return data.header.data;
    }
    if (data?.data) {
      return data.data;
    }
    return data || {};
  };

  const contractData = extractData(rawData);
  
  // Debug log to check data structure
  console.log('ContratoCambioViewer - Raw data:', rawData);
  console.log('ContratoCambioViewer - Extracted data:', contractData);

  const {
    isEditing,
    editedData,
    handleEdit,
    handleSave,
    handleCancel,
    setEditedData
  } = useViewerState(contractData, props);

  const cambioData = editedData as ContratoCambioData;

  // Define fields for each section
  const contractFields = [
    {
      key: 'contrato',
      label: 'Número do Contrato',
      type: 'text' as const,
      icon: <FileText className="h-5 w-5" />
    },
    {
      key: 'data',
      label: 'Data do Contrato',
      type: 'date' as const,
      icon: <Calendar className="h-5 w-5" />
    },
    {
      key: 'corretora',
      label: 'Corretora',
      type: 'text' as const,
      icon: <Building2 className="h-5 w-5" />
    },
    {
      key: 'fatura',
      label: 'Número da Fatura',
      type: 'text' as const,
      icon: <FileText className="h-5 w-5" />
    }
  ];

  const valueFields = [
    {
      key: 'moeda',
      label: 'Moeda',
      type: 'text' as const,
      icon: <DollarSign className="h-5 w-5" />
    },
    {
      key: 'valor_estrangeiro',
      label: 'Valor em Moeda Estrangeira',
      type: 'text' as const,
      icon: <DollarSign className="h-5 w-5" />
    },
    {
      key: 'taxa_cambial',
      label: 'Taxa de Câmbio',
      type: 'text' as const,
      icon: <DollarSign className="h-5 w-5" />
    },
    {
      key: 'valor_nacional',
      label: 'Valor em Reais',
      type: 'text' as const,
      icon: <DollarSign className="h-5 w-5" />
    }
  ];

  const beneficiaryFields = [
    {
      key: 'recebedor',
      label: 'Recebedor/Pagador no Exterior',
      type: 'text' as const,
      icon: <Building2 className="h-5 w-5" />
    },
    {
      key: 'pais',
      label: 'País',
      type: 'text' as const,
      icon: <Globe className="h-5 w-5" />
    },
    {
      key: 'endereco',
      label: 'Endereço',
      type: 'textarea' as const,
      icon: <Globe className="h-5 w-5" />
    }
  ];

  const bankingFields = [
    {
      key: 'conta_bancaria',
      label: 'Conta Bancária/IBAN',
      type: 'text' as const,
      icon: <CreditCard className="h-5 w-5" />
    },
    {
      key: 'swift',
      label: 'Código SWIFT',
      type: 'text' as const,
      icon: <CreditCard className="h-5 w-5" />
    },
    {
      key: 'banco_beneficiario',
      label: 'Banco Beneficiário',
      type: 'text' as const,
      icon: <Building2 className="h-5 w-5" />
    }
  ];

  if (variant === 'summary') {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Contrato</p>
                <p className="text-lg font-semibold">{cambioData.contrato || 'N/A'}</p>
              </div>
              <Badge variant="outline">
                <DollarSign className="h-4 w-4 mr-1" />
                Contrato de Câmbio
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Data</p>
                <p className="font-medium">{cambioData.data || 'N/A'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Corretora</p>
                <p className="font-medium">{cambioData.corretora || 'N/A'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Moeda</p>
                <p className="font-medium">{cambioData.moeda || 'N/A'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Valor Estrangeiro</p>
                <p className="font-medium">{cambioData.valor_estrangeiro || 'N/A'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Taxa de Câmbio</p>
                <p className="font-medium">{cambioData.taxa_cambial || 'N/A'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Valor Nacional</p>
                <p className="font-medium">{cambioData.valor_nacional || 'N/A'}</p>
              </div>
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
            <DollarSign className="h-6 w-6" />
            Contrato de Câmbio
          </CardTitle>
          {!readonly && (
            <div>
              {isEditing ? (
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSave}>
                    <Save className="h-4 w-4 mr-1" />
                    Salvar
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleCancel}>
                    <X className="h-4 w-4 mr-1" />
                    Cancelar
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="outline" onClick={handleEdit}>
                  <Edit2 className="h-4 w-4 mr-1" />
                  Editar
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <HeaderSection
          title="Informações do Contrato"
          fields={contractFields}
          data={cambioData}
          isEditing={isEditing}
          onChange={(field, value) => {
            setEditedData(prev => ({
              ...prev,
              [field]: value
            }));
          }}
        />

        <FieldSection
          title="Valores e Câmbio"
          fields={valueFields}
          data={cambioData}
          isEditing={isEditing}
          onChange={(field, value) => {
            setEditedData(prev => ({
              ...prev,
              [field]: value
            }));
          }}
        />

        <FieldSection
          title="Beneficiário"
          fields={beneficiaryFields}
          data={cambioData}
          isEditing={isEditing}
          onChange={(field, value) => {
            setEditedData(prev => ({
              ...prev,
              [field]: value
            }));
          }}
        />

        <FieldSection
          title="Informações Bancárias"
          fields={bankingFields}
          data={cambioData}
          isEditing={isEditing}
          onChange={(field, value) => {
            setEditedData(prev => ({
              ...prev,
              [field]: value
            }));
          }}
        />
      </CardContent>
    </Card>
  );
}