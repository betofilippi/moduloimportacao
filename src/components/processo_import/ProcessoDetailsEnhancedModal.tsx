'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, 
  AlertCircle, 
  ChevronDown, 
  ChevronRight,
  Calendar,
  Building2,
  User,
  Package,
  CheckCircle2,
  XCircle,
  Clock,
  FileWarning,
  DollarSign,
  Hash,
  Ship,
  Globe
} from 'lucide-react';
import { ProcessoImportacao } from '@/types/processo-importacao';
import { toast } from 'sonner';

interface DocumentHeader {
  tipoDocumento: string;
  [key: string]: any;
}

interface DocumentDetail {
  id: string;
  hashArquivo: string;
  nomeArquivoOriginal: string;
  tipoDocumento: string;
  statusProcessamento: string;
  dataUpload: string;
  idDocumento: string;
  header: DocumentHeader | null;
}

interface ProcessData {
  process: ProcessoImportacao & { stage: string };
  documents: {
    total: number;
    byType: Record<string, number>;
    types: string[];
    missingTypes: string[];
    details: DocumentDetail[];
  };
  alerts: {
    missingDocumentsCount: number;
    hasAllRequiredDocs: boolean;
  };
}

interface ProcessoDetailsEnhancedModalProps {
  isOpen: boolean;
  onClose: () => void;
  processId: string;
  onDocumentConnect?: (fileHash: string) => void;
}

const documentTypeLabels: Record<string, string> = {
  'proforma_invoice': 'Proforma Invoice',
  'commercial_invoice': 'Commercial Invoice',
  'packing_list': 'Packing List',
  'swift': 'SWIFT',
  'di': 'Declaração de Importação',
  'numerario': 'Numerário',
  'nota_fiscal': 'Nota Fiscal',
  'bl': 'Bill of Lading',
  'contrato_cambio': 'Contrato de Câmbio',
  'unknown': 'Documento Desconhecido'
};

const stageLabels: Record<string, string> = {
  'inicial': 'Inicial',
  'negociacao': 'Negociação',
  'pagamento': 'Pagamento',
  'transporte': 'Transporte',
  'nacionalizacao': 'Nacionalização'
};

const stageColors: Record<string, string> = {
  'inicial': 'bg-gray-500',
  'negociacao': 'bg-blue-500',
  'pagamento': 'bg-yellow-500',
  'transporte': 'bg-purple-500',
  'nacionalizacao': 'bg-green-500'
};

export function ProcessoDetailsEnhancedModal({
  isOpen,
  onClose,
  processId,
  onDocumentConnect
}: ProcessoDetailsEnhancedModalProps) {
  const [loading, setLoading] = useState(true);
  const [processData, setProcessData] = useState<ProcessData | null>(null);
  const [expandedDocs, setExpandedDocs] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isOpen && processId) {
      fetchProcessDetails();
    }
  }, [isOpen, processId]);

  const fetchProcessDetails = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/processo-importacao/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ processId })
      });

      if (!response.ok) throw new Error('Erro ao buscar detalhes');

      const data = await response.json();
      setProcessData(data);
    } catch (error) {
      console.error('Erro ao buscar processo:', error);
      toast.error('Erro ao carregar detalhes do processo');
    } finally {
      setLoading(false);
    }
  };

  const toggleDocumentExpand = (docHash: string) => {
    setExpandedDocs(prev => ({
      ...prev,
      [docHash]: !prev[docHash]
    }));
  };

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'proforma_invoice':
      case 'commercial_invoice':
        return <FileText className="h-4 w-4" />;
      case 'packing_list':
        return <Package className="h-4 w-4" />;
      case 'swift':
        return <DollarSign className="h-4 w-4" />;
      case 'bl':
        return <Ship className="h-4 w-4" />;
      case 'di':
        return <Globe className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const renderHeaderField = (label: string, value: any, icon?: React.ReactNode) => {
    if (!value || value === 'N/A') return null;
    
    return (
      <div className="flex items-center gap-2 text-sm">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <span className="font-medium">{label}:</span>
        <span className="text-muted-foreground">{value}</span>
      </div>
    );
  };

  const renderDocumentHeader = (header: DocumentHeader | null, docType: string) => {
    if (!header) return null;

    // Use fullData if available for more complete information
    const data = header.fullData || header;

    switch (docType) {
      case 'proforma_invoice':
        return (
          <div className="grid grid-cols-2 gap-3 mt-3 p-3 bg-muted/30 rounded-md">
            {renderHeaderField('Proforma Nº', header.proformaNumber || data.proforma_number, <Hash className="h-3 w-3" />)}
            {renderHeaderField('Fornecedor', header.supplierName || data.supplier_name, <Building2 className="h-3 w-3" />)}
            {renderHeaderField('Valor Total', `${header.currency || data.currency || 'USD'} ${header.totalAmount || data.total_amount}`, <DollarSign className="h-3 w-3" />)}
            {renderHeaderField('Data Emissão', header.issueDate || data.issue_date, <Calendar className="h-3 w-3" />)}
          </div>
        );
      
      case 'commercial_invoice':
        return (
          <div className="grid grid-cols-2 gap-3 mt-3 p-3 bg-muted/30 rounded-md">
            {renderHeaderField('Invoice Nº', header.invoiceNumber || data.invoice_number, <Hash className="h-3 w-3" />)}
            {renderHeaderField('Fornecedor', header.supplierName || data.supplier_name, <Building2 className="h-3 w-3" />)}
            {renderHeaderField('Valor Total', `${header.currency || data.currency || 'USD'} ${header.totalAmount || data.total_amount}`, <DollarSign className="h-3 w-3" />)}
            {renderHeaderField('Data Emissão', header.issueDate || data.issue_date, <Calendar className="h-3 w-3" />)}
          </div>
        );
      
      case 'packing_list':
        return (
          <div className="grid grid-cols-2 gap-3 mt-3 p-3 bg-muted/30 rounded-md">
            {renderHeaderField('Packing List Nº', header.packingListNumber || data.packing_list_number, <Hash className="h-3 w-3" />)}
            {renderHeaderField('Total Pacotes', header.totalPackages || data.total_packages, <Package className="h-3 w-3" />)}
            {renderHeaderField('Peso Bruto', `${header.grossWeight || data.gross_weight} kg`, <Package className="h-3 w-3" />)}
            {renderHeaderField('Invoice Ref.', data.invoice_number, <FileText className="h-3 w-3" />)}
          </div>
        );
      
      case 'bl':
        return (
          <div className="grid grid-cols-2 gap-3 mt-3 p-3 bg-muted/30 rounded-md">
            {renderHeaderField('BL Number', header.blNumber || data.bl_number, <Hash className="h-3 w-3" />)}
            {renderHeaderField('Embarcador', header.shipper || data.shipper, <Building2 className="h-3 w-3" />)}
            {renderHeaderField('Navio', header.vesselName || data.vessel_name, <Ship className="h-3 w-3" />)}
            {renderHeaderField('Porto Embarque', header.portOfLoading || data.port_of_loading, <Ship className="h-3 w-3" />)}
          </div>
        );
      
      case 'numerario':
        return (
          <div className="grid grid-cols-2 gap-3 mt-3 p-3 bg-muted/30 rounded-md">
            {renderHeaderField('NF-e', header.nfeNumber || data.numero_nf, <FileText className="h-3 w-3" />)}
            {renderHeaderField('DI Referência', header.diNumber || data.di_number, <Hash className="h-3 w-3" />)}
            {renderHeaderField('Valor Total', `R$ ${header.totalValue || data.valor_liquido}`, <DollarSign className="h-3 w-3" />)}
            {renderHeaderField('CNPJ', header.cnpjCpf || data.cnpj_cpf, <Building2 className="h-3 w-3" />)}
          </div>
        );
      
      case 'contrato_cambio':
        return (
          <div className="grid grid-cols-2 gap-3 mt-3 p-3 bg-muted/30 rounded-md">
            {renderHeaderField('Contrato Nº', header.contrato || data.contrato, <Hash className="h-3 w-3" />)}
            {renderHeaderField('Banco', header.banco || data.banco, <Building2 className="h-3 w-3" />)}
            {renderHeaderField('Valor Estrangeiro', header.valorEstrangeiro || data.valor_estrangeiro, <DollarSign className="h-3 w-3" />)}
            {renderHeaderField('Taxa Câmbio', header.taxa || data.taxa, <DollarSign className="h-3 w-3" />)}
          </div>
        );
      
      case 'di':
        return (
          <div className="grid grid-cols-2 gap-3 mt-3 p-3 bg-muted/30 rounded-md">
            {renderHeaderField('DI Número', header.diNumber || data.di_number, <Hash className="h-3 w-3" />)}
            {renderHeaderField('Importador', header.importerName || data.importer_name, <Building2 className="h-3 w-3" />)}
            {renderHeaderField('Data Registro', header.registrationDate || data.registration_date, <Calendar className="h-3 w-3" />)}
            {renderHeaderField('Canal', header.channel || data.channel, <FileText className="h-3 w-3" />)}
          </div>
        );
        
      case 'nota_fiscal':
        return (
          <div className="grid grid-cols-2 gap-3 mt-3 p-3 bg-muted/30 rounded-md">
            {renderHeaderField('NF-e', header.nfeNumber || data.nfe_number, <FileText className="h-3 w-3" />)}
            {renderHeaderField('Emitente', header.issuerName || data.issuer_name, <Building2 className="h-3 w-3" />)}
            {renderHeaderField('Valor Total', `R$ ${header.totalValue || data.total_value}`, <DollarSign className="h-3 w-3" />)}
            {renderHeaderField('Data Emissão', header.issueDate || data.issue_date, <Calendar className="h-3 w-3" />)}
          </div>
        );
      
      case 'swift':
        return (
          <div className="grid grid-cols-2 gap-3 mt-3 p-3 bg-muted/30 rounded-md">
            {renderHeaderField('SWIFT Code', header.swiftCode || data.swift_code, <Hash className="h-3 w-3" />)}
            {renderHeaderField('Beneficiário', header.beneficiary || data.beneficiary, <Building2 className="h-3 w-3" />)}
            {renderHeaderField('Valor', `${header.currency || data.currency} ${header.amount || data.amount}`, <DollarSign className="h-3 w-3" />)}
            {renderHeaderField('Banco Rem.', header.senderBank || data.sender_bank, <Building2 className="h-3 w-3" />)}
          </div>
        );
      
      default:
        // Generic display for unknown types
        return (
          <div className="grid grid-cols-2 gap-3 mt-3 p-3 bg-muted/30 rounded-md">
            {Object.entries(header).filter(([key]) => key !== 'tipoDocumento' && key !== 'fullData').map(([key, value]) => (
              renderHeaderField(key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), value, <FileText className="h-3 w-3" />)
            ))}
          </div>
        );
    }
  };

  if (!processData) return null;

  const { process, documents, alerts } = processData;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] bg-background/95 backdrop-blur-sm">
        {/* Alert Button for Unrelated Documents */}
        {alerts.missingDocumentsCount > 0 && onDocumentConnect && (
          <div className="absolute -top-12 right-0">
            <Button 
              variant="destructive" 
              size="sm"
              onClick={() => onDocumentConnect('')}
              className="flex items-center gap-2"
            >
              <AlertCircle className="h-4 w-4" />
              {alerts.missingDocumentsCount} documentos não relacionados
            </Button>
          </div>
        )}
        
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Detalhes do Processo {process.numero_processo}</span>
            <Badge className={`${stageColors[process.stage]} text-white`}>
              {stageLabels[process.stage]}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[calc(90vh-120px)] pr-4">
          <div className="space-y-6">
            {/* Informações do Processo */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informações Gerais</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Empresa:</span>
                      <span className="text-sm">{process.empresa}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Responsável:</span>
                      <span className="text-sm">{process.responsavel || 'Não definido'}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Início:</span>
                      <span className="text-sm">
                        {new Date(process.data_inicio).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Status:</span>
                      <Badge variant={process.status === 'ativo' ? 'default' : 'secondary'}>
                        {process.status}
                      </Badge>
                    </div>
                  </div>
                </div>
                {process.descricao && (
                  <div className="mt-4">
                    <span className="text-sm font-medium">Descrição:</span>
                    <p className="text-sm text-muted-foreground mt-1">{process.descricao}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Alertas */}
            {alerts.missingDocumentsCount > 0 && (
              <Card className="border-yellow-500">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                    Documentos Pendentes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {documents.missingTypes.map(docType => (
                      <Badge key={docType} variant="outline" className="border-yellow-500">
                        <FileWarning className="h-3 w-3 mr-1" />
                        {documentTypeLabels[docType] || docType}
                      </Badge>
                    ))}
                  </div>
                  {onDocumentConnect && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="mt-3"
                      onClick={() => onDocumentConnect('')}
                    >
                      Anexar Documentos
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Lista de Documentos Agrupados por Tipo */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>Documentos Anexados ({documents.total})</span>
                  {alerts.hasAllRequiredDocs && (
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Completo
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {documents.details.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>Nenhum documento anexado</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Group documents by type and sort by predefined order */}
                    {(() => {
                      const documentOrder = [
                        'proforma_invoice',
                        'commercial_invoice',
                        'packing_list',
                        'bl',
                        'numerario',
                        'contrato_cambio',
                        'di',
                        'nota_fiscal',
                        'swift',
                        'unknown'
                      ];
                      
                      const groupedDocs = documents.details.reduce((acc, doc) => {
                        const type = doc.tipoDocumento;
                        if (!acc[type]) acc[type] = [];
                        acc[type].push(doc);
                        return acc;
                      }, {} as Record<string, DocumentDetail[]>);
                      
                      // Sort entries by predefined order
                      const sortedEntries = Object.entries(groupedDocs).sort(([a], [b]) => {
                        const aIndex = documentOrder.indexOf(a);
                        const bIndex = documentOrder.indexOf(b);
                        const aOrder = aIndex === -1 ? 999 : aIndex;
                        const bOrder = bIndex === -1 ? 999 : bIndex;
                        return aOrder - bOrder;
                      });
                      
                      return sortedEntries.map(([type, docs]) => (
                      <div key={type} className="space-y-2">
                        {/* Type Header */}
                        <div className="flex items-center gap-2 mb-2">
                          {getDocumentIcon(type)}
                          <h4 className="font-medium text-sm">
                            {documentTypeLabels[type] || type}
                            <Badge variant="secondary" className="ml-2 text-xs">
                              {docs.length}
                            </Badge>
                          </h4>
                        </div>
                        
                        {/* Documents of this type */}
                        {docs.map(doc => (
                          <div
                            key={doc.hashArquivo}
                            className="ml-6 border rounded-lg overflow-hidden bg-muted/20"
                          >
                            <button
                              onClick={() => toggleDocumentExpand(doc.hashArquivo)}
                              className="w-full p-3 hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {expandedDocs[doc.hashArquivo] ? 
                                    <ChevronDown className="h-4 w-4" /> : 
                                    <ChevronRight className="h-4 w-4" />
                                  }
                                  <div className="text-left">
                                    <p className="text-sm font-medium">
                                      {/* Use filename as main display */}
                                      {doc.nomeArquivoOriginal || 'Documento sem nome'}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {/* Show key info based on document type */}
                                      {doc.header ? (
                                        <span className="flex items-center gap-2 flex-wrap">
                                          {(() => {
                                            // Get the most relevant fields for each document type
                                            switch (doc.tipoDocumento) {
                                              case 'proforma_invoice':
                                                return (
                                                  <>
                                                    {doc.header.proformaNumber && <span>Nº {doc.header.proformaNumber}</span>}
                                                    {doc.header.supplierName && <span>• {doc.header.supplierName}</span>}
                                                    {doc.header.totalAmount && <span>• {doc.header.currency || ''} {doc.header.totalAmount}</span>}
                                                  </>
                                                );
                                              case 'commercial_invoice':
                                                return (
                                                  <>
                                                    {doc.header.invoiceNumber && <span>Invoice {doc.header.invoiceNumber}</span>}
                                                    {doc.header.supplierName && <span>• {doc.header.supplierName}</span>}
                                                    {doc.header.totalAmount && <span>• {doc.header.currency || ''} {doc.header.totalAmount}</span>}
                                                  </>
                                                );
                                              case 'packing_list':
                                                return (
                                                  <>
                                                    {doc.header.packingListNumber && <span>PL {doc.header.packingListNumber}</span>}
                                                    {doc.header.totalPackages && <span>• {doc.header.totalPackages} pacotes</span>}
                                                    {doc.header.grossWeight && <span>• {doc.header.grossWeight} kg</span>}
                                                  </>
                                                );
                                              case 'bl':
                                                return (
                                                  <>
                                                    {doc.header.blNumber && <span>BL {doc.header.blNumber}</span>}
                                                    {doc.header.shipper && <span>• {doc.header.shipper}</span>}
                                                    {doc.header.vesselName && <span>• {doc.header.vesselName}</span>}
                                                  </>
                                                );
                                              case 'numerario':
                                                return (
                                                  <>
                                                    {doc.header.nfeNumber && <span>NF-e {doc.header.nfeNumber}</span>}
                                                    {doc.header.diNumber && <span>• DI {doc.header.diNumber}</span>}
                                                    {doc.header.totalValue && <span>• R$ {doc.header.totalValue}</span>}
                                                  </>
                                                );
                                              case 'contrato_cambio':
                                                return (
                                                  <>
                                                    {doc.header.contrato && <span>Contrato {doc.header.contrato}</span>}
                                                    {doc.header.banco && <span>• {doc.header.banco}</span>}
                                                    {doc.header.valorEstrangeiro && <span>• {doc.header.valorEstrangeiro}</span>}
                                                  </>
                                                );
                                              case 'di':
                                                return (
                                                  <>
                                                    {doc.header.diNumber && <span>DI {doc.header.diNumber}</span>}
                                                    {doc.header.importerName && <span>• {doc.header.importerName}</span>}
                                                    {doc.header.channel && <span>• Canal {doc.header.channel}</span>}
                                                  </>
                                                );
                                              case 'nota_fiscal':
                                                return (
                                                  <>
                                                    {doc.header.nfeNumber && <span>NF-e {doc.header.nfeNumber}</span>}
                                                    {doc.header.issuerName && <span>• {doc.header.issuerName}</span>}
                                                    {doc.header.totalValue && <span>• R$ {doc.header.totalValue}</span>}
                                                  </>
                                                );
                                              case 'swift':
                                                return (
                                                  <>
                                                    {doc.header.swiftCode && <span>{doc.header.swiftCode}</span>}
                                                    {doc.header.beneficiary && <span>• {doc.header.beneficiary}</span>}
                                                    {doc.header.amount && <span>• {doc.header.currency} {doc.header.amount}</span>}
                                                  </>
                                                );
                                              default:
                                                return <span>Dados não disponíveis</span>;
                                            }
                                          })()}
                                        </span>
                                      ) : (
                                        <span className="italic">Aguardando processamento</span>
                                      )}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge 
                                    variant={doc.statusProcessamento === 'completo' ? 'default' : 'secondary'}
                                    className="text-xs"
                                  >
                                    {doc.statusProcessamento === 'completo' ? (
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                    ) : (
                                      <Clock className="h-3 w-3 mr-1" />
                                    )}
                                    {doc.statusProcessamento}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(doc.dataUpload).toLocaleDateString('pt-BR')}
                                  </span>
                                </div>
                              </div>
                            </button>
                            
                            {expandedDocs[doc.hashArquivo] && (
                              <div className="px-3 pb-3 border-t bg-background/50">
                                {renderDocumentHeader(doc.header, doc.tipoDocumento)}
                                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                                  <Hash className="h-3 w-3" />
                                  <span>Hash: {doc.hashArquivo.substring(0, 16)}...</span>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ));
                  })()}
                </div>
                )}
              </CardContent>
            </Card>

          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}