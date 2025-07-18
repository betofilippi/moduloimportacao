'use client';

import React, { useState, useEffect } from 'react';
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
import { NOCODB_TABLES } from '@/config/nocodb-tables';

export default function OCRPage() {
  const [processingResults, setProcessingResults] = useState<any>(null);
  const [selectedDocumentType, setSelectedDocumentType] = useState<DocumentType | null>(null);
  const [processedData, setProcessedData] = useState<any>(null);
  const [originalData, setOriginalData] = useState<any>(null);
  const [lastSaveTime, setLastSaveTime] = useState<Date | undefined>();
  const [isAlreadySaved, setIsAlreadySaved] = useState(false);
  const [currentFileHash, setCurrentFileHash] = useState<string | undefined>();
  const [resetting, setResetting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Hook para salvar no banco de dados
  const { 
    saveDI, 
    saveCommercialInvoice, 
    savePackingList,
    saveProformaInvoice,
    saveSwift,
    saveNumerario,
    saveNotaFiscal,
    updateDI,
    updateCommercialInvoice,
    updatePackingList,
    updateProformaInvoice,
    updateSwift,
    updateNumerario,
    updateNotaFiscal,
    resetDocumentData,
    saving, 
    error, 
    lastSaveResult 
  } = useDocumentSave();

  const handleProcessComplete = async (results: any, documentType: DocumentType, isFromCache: boolean) => {
    setProcessingResults(results);
    setSelectedDocumentType(documentType);
    console.log(results, documentType, isFromCache)
    
    // Extract file hash from results
    const isfileHash = isFromCache;
    const fileHash = results.hashFile;
    setCurrentFileHash(fileHash);
    console.log('IF SEM O FROM CACHE', isfileHash, documentType)
    // Check if document is already saved
    if (isfileHash) {
      setIsAlreadySaved(isFromCache);
    }
    
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
        
      default:
        toast.error(`Tipo de documento não suportado para atualização: ${selectedDocumentType}`);
        return;
    }
    
    if (result.success) {
      setLastSaveTime(new Date());
      setHasChanges(false);
      setOriginalData(processedData); // Update original data after successful update
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
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">OCR - Extração de Dados</h1>
        <p className="text-muted-foreground">
          Sistema modular para processamento de documentos de importação
        </p>
        
        {/* Info about new system */}

      </div>

      {/* Main Content */}
      <div className="space-y-6">
        {/* Row 1: Upload + Processing Status + Save */}
        <div className={`grid gap-4   lg:grid-cols-2`}>
          <div className=''>
            <DocumentUploadForm 
              onProcessComplete={handleProcessComplete}
              onClear={handleClearUI}
              hasProcessedData={!!processingResults}
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