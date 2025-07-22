'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { FileText, Upload, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useDropzone } from 'react-dropzone';
import { DocumentType } from '@/services/documents';
import { getProcessDocumentService } from '@/lib/services/ProcessDocumentService';
import { getProcessService } from '@/lib/services/ProcessService';
import { getNocoDBService } from '@/lib/services/nocodb';
import { NOCODB_TABLES } from '@/config/nocodb-tables';

interface NovoProcessoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: Record<string, any>) => void | Promise<void> | Promise<string>;
}

// Helper function to extract OCR data from various response structures
function extractOCRData(ocrResponse: any) {
  let headerData = {};
  let itemsData = [];
  
  // Log the structure to understand what we're working with
  console.log('OCR Response structure keys:', Object.keys(ocrResponse || {}));
  
  // Handle the multiPrompt structure from the OCR response
  if (ocrResponse?.multiPrompt?.documentType === 'proforma_invoice' && ocrResponse?.multiPrompt?.steps) {
    // This is the structure shown in the logs
    const steps = ocrResponse.multiPrompt.steps;
    if (steps && steps.length > 0) {
      // First step contains header data - might be string or object
      let headerResult = steps[0]?.result;
      if (typeof headerResult === 'string') {
        try {
          headerData = JSON.parse(headerResult);
        } catch (e) {
          console.error('Failed to parse header string:', e);
          // Try to extract JSON from the string
          const jsonMatch = headerResult.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              headerData = JSON.parse(jsonMatch[0]);
            } catch (e2) {
              headerData = {};
            }
          }
        }
      } else {
        headerData = headerResult || {};
      }
      
      // Second step contains items data
      if (steps.length > 1) {
        let itemsResult = steps[1]?.result;
        if (typeof itemsResult === 'string') {
          try {
            itemsData = JSON.parse(itemsResult);
          } catch (e) {
            console.error('Failed to parse items string:', e);
            // Try to extract JSON array from the string
            const jsonMatch = itemsResult.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
              try {
                itemsData = JSON.parse(jsonMatch[0]);
              } catch (e2) {
                itemsData = [];
              }
            }
          }
        } else {
          itemsData = itemsResult || [];
        }
      }
    }
  } else {
    // Fallback to other structures
    if (ocrResponse?.header?.data) {
      headerData = ocrResponse.header.data;
    } else if (ocrResponse?.header) {
      headerData = ocrResponse.header;
    }
    
    if (ocrResponse?.items?.data) {
      itemsData = ocrResponse.items.data;
    } else if (ocrResponse?.items && Array.isArray(ocrResponse.items)) {
      itemsData = ocrResponse.items;
    }
  }
  
  console.log('Extracted header keys:', Object.keys(headerData));
  console.log('Extracted items count:', Array.isArray(itemsData) ? itemsData.length : 0);
  console.log('Header data type:', typeof headerData);
  
  return { headerData, itemsData };
}

export function NovoProcessoModal({
  open,
  onOpenChange,
  onSubmit,
}: NovoProcessoModalProps) {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<'idle' | 'uploading' | 'processing' | 'saving' | 'creating' | 'redirecting'>('idle');
  const [processData, setProcessData] = useState<any>(null);
  const [proformaData, setProformaData] = useState<any>(null);
  const [numeroProcesso, setNumeroProcesso] = useState('');
  
  // Add ref for processing control to prevent double execution
  const processingRef = useRef(false);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setSelectedFile(null);
      setIsProcessing(false);
      setProcessingStep('idle');
      setProcessData(null);
      setProformaData(null);
      setNumeroProcesso('');
      processingRef.current = false; // Reset processing ref
    }
  }, [open]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        setSelectedFile(file);
      } else {
        toast.error('Por favor, selecione um arquivo PDF de Proforma Invoice');
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

  const handleProcessFile = async () => {
    // Check if already processing using ref
    if (processingRef.current) return;
    
    if (!selectedFile) {
      toast.error('Selecione um arquivo para processar');
      return;
    }

    // Set processing immediately with ref
    processingRef.current = true;
    setIsProcessing(true);
    setProcessingStep('uploading');

    try {
      // Step 1: Upload file
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('documentType', DocumentType.PROFORMA_INVOICE);

      const uploadResponse = await fetch('/api/ocr/upload', {
        method: 'POST',
        body: formData
      });

      const uploadResult = await uploadResponse.json();
      
      if (!uploadResponse.ok || uploadResult.error) {
        throw new Error(uploadResult.error || 'Upload failed');
      }

      setProcessingStep('processing');

      // Step 2: Process with OCR
      const { storagePath, fileType, fileHash } = uploadResult.data;
      
      const extractResponse = await fetch('/api/ocr/extract-claude-multi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storagePath,
          fileType,
          documentType: DocumentType.PROFORMA_INVOICE
        })
      });

      const processResult = await extractResponse.json();
      
      if (!extractResponse.ok || processResult.error) {
        throw new Error(processResult.error || 'Processing failed');
      }

      // Extract proforma data from the correct structure
      console.log('OCR Result structure:', processResult.data);
      
      const extractedData = extractOCRData(processResult.data);
      let proformaInfo = extractedData.headerData;
      let proformaItems = extractedData.itemsData;
      
      // Ensure proformaInfo is an object, not a string
      if (typeof proformaInfo === 'string') {
        try {
          proformaInfo = JSON.parse(proformaInfo);
        } catch (e) {
          console.error('Failed to parse proformaInfo string:', e);
          // Try to extract JSON from the string
          const jsonMatch = proformaInfo.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              proformaInfo = JSON.parse(jsonMatch[0]);
            } catch (e2) {
              console.error('Failed to extract JSON from proformaInfo:', e2);
              proformaInfo = {};
            }
          }
        }
      }
      
      console.log('Extracted proformaInfo:', proformaInfo);
      console.log('Extracted proformaItems:', proformaItems);
      
      // IMPORTANT: Check if we got the data from the multiPrompt structure
      if (processResult.data?.multiPrompt?.steps) {
        const steps = processResult.data.multiPrompt.steps;
        if (steps.length > 0 && steps[0].result) {
          // Parse if it's a string
          if (typeof steps[0].result === 'string') {
            try {
              proformaInfo = JSON.parse(steps[0].result);
            } catch (e) {
              console.error('Error parsing header result:', e);
              proformaInfo = steps[0].result;
            }
          } else {
            proformaInfo = steps[0].result;
          }
          console.log('Using multiPrompt header data:', proformaInfo);
        }
        if (steps.length > 1 && steps[1].result) {
          // Parse if it's a string
          if (typeof steps[1].result === 'string') {
            try {
              proformaItems = JSON.parse(steps[1].result);
            } catch (e) {
              console.error('Error parsing items result:', e);
              proformaItems = steps[1].result;
            }
          } else {
            proformaItems = steps[1].result;
          }
          console.log('Using multiPrompt items data:', proformaItems);
        }
      }
      
      // Store in state for UI display
      setProformaData(proformaInfo);

      // Save proforma invoice to database first
      let savedDocumentId = null;
      try {
        const proformaDataToSave = {
          header: proformaInfo,
          items: proformaItems
        };
        
        const saveResponse = await fetch('/api/documents/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documentType: DocumentType.PROFORMA_INVOICE,
            extractedData: proformaDataToSave,
            metadata: {
              fileHash: fileHash,
              originalFileName: uploadedFile?.name || 'proforma_invoice.pdf',
              storagePath: '' // Will be filled by backend if needed
            }
          })
        });
        
        const saveResult = await saveResponse.json();
        if (saveResult.success) {
          savedDocumentId = saveResult.documentId;
          console.log('Proforma Invoice salva com sucesso:', savedDocumentId);
        } else {
          console.error('Erro ao salvar Proforma Invoice:', saveResult.error);
        }
      } catch (error) {
        console.error('Erro ao salvar Proforma Invoice:', error);
      }

      // Generate process number from proforma data - USING THE EXTRACTED DATA
      console.log('Generating process number with proformaInfo:', proformaInfo);
      const invoiceNumber = proformaInfo?.invoice_number || proformaInfo?.proforma_number || 'XXXX';
      const invoiceDate = proformaInfo?.invoice_date || proformaInfo?.date || new Date().toISOString();
      
      console.log('Invoice number extraction:', {
        proformaInfoType: typeof proformaInfo,
        proformaInfoKeys: Object.keys(proformaInfo || {}),
        fromInfo: proformaInfo?.invoice_number,
        fromProforma: proformaInfo?.proforma_number,
        final: invoiceNumber
      });
      
      // Parse date from DD/MM/YYYY format
      let date;
      if (invoiceDate && invoiceDate.includes('/')) {
        // Brazilian format: DD/MM/YYYY
        const [day, month, year] = invoiceDate.split('/');
        date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      } else {
        // Try standard parsing
        date = new Date(invoiceDate);
      }
      
      // Validate date
      if (isNaN(date.getTime())) {
        console.warn('Invalid date, using current date:', invoiceDate);
        date = new Date();
      }
      
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const processNumber = `IMP-${invoiceNumber}`;
      
      console.log('Process number generation:', {
        invoiceDate,
        parsedDate: date,
        month,
        year,
        processNumber
      });
      
      setNumeroProcesso(processNumber);

      // Check for duplicate invoice before proceeding
      const nocodb = getNocoDBService();
      try {
        const existingProcesses = await nocodb.find(NOCODB_TABLES.PROCESSOS_IMPORTACAO, {
          where: `(invoiceNumber,eq,${invoiceNumber})`,
          limit: 1
        });

        if (existingProcesses.list && existingProcesses.list.length > 0) {
          const existingProcess = existingProcesses.list[0];
          const confirmDuplicate = window.confirm(
            `⚠️ ATENÇÃO: Já existe um processo com a invoice ${invoiceNumber}!\n\n` +
            `Processo existente: ${existingProcess.numero_processo}\n` +
            `Empresa: ${existingProcess.empresa}\n` +
            `Data de início: ${new Date(existingProcess.data_inicio).toLocaleDateString('pt-BR')}\n\n` +
            `Deseja criar um novo processo mesmo assim?`
          );
          
          if (!confirmDuplicate) {
            setIsProcessing(false);
            setProcessingStep('idle');
            toast.warning('Criação de processo cancelada - Invoice já existe no sistema');
            return;
          }
        }
      } catch (error) {
        console.error('Erro ao verificar duplicidade:', error);
        // Continue mesmo se houver erro na verificação
      }

      // Create process data with enhanced fields from proforma
      console.log('Creating process with proforma data:', {
        invoiceNumber,
        empresa: proformaInfo?.contracted_company,
        valor: proformaInfo?.total_price
      });
      
      const newProcessData = {
        numero_processo: processNumber,
        invoiceNumber: invoiceNumber,
        data_inicio: format(new Date(), 'yyyy-MM-dd'),
        data_conclusao: null,
        status: 'active',
        etapa: 'solicitado', // Default Kanban stage
        empresa: proformaInfo?.contracted_company || proformaInfo?.seller || proformaInfo?.exporter || 'A definir',
        cnpj_empresa: proformaInfo?.seller_tax_id || '',
        responsavel: 'Sistema',
        email_responsavel: proformaInfo?.contracted_email || '',
        valor_total_estimado: proformaInfo?.total_price || proformaInfo?.total_amount || proformaInfo?.total || 0,
        moeda: proformaInfo?.currency || 'USD'
      };

      setProcessData(newProcessData);

      // Save process to database and get the created process ID
      const createdProcessId = await onSubmit(newProcessData);

      // Link the proforma invoice to the process using the ID, not the number
      try {
        const processDocService = getProcessDocumentService();
        const linkResult = await processDocService.linkDocumentToProcess(createdProcessId, fileHash);
        
        if (linkResult.success) {
          console.log(`Proforma Invoice vinculada ao processo ${processNumber}`);
        } else {
          console.error('Erro ao vincular Proforma Invoice ao processo:', linkResult.error);
        }
      } catch (error) {
        console.error('Erro ao vincular documento ao processo:', error);
        // Don't break the flow, just log the error
      }

      setProcessingStep('redirecting');
      
      // If already saved, just close modal and show success
      if (savedDocumentId) {
        toast.success('Processo criado com sucesso!');
        setTimeout(() => {
          onOpenChange(false);
          router.push('/processos');
        }, 1500);
      }

    } catch (error) {
      console.error('Processing error:', error);
      toast.error(`Erro ao processar: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      setIsProcessing(false);
      setProcessingStep('idle');
      processingRef.current = false; // Reset ref
    }
  };

  const getStepMessage = () => {
    switch (processingStep) {
      case 'uploading':
        return 'Fazendo upload do arquivo...';
      case 'processing':
        return 'Processando Proforma Invoice com OCR...';
      case 'saving':
        return 'Salvando dados da Proforma Invoice...';
      case 'creating':
        return 'Criando processo de importação...';
      case 'redirecting':
        return 'Processo criado! Redirecionando...';
      default:
        return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!bg-zinc-900 max-w-2xl border-zinc-800">
        <DialogHeader>
          <DialogTitle>Novo Processo de Importação</DialogTitle>
          <DialogDescription>
            Faça upload de uma Proforma Invoice para criar automaticamente um processo de importação
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          {/* Upload Area */}
          {!isProcessing && (
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                transition-all duration-200
                ${isDragActive ? 'border-primary bg-primary/10' : 'border-zinc-700 hover:border-zinc-600'}
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
                      {isDragActive ? 'Solte o arquivo aqui' : 'Arraste uma Proforma Invoice'}
                    </p>
                    <p className="text-sm text-zinc-400 mt-1">
                      ou clique para selecionar (PDF, máx. 20MB)
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Processing Status */}
          {isProcessing && (
            <Card className="p-6 bg-zinc-800 border-zinc-700">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-sm font-medium">{getStepMessage()}</span>
                </div>
                
                {proformaData && (
                  <div className="space-y-2 pt-4 border-t border-zinc-700">
                    <h4 className="text-sm font-medium text-zinc-300">Dados extraídos:</h4>
                    <div className="text-xs space-y-1">
                      {proformaData.invoice_number && (
                        <p>Invoice: <span className="text-zinc-400">{proformaData.invoice_number}</span></p>
                      )}
                      {proformaData.contracted_company && (
                        <p>Empresa: <span className="text-zinc-400">{proformaData.contracted_company}</span></p>
                      )}
                      {proformaData.contracted_email && (
                        <p>Email: <span className="text-zinc-400">{proformaData.contracted_email}</span></p>
                      )}
                      {proformaData.total_price && (
                        <p>Valor Total: <span className="text-zinc-400">{proformaData.currency || 'USD'} {proformaData.total_price}</span></p>
                      )}
                      {proformaData.load_port && (
                        <p>Porto Embarque: <span className="text-zinc-400">{proformaData.load_port}</span></p>
                      )}
                      {proformaData.destination && (
                        <p>Destino: <span className="text-zinc-400">{proformaData.destination}</span></p>
                      )}
                      {numeroProcesso && (
                        <p className="pt-2 font-medium">
                          Número do Processo: <span className="text-primary">{numeroProcesso}</span>
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Info Message */}
          <div className="flex items-start gap-2 p-3 bg-blue-950/20 rounded-lg border border-blue-900">
            <AlertCircle className="h-4 w-4 text-blue-400 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-300">Como funciona:</p>
              <ol className="text-xs text-blue-200 mt-1 space-y-1 list-decimal list-inside">
                <li>Faça upload da Proforma Invoice</li>
                <li>O sistema extrai automaticamente os dados do documento</li>
                <li>Um processo de importação é criado com as informações</li>
                <li>Você será redirecionado para salvar os dados no sistema</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mt-6">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            Cancelar
          </Button>
          <Button
            onClick={() => {
              // Use setTimeout to avoid multiple clicks
              setTimeout(() => {
                handleProcessFile();
              }, 0);
            }}
            disabled={!selectedFile || isProcessing || processingRef.current}
            className="bg-primary hover:bg-primary/90"
          >
            <FileText className="h-4 w-4 mr-2" />
            {isProcessing ? 'Processando...' : 'Processar e Criar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}