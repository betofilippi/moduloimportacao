'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit2, Save, X, Ship, Package, MapPin, DollarSign, Calendar, Building2 } from 'lucide-react';
import { BaseViewerProps, useViewerState } from '../components/BaseViewer';
import { HeaderSection } from '../components/HeaderSection';
import { FieldSection } from '../components/FieldSection';
import { TableViewLayout } from '../layout/TableViewLayout';
import { TableEditLayout } from '../layout/TableEditLayout';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface BLHeaderData {
  bl_number?: string;
  issue_date?: string;
  onboard_date?: string;
  shipper?: string;
  consignee?: string;
  notify_party?: string;
  cnpj_consignee?: string;
  place_of_receipt?: string;
  port_of_loading?: string;
  port_of_discharge?: string;
  place_of_delivery?: string;
  freight_term?: string;
  cargo_description?: string;
  ncm_codes?: string;
  package_type?: string;
  total_packages?: string;
  total_weight_kg?: string;
  total_volume_cbm?: string;
  freight_value_usd?: string;
  freight_value_brl?: string;
  freight_agent?: string;
  vessel_name?: string;
  voy_number?: string;
}

interface BLContainerData {
  container_number?: string;
  container_size?: string;
  seal_number?: string;
  booking_number?: string;
  total_packages?: string;
  gross_weight_kg?: string;
  volume_cbm?: string;
  bl_number?: string;
}

interface BLData {
  header?: BLHeaderData;
  containers?: BLContainerData[];
}

export function BLViewer(props: BaseViewerProps) {
  const {
    data: rawData,
    variant = 'detailed',
    readonly = false,
    className,
    onUpdate
  } = props;

  // Extract BL data from different possible structures
  const extractBLData = (data: any): BLData => {
    // Check for multi-step OCR result pattern
    if (data?.multiPrompt?.steps) {
      const headerStep = data.multiPrompt.steps.find((s: any) => s.stepName === 'Header');
      const containerStep = data.multiPrompt.steps.find((s: any) => s.stepName === 'Containers');
      
      let header = {};
      let containers: any[] = [];
      
      // Parse header data
      if (headerStep?.result) {
        try {
          header = JSON.parse(headerStep.result);
        } catch (e) {
          console.error('Error parsing BL header:', e);
        }
      }
      
      // Parse containers data
      if (containerStep?.result) {
        try {
          const containerData = JSON.parse(containerStep.result);
          // Container data might be a single object or array
          containers = Array.isArray(containerData) ? containerData : [containerData];
        } catch (e) {
          console.error('Error parsing BL containers:', e);
        }
      }
      
      return { header, containers };
    }
    
    // Check for structuredResult pattern (from OCR)
    if (data?.structuredResult) {
      // For BL, structuredResult might have header.data directly
      if (data.structuredResult.header?.data) {
        const headerData = data.structuredResult.header.data;
        
        // Try to parse if it's a string
        if (typeof headerData === 'string') {
          try {
            const parsed = JSON.parse(headerData);
            return {
              header: parsed,
              containers: data.structuredResult.containers?.data || []
            };
          } catch (e) {
            console.error('Error parsing header data string:', e);
          }
        }
        
        return {
          header: headerData || {},
          containers: data.structuredResult.containers?.data || []
        };
      }
      
      // Sometimes the header data is directly in structuredResult.header
      return {
        header: data.structuredResult.header || {},
        containers: data.structuredResult.containers || []
      };
    }
    
    // Check for direct header/containers structure
    if (data?.header || data?.containers) {
      return {
        header: data.header || {},
        containers: data.containers || []
      };
    }
    
    // If data has these fields directly, wrap them
    if (data?.bl_number || data?.shipper || data?.consignee) {
      return {
        header: data,
        containers: []
      };
    }
    
    // Default: assume it's already in the correct format
    return data || { header: {}, containers: [] };
  };

  const blData = extractBLData(rawData);
  
  // Debug logs
  console.log('BLViewer - Raw data:', rawData);
  console.log('BLViewer - Extracted BL data:', blData);
  console.log('BLViewer - Header:', blData.header);
  console.log('BLViewer - Containers:', blData.containers);

  const {
    isEditing,
    editedData,
    handleEdit,
    handleSave,
    handleCancel,
    setEditedData
  } = useViewerState(blData, props);

  const editedBLData = editedData as BLData;
  const header = editedBLData.header || {};
  const containers = editedBLData.containers || [];

  // Define fields for header section
  const headerFields = [
    {
      key: 'bl_number',
      label: 'Número da BL',
      type: 'text' as const,
      icon: <Ship className="h-5 w-5" />
    },
    {
      key: 'issue_date',
      label: 'Data de Emissão',
      type: 'date' as const,
      icon: <Calendar className="h-5 w-5" />
    },
    {
      key: 'onboard_date',
      label: 'Data de Embarque',
      type: 'date' as const,
      icon: <Calendar className="h-5 w-5" />
    },
    {
      key: 'vessel_name',
      label: 'Nome do Navio',
      type: 'text' as const,
      icon: <Ship className="h-5 w-5" />
    },
    {
      key: 'voy_number',
      label: 'Número da Viagem',
      type: 'text' as const,
      icon: <Ship className="h-5 w-5" />
    }
  ];

  const partiesFields = [
    {
      key: 'shipper',
      label: 'Exportador',
      type: 'textarea' as const,
      icon: <Building2 className="h-5 w-5" />
    },
    {
      key: 'consignee',
      label: 'Importador',
      type: 'textarea' as const,
      icon: <Building2 className="h-5 w-5" />
    },
    {
      key: 'notify_party',
      label: 'Parte Notificante',
      type: 'textarea' as const,
      icon: <Building2 className="h-5 w-5" />
    },
    {
      key: 'cnpj_consignee',
      label: 'CNPJ do Importador',
      type: 'text' as const
    }
  ];

  const routeFields = [
    {
      key: 'place_of_receipt',
      label: 'Local de Recebimento',
      type: 'text' as const,
      icon: <MapPin className="h-5 w-5" />
    },
    {
      key: 'port_of_loading',
      label: 'Porto de Carregamento',
      type: 'text' as const,
      icon: <MapPin className="h-5 w-5" />
    },
    {
      key: 'port_of_discharge',
      label: 'Porto de Descarga',
      type: 'text' as const,
      icon: <MapPin className="h-5 w-5" />
    },
    {
      key: 'place_of_delivery',
      label: 'Local de Entrega',
      type: 'text' as const,
      icon: <MapPin className="h-5 w-5" />
    }
  ];

  const cargoFields = [
    {
      key: 'cargo_description',
      label: 'Descrição da Carga',
      type: 'textarea' as const,
      icon: <Package className="h-5 w-5" />
    },
    {
      key: 'ncm_codes',
      label: 'Códigos NCM',
      type: 'text' as const
    },
    {
      key: 'package_type',
      label: 'Tipo de Embalagem',
      type: 'text' as const
    },
    {
      key: 'total_packages',
      label: 'Total de Pacotes',
      type: 'number' as const
    },
    {
      key: 'total_weight_kg',
      label: 'Peso Total (kg)',
      type: 'number' as const
    },
    {
      key: 'total_volume_cbm',
      label: 'Volume Total (CBM)',
      type: 'number' as const
    }
  ];

  const freightFields = [
    {
      key: 'freight_term',
      label: 'Condição de Frete',
      type: 'text' as const,
      icon: <DollarSign className="h-5 w-5" />
    },
    {
      key: 'freight_value_usd',
      label: 'Valor do Frete (USD)',
      type: 'currency' as const,
      icon: <DollarSign className="h-5 w-5" />
    },
    {
      key: 'freight_value_brl',
      label: 'Valor do Frete (BRL)',
      type: 'currency' as const,
      icon: <DollarSign className="h-5 w-5" />
    },
    {
      key: 'freight_agent',
      label: 'Agente de Frete',
      type: 'text' as const
    }
  ];

  // Container columns for table
  const containerColumns = [
    { key: 'container_number', label: 'Número do Container' },
    { key: 'container_size', label: 'Tamanho' },
    { key: 'seal_number', label: 'Número do Lacre' },
    { key: 'booking_number', label: 'Número da Reserva' },
    { key: 'total_packages', label: 'Pacotes' },
    { key: 'gross_weight_kg', label: 'Peso Bruto (kg)' },
    { key: 'volume_cbm', label: 'Volume (CBM)' }
  ];

  if (variant === 'summary') {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Número da BL</p>
                <p className="text-lg font-semibold">{header.bl_number || 'N/A'}</p>
              </div>
              <Badge variant="outline">
                <Ship className="h-4 w-4 mr-1" />
                Bill of Lading
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Exportador</p>
                <p className="font-medium">{header.shipper || 'N/A'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Importador</p>
                <p className="font-medium">{header.consignee || 'N/A'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Porto de Carregamento</p>
                <p className="font-medium">{header.port_of_loading || 'N/A'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Porto de Descarga</p>
                <p className="font-medium">{header.port_of_discharge || 'N/A'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Containers</p>
                <p className="font-medium">{containers.length} container(s)</p>
              </div>
              <div>
                <p className="text-muted-foreground">Peso Total</p>
                <p className="font-medium">{header.total_weight_kg ? `${header.total_weight_kg} kg` : 'N/A'}</p>
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
            <Ship className="h-6 w-6" />
            Bill of Lading
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
          title="Informações Principais"
          fields={headerFields}
          data={header}
          isEditing={isEditing}
          onChange={(field, value) => {
            setEditedData(prev => ({
              ...prev,
              header: { ...header, [field]: value }
            }));
          }}
        />

        <FieldSection
          title="Partes Envolvidas"
          fields={partiesFields}
          data={header}
          isEditing={isEditing}
          onChange={(field, value) => {
            setEditedData(prev => ({
              ...prev,
              header: { ...header, [field]: value }
            }));
          }}
        />

        <FieldSection
          title="Rota de Transporte"
          fields={routeFields}
          data={header}
          isEditing={isEditing}
          onChange={(field, value) => {
            setEditedData(prev => ({
              ...prev,
              header: { ...header, [field]: value }
            }));
          }}
        />

        <FieldSection
          title="Informações da Carga"
          fields={cargoFields}
          data={header}
          isEditing={isEditing}
          onChange={(field, value) => {
            setEditedData(prev => ({
              ...prev,
              header: { ...header, [field]: value }
            }));
          }}
        />

        <FieldSection
          title="Informações de Frete"
          fields={freightFields}
          data={header}
          isEditing={isEditing}
          onChange={(field, value) => {
            setEditedData(prev => ({
              ...prev,
              header: { ...header, [field]: value }
            }));
          }}
        />

        {/* Containers Table */}
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Package className="h-5 w-5" />
            Containers
          </h3>
          {isEditing ? (
            <TableEditLayout
              data={containers}
              columns={containerColumns}
              onChange={(updatedContainers) => {
                setEditedData(prev => ({
                  ...prev,
                  containers: updatedContainers
                }));
              }}
              onAddRow={() => {
                const newContainer: BLContainerData = {
                  container_number: '',
                  container_size: '',
                  seal_number: '',
                  booking_number: '',
                  total_packages: '',
                  gross_weight_kg: '',
                  volume_cbm: '',
                  bl_number: header.bl_number
                };
                setEditedData(prev => ({
                  ...prev,
                  containers: [...containers, newContainer]
                }));
              }}
            />
          ) : (
            <TableViewLayout
              data={containers}
              columns={containerColumns}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}