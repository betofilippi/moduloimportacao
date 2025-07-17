'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DocumentTypeSelector } from './DocumentTypeSelector';
import { DocumentType } from '@/services/documents/base/types';
import { ProcessingProgress } from './ProcessingProgress';
import { FileText, Upload, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { fetchFormData, fetchJSON } from '@/lib/fetch-wrapper';

interface ProcessingStep {
  step: number;
  stepName: string;
  stepDescription: string;
  completed: boolean;
  result?: string;
}

interface MultiPromptData {
  documentType: string;
  totalSteps: number;
  steps: Array<{
    step: number;
    stepName: string;
    stepDescription: string;
    result: string;
    metadata?: {
      tokenUsage?: {
        input: number;
        output: number;
      };
      processingTime: number;
    };
  }>;
  progressSteps: ProcessingStep[];
}

interface OCRResult {
  upload: {
    storagePath: string;
    fileType: string;
    fileName: string;
    fileSize: number;
  };
  ocr: {
    rawText: string;
    cleanedText: string;
    extractedData?: Record<string, unknown>;
    validation?: {
      isValid: boolean;
      missingFields: string[];
    };
    multiPrompt?: MultiPromptData;
  };
  extraction: {
    extractedData: Record<string, unknown>;
    validation?: {
      isValid: boolean;
      missingFields: string[];
    };
    documentType: string;
  };
}

interface OCRUploadFormProps {
  onProcessComplete: (result: OCRResult) => void;
}

export function OCRUploadForm({ onProcessComplete }: OCRUploadFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<DocumentType | ''>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [useMultiPrompt, setUseMultiPrompt] = useState(false);
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [processingStartTime, setProcessingStartTime] = useState<number | null>(null);
  const [estimatedProcessingTime, setEstimatedProcessingTime] = useState<string>('');
  const [elapsedTime, setElapsedTime] = useState<number>(0);

  // Update elapsed time every second during processing
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isProcessing && processingStartTime) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - processingStartTime) / 1000));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isProcessing, processingStartTime]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const droppedFile = acceptedFiles[0];
      setFile(droppedFile);
      
      // Estimate processing time based on file size
      const fileSizeMB = droppedFile.size / (1024 * 1024);
      if (fileSizeMB > 5) {
        const estimatedMinutes = Math.ceil(fileSizeMB / 2); // Rough estimate: 2MB per minute
        setEstimatedProcessingTime(`Tempo estimado: ${estimatedMinutes}-${estimatedMinutes + 2} minutos`);
      } else {
        setEstimatedProcessingTime('Tempo estimado: 30-60 segundos');
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

  const handleRemoveFile = () => {
    setFile(null);
    setEstimatedProcessingTime('');
  };

  const pollForResult = async (jobId: string, statusEndpoint: string): Promise<any> => {
    const maxPollingTime = 15 * 60 * 1000; // 15 minutes
    const pollingInterval = 5000; // 5 seconds
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxPollingTime) {
      try {
        const statusResponse = await fetchJSON(statusEndpoint, {
          method: 'GET',
          timeout: 10000, // 10 seconds timeout for status check
        });
        
        if (statusResponse.error) {
          throw new Error(statusResponse.error);
        }
        
        const status = statusResponse.data;
        
        if (status.status === 'completed') {
          return status.result;
        } else if (status.status === 'failed') {
          throw new Error(status.error || 'Processing failed');
        }
        
        // Update UI with processing time
        if (status.elapsedTime) {
          console.log(`Processing for ${Math.floor(status.elapsedTime / 1000)} seconds...`);
        }
        
        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, pollingInterval));
      } catch (error) {
        console.error('Polling error:', error);
        // Continue polling unless it's a fatal error
        if (error instanceof Error && error.message.includes('Failed to fetch')) {
          await new Promise(resolve => setTimeout(resolve, pollingInterval));
        } else {
          throw error;
        }
      }
    }
    
    throw new Error('Processing timed out after 15 minutes');
  };

  const handleProcess = async () => {
    if (!file || !documentType) {
      toast.error('Por favor, selecione um arquivo e o tipo de documento');
      return;
    }

    setIsProcessing(true);
    setProcessingSteps([]);
    setCurrentStep(0);
    setProcessingStartTime(Date.now());

    try {
      // 1. Upload file
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', documentType);

      const uploadResponse = await fetchFormData('/api/ocr/upload', formData);
      console.log('uploadResponse', uploadResponse)
      
      if (uploadResponse.error) {
        throw new Error(uploadResponse.error);
      }
      
      const uploadResult = uploadResponse.data;

      console.log('uploadResult', uploadResult)
      
      // Check if document came from cache
      if (uploadResult.fromCache && uploadResult.data?.structuredResult) {
        console.log('Document found in cache, using cached data');
        
        // Prepare result from cached data
        const finalResult = {
          upload: {
            storagePath: uploadResult.data.storagePath,
            fileType: uploadResult.data.fileType,
            fileName: uploadResult.data.originalName,
            fileSize: uploadResult.data.size,
          },
          ocr: {
            rawText: '', // Not available in cache
            cleanedText: '', // Not available in cache
            extractedData: uploadResult.data.structuredResult,
            validation: { isValid: true, missingFields: [] },
          },
          extraction: {
            extractedData: uploadResult.data.structuredResult,
            validation: { isValid: true, missingFields: [] },
            documentType: documentType,
          },
        };
        
        toast.success(uploadResult.data.message || 'Documento já processado! Dados recuperados do cache.');
        onProcessComplete(finalResult);
        console.log(finalResult)
        return; // Exit without processing with Claude
      }
      else {
        console.log('erro ao verificar arquivo ja salvado.', (uploadResult.fromCache && uploadResult.data?.structuredResult))
      }
      console.log('fileType:', (uploadResult as any).data.fileType);
      
      // Determine if we should use multi-prompt processing
      const shouldUseMultiPrompt = (uploadResult as any).data.fileType === 'pdf';
      setUseMultiPrompt(shouldUseMultiPrompt);
      
      // 2. Extract text with OCR
      let extractEndpoint: string;
      let extractResult: any;

      if (shouldUseMultiPrompt) {
        // Use multi-prompt processing
        extractEndpoint = '/api/ocr/extract-claude-multi';
        console.log('Using multi-prompt processing for packing list');
        
        const extractResponse = await fetchJSON(extractEndpoint, {
          method: 'POST',
          body: JSON.stringify({
            storagePath: (uploadResult as any).data.storagePath,
            fileType: (uploadResult as any).data.fileType,
            documentType: documentType,
          }),
          timeout: 850000, // 850 seconds (50 seconds buffer from Vercel Pro 800s limit)
        });

        if (extractResponse.error) {
          throw new Error(extractResponse.error);
        }

        extractResult = extractResponse.data;
        
        // Handle asynchronous processing for large files
        if (extractResult.jobId) {
          console.log('Large file detected, starting polling for job:', extractResult.jobId);
          toast.info('Arquivo grande detectado. Processamento em segundo plano iniciado.');
          extractResult = await pollForResult(extractResult.jobId, extractResult.statusEndpoint);
        }
        
        // Update processing steps from multi-prompt result
        if (extractResult.multiPrompt) {
          setProcessingSteps(extractResult.multiPrompt.progressSteps || []);
          setCurrentStep(extractResult.multiPrompt.totalSteps);
        }
      } else {
        // Use single prompt processing
        extractEndpoint = '/api/ocr/extract-claude';
        console.log('Using single prompt processing');
        
        const extractResponse = await fetchJSON(extractEndpoint, {
          method: 'POST',
          body: JSON.stringify({
            storagePath: (uploadResult as any).data.storagePath,
            fileType: (uploadResult as any).data.fileType,
            documentType: documentType,
          }),
        });

        if (extractResponse.error) {
          throw new Error(extractResponse.error);
        }

        extractResult = extractResponse.data;
      }

      // Prepare final result
      const finalResult = {
        upload: uploadResult as any,
        ocr: {
          ...extractResult,
          multiPrompt: extractResult.multiPrompt || undefined,
        },
        extraction: {
          extractedData: extractResult.extractedData || {},
          validation: extractResult.validation || { isValid: false, missingFields: [] },
          documentType: documentType,
        },
      };

      toast.success(
        shouldUseMultiPrompt 
          ? 'Documento processado com sucesso usando processamento multi-prompt!'
          : 'Documento processado com sucesso!'
      );
      onProcessComplete(finalResult);
    } catch (error) {
      console.error('Processing error:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao processar documento');
    } finally {
      setIsProcessing(false);
      setProcessingStartTime(null);
    }
  };

  return (
    <>
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">Upload de Documento</h3>
          <p className="text-sm text-muted-foreground">
            Faça upload de um documento para extrair informações automaticamente
          </p>
        </div>

        <DocumentTypeSelector
          value={documentType}
          onChange={setDocumentType}
          disabled={isProcessing}
        />

        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
            transition-colors duration-200
            ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
            ${file ? 'bg-muted/50' : 'hover:border-primary/50'}
            ${isProcessing ? 'pointer-events-none opacity-50' : ''}
          `}
        >
          <input {...getInputProps()} />
          
          {file ? (
            <div className="flex items-center justify-center space-x-2">
              <FileText className="h-8 w-8 text-primary" />
              <div className="text-left">
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
                {estimatedProcessingTime && (
                  <p className="text-xs text-yellow-600 dark:text-yellow-400">
                    {estimatedProcessingTime}
                  </p>
                )}
              </div>
              {!isProcessing && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFile();
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {isDragActive
                  ? 'Solte o arquivo aqui'
                  : 'Arraste um arquivo ou clique para selecionar'}
              </p>
              <p className="text-xs text-muted-foreground">
                PDF (máx. 20MB)
              </p>
            </div>
          )}
        </div>

        {/* Show warning for large files */}
        {file && (file.size / 1024 / 1024) > 5 && !isProcessing && (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-start space-x-2">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-600 dark:text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="text-sm">
                <p className="font-medium text-yellow-800 dark:text-yellow-200">
                  Arquivo grande detectado
                </p>
                <p className="text-yellow-700 dark:text-yellow-300">
                  Este arquivo pode levar vários minutos para processar. Por favor, não feche esta página durante o processamento.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Show processing progress for multi-prompt */}
        {isProcessing && useMultiPrompt && processingSteps.length > 0 && (
          <ProcessingProgress
            steps={processingSteps}
            currentStep={currentStep}
            totalSteps={processingSteps.length}
          />
        )}

        {/* Show processing time indicator */}
        {isProcessing && processingStartTime && (
          <div className="text-sm text-muted-foreground text-center">
            Processando há {Math.floor(elapsedTime / 60)}:{(elapsedTime % 60).toString().padStart(2, '0')} minutos...
          </div>
        )}

        <Button
          onClick={handleProcess}
          disabled={!file || !documentType || isProcessing}
          className="w-full"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {useMultiPrompt && processingSteps.length > 0 
                ? `Processando etapa ${currentStep}/${processingSteps.length}...`
                : 'Processando...'}
            </>
          ) : (
            'Processar Documento'
          )}
        </Button>
      </div>
    </Card>
  </>
  );
}