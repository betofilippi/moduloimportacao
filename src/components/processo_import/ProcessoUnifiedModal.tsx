'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileText, 
  AlertCircle, 
  History,
  Upload,
  Calendar,
  Building2,
  Package,
  ChevronRight,
  Eye,
  Download,
  Trash2,
  User,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { ProcessoImportacao } from '@/types/processo-importacao';
import { KANBAN_CONFIG } from '@/config/nocodb-tables';
import { BusinessRuleAlerts } from './BusinessRuleAlerts';
import { DocumentUploadForm } from '@/components/documents/DocumentUploadForm';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ProcessDocument {
  id: string;
  hashArquivo: string;
  nomeArquivo: string;
  tipoDocumento: string;
  dataUpload: string;
  statusProcessamento: string;
  usuario?: string;
}

interface StageLog {
  id: string;
  ultima_etapa: string;
  nova_etapa: string;
  responsavel: string;
  descricao_regra: string;
  created_at: string;
}

interface ProcessoUnifiedModalProps {
  processo: ProcessoImportacao | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (processo: ProcessoImportacao) => void;
  onDelete?: (processo: ProcessoImportacao) => void;
  onStageChange?: (processId: string, newStage: string) => void;
}

export function ProcessoUnifiedModal({
  processo,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  onStageChange
}: ProcessoUnifiedModalProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [documents, setDocuments] = useState<ProcessDocument[]>([]);
  const [stageLogs, setStageLogs] = useState<StageLog[]>([]);
  const [violations, setViolations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [businessRules, setBusinessRules] = useState<any>(null);
  const [processData, setProcessData] = useState<any>(null);

  useEffect(() => {
    if (open && processo) {
      loadProcessData();
    }
  }, [open, processo]);

  const loadProcessData = async () => {
    if (!processo) return;
    
    setLoading(true);
    try {
      // Load all data from check endpoint
      const checkResponse = await fetch(`/api/processo-importacao/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ processId: processo.id })
      });
      
      if (checkResponse.ok) {
        const checkData = await checkResponse.json();
        
        // Update process data
        setProcessData(checkData.process);
        
        // Update documents with header data
        const documentsWithHeaders = checkData.documents.details.map((doc: any) => ({
          id: doc.id,
          hashArquivo: doc.hashArquivo,
          nomeArquivo: doc.nomeArquivoOriginal || doc.tipoDocumento,
          tipoDocumento: doc.tipoDocumento,
          dataUpload: doc.dataUpload,
          statusProcessamento: doc.statusProcessamento,
          idDocumento: doc.idDocumento,
          header: doc.header // Include header data
        }));
        setDocuments(documentsWithHeaders);
        
        // Update stage logs
        if (checkData.stageLogs) {
          setStageLogs(checkData.stageLogs.map((log: any) => ({
            id: log.id,
            ultima_etapa: log.ultimaEtapa,
            nova_etapa: log.novaEtapa,
            responsavel: log.responsavel,
            descricao_regra: log.descricaoRegra,
            created_at: log.dataMovimentacao || log.createdAt
          })));
        }
        
        // Update violations and business rules
        setViolations(checkData.businessRules?.violations || []);
        setBusinessRules(checkData.businessRules);
      }
    } catch (error) {
      console.error('Error loading process data:', error);
      toast.error('Erro ao carregar dados do processo');
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentUpload = async (files: File[]) => {
    try {
      // Upload logic here
      toast.success('Documento enviado com sucesso');
      setShowUploadForm(false);
      loadProcessData(); // Reload data
    } catch (error) {
      toast.error('Erro ao enviar documento');
    }
  };

  const handleDocumentView = (doc: ProcessDocument) => {
    // Open document viewer
    window.open(`/api/documents/view/${doc.hashArquivo}`, '_blank');
  };

  const handleDocumentDelete = async (doc: ProcessDocument) => {
    if (!confirm('Deseja remover este documento do processo?')) return;
    
    try {
      const response = await fetch('/api/processo-importacao/documents/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentHash: doc.hashArquivo,
          processId: processo?.id
        })
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        toast.success(
          result.isOrphan 
            ? 'Documento removido e marcado como excluído' 
            : 'Documento removido do processo'
        );
        loadProcessData();
      } else {
        throw new Error(result.error || 'Falha ao remover documento');
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Erro ao remover documento');
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  const getStageInfo = (stageId: string) => {
    const stage = KANBAN_CONFIG.STAGES.find(s => s.id === stageId);
    return stage || { title: stageId, color: 'bg-gray-500', description: '' };
  };

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'proforma_invoice': 'Proforma Invoice',
      'commercial_invoice': 'Commercial Invoice',
      'packing_list': 'Packing List',
      'bl': 'Bill of Lading',
      'di': 'Declaração de Importação',
      'swift': 'SWIFT',
      'nota_fiscal': 'Nota Fiscal',
      'numerario': 'Numerário'
    };
    return labels[type] || type;
  };

  const criticalViolations = violations.filter(v => v.severity === 'error');
  const currentStage = getStageInfo(processo?.etapa || 'solicitado');

  if (!processo) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] bg-neutral-950">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Package className="h-5 w-5" />
              <span>Processo {processo.numeroProcesso}</span>
              <Badge className={cn('text-white', currentStage.color)}>
                {currentStage.title}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {onEdit && (
                <Button size="sm" variant="outline" onClick={() => onEdit(processo)}>
                  Editar
                </Button>
              )}
              {onDelete && (
                <Button size="sm" variant="destructive" onClick={() => onDelete(processo)}>
                  Excluir
                </Button>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Documentos ({documents.length})
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Histórico
            </TabsTrigger>
            <TabsTrigger value="violations" className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Validações {violations.filter(v => v.severity === 'error').length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 text-xs">
                  {violations.filter(v => v.severity === 'error').length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Informações do Processo</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Empresa:</span>
                    <span>{processo.empresa}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Invoice:</span>
                    <span>{processo.invoiceNumber}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Responsável:</span>
                    <span>{processo.responsavel || 'Não definido'}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Data Início:</span>
                    <span>{formatDate(processo.dataInicio)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Previsão:</span>
                    <span>{processo.dataPrevisaoTermino ? formatDate(processo.dataPrevisaoTermino) : 'Não definida'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {processo.descricao && (
              <Card>
                <CardHeader>
                  <CardTitle>Descrição</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{processo.descricao}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Documentos Anexados</h3>
              <Button 
                size="sm" 
                onClick={() => setShowUploadForm(!showUploadForm)}
              >
                <Upload className="h-4 w-4 mr-2" />
                Adicionar Documento
              </Button>
            </div>

            {showUploadForm && (
              <Card className="mb-4">
                <CardContent className="pt-6">
                  <DocumentUploadForm 
                    processId={processo.id}
                    autoSave={true}
                    onDocumentSaved={(documentId, documentType) => {
                      console.log(`Document ${documentId} of type ${documentType} saved and linked to process ${processo.id}`);
                      loadDocuments(); // Refresh documents list
                    }}
                    onProcessComplete={(results, documentType, isFromCache) => {
                      handleDocumentUpload();
                      setShowUploadForm(false);
                    }}
                  />
                </CardContent>
              </Card>
            )}

            {documents.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">Nenhum documento anexado</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {documents.map((doc) => (
                      <div key={doc.id} className="p-4 flex items-center justify-between hover:bg-muted/50">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-sm">{doc.nomeArquivo}</p>
                            <p className="text-xs text-muted-foreground">
                              {getDocumentTypeLabel(doc.tipoDocumento)} • {formatDate(doc.dataUpload)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={doc.statusProcessamento === 'completo' ? 'success' : 'secondary'}>
                            {doc.statusProcessamento === 'completo' ? (
                              <CheckCircle className="h-3 w-3 mr-1" />
                            ) : (
                              <Clock className="h-3 w-3 mr-1" />
                            )}
                            {doc.statusProcessamento}
                          </Badge>
                          <Button 
                            size="icon" 
                            variant="ghost"
                            onClick={() => handleDocumentView(doc)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost"
                            onClick={() => handleDocumentDelete(doc)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">Últimas 5 Mudanças de Etapa</h3>
            {stageLogs.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <History className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">Nenhuma mudança registrada</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {stageLogs.map((log) => {
                  const fromStage = getStageInfo(log.ultima_etapa);
                  const toStage = getStageInfo(log.nova_etapa);
                  
                  return (
                    <Card key={log.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={cn('text-white', fromStage.color)}>
                            {fromStage.title}
                          </Badge>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          <Badge className={cn('text-white', toStage.color)}>
                            {toStage.title}
                          </Badge>
                        </div>
                        <p className="text-sm mb-1">{log.descricao_regra}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {log.responsavel}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(log.created_at)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="violations" className="space-y-4">
            {violations.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-2" />
                  <p className="text-muted-foreground">Nenhuma inconsistência encontrada</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Todas as regras de negócio estão sendo atendidas
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <BusinessRuleAlerts violations={violations} />
                
                {/* Required Documents Info */}
                {businessRules?.requiredDocuments && businessRules.requiredDocuments.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Documentos Necessários</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {businessRules.requiredDocuments.map((doc: any) => (
                          <div key={doc.type} className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{doc.name}</span>
                            {doc.isRequired && (
                              <Badge variant="destructive" className="text-xs">Obrigatório</Badge>
                            )}
                            <Badge variant="secondary" className="text-xs">{doc.stage}</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                {/* Stage Transition Info */}
                {businessRules?.canTransitionTo && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Transições Permitidas</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {businessRules.canTransitionTo.map((transition: any) => (
                          <div key={transition.stage} className="flex items-center justify-between">
                            <span className="text-sm">{transition.title}</span>
                            {transition.allowed ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}