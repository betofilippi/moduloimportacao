'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  FileText, 
  Package, 
  Calendar, 
  Building,
  Truck,
  DollarSign,
  Calculator,
  Hash,
  Key,
  Receipt,
  BarChart,
  Edit,
  Save,
  X,
  RotateCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow 
} from '@/components/ui/table';

interface NumerarioViewerProps {
  data: any;
  results?: any;
  onSave?: (data: any) => void;
  onEdit?: (data: any) => void;
  variant?: 'summary' | 'detailed';
  readonly?: boolean;
  className?: string;
}

export function NumerarioViewer({
  data,
  results,
  onSave,
  onEdit,
  variant = 'detailed',
  readonly = false,
  className
}: NumerarioViewerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<any>({
    diInfo: { numero_di: '' },
    header: {},
    items: []
  });

  // Extract Numerário data from various possible locations
  useEffect(() => {
    let numerarioData = {
      diInfo: { numero_di: '' },
      header: {},
      items: []
    };

    // Try different data structures
    if (data?.structuredResult) {
      numerarioData.diInfo = data.structuredResult.diInfo?.data || { numero_di: '' };
      numerarioData.header = data.structuredResult.header?.data || {};
      numerarioData.items = data.structuredResult.items?.data || [];
    } else if (results?.ocr?.data?.structuredResult) {
      const structured = results.ocr.data.structuredResult;
      numerarioData.diInfo = structured.diInfo?.data || { numero_di: '' };
      numerarioData.header = structured.header?.data || {};
      numerarioData.items = structured.items?.data || [];
    } else if (data?.header || data?.items) {
      numerarioData = {
        diInfo: data.diInfo || { numero_di: '' },
        header: data.header || {},
        items: data.items || []
      };
    }

    setEditedData(numerarioData);
  }, [data, results]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    if (onSave) {
      onSave(editedData);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    // Reset to original data
    let originalData = {
      diInfo: { numero_di: '' },
      header: {},
      items: []
    };

    if (data?.structuredResult) {
      originalData.diInfo = data.structuredResult.diInfo?.data || { numero_di: '' };
      originalData.header = data.structuredResult.header?.data || {};
      originalData.items = data.structuredResult.items?.data || [];
    } else if (data?.header || data?.items) {
      originalData = {
        diInfo: data.diInfo || { numero_di: '' },
        header: data.header || {},
        items: data.items || []
      };
    }

    setEditedData(originalData);
    setIsEditing(false);
  };

  const updateDI = (value: string) => {
    setEditedData((prev: any) => ({
      ...prev,
      diInfo: { numero_di: value }
    }));
  };

  const updateHeader = (field: string, value: string) => {
    setEditedData((prev: any)=> ({
      ...prev,
      header: {
        ...prev.header,
        [field]: value
      }
    }));
  };

  const updateItem = (index: number, field: string, value: string) => {
    setEditedData((prev: any) => ({
      ...prev,
      items: prev.items.map((item: any, i: number) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const formatCurrency = (value: string | number, currency: string = 'BRL') => {
    const num = typeof value === 'string' ? parseFloat(value.replace(',', '.')) : value;
    if (isNaN(num)) return 'R$ 0,00';
    
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency
    }).format(num);
  };

  const formatNumber = (value: string | number, decimals: number = 2) => {
    const num = typeof value === 'string' ? parseFloat(value.replace(',', '.')) : value;
    if (isNaN(num)) return '0';
    
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(num);
  };

  const formatChaveAcesso = (chave: string) => {
    if (!chave) return 'N/A';
    // Format: XXXX XXXX XXXX XXXX XXXX XXXX XXXX XXXX XXXX XXXX XXXX
    const cleaned = chave.replace(/\s/g, '');
    if (cleaned.length !== 44) return chave;
    
    return cleaned.match(/.{1,4}/g)?.join(' ') || chave;
  };

  if (variant === 'summary') {
    const { diInfo, header, items } = editedData;
    const totalItems = items.length;
    const totalValue = parseFloat(header.valor_total_nota || '0');
    const totalICMS = parseFloat(header.valor_icms || '0');
    const totalIPI = parseFloat(header.valor_total_ipi || '0');

    return (
      <Card className={cn("w-full", className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Numerário Summary
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{header.numero_nf || 'N/A'}</Badge>
              {diInfo.numero_di && (
                <Badge variant="secondary">DI: {diInfo.numero_di}</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Data Emissão</p>
              <p className="font-medium">{header.data_emissao || 'N/A'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Total Itens</p>
              <p className="font-medium">{totalItems}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Valor Total</p>
              <p className="font-medium text-green-600">
                {formatCurrency(totalValue)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">ICMS + IPI</p>
              <p className="font-medium text-orange-600">
                {formatCurrency(totalICMS + totalIPI)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Detailed view
  const { diInfo, header, items } = editedData;

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Numerário - Nota Fiscal Eletrônica
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-lg">
              NF-e {header.numero_nf || 'N/A'}
            </Badge>
            {!readonly && !isEditing && (
              <Button size="sm" variant="outline" onClick={handleEdit}>
                <Edit className="h-4 w-4 mr-1" />
                Editar
              </Button>
            )}
            {isEditing && (
              <>
                <Button size="sm" variant="outline" onClick={handleCancel}>
                  <X className="h-4 w-4 mr-1" />
                  Cancelar
                </Button>
                <Button size="sm" onClick={handleSave}>
                  <Save className="h-4 w-4 mr-1" />
                  Salvar
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* DI Reference */}
        {(diInfo.numero_di || isEditing) && (
          <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <label className="text-sm text-muted-foreground">DI Relacionada</label>
                {isEditing ? (
                  <Input 
                    value={diInfo.numero_di || ''} 
                    onChange={(e) => updateDI(e.target.value)}
                    placeholder="00/0000000-0"
                    className="mt-1"
                  />
                ) : (
                  <p className="font-medium text-blue-600">{diInfo.numero_di || 'N/A'}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* General Information */}
        <div className="space-y-4">
          <h3 className="font-medium text-lg flex items-center gap-2">
            <Hash className="h-5 w-5" />
            Identificação da NF-e
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-muted-foreground">Número</label>
              {isEditing ? (
                <Input 
                  value={header.numero_nf || ''} 
                  onChange={(e) => updateHeader('numero_nf', e.target.value)}
                  className="mt-1"
                />
              ) : (
                <p className="font-medium">{header.numero_nf || 'N/A'}</p>
              )}
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Série</label>
              {isEditing ? (
                <Input 
                  value={header.serie || ''} 
                  onChange={(e) => updateHeader('serie', e.target.value)}
                  className="mt-1"
                />
              ) : (
                <p className="font-medium">{header.serie || 'N/A'}</p>
              )}
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Data Emissão</label>
              {isEditing ? (
                <Input 
                  value={header.data_emissao || ''} 
                  onChange={(e) => updateHeader('data_emissao', e.target.value)}
                  className="mt-1"
                />
              ) : (
                <p className="font-medium">{header.data_emissao || 'N/A'}</p>
              )}
            </div>
            <div className="lg:col-span-3">
              <label className="text-sm text-muted-foreground">Chave de Acesso</label>
              {isEditing ? (
                <Input 
                  value={header.chave_acesso || ''} 
                  onChange={(e) => updateHeader('chave_acesso', e.target.value)}
                  className="mt-1 font-mono"
                />
              ) : (
                <p className="font-mono text-sm">{formatChaveAcesso(header.chave_acesso)}</p>
              )}
            </div>
          </div>
        </div>

        {/* Parties */}
        <div className="border-t pt-6">
          <h3 className="font-medium text-lg flex items-center gap-2 mb-4">
            <Building className="h-5 w-5" />
            Emitente e Destinatário
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm text-muted-foreground">Emitente</label>
              {isEditing ? (
                <Input 
                  value={header.emitente_razao_social || ''} 
                  onChange={(e) => updateHeader('emitente_razao_social', e.target.value)}
                  className="mt-1"
                />
              ) : (
                <p className="font-medium">{header.emitente_razao_social || 'N/A'}</p>
              )}
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Destinatário</label>
              {isEditing ? (
                <Input 
                  value={header.destinatario_razao_social || ''} 
                  onChange={(e) => updateHeader('destinatario_razao_social', e.target.value)}
                  className="mt-1"
                />
              ) : (
                <p className="font-medium">{header.destinatario_razao_social || 'N/A'}</p>
              )}
            </div>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="border-t pt-6">
          <h3 className="font-medium text-lg flex items-center gap-2 mb-4">
            <DollarSign className="h-5 w-5" />
            Valores da NF-e
          </h3>
          <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Produtos</p>
                <p className="font-semibold">{formatCurrency(header.valor_total_produtos || '0')}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Base ICMS</p>
                <p className="font-semibold">{formatCurrency(header.base_calculo_icms || '0')}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Valor ICMS</p>
                <p className="font-semibold text-orange-600">
                  {formatCurrency(header.valor_icms || '0')}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Valor IPI</p>
                <p className="font-semibold text-orange-600">
                  {formatCurrency(header.valor_total_ipi || '0')}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Frete</p>
                <p className="font-semibold">{formatCurrency(header.valor_frete || '0')}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Seguro</p>
                <p className="font-semibold">{formatCurrency(header.valor_seguro || '0')}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Desconto</p>
                <p className="font-semibold text-red-600">
                  {formatCurrency(header.desconto || '0')}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total NF-e</p>
                <p className="font-bold text-lg text-green-600">
                  {formatCurrency(header.valor_total_nota || '0')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Transport Information */}
        <div className="border-t pt-6">
          <h3 className="font-medium text-lg flex items-center gap-2 mb-4">
            <Truck className="h-5 w-5" />
            Transporte
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm text-muted-foreground">Modalidade Frete</label>
              {isEditing ? (
                <Input 
                  value={header.frete_por_conta || ''} 
                  onChange={(e) => updateHeader('frete_por_conta', e.target.value)}
                  className="mt-1"
                />
              ) : (
                <p className="font-medium">{header.frete_por_conta || 'N/A'}</p>
              )}
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Qtd Volumes</label>
              {isEditing ? (
                <Input 
                  value={header.quantidade_volumes || ''} 
                  onChange={(e) => updateHeader('quantidade_volumes', e.target.value)}
                  className="mt-1"
                />
              ) : (
                <p className="font-medium">{header.quantidade_volumes || 'N/A'}</p>
              )}
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Peso Bruto</label>
              {isEditing ? (
                <Input 
                  value={header.peso_bruto || ''} 
                  onChange={(e) => updateHeader('peso_bruto', e.target.value)}
                  className="mt-1"
                />
              ) : (
                <p className="font-medium">{formatNumber(header.peso_bruto || '0', 3)} kg</p>
              )}
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Peso Líquido</label>
              {isEditing ? (
                <Input 
                  value={header.peso_liquido || ''} 
                  onChange={(e) => updateHeader('peso_liquido', e.target.value)}
                  className="mt-1"
                />
              ) : (
                <p className="font-medium">{formatNumber(header.peso_liquido || '0', 3)} kg</p>
              )}
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="border-t pt-6">
          <h3 className="font-medium text-lg flex items-center gap-2 mb-4">
            <Package className="h-5 w-5" />
            Produtos/Serviços ({items.length} itens)
          </h3>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>NCM</TableHead>
                  <TableHead>CFOP</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                  <TableHead>Un</TableHead>
                  <TableHead className="text-right">Valor Unit</TableHead>
                  <TableHead className="text-right">Valor Total</TableHead>
                  <TableHead className="text-right">ICMS</TableHead>
                  <TableHead className="text-right">IPI</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item: any, index: number) => (
                  <TableRow key={index}>
                    <TableCell className="font-mono">{item.codigo_produto}</TableCell>
                    <TableCell className="max-w-xs truncate" title={item.descricao_produto}>
                      {item.descricao_produto}
                    </TableCell>
                    <TableCell>{item.ncm_sh}</TableCell>
                    <TableCell>{item.cfop}</TableCell>
                    <TableCell className="text-right">
                      {formatNumber(item.quantidade || '0', 4)}
                    </TableCell>
                    <TableCell>{item.unidade}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.valor_unitario || '0')}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.valor_total_produto || '0')}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.valor_icms_produto || '0')}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.valor_ipi_produto || '0')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Additional Information */}
        {(header.informacoes_complementares || header.informacoes_fisco) && (
          <div className="border-t pt-6">
            <h3 className="font-medium text-lg flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5" />
              Informações Adicionais
            </h3>
            <div className="space-y-4">
              {header.informacoes_complementares && (
                <div>
                  <label className="text-sm text-muted-foreground">Informações Complementares</label>
                  {isEditing ? (
                    <Textarea 
                      value={header.informacoes_complementares || ''} 
                      onChange={(e) => updateHeader('informacoes_complementares', e.target.value)}
                      className="mt-1"
                      rows={3}
                    />
                  ) : (
                    <p className="text-sm mt-1 whitespace-pre-wrap">
                      {header.informacoes_complementares}
                    </p>
                  )}
                </div>
              )}
              {header.informacoes_fisco && (
                <div>
                  <label className="text-sm text-muted-foreground">Informações do Fisco</label>
                  {isEditing ? (
                    <Textarea 
                      value={header.informacoes_fisco || ''} 
                      onChange={(e) => updateHeader('informacoes_fisco', e.target.value)}
                      className="mt-1"
                      rows={2}
                    />
                  ) : (
                    <p className="text-sm mt-1 whitespace-pre-wrap">
                      {header.informacoes_fisco}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}