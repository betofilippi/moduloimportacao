'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  CheckCircle,
  AlertCircle,
  FileText,
  Link,
  Plus,
  Search,
  Building,
  Calendar,
  Hash,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface Process {
  id: string;
  numero_processo: string;
  empresa: string;
  invoice: string;
  status: string;
  data_abertura: string;
  descricao_adicionais?: string;
  relevanceScore?: number;
  matchedFields?: string[];
}

interface ProcessSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  processes: Process[];
  documentType: string;
  documentId: string;
  onProcessSelect: (processId: string) => void;
  onCreateNewProcess: () => void;
  onSkipAttachment?: () => void;
}

export function ProcessSelectionModal({
  open,
  onOpenChange,
  processes,
  documentType,
  documentId,
  onProcessSelect,
  onCreateNewProcess,
  onSkipAttachment
}: ProcessSelectionModalProps) {
  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null);
  const [isAttaching, setIsAttaching] = useState(false);

  const handleAttach = async () => {
    if (!selectedProcessId) return;

    setIsAttaching(true);
    try {
      // Call API to attach document to process
      const response = await fetch('/api/processo-importacao/attach-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          processId: selectedProcessId,
          documentId: documentId,
          documentType: documentType
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Falha ao anexar documento');
      }

      toast.success('Documento anexado ao processo com sucesso!');
      await onProcessSelect(selectedProcessId);
      onOpenChange(false);
    } catch (error) {
      console.error('Error attaching document:', error);
      toast.error(`Erro ao anexar documento: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsAttaching(false);
    }
  };

  const getStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      'aberto': 'bg-blue-500',
      'em_andamento': 'bg-yellow-500',
      'concluido': 'bg-green-500',
      'cancelado': 'bg-red-500'
    };
    return statusColors[status] || 'bg-gray-500';
  };

  const getDocumentTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      'proforma_invoice': 'Proforma Invoice',
      'commercial_invoice': 'Commercial Invoice',
      'packing_list': 'Packing List',
      'swift': 'SWIFT',
      'di': 'DI - Declaração de Importação',
      'numerario': 'Numerário',
      'nota_fiscal': 'Nota Fiscal'
    };
    return labels[type] || type;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!bg-zinc-900 max-w-3xl max-h-[90vh] border-zinc-800">
        <DialogHeader className="border-b border-zinc-800 pb-4">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Link className="h-5 w-5 text-blue-400" />
            Anexar Documento ao Processo
          </DialogTitle>
          <DialogDescription>
            Documento <span className="text-blue-400 font-medium">{getDocumentTypeLabel(documentType)}</span> salvo com sucesso. 
            Selecione um processo para anexar ou crie um novo.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {processes.length > 0 ? (
            <>
              <div className="mb-4">
                <p className="text-sm text-zinc-400 mb-2">
                  Encontramos {processes.length} processo(s) que podem estar relacionados:
                </p>
              </div>

              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {processes.map((process) => (
                    <Card 
                      key={process.id}
                      className={`bg-zinc-800 border-zinc-700 cursor-pointer transition-all ${
                        selectedProcessId === process.id 
                          ? 'border-blue-500 bg-zinc-800/50' 
                          : 'hover:border-zinc-600'
                      }`}
                      onClick={() => setSelectedProcessId(process.id)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg flex items-center gap-2">
                              <Hash className="h-4 w-4 text-zinc-500" />
                              {process.numero_processo}
                              {selectedProcessId === process.id && (
                                <CheckCircle className="h-4 w-4 text-blue-500" />
                              )}
                            </CardTitle>
                            <CardDescription className="mt-1">
                              <div className="flex items-center gap-4 text-sm">
                                <span className="flex items-center gap-1">
                                  <Building className="h-3 w-3" />
                                  {process.empresa}
                                </span>
                                {process.invoice && (
                                  <span className="flex items-center gap-1">
                                    <FileText className="h-3 w-3" />
                                    Invoice: {process.invoice}
                                  </span>
                                )}
                              </div>
                            </CardDescription>
                          </div>
                          <Badge className={`${getStatusColor(process.status)} text-white`}>
                            {process.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-2">
                          {process.data_abertura && (
                            <div className="flex items-center gap-2 text-sm text-zinc-400">
                              <Calendar className="h-3 w-3" />
                              Aberto em {format(new Date(process.data_abertura), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                            </div>
                          )}
                          
                          {process.relevanceScore && process.relevanceScore > 0 && (
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-zinc-700 rounded-full h-2">
                                <div 
                                  className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full"
                                  style={{ width: `${Math.min(process.relevanceScore, 100)}%` }}
                                />
                              </div>
                              <span className="text-xs text-zinc-400">
                                {process.relevanceScore}% match
                              </span>
                            </div>
                          )}
                          
                          {process.matchedFields && process.matchedFields.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {process.matchedFields.map((field, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {field}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </>
          ) : (
            <Card className="bg-zinc-800 border-zinc-700">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Search className="h-12 w-12 text-zinc-600 mb-4" />
                <p className="text-lg font-medium text-zinc-300 mb-2">
                  Nenhum processo relacionado encontrado
                </p>
                <p className="text-sm text-zinc-400 text-center max-w-md">
                  Não encontramos processos que correspondam a este documento. 
                  Você pode criar um novo processo ou pular esta etapa.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="border-t border-zinc-800 pt-4">
          <div className="flex justify-between w-full">
            <div className="flex gap-2">
              {onSkipAttachment && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    onSkipAttachment();
                    onOpenChange(false);
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Pular anexação
                </Button>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onCreateNewProcess}
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar Novo Processo
              </Button>
              
              <Button
                onClick={handleAttach}
                disabled={!selectedProcessId || isAttaching}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isAttaching ? (
                  <>Anexando...</>
                ) : (
                  <>
                    <Link className="h-4 w-4 mr-2" />
                    Anexar ao Processo
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}