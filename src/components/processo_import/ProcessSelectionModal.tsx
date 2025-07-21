'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  X,
  Play,
  Pause
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
  data_inicio: string;
}

interface ProcessSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  processes: Process[];
  documentType: string;
  documentId: string;
  fileHash: string;
  onProcessSelect: (processId: string) => void;
  onCreateNewProcess: () => void;
  onSkipAttachment?: () => void;
  onSuccessfulConnection?: (processId: string) => void; // New callback
}

export function ProcessSelectionModal({
  open,
  onOpenChange,
  processes,
  documentType,
  documentId,
  fileHash,
  onProcessSelect,
  onCreateNewProcess,
  onSkipAttachment,
  onSuccessfulConnection
}: ProcessSelectionModalProps) {
  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null);
  const [isAttaching, setIsAttaching] = useState(false);
  
  // Auto-connect states
  const [autoConnectCountdown, setAutoConnectCountdown] = useState<number>(0);
  const [isAutoConnectPaused, setIsAutoConnectPaused] = useState(false);
  const countdownInterval = useRef<NodeJS.Timeout | null>(null);
  
  // Prevent duplicate requests
  const attachingRef = useRef(false);

  // Initialize auto-connect when modal opens with single process
  useEffect(() => {
    if (open && processes.length === 1 && !selectedProcessId) {
      // Auto-select the single process
      setSelectedProcessId(processes[0].id);
      // Start countdown
      setAutoConnectCountdown(9);
    }
    
    // Cleanup on close
    if (!open) {
      setAutoConnectCountdown(0);
      setIsAutoConnectPaused(false);
      attachingRef.current = false; // Reset attach ref
      setIsAttaching(false); // Reset attaching state
      if (countdownInterval.current) {
        clearInterval(countdownInterval.current);
        countdownInterval.current = null;
      }
    }
  }, [open, processes.length]);

  // Auto-connect countdown effect
  useEffect(() => {
    if (autoConnectCountdown > 0 && !isAutoConnectPaused) {
      countdownInterval.current = setInterval(() => {
        setAutoConnectCountdown((prev) => {
          if (prev <= 1) {
            // Clear interval before auto-connecting
            if (countdownInterval.current) {
              clearInterval(countdownInterval.current);
              countdownInterval.current = null;
            }
            // Auto-connect
            handleAttach();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (countdownInterval.current) {
        clearInterval(countdownInterval.current);
        countdownInterval.current = null;
      }
    }

    return () => {
      if (countdownInterval.current) {
        clearInterval(countdownInterval.current);
        countdownInterval.current = null;
      }
    };
  }, [autoConnectCountdown, isAutoConnectPaused]);

  const handleAttach = async () => {
    if (!selectedProcessId || !fileHash) return;
    
    // Prevent duplicate requests
    if (attachingRef.current) {
      console.log('Attach already in progress, skipping duplicate request');
      return;
    }

    attachingRef.current = true;
    setIsAttaching(true);
    setAutoConnectCountdown(0); // Stop countdown
    
    try {
      // Call API to connect document to process
      const response = await fetch('/api/processo-importacao/connect-documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          processId: selectedProcessId,
          fileHash: fileHash
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Falha ao conectar documento');
      }

      toast.success('Documento conectado ao processo com sucesso!');
      
      // Close modal first
      onOpenChange(false);
      
      // Call success callback if provided
      if (onSuccessfulConnection && typeof onSuccessfulConnection === 'function') {
        try {
          await onSuccessfulConnection(selectedProcessId);
        } catch (callbackError) {
          console.warn('onSuccessfulConnection callback error (non-critical):', callbackError);
        }
      }
      
      // Try to call onProcessSelect if it exists and is a function
      // This is optional - if it fails, we already showed success
      if (onProcessSelect && typeof onProcessSelect === 'function') {
        try {
          await onProcessSelect(selectedProcessId);
        } catch (selectError) {
          console.warn('onProcessSelect callback error (non-critical):', selectError);
          // Don't show error to user since the connection was successful
        }
      }
    } catch (error) {
      console.error('Error connecting document:', error);
      toast.error(`Erro ao conectar documento: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsAttaching(false);
      attachingRef.current = false; // Reset the ref
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

              {/* Auto-connect card for single process */}
              {processes.length === 1 && autoConnectCountdown > 0 && (
                <Card className="mb-4 bg-gradient-to-r from-blue-900/20 to-green-900/20 border-blue-700">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {isAutoConnectPaused ? (
                          <Pause className="h-5 w-5 text-yellow-500" />
                        ) : (
                          <Play className="h-5 w-5 text-green-500 animate-pulse" />
                        )}
                        <div>
                          <p className="font-medium">
                            {isAutoConnectPaused 
                              ? 'Conexão automática pausada' 
                              : `Conectando automaticamente em ${autoConnectCountdown} segundos...`
                            }
                          </p>
                          <p className="text-sm text-zinc-400">
                            Documento será conectado ao processo {processes[0].numero_processo}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={isAutoConnectPaused ? "default" : "outline"}
                          onClick={() => setIsAutoConnectPaused(!isAutoConnectPaused)}
                        >
                          {isAutoConnectPaused ? (
                            <>
                              <Play className="h-4 w-4 mr-1" />
                              Continuar
                            </>
                          ) : (
                            <>
                              <Pause className="h-4 w-4 mr-1" />
                              Pausar
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setAutoConnectCountdown(0);
                            setIsAutoConnectPaused(false);
                          }}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

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
                          {process.data_inicio && (
                            <div className="flex items-center gap-2 text-sm text-zinc-400">
                              <Calendar className="h-3 w-3" />
                              Iniciado em {format(new Date(process.data_inicio), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
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
                onClick={async () => {
                  // Try to extract invoice number from the saved document
                  let invoiceNumber = null;
                  
                  try {
                    // Get document data to extract invoice number
                    const docResponse = await fetch(`/api/documents/${documentType}/${documentId}`);
                    if (docResponse.ok) {
                      const docData = await docResponse.json();
                      invoiceNumber = docData.invoiceNumber || docData.invoice_number || docData.fatura;
                    }
                  } catch (error) {
                    console.error('Error fetching document data:', error);
                  }
                  
                  if (invoiceNumber) {
                    // Create simple process directly
                    try {
                      const response = await fetch('/api/processo-importacao/create-simple', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                          invoiceNumber: invoiceNumber,
                          fileHash: fileHash
                        })
                      });
                      
                      const result = await response.json();
                      
                      if (result.success) {
                        toast.success(
                          result.isNew 
                            ? `Processo ${result.processNumber} criado e documento conectado!` 
                            : `Documento conectado ao processo ${result.processNumber} existente`
                        );
                        onOpenChange(false);
                      } else {
                        throw new Error(result.error || 'Falha ao criar processo');
                      }
                    } catch (error) {
                      console.error('Error creating simple process:', error);
                      toast.error(`Erro ao criar processo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
                    }
                  } else {
                    // Fallback to original behavior if no invoice number
                    onCreateNewProcess();
                  }
                }}
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