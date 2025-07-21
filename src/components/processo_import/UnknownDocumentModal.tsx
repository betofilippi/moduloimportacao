'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FileQuestion,
  Upload,
  Loader2,
  CheckCircle,
  AlertCircle,
  FileText,
  ArrowRight,
  Link,
  Plus,
  Search,
  Pause,
  Play,
  X,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { ProcessoImportacao } from '@/types/processo-importacao';
import { DocumentType } from '@/services/documents';
import { ProcessSelectionModal } from './ProcessSelectionModal';
import { getDocumentCacheService } from '@/lib/services/DocumentCacheService';
import { getNocoDBService } from '@/lib/services/nocodb';
import { NOCODB_TABLES } from '@/config/nocodb-tables';

interface UnknownDocumentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  processos: ProcessoImportacao[];
  onProcessSelect: (processId: string) => void;
  onCreateNewProcess: () => void;
}

interface IdentificationResult {
  success: boolean;
  uploadData: {
    storagePath: string;
    fileHash: string;
    originalFileName: string;
    fromCache: boolean;
  };
  identification: {
    tipo: string;
    mappedType: string;
    document_number: string | null;
    has_invoice_number: boolean;
    resumo: string;
    data: string;
    proximo_modulo: string;
  };
  nextStep: {
    shouldProcess: boolean;
    documentType: string;
    message: string;
  };
}

export function UnknownDocumentModal({
  open,
  onOpenChange,
  processos,
  onProcessSelect,
  onCreateNewProcess
}: UnknownDocumentModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [identificationResult, setIdentificationResult] = useState<IdentificationResult | null>(null);
  const [step, setStep] = useState<'upload' | 'processing' | 'results'>('upload');
  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null);
  
  // Auto-processing states
  const [autoProcessCountdown, setAutoProcessCountdown] = useState<number>(0);
  const [isAutoProcessPaused, setIsAutoProcessPaused] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const countdownInterval = useRef<NodeJS.Timeout | null>(null);
  
  // Process selection modal state
  const [showProcessSelection, setShowProcessSelection] = useState(false);
  const [savedDocumentId, setSavedDocumentId] = useState<string | null>(null);
  const [foundProcesses, setFoundProcesses] = useState<any[]>([]);
  
  // Add ref for processing control to prevent double execution
  const processingRef = useRef(false);

  // Reset state when modal closes
  React.useEffect(() => {
    if (!open) {
      setSelectedFile(null);
      setIdentificationResult(null);
      setStep('upload');
      setIsProcessing(false);
      setSelectedProcessId(null);
      setAutoProcessCountdown(0);
      setIsAutoProcessPaused(false);
      processingRef.current = false; // Reset processing ref
      if (countdownInterval.current) {
        clearInterval(countdownInterval.current);
      }
    }
  }, [open]);

  // Auto-process countdown effect
  useEffect(() => {
    if (
      identificationResult?.nextStep.shouldProcess &&
      autoProcessCountdown > 0 &&
      !isAutoProcessPaused &&
      !processingRef.current // Use ref instead of state
    ) {
      countdownInterval.current = setInterval(() => {
        setAutoProcessCountdown((prev) => {
          if (prev <= 1) {
            // Clear interval before auto-processing
            if (countdownInterval.current) {
              clearInterval(countdownInterval.current);
              countdownInterval.current = null;
            }
            // Auto-process only if not already processing - check ref again
            if (!processingRef.current) {
              handleProcessAsType(identificationResult.identification.mappedType as DocumentType);
            }
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
  }, [autoProcessCountdown, isAutoProcessPaused, identificationResult]); // Remove isProcessing from deps

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        setSelectedFile(file);
      } else {
        toast.error('Por favor, selecione um arquivo PDF');
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
    maxSize: 20 * 1024 * 1024, // 20MB
  });

  const handleIdentify = async () => {
    if (!selectedFile) {
      toast.error('Selecione um arquivo para identificar');
      return;
    }

    setIsProcessing(true);
    setStep('processing');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('/api/documents/identify', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Falha na identificação');
      }

      setIdentificationResult(result);
      setStep('results');
      
      // Start auto-process countdown if document was identified
      if (result.nextStep.shouldProcess) {
        setAutoProcessCountdown(8);
      }
    } catch (error) {
      console.error('Error identifying document:', error);
      toast.error(`Erro ao identificar documento: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      setStep('upload');
    } finally {
      setIsProcessing(false);
    }
  };

  const searchRelatedProcesses = async (
    identificationData: IdentificationResult,
    documentId: string,
    documentType: string
  ) => {
    try {
      // Only search if we have an invoice number
      if (identificationData.identification.document_number) {
        const response = await fetch('/api/processo-importacao/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            invoiceNumber: identificationData.identification.document_number
          })
        });
        
        if (response.ok) {
          const result = await response.json();
          setFoundProcesses(result.processes || []);
        } else {
          setFoundProcesses([]);
        }
      } else {
        setFoundProcesses([]);
      }
      
      // Always show process selection modal
      setShowProcessSelection(true);
      
    } catch (error) {
      console.error('Error searching processes:', error);
      setFoundProcesses([]);
      setShowProcessSelection(true);
    }
  };

  const handleProcessAsType = async (documentType: string, processId?: string) => {
    // Check if already processing using ref
    if (processingRef.current || !identificationResult) return;
    
    // Set processing immediately with ref
    processingRef.current = true;
    setIsProcessing(true);
    
    try {
      // Call process endpoint
      const processResponse = await fetch('/api/documents/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          storagePath: identificationResult.uploadData.storagePath,
          documentType: documentType,
          fileHash: identificationResult.uploadData.fileHash,
          originalFileName: identificationResult.uploadData.originalFileName
        })
      });

      const processResult = await processResponse.json();

      if (!processResponse.ok || !processResult.success) {
        throw new Error(processResult.error || 'Falha no processamento');
      }

      // Call save endpoint
      const saveResponse = await fetch('/api/documents/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          documentType: documentType,
          extractedData: processResult.extractedData,
          metadata: {
            fileHash: identificationResult.uploadData.fileHash,
            originalFileName: identificationResult.uploadData.originalFileName,
            storagePath: identificationResult.uploadData.storagePath
          }
        })
      });

      const saveResult = await saveResponse.json();

      if (!saveResponse.ok || !saveResult.success) {
        throw new Error(saveResult.error || 'Falha ao salvar');
      }

      toast.success(`Documento ${documentType} processado e salvo com sucesso!`);
      
      // Save document ID
      setSavedDocumentId(saveResult.documentId);
      
      // Update upload status
      if (identificationResult.uploadData.fileHash && saveResult.documentId) {
        try {
          const nocodb = getNocoDBService();
          // Find upload record by hash
          const uploadRecords = await nocodb.find(NOCODB_TABLES.DOCUMENT_UPLOADS, {
            where: `(hashArquivo,eq,${identificationResult.uploadData.fileHash})`,
            limit: 1
          });
          
          if (uploadRecords.list && uploadRecords.list.length > 0) {
            const uploadRecord = uploadRecords.list[0];
            const cacheService = getDocumentCacheService();
            await cacheService.updateUploadStatus(
              uploadRecord.Id, 
              saveResult.documentId, 
              'completo'
            );
            console.log(`✅ Status atualizado para 'completo' - Upload ID: ${uploadRecord.Id}`);
          }
        } catch (error) {
          console.error('Error updating upload status:', error);
          // Don't fail the operation
        }
      }
      
      // Search for related processes
      await searchRelatedProcesses(identificationResult, saveResult.documentId, documentType);
      
      // Don't close modal - show process selection instead
    } catch (error) {
      console.error('Error processing document:', error);
      toast.error(`Erro ao processar: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsProcessing(false);
      processingRef.current = false; // Reset ref
    }
  };

  const getDocumentTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      'proforma_invoice': 'Proforma Invoice',
      'commercial_invoice': 'Commercial Invoice',
      'packing_list': 'Packing List',
      'swift': 'SWIFT',
      'di': 'DI - Declaração de Importação',
      'numerario': 'Numerário',
      'nota_fiscal': 'Nota Fiscal',
      'unknown': 'Desconhecido',
      'other': 'Outro',
      'PROFORMA_INVOICE': 'Proforma Invoice',
      'COMMERCIAL_INVOICE': 'Commercial Invoice',
      'PACKING_LIST': 'Packing List',
      'SWIFT': 'SWIFT',
      'DI': 'DI - Declaração de Importação',
      'NUMERARIO': 'Numerário',
      'NOTA_FISCAL_TRADING': 'Nota Fiscal',
      'DESCONHECIDO': 'Desconhecido'
    };
    return labels[type] || type;
  };

  const getConfidenceBadge = (tipo: string) => {
    if (tipo === 'DESCONHECIDO' || tipo === 'unknown') {
      return <Badge className="bg-red-500">Não identificado</Badge>;
    } else {
      return <Badge className="bg-green-500">Alta confiança</Badge>;
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!bg-zinc-900 max-w-3xl max-h-[90vh] border-zinc-800">
        <DialogHeader className="border-b border-zinc-800 pb-4">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileQuestion className="h-5 w-5 text-purple-400" />
            Identificar Documento com IA
          </DialogTitle>
          <DialogDescription>
            Nossa IA analisa o documento para identificar o tipo e buscar processos relacionados
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {step === 'upload' && (
            <div className="space-y-4">
              <div
                {...getRootProps()}
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                  transition-all duration-200
                  ${isDragActive ? 'border-purple-500 bg-purple-500/10' : 'border-zinc-700 hover:border-zinc-600'}
                  ${selectedFile ? 'bg-green-950/20 border-green-700' : ''}
                `}
              >
                <input {...getInputProps()} />
                
                {selectedFile ? (
                  <div className="space-y-3">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                    <div>
                      <p className="font-medium text-green-300">{selectedFile.name}</p>
                      <p className="text-sm text-zinc-400">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                      }}
                    >
                      Trocar arquivo
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Upload className="h-12 w-12 text-zinc-500 mx-auto" />
                    <div>
                      <p className="text-lg font-medium">
                        {isDragActive ? 'Solte o arquivo aqui' : 'Arraste um documento'}
                      </p>
                      <p className="text-sm text-zinc-400 mt-1">
                        ou clique para selecionar (PDF, máx. 20MB)
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <Card className="bg-purple-950/20 border-purple-800">
                <CardContent className="flex gap-3 p-4">
                  <AlertCircle className="h-5 w-5 text-purple-400 flex-shrink-0 mt-0.5" />
                  <div className="text-purple-200">
                    <p className="font-medium mb-2">A IA analisará o documento para identificar:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>Tipo do documento (Invoice, Packing List, etc.)</li>
                      <li>Número de referência/invoice</li>
                      <li>Processos relacionados existentes</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleIdentify}
                  disabled={!selectedFile}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Identificar Documento
                </Button>
              </div>
            </div>
          )}

          {step === 'processing' && (
            <div className="py-12 text-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-purple-500 mx-auto" />
              <div>
                <p className="text-lg font-medium">Analisando documento...</p>
                <p className="text-sm text-zinc-400 mt-1">
                  Nossa IA está identificando o tipo e extraindo informações
                </p>
              </div>
            </div>
          )}

          {step === 'results' && identificationResult && (
            <div className="space-y-4">
              {/* Identification Result */}
              <Card className="bg-zinc-800 border-zinc-700">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    Resultado da Identificação
                    {getConfidenceBadge(identificationResult.identification.tipo)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-zinc-400">Tipo identificado:</p>
                      <p className="text-lg font-medium text-purple-300">
                        {getDocumentTypeLabel(identificationResult.identification.tipo)}
                      </p>
                    </div>
                    
                    {identificationResult.identification.document_number && (
                      <div>
                        <p className="text-sm text-zinc-400">Número do documento:</p>
                        <p className="text-lg font-medium text-blue-300">
                          {identificationResult.identification.document_number}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {identificationResult.identification.has_invoice_number && (
                    <div>
                      <p className="text-sm text-zinc-400">Invoice encontrada:</p>
                      <Badge className="bg-green-600">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Sim
                      </Badge>
                    </div>
                  )}
                  
                  <div>
                    <p className="text-sm text-zinc-400 mb-1">Resumo da análise:</p>
                    <p className="text-sm bg-zinc-900 p-3 rounded-lg border border-zinc-700">
                      {identificationResult.identification.resumo}
                    </p>
                  </div>

                  {identificationResult.identification.data && (
                    <div>
                      <p className="text-sm text-zinc-400">Data do documento:</p>
                      <p className="font-medium">{identificationResult.identification.data}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Auto-process countdown */}
              {identificationResult.nextStep.shouldProcess && autoProcessCountdown > 0 && (
                <Card className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border-purple-700">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {isAutoProcessPaused ? (
                          <Pause className="h-5 w-5 text-yellow-500" />
                        ) : (
                          <Play className="h-5 w-5 text-green-500 animate-pulse" />
                        )}
                        <div>
                          <p className="font-medium">
                            {isAutoProcessPaused 
                              ? 'Processamento automático pausado' 
                              : `Processando automaticamente em ${autoProcessCountdown} segundos...`
                            }
                          </p>
                          <p className="text-sm text-zinc-400">
                            O documento será processado como {getDocumentTypeLabel(identificationResult.identification.mappedType)}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={isAutoProcessPaused ? "default" : "outline"}
                          onClick={() => setIsAutoProcessPaused(!isAutoProcessPaused)}
                        >
                          {isAutoProcessPaused ? (
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
                            setAutoProcessCountdown(0);
                            setIsAutoProcessPaused(false);
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

              {/* Actions */}
              <div className="space-y-3">
                {identificationResult.identification.mappedType !== 'unknown' && 
                 identificationResult.identification.mappedType !== 'other' && (
                  <Button
                    onClick={() => {
                      setAutoProcessCountdown(0);
                      // Use setTimeout to avoid multiple clicks
                      setTimeout(() => {
                        handleProcessAsType(identificationResult.identification.mappedType);
                      }, 0);
                    }}
                    disabled={isProcessing || processingRef.current}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                    size="lg"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4 mr-2" />
                        Processar como {getDocumentTypeLabel(identificationResult.identification.mappedType)}
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                )}
                
                <Button
                  onClick={onCreateNewProcess}
                  variant="outline"
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Novo Processo
                </Button>
                
                <Button
                  onClick={() => {
                    setStep('upload');
                    setSelectedFile(null);
                    setIdentificationResult(null);
                    setAutoProcessCountdown(0);
                  }}
                  variant="ghost"
                  className="w-full"
                >
                  Tentar Outro Documento
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
    
    {/* Process Selection Modal */}
    {showProcessSelection && savedDocumentId && identificationResult && (
      <ProcessSelectionModal
        open={showProcessSelection}
        onOpenChange={setShowProcessSelection}
        processes={foundProcesses}
        documentType={identificationResult.identification.mappedType}
        documentId={savedDocumentId}
        fileHash={identificationResult.uploadData.fileHash}
        onProcessSelect={(processId) => {
          toast.success(`Documento conectado ao processo ${processId}`);
          onProcessSelect(processId);
          onOpenChange(false);
        }}
        onCreateNewProcess={() => {
          setShowProcessSelection(false);
          onCreateNewProcess();
          onOpenChange(false);
        }}
        onSkipAttachment={() => {
          toast.info('Documento salvo sem conexão a processo');
          setShowProcessSelection(false);
          onOpenChange(false);
        }}
      />
    )}
    </>
  );
}