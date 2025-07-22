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
import { Progress } from '@/components/ui/progress';
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
  onSuccessfulAttachment?: () => void;
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
  onCreateNewProcess,
  onSuccessfulAttachment
}: UnknownDocumentModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [identificationResult, setIdentificationResult] = useState<IdentificationResult | null>(null);
  const [step, setStep] = useState<'upload' | 'processing' | 'results'>('upload');
  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null);
  const [processingProgress, setProcessingProgress] = useState<number>(0);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [savedExtractedData, setSavedExtractedData] = useState<any>(null); // Store extracted data
  
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
  
  // Track if document has been processed
  const [isDocumentProcessed, setIsDocumentProcessed] = useState(false);
  
  // File existence check state
  const [existingFileInfo, setExistingFileInfo] = useState<{
    exists: boolean;
    uploadRecord?: any;
    processInfo?: any;
  } | null>(null);
  const [showReprocessConfirm, setShowReprocessConfirm] = useState(false);
  
  // AbortController for API requests
  const abortControllerRef = useRef<AbortController | null>(null);

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
      setIsDocumentProcessed(false); // Reset processed state
      processingRef.current = false; // Reset processing ref
      setExistingFileInfo(null); // Reset file check
      setShowReprocessConfirm(false);
      if (countdownInterval.current) {
        clearInterval(countdownInterval.current);
      }
      // Abort any pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    }
  }, [open]);

  // Auto-process countdown effect
  useEffect(() => {
    if (
      identificationResult?.nextStep.shouldProcess &&
      autoProcessCountdown > 0 &&
      !isAutoProcessPaused &&
      !processingRef.current && // Use ref instead of state
      !isDocumentProcessed // Don't countdown if already processed
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

  const checkFileExistence = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/documents/check-existing', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      
      if (response.ok) {
        setExistingFileInfo(result);
        if (result.exists) {
          setShowReprocessConfirm(true);
        }
      }
    } catch (error) {
      console.error('Error checking file existence:', error);
      // Don't block file selection on error
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        setSelectedFile(file);
        // Check if file already exists
        await checkFileExistence(file);
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
        setAutoProcessCountdown(10);
      }
    } catch (error) {
      console.error('Error identifying document:', error);
      toast.error(`Erro ao identificar documento: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      setStep('upload');
    } finally {
      setIsProcessing(false);
    }
  };

  const updateProcessWithProformaData = async (processId: string, proformaData: any) => {
    try {
      console.log('🔄 [PROFORMA UPDATE] Updating process with Proforma data');
      
      const response = await fetch('/api/processo-importacao/update-from-proforma', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          processId,
          proformaData,
          fileHash: identificationResult?.uploadData.fileHash
        })
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        console.log('✅ [PROFORMA UPDATE] Process updated successfully');
        toast.success('Dados da Proforma aplicados ao processo');
      } else {
        console.warn('⚠️ [PROFORMA UPDATE] Update failed:', result);
      }
    } catch (error) {
      console.error('❌ [PROFORMA UPDATE] Error updating process:', error);
      // Don't show error to user - this is an enhancement, not critical
    }
  };

  const searchRelatedProcesses = async (
    identificationData: IdentificationResult,
    documentId: string,
    documentType: string
  ) => {
    try {
      console.log('🔍 [DEBUG] searchRelatedProcesses called with:', {
        documentId,
        documentType,
        hasInvoiceNumber: !!identificationData.identification.document_number,
        invoiceNumber: identificationData.identification.document_number
      });
      
      // Check if this is a document type without invoice (BL or Contrato de Câmbio)
      const isDocumentWithoutInvoice = documentType === 'bl' || documentType === 'contrato_cambio';
      
      if (isDocumentWithoutInvoice) {
        // For BL and Contrato de Câmbio, get all active processes
        console.log('📋 [DEBUG] Document without invoice detected, fetching all processes');
        
        const response = await fetch('/api/processo-importacao/list-all', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log(`✅ [DEBUG] Found ${result.processes.length} active processes`);
          setFoundProcesses(result.processes || []);
        } else {
          setFoundProcesses([]);
        }
      } else if (identificationData.identification.document_number) {
        // For other documents, search by invoice number
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
          console.log('✅ [DEBUG] Search result:', result);
          setFoundProcesses(result.processes || []);
        } else {
          setFoundProcesses([]);
        }
      } else {
        setFoundProcesses([]);
      }
      
      // Always show process selection modal
      console.log('📊 [DEBUG] Setting showProcessSelection to true');
      setShowProcessSelection(true);
      
    } catch (error) {
      console.error('Error searching processes:', error);
      setFoundProcesses([]);
      setShowProcessSelection(true);
    }
  };

  const pollForOCRStatus = async (requestId: string): Promise<any> => {
    const maxAttempts = 300; // 10 minutes max (2 second intervals)
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        const statusResponse = await fetch(`/api/ocr/extract-claude-multi/status?requestId=${requestId}`, {
          signal: abortControllerRef.current?.signal
        });
        
        if (!statusResponse.ok) {
          // If 404, assume still processing
          if (statusResponse.status === 404) {
            setProcessingStatus('Processamento em andamento...');
            await new Promise(resolve => setTimeout(resolve, 2000));
            attempts++;
            continue;
          }
          throw new Error('Failed to check status');
        }
        
        const statusResult = await statusResponse.json();
        
        // Update progress based on current step
        if (statusResult.currentStep) {
          const progress = (statusResult.currentStep / (statusResult.totalSteps || 3)) * 100;
          setProcessingProgress(progress);
        }
        
        if (statusResult.currentStepName) {
          setProcessingStatus(`Processando: ${statusResult.currentStepName}`);
        }
        
        // Check if completed
        if (statusResult.status === 'completed' && statusResult.result) {
          return statusResult.result;
        }
        
        // Check for errors
        if (statusResult.status === 'failed' || statusResult.error) {
          throw new Error(statusResult.error || 'Processing failed');
        }
        
        // Wait 2 seconds before next poll
        await new Promise(resolve => setTimeout(resolve, 2000));
        attempts++;
        
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          throw new Error('Processing cancelled');
        }
        throw error;
      }
    }
    
    throw new Error('Processing timeout - exceeded 10 minutes');
  };

  const handleProcessAsType = async (documentType: string, processId?: string) => {
    // Check if already processing using ref
    if (processingRef.current || !identificationResult) return;
    
    // Set processing immediately with ref
    processingRef.current = true;
    setIsProcessing(true);
    
    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new AbortController
    abortControllerRef.current = new AbortController();
    
    try {
      // Step 1: Call OCR extraction directly
      console.log('🚀 Starting OCR extraction for document type:', documentType);
      
      const ocrResponse = await fetch('/api/ocr/extract-claude-multi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          storagePath: identificationResult.uploadData.storagePath,
          fileType: '.pdf',
          documentType: documentType,
          fileHash: identificationResult.uploadData.fileHash
        }),
        signal: abortControllerRef.current.signal
      });

      const ocrResult = await ocrResponse.json();

      if (!ocrResponse.ok || !ocrResult.success) {
        throw new Error(ocrResult.error || 'Falha na extração OCR');
      }

      let extractedData;
      
      // Check if async processing was initiated
      if (ocrResult.requestId) {
        console.log('🔄 OCR async processing initiated:', ocrResult.requestId);
        setProcessingStatus('Iniciando extração de dados...');
        
        // Poll for OCR status
        const finalOCRResult = await pollForOCRStatus(ocrResult.requestId);
        
        if (!finalOCRResult.success) {
          throw new Error('Extração OCR assíncrona falhou');
        }
        
        extractedData = finalOCRResult.data;
      } else {
        // Synchronous result
        extractedData = ocrResult.data;
      }

      console.log('✅ OCR extraction completed, processing data...');
      console.log('📊 [DEBUG] Extracted data structure:', {
        hasSteps: !!extractedData?.steps,
        stepsLength: extractedData?.steps?.length,
        keys: Object.keys(extractedData || {}),
        sampleData: extractedData?.steps?.[0] ? {
          stepName: extractedData.steps[0].stepName,
          hasResult: !!extractedData.steps[0].result,
          resultType: typeof extractedData.steps[0].result
        } : null
      });
      setProcessingStatus('Processando dados extraídos...');

      // Step 2: Send extracted data to process endpoint
      const processResponse = await fetch('/api/documents/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          documentType: documentType,
          extractedData: extractedData,
          fileHash: identificationResult.uploadData.fileHash,
          originalFileName: identificationResult.uploadData.originalFileName,
          storagePath: identificationResult.uploadData.storagePath
        }),
        signal: abortControllerRef.current.signal
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
        }),
        signal: abortControllerRef.current.signal
      });

      const saveResult = await saveResponse.json();

      if (!saveResponse.ok || !saveResult.success) {
        throw new Error(saveResult.error || 'Falha ao salvar');
      }

      toast.success(`Documento ${documentType} processado e salvo com sucesso!`);
      
      // Mark document as processed
      setIsDocumentProcessed(true);
      setAutoProcessCountdown(0); // Stop countdown
      
      // Save document ID
      console.log('📊 [DEBUG] Save result:', saveResult);
      console.log('📊 [DEBUG] Document ID:', saveResult.documentId);
      setSavedDocumentId(saveResult.documentId);
      
      // Save extracted data for later use (especially for Proforma)
      setSavedExtractedData(processResult.extractedData);
      
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
      console.log('🚀 [DEBUG] About to search related processes');
      await searchRelatedProcesses(identificationResult, saveResult.documentId, documentType);
      console.log('✅ [DEBUG] searchRelatedProcesses completed');
      
      // Log final state
      console.log('📊 [DEBUG] Final state after processing:', {
        isDocumentProcessed,
        showProcessSelection,
        savedDocumentId: saveResult.documentId,
        foundProcessesCount: foundProcesses.length
      });
      
      // Don't close modal - show process selection instead
    } catch (error) {
      // Ignore abort errors
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Request was aborted');
      } else {
        console.error('Error processing document:', error);
        toast.error(`Erro ao processar: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      }
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
      'bl': 'BL - Bill of Lading',
      'contrato_cambio': 'Contrato de Câmbio',
      'unknown': 'Desconhecido',
      'other': 'Outro',
      'PROFORMA_INVOICE': 'Proforma Invoice',
      'COMMERCIAL_INVOICE': 'Commercial Invoice',
      'PACKING_LIST': 'Packing List',
      'SWIFT': 'SWIFT',
      'DI': 'DI - Declaração de Importação',
      'NUMERARIO': 'Numerário',
      'NOTA_FISCAL_TRADING': 'Nota Fiscal',
      'BL': 'BL - Bill of Lading',
      'CONTRATO_CAMBIO': 'Contrato de Câmbio',
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

              {/* Alert card for existing file */}
              {existingFileInfo?.exists && showReprocessConfirm && (
                <Card className="bg-yellow-950/20 border-yellow-700">
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-yellow-300 mb-2">
                          Este arquivo já foi processado anteriormente
                        </p>
                        <div className="space-y-2 text-sm text-yellow-200/80">
                          <p>
                            <span className="text-zinc-400">Tipo de documento:</span>{' '}
                            <span className="font-medium">
                              {getDocumentTypeLabel(existingFileInfo.uploadRecord?.documentType || 'unknown')}
                            </span>
                          </p>
                          <p>
                            <span className="text-zinc-400">Status:</span>{' '}
                            <Badge variant={existingFileInfo.uploadRecord?.status === 'completo' ? 'default' : 'secondary'}>
                              {existingFileInfo.uploadRecord?.status || 'pendente'}
                            </Badge>
                          </p>
                          {existingFileInfo.processInfo?.connected && (
                            <div>
                              <p className="text-zinc-400 mb-1">
                                Conectado a {existingFileInfo.processInfo.processCount} processo(s):
                              </p>
                              <div className="space-y-1 ml-4">
                                {existingFileInfo.processInfo.processes.map((proc: any) => (
                                  <div key={proc.id} className="flex items-center gap-2">
                                    <Link className="h-3 w-3 text-blue-400" />
                                    <span className="text-blue-300">{proc.numeroProcesso}</span>
                                    <span className="text-zinc-500">- {proc.empresa}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 mt-4">

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedFile(null);
                              setExistingFileInfo(null);
                              setShowReprocessConfirm(false);
                            }}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Limpar
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

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

              {/* Auto-process countdown - only show if not processed */}
              {identificationResult.nextStep.shouldProcess && autoProcessCountdown > 0 && !isDocumentProcessed && (
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
                  isDocumentProcessed ? (
                    // Show success state button
                    <Button
                      disabled
                      variant="outline"
                      className="w-full border-green-600 text-green-600"
                      size="lg"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Documento Processado com Sucesso
                    </Button>
                  ) : (
                    // Show process button
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
                        <div className="flex items-center justify-center w-full">
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          <span className="flex-1 text-left">
                            {processingStatus || 'Processando...'}
                            {processingProgress > 0 && ` (${Math.round(processingProgress)}%)`}
                          </span>
                        </div>
                      ) : (
                        <>
                          <FileText className="h-4 w-4 mr-2" />
                          Processar como {getDocumentTypeLabel(identificationResult.identification.mappedType)}
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </>
                      )}
                    </Button>
                  )
                )}

                {/* Progress bar for async processing */}
                {isProcessing && processingProgress > 0 && (
                  <div className="w-full space-y-2">
                    <Progress value={processingProgress} className="h-2" />
                    <p className="text-xs text-zinc-400 text-center">
                      {processingStatus || `Processando documento... ${Math.round(processingProgress)}%`}
                    </p>
                  </div>
                )}
                
                {/* Only show create process button for documents WITH invoice */}
                {identificationResult?.identification.mappedType !== 'bl' && 
                 identificationResult?.identification.mappedType !== 'contrato_cambio' && (
                <Button
                  onClick={async () => {
                    // Create simple process directly
                    if (identificationResult?.identification.document_number) {
                      try {
                        const response = await fetch('/api/processo-importacao/create-simple', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json'
                          },
                          body: JSON.stringify({
                            invoiceNumber: identificationResult.identification.document_number,
                            fileHash: identificationResult.uploadData.fileHash
                          })
                        });
                        
                        const result = await response.json();
                        
                        if (result.success) {
                          toast.success(
                            result.isNew 
                              ? `Processo ${result.processNumber} criado com sucesso!` 
                              : `Documento conectado ao processo ${result.processNumber} existente`
                          );
                          
                          // If it's a Proforma Invoice, update the process with its data
                          if (identificationResult.identification.mappedType === 'proforma_invoice' && savedExtractedData && result.processId) {
                            await updateProcessWithProformaData(result.processId, savedExtractedData);
                          }
                          
                          onOpenChange(false);
                          // Call refresh callback if provided
                          if (onSuccessfulAttachment) {
                            onSuccessfulAttachment();
                          }
                        } else {
                          throw new Error(result.error || 'Falha ao criar processo');
                        }
                      } catch (error) {
                        console.error('Error creating simple process:', error);
                        toast.error(`Erro ao criar processo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
                      }
                    } else {
                      toast.error('Não foi possível identificar o número da invoice no documento');
                    }
                  }}
                  variant="outline"
                  className="w-full"
                  disabled={!identificationResult?.identification.document_number}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Novo Processo
                </Button>
                )}
                
                {!isDocumentProcessed && (
                  <Button
                    onClick={() => {
                      setStep('upload');
                      setSelectedFile(null);
                      setIdentificationResult(null);
                      setAutoProcessCountdown(0);
                      setIsDocumentProcessed(false);
                    }}
                    variant="ghost"
                    className="w-full"
                  >
                    Tentar Outro Documento
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
    
    {/* Process Selection Modal */}
    {console.log('🎯 [DEBUG] Modal conditions:', {
      showProcessSelection,
      savedDocumentId,
      hasIdentificationResult: !!identificationResult,
      foundProcessesCount: foundProcesses.length,
      shouldShowModal: showProcessSelection && identificationResult
    })}
    {showProcessSelection && identificationResult && (
      <ProcessSelectionModal
        open={showProcessSelection}
        onOpenChange={setShowProcessSelection}
        processes={foundProcesses}
        documentType={identificationResult.identification.mappedType}
        documentId={savedDocumentId || ''}
        fileHash={identificationResult.uploadData.fileHash}
        isDocumentWithoutInvoice={
          identificationResult.identification.mappedType === 'bl' || 
          identificationResult.identification.mappedType === 'contrato_cambio'
        }
        onProcessSelect={(processId) => {
          toast.success(`Documento conectado ao processo ${processId}`);
          onProcessSelect(processId);
          onOpenChange(false);
          // Call refresh callback if provided
          if (onSuccessfulAttachment) {
            onSuccessfulAttachment();
          }
        }}
        onSuccessfulConnection={async (processId) => {
          // If it's a Proforma Invoice, update the process with its data
          if (identificationResult.identification.mappedType === 'proforma_invoice' && savedExtractedData) {
            await updateProcessWithProformaData(processId, savedExtractedData);
          }
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