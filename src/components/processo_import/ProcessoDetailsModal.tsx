'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { DocumentUploadForm } from '@/components/documents/DocumentUploadForm';
import {
  FileText,
  Upload,
  CheckCircle,
  AlertCircle,
  Package,
  Receipt,
  Loader2,
  ArrowRight,
  Eye,
  Download,
  Truck,
  Calculator
} from 'lucide-react';
import { ProcessoImportacao, DocumentType, DocumentStatus, documentTypeLabels } from '@/types/processo-importacao';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ProcessoDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  processo: ProcessoImportacao | null;
  onUpdate?: (processo: ProcessoImportacao) => void;
}

interface DocumentStatusInfo {
  type: DocumentType;
  status: DocumentStatus;
  documentId?: string;
  uploadedAt?: string;
  processedAt?: string;
  fileHash?: string;
}

export function ProcessoDetailsModal({
  open,
  onOpenChange,
  processo,
  onUpdate
}: ProcessoDetailsModalProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [isProcessing, setIsProcessing] = useState(false);
  const [documentStatuses, setDocumentStatuses] = useState<Record<DocumentType, DocumentStatusInfo>>({});

  // Initialize document statuses from processo
  useEffect(() => {
    if (processo) {
      const statuses: Record<DocumentType, DocumentStatusInfo> = {} as any;
      
      // Define all document types with default status
      const allDocumentTypes: DocumentType[] = [
        'proforma_invoice',
        'commercial_invoice',
        'packing_list',
        'swift',
        'di',
        'numerario',
        'nota_fiscal'
      ];
      
      // Set default status for all documents
      allDocumentTypes.forEach(docType => {
        statuses[docType] = {
          type: docType,
          status: 'pending'
        };
      });
      
      // Update with actual statuses from processo
      processo.documentsPipeline.forEach(doc => {
        statuses[doc.documentType] = doc;
      });
      
      setDocumentStatuses(statuses);
    }
  }, [processo]);

  if (!processo) return null;

  const getStatusIcon = (status: DocumentStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Upload className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: DocumentStatus) => {
    const variants: Record<DocumentStatus, any> = {
      completed: 'default',
      processing: 'secondary',
      error: 'destructive',
      pending: 'outline',
      not_applicable: 'outline'
    };
    
    const labels: Record<DocumentStatus, string> = {
      completed: 'Completo',
      processing: 'Processando',
      error: 'Erro',
      pending: 'Pendente',
      not_applicable: 'N/A'
    };
    
    return <Badge variant={variants[status]}>{labels[status]}</Badge>;
  };

  const handleDocumentUpload = async (results: any, documentType: DocumentType) => {
    // Navigate to OCR page with process context
    const processState = {
      processId: processo.numeroProcesso,
      documentType,
      fromProcess: true,
      returnUrl: '/processos'
    };
    
    const stateParam = btoa(JSON.stringify(processState));
    router.push(`/ocr?documentType=${documentType}&from=process&processId=${processo.numeroProcesso}&state=${stateParam}`);
    onOpenChange(false);
  };

  const canProcessPhysicalReceipt = () => {
    const hasPackingList = documentStatuses.packing_list?.status === 'completed';
    const hasCommercialInvoice = documentStatuses.commercial_invoice?.status === 'completed';
    return hasPackingList && hasCommercialInvoice;
  };

  const canProcessFiscal = () => {
    const hasDI = documentStatuses.di?.status === 'completed';
    const hasNotaFiscal = documentStatuses.nota_fiscal?.status === 'completed';
    return hasDI && hasNotaFiscal;
  };

  const handlePhysicalReceipt = () => {
    if (!canProcessPhysicalReceipt()) {
      toast.error('É necessário ter Packing List e Commercial Invoice processados');
      return;
    }
    
    toast.info('Iniciando processamento de recebimento físico...');
    // TODO: Implement physical receipt processing
  };

  const handleFiscalProcessing = () => {
    if (!canProcessFiscal()) {
      toast.error('É necessário ter DI e Nota Fiscal processados');
      return;
    }
    
    toast.info('Iniciando processamento fiscal...');
    // TODO: Implement fiscal processing
  };

  const getNextRecommendedDocument = (): DocumentType | null => {
    // Priority order for import process
    const priorityOrder: DocumentType[] = [
      'proforma_invoice',
      'commercial_invoice',
      'packing_list',
      'swift',
      'di',
      'numerario',
      'nota_fiscal'
    ];
    
    for (const docType of priorityOrder) {
      if (documentStatuses[docType]?.status === 'pending') {
        return docType;
      }
    }
    
    return null;
  };

  const nextDocument = getNextRecommendedDocument();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!bg-zinc-900 max-w-4xl max-h-[90vh] border-zinc-800">
        <DialogHeader className="border-b border-zinc-800 pb-4">
          <DialogTitle className="flex items-center gap-2 text-xl text-zinc-100">
            <FileText className="h-5 w-5 text-primary" />
            Processo {processo.numeroProcesso}
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            {processo.descricao}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-4 bg-zinc-800 border-zinc-700">
            <TabsTrigger value="overview" className="data-[state=active]:bg-zinc-700">Visão Geral</TabsTrigger>
            <TabsTrigger value="documents" className="data-[state=active]:bg-zinc-700">Documentos</TabsTrigger>
            <TabsTrigger value="upload" className="data-[state=active]:bg-zinc-700">Upload</TabsTrigger>
            <TabsTrigger value="actions" className="data-[state=active]:bg-zinc-700">Ações</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[500px] mt-4 px-1">
            <TabsContent value="overview" className="space-y-4">
              {/* Process Info */}
              <Card className="bg-zinc-800 border-zinc-700">
                <CardHeader>
                  <CardTitle className="text-lg text-zinc-100">Informações do Processo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Empresa:</span>
                      <p className="font-medium">{processo.empresa}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Responsável:</span>
                      <p className="font-medium">{processo.responsavel}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Data Início:</span>
                      <p className="font-medium">
                        {format(new Date(processo.dataInicio), 'dd/MM/yyyy', { locale: ptBR })}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status:</span>
                      <p className="font-medium">{processo.status}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Document Progress */}
              <Card className="bg-zinc-800 border-zinc-700">
                <CardHeader>
                  <CardTitle className="text-lg text-zinc-100">Progresso dos Documentos</CardTitle>
                  <CardDescription>
                    Status de cada documento no processo
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.values(documentStatuses).map((docStatus) => (
                      <div key={docStatus.type} className="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(docStatus.status)}
                          <span className="font-medium">{documentTypeLabels[docStatus.type]}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          {getStatusBadge(docStatus.status)}
                          {docStatus.documentId && (
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents" className="space-y-4">
              {/* Document List */}
              <Card className="bg-zinc-800 border-zinc-700">
                <CardHeader>
                  <CardTitle className="text-lg text-zinc-100">Documentos Processados</CardTitle>
                  <CardDescription>
                    Lista de todos os documentos vinculados ao processo
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.values(documentStatuses)
                      .filter(doc => doc.status === 'completed')
                      .map((doc) => (
                        <div key={doc.type} className="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors">
                          <div className="space-y-1">
                            <p className="font-medium">{documentTypeLabels[doc.type]}</p>
                            {doc.processedAt && (
                              <p className="text-xs text-muted-foreground">
                                Processado em: {format(new Date(doc.processedAt), 'dd/MM/yyyy HH:mm')}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => {
                              if (doc.documentId) {
                                // TODO: Navigate to document view
                                router.push(`/ocr?documentId=${doc.documentId}`);
                              }
                            }}>
                              <Eye className="h-4 w-4 mr-2" />
                              Visualizar
                            </Button>
                            <Button variant="outline" size="sm">
                              <Download className="h-4 w-4 mr-2" />
                              Baixar
                            </Button>
                          </div>
                        </div>
                      ))}
                    
                    {Object.values(documentStatuses).filter(doc => doc.status === 'completed').length === 0 && (
                      <p className="text-center text-muted-foreground py-8">
                        Nenhum documento processado ainda
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="upload" className="space-y-4">
              {/* Upload Section */}
              <Card className="bg-zinc-800 border-zinc-700">
                <CardHeader>
                  <CardTitle className="text-lg text-zinc-100">Upload de Documentos</CardTitle>
                  <CardDescription>
                    Adicione novos documentos ao processo
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {nextDocument && (
                    <div className="mb-6 p-4 bg-blue-950/20 rounded-lg border border-blue-900">
                      <p className="text-sm font-medium text-blue-300 mb-1">
                        Próximo documento recomendado:
                      </p>
                      <p className="text-lg font-medium flex items-center gap-2">
                        {documentTypeLabels[nextDocument]}
                        <ArrowRight className="h-4 w-4" />
                      </p>
                    </div>
                  )}
                  
                  <DocumentUploadForm
                    onProcessComplete={(results, docType) => handleDocumentUpload(results, docType)}
                    allowedTypes={Object.keys(documentStatuses)
                      .filter(type => documentStatuses[type as DocumentType].status === 'pending')
                      .map(type => type as DocumentType)}
                    defaultType={nextDocument || undefined}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="actions" className="space-y-4">
              {/* Process Actions */}
              <Card className="bg-zinc-800 border-zinc-700">
                <CardHeader>
                  <CardTitle className="text-lg text-zinc-100">Ações do Processo</CardTitle>
                  <CardDescription>
                    Execute ações específicas baseadas nos documentos disponíveis
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Physical Receipt Processing */}
                  <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg space-y-3 hover:border-zinc-700 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Truck className="h-5 w-5 text-blue-500" />
                        <div>
                          <h4 className="font-medium">Processar Recebimento Físico</h4>
                          <p className="text-sm text-muted-foreground">
                            Registre o recebimento físico das mercadorias
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={handlePhysicalReceipt}
                        disabled={!canProcessPhysicalReceipt()}
                        variant={canProcessPhysicalReceipt() ? 'default' : 'outline'}
                      >
                        <Package className="h-4 w-4 mr-2" />
                        Processar
                      </Button>
                    </div>
                    {!canProcessPhysicalReceipt() && (
                      <div className="text-xs text-yellow-600 bg-yellow-950/20 p-2 rounded">
                        Requer: Packing List e Commercial Invoice processados
                      </div>
                    )}
                  </div>

                  {/* Fiscal Processing */}
                  <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg space-y-3 hover:border-zinc-700 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Calculator className="h-5 w-5 text-green-500" />
                        <div>
                          <h4 className="font-medium">Processamento Fiscal</h4>
                          <p className="text-sm text-muted-foreground">
                            Calcule impostos e gere documentos fiscais
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={handleFiscalProcessing}
                        disabled={!canProcessFiscal()}
                        variant={canProcessFiscal() ? 'default' : 'outline'}
                      >
                        <Receipt className="h-4 w-4 mr-2" />
                        Processar
                      </Button>
                    </div>
                    {!canProcessFiscal() && (
                      <div className="text-xs text-yellow-600 bg-yellow-950/20 p-2 rounded">
                        Requer: DI e Nota Fiscal processados
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Other Actions */}
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full justify-start hover:bg-zinc-800 transition-colors">
                      <FileText className="h-4 w-4 mr-2" />
                      Gerar Relatório Completo
                    </Button>
                    <Button variant="outline" className="w-full justify-start hover:bg-zinc-800 transition-colors">
                      <Download className="h-4 w-4 mr-2" />
                      Exportar Todos os Documentos
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}