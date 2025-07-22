'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { DocumentUploadForm } from '@/components/documents/DocumentUploadForm';
import { OCRResultsViewer } from '@/components/ocr/OCRResultsViewer';
import { SaveToDatabaseCard } from '@/components/ocr/SaveToDatabaseCard';
import { DocumentType } from '@/services/documents';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { FileText, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { useDocumentSave } from '@/hooks/useDocumentSave';
import { getDocumentCacheService } from '@/lib/services/DocumentCacheService';
import { getNocoDBService } from '@/lib/services/nocodb';
import { getProcessDocumentService } from '@/lib/services/ProcessDocumentService';
import { getProcessService } from '@/lib/services/ProcessService';
import { NOCODB_TABLES } from '@/config/nocodb-tables';

function OCRPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const documentTypeParam = searchParams.get('documentType');
  const fromParam = searchParams.get('from');
  const stateParam = searchParams.get('state');
  const processIdParam = searchParams.get('processId');
  const fromUnknownParam = searchParams.get('fromUnknown');
  const invoiceNumberParam = searchParams.get('invoiceNumber');
  
  const [processingResults, setProcessingResults] = useState<any>(null);
  const [selectedDocumentType, setSelectedDocumentType] = useState<DocumentType | null>(
    documentTypeParam as DocumentType || null
  );
  const [processedData, setProcessedData] = useState<any>(null);
  const [originalData, setOriginalData] = useState<any>(null);
  const [lastSaveTime, setLastSaveTime] = useState<Date | undefined>();
  const [isAlreadySaved, setIsAlreadySaved] = useState(false);
  const [currentFileHash, setCurrentFileHash] = useState<string | undefined>();
  const [resetting, setResetting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [pageOrigin, setPageOrigin] = useState<string | null>(fromParam);
  const [processId, setProcessId] = useState<string | null>(processIdParam);
  const [initialStateData, setInitialStateData] = useState<any>(null);
  
  // Hook para salvar no banco de dados
  const { 
    saveDI, 
    saveCommercialInvoice, 
    savePackingList,
    saveProformaInvoice,
    saveSwift,
    saveNumerario,
    saveNotaFiscal,
    saveBL,
    saveContratoCambio,
    updateDI,
    updateCommercialInvoice,
    updatePackingList,
    updateProformaInvoice,
    updateSwift,
    updateNumerario,
    updateNotaFiscal,
    updateBL,
    updateContratoCambio,
    resetDocumentData,
    saving, 
    error, 
    lastSaveResult 
  } = useDocumentSave();

  const handleProcessComplete = async (results: any, documentType: DocumentType, isAlreadySavedInDB: boolean) => {
    setProcessingResults(results);
    setSelectedDocumentType(documentType);
    console.log(results, documentType, isAlreadySavedInDB)
    
    // Extract file hash from results
    const fileHash = results.hashFile;
    setCurrentFileHash(fileHash);
    
    // Check if document is already saved in database
    // isAlreadySavedInDB is true when document has status 'completo' (already saved in NocoDB)
    setIsAlreadySaved(isAlreadySavedInDB || results.isAlreadySaved || false);
    
    if (results.success) {
      toast.success('Documento processado com sucesso!');
    } else {
      toast.error(`Erro no processamento: ${results.error}`);
    }
  };

  const handleSave = (editedData: any) => {
    // Preserva a estrutura original dos dados e apenas atualiza os campos editados
    if (!processingResults?.data) {
      toast.error('Dados originais não encontrados');
      return;
    }

    // Cria uma cópia profunda dos dados originais
    let updatedResults = JSON.parse(JSON.stringify(processingResults));
    
    // Atualiza os dados dentro da estrutura original
    if (updatedResults.data) {
      // Se tem structuredResult, atualiza dentro dele
      if (updatedResults.data.structuredResult) {
        if (editedData.header) updatedResults.data.structuredResult.header = editedData.header;
        if (editedData.items) updatedResults.data.structuredResult.items = editedData.items;
        if (editedData.taxInfo) updatedResults.data.structuredResult.taxInfo = editedData.taxInfo;
      }
      // Se tem multiPrompt com steps
      else if (updatedResults.data.multiPrompt?.steps) {
        // Preserva toda a estrutura multiPrompt mas atualiza os dados nos steps
        const steps = updatedResults.data.multiPrompt.steps;
        
        // Atualiza step 1 (header)
        const step1 = steps.find((s: any) => s.step === 1);
        if (step1 && editedData.header) {
          step1.result = editedData.header;
        }
        
        // Atualiza step 2 (items)
        const step2 = steps.find((s: any) => s.step === 2);
        if (step2 && editedData.items) {
          step2.result = editedData.items;
        }
        
        // Atualiza step 3 (taxInfo) se existir
        const step3 = steps.find((s: any) => s.step === 3);
        if (step3 && editedData.taxInfo) {
          step3.result = editedData.taxInfo;
        }
      }
      // Se é formato de cache (DI vindo do banco)
      else if ('header' in updatedResults.data && 'items' in updatedResults.data && 'taxInfo' in updatedResults.data) {
        if (editedData.header) updatedResults.data.header = editedData.header;
        if (editedData.items) updatedResults.data.items = editedData.items;
        if (editedData.taxInfo) updatedResults.data.taxInfo = editedData.taxInfo;
      }
      // Outros formatos
      else {
        // Atualiza diretamente no data
        if (editedData.header) updatedResults.data.header = editedData.header;
        if (editedData.items) updatedResults.data.items = editedData.items;
        if (editedData.taxInfo) updatedResults.data.taxInfo = editedData.taxInfo;
        if (editedData.diInfo) updatedResults.data.diInfo = editedData.diInfo;
      }
    }
    
    // Atualiza os estados
    setProcessingResults(updatedResults);
    
    // Extrai os dados processados da mesma forma que o useEffect faz
    let dataToSet;
    if (updatedResults.data.structuredResult) {
      dataToSet = updatedResults.data.structuredResult;
    } else if (updatedResults.data.multiPrompt) {
      dataToSet = updatedResults.data;
    } else {
      dataToSet = updatedResults.data;
    }
    
    setProcessedData(dataToSet);
    
    // Check if data has changed
    if (originalData) {
      const changed = JSON.stringify(dataToSet) !== JSON.stringify(originalData);
      setHasChanges(changed);
    }
    
    toast.success('Edições salvas localmente!');
  };

  const handleSaveToDatabase = async () => {
    if (!selectedDocumentType || !processedData) {
      toast.error('Nenhum dado para salvar');
      return;
    }

    let result;
    
    switch(selectedDocumentType) {
      case 'commercial_invoice':
        console.log(processedData)  
      // Extrai dados específicos da Commercial Invoice
        const commercialInvoiceData = {
          
          header: processedData.header?.data || processedData.header || {},
          items: processedData.items?.data || processedData.items || 
                 processedData.containers?.data || processedData.containers || []
        };
        result = await saveCommercialInvoice(commercialInvoiceData, { fileHash: currentFileHash });
        break;
        
      case 'di':
        // Extrai dados específicos da DI
        const diData = {
          header: processedData.header?.data || processedData.header || {},
          items: processedData.items?.data || processedData.items || [],
          taxInfo: processedData.taxInfo?.data || processedData.taxInfo || []
        };
        result = await saveDI(diData, { fileHash: currentFileHash });
        break;
        
      case 'packing_list':
        // Packing List pode ter estrutura diferente
        const packingListData = {
          header: processedData.header?.data || processedData.header || {},
          containers: processedData.containers?.data || processedData.containers || [],
          items_por_container: processedData.items?.data || processedData.items || []
        };
        result = await savePackingList(packingListData, { fileHash: currentFileHash });
        break;
        
      case 'proforma_invoice':
        const proformaData = {
          header: processedData.header?.data || processedData.header || {},
          items: processedData.items?.data || processedData.items || 
                  processedData.containers?.data || processedData.containers || []
        };
        result = await saveProformaInvoice(proformaData, { fileHash: currentFileHash });
        break;
        
      case 'swift':
        // Swift tem estrutura mais simples
        const swiftData = processedData.header?.data || processedData.header || processedData;
        result = await saveSwift(swiftData, { fileHash: currentFileHash });
        break;
        
      case 'numerario':
        const numerarioData = {
          diInfo: processedData.diInfo?.data || processedData.diInfo || {},
          header: processedData.header?.data || processedData.header || {},
          items: processedData.items?.data || processedData.items || []
        };
        result = await saveNumerario(numerarioData, { fileHash: currentFileHash });
        break;
        
      case 'nota_fiscal':
        const notaFiscalData = {
          header: processedData.header?.data || processedData.header || {},
          items: processedData.items?.data || processedData.items || []
        };
        result = await saveNotaFiscal(notaFiscalData, { fileHash: currentFileHash });
        break;
        
      case 'bl':
        const blData = {
          header: processedData.header?.data || processedData.header || {},
          containers: processedData.containers?.data || processedData.containers || []
        };
        result = await saveBL(blData, { fileHash: currentFileHash });
        break;
        
      case 'contrato_cambio':
        // Contrato de Câmbio tem dados no header
        const contratoCambioData = processedData.header?.data || processedData.header || processedData;
        result = await saveContratoCambio(contratoCambioData, { fileHash: currentFileHash });
        break;
        
      default:
        toast.error(`Tipo de documento não suportado: ${selectedDocumentType}`);
        return;
    }
    
    if (result.success) {
      setLastSaveTime(new Date());
      setIsAlreadySaved(true);
      setHasChanges(false);
      setOriginalData(processedData); // Update original data after save
      
      // Atualizar status no NocoDB para 'completo'
      if (currentFileHash) {
        try {
          // Buscar o registro de upload pelo hash
          const nocodb = getNocoDBService();
          const uploadRecords = await nocodb.find(NOCODB_TABLES.DOCUMENT_UPLOADS, {
            where: `(hashArquivo,eq,${currentFileHash})`,
            limit: 1
          });
          
          if (uploadRecords.list && uploadRecords.list.length > 0) {
            const uploadRecord = uploadRecords.list[0];
            // Atualizar o status usando o ID real do registro
            const cacheService = getDocumentCacheService();
            await cacheService.updateUploadStatus(
              uploadRecord.Id, 
              result.documentId || '', 
              'completo'
            );
            console.log(`Status atualizado para 'completo' - Upload ID: ${uploadRecord.Id}`);
          }
        } catch (error) {
          console.error('Erro ao atualizar status de upload:', error);
          // Não exibir erro ao usuário pois o salvamento principal foi bem-sucedido
        }
      }
      
      // Link document to process with metadata if processId exists
      if (processId && currentFileHash && selectedDocumentType) {
        try {
          const processDocService = getProcessDocumentService();
          const linkResult = await processDocService.linkDocumentWithMetadata(
            processId, 
            currentFileHash,
            selectedDocumentType,
            result.documentId || ''
          );
          
          if (linkResult.success) {
            console.log(`Documento vinculado ao processo ${processId} com metadados`);
          } else {
            console.error('Erro ao vincular documento ao processo:', linkResult.error);
          }
        } catch (error) {
          console.error('Erro ao vincular documento ao processo:', error);
          // Don't break the main flow, just log the error
        }
      }
      
      // If coming from process creation, update process with proforma details
      if (fromParam === 'new_process' && processId && selectedDocumentType === 'proforma_invoice') {
        try {
          const processService = getProcessService();
          const updateResult = await processService.updateProcessWithProformaDetails(processId, processedData);
          
          if (updateResult.success) {
            console.log('Processo atualizado com detalhes da Proforma Invoice');
          } else {
            console.error('Erro ao atualizar processo:', updateResult.error);
          }
        } catch (error) {
          console.error('Erro ao atualizar processo com detalhes da proforma:', error);
        }
        
        // Redirect back to process page after a short delay
        toast.success('Documento salvo e vinculado ao processo!');
        setTimeout(() => {
          router.push('/processos');
        }, 2000);
      }
    }
  };
  
  const handleUpdateToDatabase = async () => {
    if (!selectedDocumentType || !processedData || !currentFileHash) {
      toast.error('Dados insuficientes para atualização');
      return;
    }

    // Extrai os dados da estrutura salva (pode estar em structuredResult ou direto)
    let extractedData = processedData;
    if (processedData.structuredResult) {
      extractedData = processedData.structuredResult;
    }

    let result;
    
    switch(selectedDocumentType) {
      case 'commercial_invoice':
        const commercialInvoiceData = {
          header: extractedData.header || {},
          items: extractedData.items || extractedData.containers || []
        };
        result = await updateCommercialInvoice(commercialInvoiceData, currentFileHash);
        break;
        
      case 'di':
        const diData = {
          header: extractedData.header || {},
          items: extractedData.items || [],
          taxInfo: extractedData.taxInfo || []
        };
        result = await updateDI(diData, currentFileHash);
        break;
        
      case 'packing_list':
        const packingListData = {
          header: extractedData.header || {},
          containers: extractedData.containers || [],
          items_por_container: extractedData.items || []
        };
        result = await updatePackingList(packingListData, currentFileHash);
        break;
        
      case 'proforma_invoice':
        const proformaData = {
          header: extractedData.header || {},
          items: extractedData.items || extractedData.containers || []
        };
        result = await updateProformaInvoice(proformaData, currentFileHash);
        break;
        
      case 'swift':
        const swiftData = extractedData.header || extractedData;
        result = await updateSwift(swiftData, currentFileHash);
        break;
        
      case 'numerario':
        const numerarioData = {
          diInfo: extractedData.diInfo || {},
          header: extractedData.header || {},
          items: extractedData.items || []
        };
        result = await updateNumerario(numerarioData, currentFileHash);
        break;
        
      case 'nota_fiscal':
        const notaFiscalData = {
          header: extractedData.header || {},
          items: extractedData.items || []
        };
        result = await updateNotaFiscal(notaFiscalData, currentFileHash);
        break;
        
      case 'bl':
        const blData = {
          header: extractedData.header || {},
          containers: extractedData.containers || []
        };
        result = await updateBL(blData, currentFileHash);
        break;
        
      case 'contrato_cambio':
        const contratoCambioData = extractedData.header?.data || extractedData.header || extractedData;
        result = await updateContratoCambio(contratoCambioData, currentFileHash);
        break;
        
      default:
        toast.error(`Tipo de documento não suportado para atualização: ${selectedDocumentType}`);
        return;
    }
    
    if (result.success) {
      setLastSaveTime(new Date());
      setHasChanges(false);
      setOriginalData(processedData); // Update original data after successful update
      
      // Link document to process if processId exists (in case of updates)
      if (processId && currentFileHash) {
        try {
          const processDocService = getProcessDocumentService();
          const linkResult = await processDocService.linkDocumentToProcess(processId, currentFileHash);
          
          if (linkResult.success) {
            console.log(`Documento atualizado e vinculado ao processo ${processId}`);
          } else {
            console.error('Erro ao vincular documento atualizado ao processo:', linkResult.error);
          }
        } catch (error) {
          console.error('Erro ao vincular documento ao processo:', error);
          // Don't break the main flow, just log the error
        }
      }
    }
  };

  const handleClearUI = () => {
    // Clear UI state only - does not touch database
    setProcessingResults(null);
    setProcessedData(null);
    setOriginalData(null);
    setSelectedDocumentType(null);
    setCurrentFileHash(undefined);
    setIsAlreadySaved(false);
    setLastSaveTime(undefined);
    setHasChanges(false);
    toast.info('Interface limpa. Pronto para processar novo documento.');
  };

  const handleReset = async () => {
    // Clear UI state immediately for better responsiveness
    setProcessingResults(null);
    setProcessedData(null);
    setOriginalData(null);
    setSelectedDocumentType(null);
    setCurrentFileHash(undefined);
    setIsAlreadySaved(false);
    setLastSaveTime(undefined);
    setHasChanges(false);

    // If there's a file hash and document type, attempt to reset backend data
    if (currentFileHash && selectedDocumentType) {
      setResetting(true);
      try {
        const result = await resetDocumentData(currentFileHash, selectedDocumentType);
        if (result.success) {
          toast.info('Dados do servidor resetados. Pronto para um novo processamento.');
        } else {
          // Non-critical error, as the UI is already reset
          console.warn('Falha ao resetar os dados no servidor:', result.error);
        }
      } catch (error) {
        console.error('Erro ao comunicar com o servidor para o reset:', error);
      } finally {
        setResetting(false);
      }
    } else {
        toast.info('Página resetada. Pronto para um novo processamento.');
    }
  };

  // Format results for OCRResultsViewer and PackingListViewer
  const formatResultsForViewer = (newResults: any) => {
    if (!newResults || !newResults.success) {
      return null;
    }

    // The OCR API returns data in the correct format already
    // Just wrap it in the expected structure
    return {
      ocr: {
        data: newResults.data,
      }
    };
  };

  const formattedResults = processingResults ? formatResultsForViewer(processingResults) : null;

  // Watch for processId changes from URL
  useEffect(() => {
    if (processIdParam && processIdParam !== processId) {
      setProcessId(processIdParam);
    }
  }, [processIdParam]);

  // Process state from URL if coming from process creation
  useEffect(() => {
    if (stateParam && fromParam === 'new_process') {
      try {
        const decodedState = JSON.parse(atob(stateParam));
        if (decodedState.proformaData) {
          // Parse the proforma data
          const proformaData = JSON.parse(decodedState.proformaData);
          
          // Set up the results as if they came from normal processing
          const results = {
            success: true,
            data: proformaData,
            hashFile: decodedState.proformaHash,
            isAlreadySaved: false,
            metadata: {
              documentType: DocumentType.PROFORMA_INVOICE,
              fromProcess: true,
              processId: decodedState.processId
            }
          };
          
          setProcessId(decodedState.processId);
          setProcessingResults(results);
          setSelectedDocumentType(DocumentType.PROFORMA_INVOICE);
          setCurrentFileHash(decodedState.proformaHash);
          setIsAlreadySaved(false);
          
          // Extract processed data
          let dataToSet;
          if (proformaData.structuredResult) {
            dataToSet = proformaData.structuredResult;
          } else if (proformaData.multiPrompt) {
            dataToSet = proformaData;
          } else {
            dataToSet = proformaData;
          }
          
          setProcessedData(dataToSet);
          setOriginalData(dataToSet);
          
          toast.success('Dados da Proforma Invoice carregados. Pronto para salvar no banco.');
        }
      } catch (error) {
        console.error('Error decoding state from URL:', error);
      }
    }
  }, [stateParam, fromParam]);

  // Inicializa processedData quando os resultados mudam
  useEffect(() => {
    if (processingResults?.success && processingResults?.data) {
      // Extrai os dados processados baseado no tipo de documento
      let dataToSet;
      if (processingResults.data.structuredResult) {
        dataToSet = processingResults.data.structuredResult;
      } else if (processingResults.data.multiPrompt) {
        // Para multi-prompt, normalmente os dados finais estão estruturados
        dataToSet = processingResults.data;
      } else {
        dataToSet = processingResults.data;
      }
      
      setProcessedData(dataToSet);
      
      // Só define originalData se ainda não existir (primeira carga)
      if (!originalData) {
        setOriginalData(dataToSet);
      }
    }
  }, [processingResults]);

  return (
    <div className="p-7 mx-auto py-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">OCR - Extração de Dados</h1>
        <p className="text-muted-foreground">
          Sistema modular para processamento de documentos de importação
        </p>
        
        {/* Info about new system */}

      </div>

      {/* Mostrar indicador se veio de outro fluxo */}
      {pageOrigin === 'new_process' && (
        <Card className="mb-6 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <CardContent className="flex items-center gap-2 py-3">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm text-blue-700 dark:text-blue-300">
              Processo de importação criado com sucesso! Agora faça o upload dos documentos.
            </span>
          </CardContent>
        </Card>
      )}
      
      {/* Mostrar indicador se veio da identificação de documento desconhecido */}
      {fromUnknownParam === 'true' && (
        <Card className="mb-6 bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800">
          <CardContent className="flex items-center gap-2 py-3">
            <FileText className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            <span className="text-sm text-purple-700 dark:text-purple-300">
              Documento identificado como <strong>{documentTypeParam}</strong> pela IA.
              {invoiceNumberParam && (
                <> Número de referência encontrado: <strong>{invoiceNumberParam}</strong></>  
              )}
            </span>
          </CardContent>
        </Card>
      )}
      
      {/* Mostrar indicador se tem processo vinculado */}
      {processId && pageOrigin !== 'new_process' && (
        <Card className="mb-6 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
          <CardContent className="flex items-center gap-2 py-3">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <span className="text-sm text-green-700 dark:text-green-300">
              Este documento será vinculado ao processo <strong>{processId}</strong>
              {fromParam === 'unknown_document' && (
                <> após o processamento</>  
              )}
            </span>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <div className="space-y-6">
        {/* Row 1: Upload + Processing Status + Save */}
        <div className={`grid gap-4   lg:grid-cols-2`}>
          <div className=''>
            <DocumentUploadForm 
              onProcessComplete={handleProcessComplete}
              onClear={handleClearUI}
              hasProcessedData={!!processingResults}
              defaultType={documentTypeParam as DocumentType}
              className=""
            />
          </div>
          

          <div className=' '>
            <SaveToDatabaseCard
              documentType={selectedDocumentType}
              hasData={!!processedData}
              saving={saving}
              error={error}
              lastSaveResult={lastSaveResult}
              lastSaveTime={lastSaveTime}
              isAlreadySaved={isAlreadySaved}
              fileHash={currentFileHash}
              hasChanges={hasChanges}
              onSave={handleSaveToDatabase}
              onUpdate={handleUpdateToDatabase}
              onReset={handleReset}
              resetting={resetting}
            />
          </div>
        </div>

        {/* Row 2: Results Viewer (full width) */}
        {formattedResults && (
          <div className="w-full space-y-4">
            {/* Summary Results */}
            <OCRResultsViewer
              results={formattedResults}
              onSave={handleSave}
              variant="summary"
            />
            {/* Detailed Results */}
            <OCRResultsViewer
              results={formattedResults}
              onSave={handleSave}
              variant="detailed"
            />
          </div>
        )}

        {/* Show raw data for debugging during transition */}
        {processingResults && processingResults.success && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Dados Processados (Debug)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <details className="text-xs">
                <summary className="cursor-pointer font-medium mb-2">
                  Ver dados brutos extraídos
                </summary>
                <pre className="bg-muted p-3 rounded overflow-auto max-h-96">
                  {JSON.stringify(processingResults.data, null, 2)}
                </pre>
              </details>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// Componente principal com Suspense
export default function OCRPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    }>
      <OCRPageContent />
    </Suspense>
  );
}