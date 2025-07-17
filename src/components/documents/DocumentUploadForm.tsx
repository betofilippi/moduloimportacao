'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { DocumentType, getAllDocumentTypeInfos, isFormatSupported } from '@/services/documents';
import { DocumentTypeSelector } from './DocumentTypeSelector';
import { toast } from 'sonner';

interface DocumentUploadFormProps {
  onProcessComplete?: (results: any, documentType: DocumentType, isFromCache: boolean) => void;
  allowedTypes?: DocumentType[];
  defaultType?: DocumentType;
  className?: string;
  onClear?: () => void;
  hasProcessedData?: boolean;
}

export function DocumentUploadForm({
  onProcessComplete,
  allowedTypes,
  defaultType,
  className = '',
  onClear,
  hasProcessedData = false
}: DocumentUploadFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<DocumentType | ''>(defaultType || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Get available document types
  const allTypes = getAllDocumentTypeInfos();
  const availableTypes = allowedTypes 
    ? allTypes.filter(type => allowedTypes.includes(type.value))
    : allTypes;

  const handleFileSelect = (file: File) => {
    // Validate file type if document type is selected
    if (documentType) {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (fileExtension && !isFormatSupported(documentType, fileExtension)) {
        const typeInfo = availableTypes.find(t => t.value === documentType);
        toast.error(`Formato de arquivo não suportado para ${typeInfo?.label}. Formatos aceitos: ${typeInfo?.supportedFormats.join(', ')}`);
        return;
      }
    }

    setSelectedFile(file);
    
    // Auto-detect document type based on filename if not selected
    if (!documentType) {
      const detectedType = detectDocumentType(file.name);
      if (detectedType) {
        setDocumentType(detectedType);
        toast.info(`Tipo de documento detectado automaticamente: ${availableTypes.find(t => t.value === detectedType)?.label}`);
      }
    }
  };

  const detectDocumentType = (fileName: string): DocumentType | null => {
    const lowercaseName = fileName.toLowerCase();
    
    if (lowercaseName.includes('packing') || lowercaseName.includes('list')) {
      return DocumentType.PACKING_LIST;
    }
    if (lowercaseName.includes('proforma')) {
      return DocumentType.PROFORMA_INVOICE;
    }
    if (lowercaseName.includes('invoice') || lowercaseName.includes('commercial')) {
      return DocumentType.COMMERCIAL_INVOICE;
    }
    if (lowercaseName.includes('swift') || lowercaseName.includes('mt103') || lowercaseName.includes('mt 103')) {
      return DocumentType.SWIFT;
    }

    if (lowercaseName.includes('di') || lowercaseName.includes('declaracao') || lowercaseName.includes('importacao')) {
      return DocumentType.DI;
    }
    if (lowercaseName.includes('numerario') || lowercaseName.includes('cambio')) {
      return DocumentType.NUMERARIO;
    }
    
    return null;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleProcess = async () => {
    if (!selectedFile || !documentType) {
      toast.error('Selecione um arquivo e tipo de documento');
      return;
    }

    setIsProcessing(true);

    try {
      // Use existing OCR APIs that work with Claude/Google Vision
      
      // Step 1: Upload file
      const uploadFormData = new FormData();
      uploadFormData.append('file', selectedFile);
      uploadFormData.append('documentType', documentType);

      const uploadResponse = await fetch('/api/ocr/upload', {
        method: 'POST',
        body: uploadFormData
      });

      const uploadResult = await uploadResponse.json();
      console.log('UPLOAD COM TRUE', uploadResult)
      if (!uploadResponse.ok || uploadResult.error) {
        throw new Error(uploadResult.error || 'Upload failed');
      }

      // Check if document came from cache
      if (uploadResult.fromCache && uploadResult.data?.structuredResult) {
        console.log('Document found in cache, using cached data');
        
        // Convert cached data to expected format
        const result = {
          success: true,
          data: uploadResult.data.structuredResult,
          hashFile: uploadResult.data.fileHash,
          metadata: {
            documentType,
            processingTime: Date.now(),
            fromCache: true,
            cacheMessage: uploadResult.data.message || 'Documento já processado anteriormente'
          }
        };

        toast.success(uploadResult.data.message || 'Documento já processado! Dados recuperados do cache.');
        onProcessComplete?.(result, documentType, true);
        return; // Exit without processing with Claude
      }
    
      const { storagePath, fileType } = uploadResult.data;

      // Step 2: Process with appropriate endpoint based on document type
      let processResult;
      
      // Use multi-prompt for packing list, commercial invoice, proforma invoice, swift, di, and numerario PDFs
      if ((documentType === DocumentType.PACKING_LIST || 
           documentType === DocumentType.COMMERCIAL_INVOICE || 
           documentType === DocumentType.PROFORMA_INVOICE ||
           documentType === DocumentType.SWIFT ||
           documentType === DocumentType.DI ||
           documentType === DocumentType.NUMERARIO) && fileType === '.pdf') {
        // Use multi-prompt Claude processing
        const extractResponse = await fetch('/api/ocr/extract-claude-multi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            storagePath,
            fileType,
            documentType
          })
        });

        processResult = await extractResponse.json();
        
        if (!extractResponse.ok || processResult.error) {
          throw new Error(processResult.error || 'Processing failed');
        }
      } else {
        // Use standard OCR processing for other types
        const extractResponse = await fetch('/api/ocr/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            storagePath,
            fileType,
            documentType
          })
        });

        processResult = await extractResponse.json();
        
        if (!extractResponse.ok || processResult.error) {
          throw new Error(processResult.error || 'Processing failed');
        }
      }

      // Convert to new format for compatibility
      const result = {
        success: true,
        data: processResult.data,
        hashFile: uploadResult.data.fileHash, // Add the file hash from upload
        metadata: {
          documentType,
          processingTime: Date.now(),
          totalSteps: processResult.data?.multiPrompt?.totalSteps || 1
        }
      };

      toast.success('Documento processado com sucesso!');
      onProcessComplete?.(result, documentType, false);

    } catch (error) {
      console.error('Processing error:', error);
      toast.error(`Erro no processamento: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setDocumentType(defaultType || '');
    onClear?.(); // Chama callback para limpar dados processados
  };

  const canProcess = selectedFile && documentType && !isProcessing;

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Upload de Documentos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Warning if there are processed data */}
        {hasProcessedData && !selectedFile && (
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  Dados processados anteriormente detectados
                </p>
                <p className="text-amber-700 dark:text-amber-300 mt-1">
                  Use o botão "Limpar" após selecionar um arquivo para remover os dados anteriores.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Document Type Selector */}
        <DocumentTypeSelector
          value={documentType}
          onChange={setDocumentType}
          availableTypes={availableTypes}
          disabled={isProcessing}
          className=''
        />

        {/* File Upload Area */}
        <div
          className={`
            border-2 border-dashed rounded-lg p-6 text-center transition-colors
            ${dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
            ${selectedFile ? 'border-green-500 bg-green-50' : ''}
          `}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          {selectedFile ? (
            <div className="space-y-2">
              <CheckCircle className="h-8 w-8 text-green-500 mx-auto" />
              <p className="font-medium text-green-700">{selectedFile.name}</p>
              <p className="text-sm text-muted-foreground">
                Tamanho: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
              {documentType && (
                <p className="text-sm text-blue-600">
                  Tipo: {availableTypes.find(t => t.value === documentType)?.label}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="h-8 w-8 text-muted-foreground mx-auto" />
              <p className="text-sm">
                Arraste um arquivo aqui ou{' '}
                <label className="text-primary cursor-pointer hover:underline">
                  clique para selecionar
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileInput}
                    accept={documentType ? 
                      availableTypes.find(t => t.value === documentType)?.supportedFormats
                        .map(ext => `.${ext}`).join(',') : 
                      '*'
                    }
                    disabled={isProcessing}
                  />
                </label>
              </p>
              {documentType && (
                <p className="text-xs text-muted-foreground">
                  Formatos aceitos: {availableTypes.find(t => t.value === documentType)?.supportedFormats.join(', ')}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Processing Options */}
        {documentType && (
          <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
            <p className="font-medium mb-1">Configurações de Processamento:</p>
            <ul className="text-xs space-y-1">
              <li>• Validação automática de dados</li>
              {availableTypes.find(t => t.value === documentType)?.hasMultiStep && (
                <li>• Processamento em múltiplas etapas</li>
              )}
              <li>• Detecção automática de inconsistências</li>
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button 
            onClick={handleProcess} 
            disabled={!canProcess}
            className="flex-1"
          >
            {isProcessing ? 'Processando...' : 'Processar Documento'}
          </Button>
          
          {selectedFile && (
            <Button 
              variant="outline" 
              onClick={handleReset}
              disabled={isProcessing}
            >
              {hasProcessedData ? 'Limpar Tudo' : 'Limpar'}
            </Button>
          )}
        </div>

        {/* Validation Message */}
        {selectedFile && documentType && (
          <div className="flex items-start gap-2 text-sm">
            {isFormatSupported(documentType, selectedFile.name.split('.').pop()?.toLowerCase() || '') ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <span className="text-green-700">Arquivo compatível com o tipo selecionado</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5" />
                <span className="text-orange-700">
                  Formato de arquivo pode não ser ideal para este tipo de documento
                </span>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}