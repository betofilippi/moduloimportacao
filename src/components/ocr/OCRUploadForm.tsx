'use client';

import React, { useState, useCallback } from 'react';
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

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
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
  };

  const handleProcess = async () => {
    if (!file || !documentType) {
      toast.error('Por favor, selecione um arquivo e o tipo de documento');
      return;
    }

    setIsProcessing(true);
    setProcessingSteps([]);
    setCurrentStep(0);

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
        });

        if (extractResponse.error) {
          throw new Error(extractResponse.error);
        }

        extractResult = extractResponse.data;
        
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

        {/* Show processing progress for multi-prompt */}
        {isProcessing && useMultiPrompt && processingSteps.length > 0 && (
          <ProcessingProgress
            steps={processingSteps}
            currentStep={currentStep}
            totalSteps={processingSteps.length}
          />
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