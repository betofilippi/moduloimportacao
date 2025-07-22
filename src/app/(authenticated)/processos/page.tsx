"use client"

import * as React from "react"
import { useState, useEffect, useCallback } from "react"
import { Plus, Search, Filter, Download, FileQuestion, RefreshCw, List, Layers } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProcessoImportacaoList } from "@/components/processo_import/ProcessoImportacaoList"
import { KanbanBoard } from "@/components/processo_import/KanbanBoard"
import { ProcessoImportacaoModal } from "@/components/processo_import/ProcessoImportacaoModal"
import { ProcessoDetailsEnhancedModal } from "@/components/processo_import/ProcessoDetailsEnhancedModal"
import { NovoProcessoModal } from "@/components/processo_import/NovoProcessoModal"
import { UnknownDocumentModal } from "@/components/processo_import/UnknownDocumentModal"
import { ProcessoImportacao, DocumentPipelineStatus } from "@/types/processo-importacao"
import { useNocoDB } from "@/hooks/useNocoDB"
import { NOCODB_TABLES, TABLE_FIELD_MAPPINGS, KANBAN_CONFIG } from "@/config/nocodb-tables"
import { toast } from "sonner"
import { NocoDBRecord } from "@/types/nocodb"

export default function ProcessosPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [processos, setProcessos] = useState<ProcessoImportacao[]>([])
  const [selectedProcesso, setSelectedProcesso] = useState<ProcessoImportacao | null>(null)
  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [isEnhancedDetailsModalOpen, setIsEnhancedDetailsModalOpen] = useState(false)
  const [isNewProcessModalOpen, setIsNewProcessModalOpen] = useState(false)
  const [isUnknownDocumentModalOpen, setIsUnknownDocumentModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list')

  const { find, create, update, remove } = useNocoDB(NOCODB_TABLES.PROCESSOS_IMPORTACAO)

  // Transform NocoDB record to ProcessoImportacao format
  const transformToProcesso = useCallback((record: NocoDBRecord): ProcessoImportacao => {
    // Parse documentsPipeline if it's a string
    let documentsPipeline: DocumentPipelineStatus[] = []
    if (record.documentsPipeline) {
      try {
        documentsPipeline = typeof record.documentsPipeline === 'string' 
          ? JSON.parse(record.documentsPipeline)
          : record.documentsPipeline
      } catch (e) {
        console.error('Error parsing documentsPipeline:', e)
        documentsPipeline = []
      }
    }

    return {
      id: record.Id || record.id,
      numeroProcesso: record.numero_processo || '',
      descricao: record.descricao || '',
      empresa: record.empresa || '',
      dataInicio: record.data_inicio || '',
      dataPrevisaoTermino: record.data_previsao_termino,
      status: record.status || 'active',
      etapa: record.etapa || KANBAN_CONFIG.DEFAULT_STAGE,
      responsavel: record.responsavel || '',
      observacoes: record.observacoes,
      documentsPipeline,
      createdAt: record.CreatedAt || record.criado_em || '',
      updatedAt: record.UpdatedAt || record.atualizado_em || '',
      createdBy: record.criado_por || 'sistema'
    }
  }, [])

  // Fetch processos from NocoDB
  const fetchProcessos = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await find({
        sort: ['-CreatedAt'],
        limit: 100
      })
      
      const transformedProcessos = response.list.map(transformToProcesso)
      setProcessos(transformedProcessos)
    } catch (error) {
      console.error('Error fetching processos:', error)
      toast.error('Erro ao carregar processos')
    } finally {
      setIsLoading(false)
    }
  }, [find, transformToProcesso])

  useEffect(() => {
    fetchProcessos()
  }, [fetchProcessos])

  // Handle refresh with check route for each process
  const handleRefresh = async () => {
    try {
      setIsRefreshing(true)
      
      // Create array of promises to check each process
      const checkPromises = processos.map(async (processo) => {
        try {
          const response = await fetch('/api/processo-importacao/check', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ processId: processo.id }),
          })
          
          if (response.ok) {
            const data = await response.json()
            return { processId: processo.id, success: data.success }
          }
          return { processId: processo.id, success: false }
        } catch (error) {
          console.error(`Error checking process ${processo.id}:`, error)
          return { processId: processo.id, success: false }
        }
      })
      
      // Wait for all checks to complete
      const results = await Promise.all(checkPromises)
      const successCount = results.filter(r => r.success).length
      
      console.log(`✅ Checked ${successCount}/${processos.length} processes successfully`)
      
      if (successCount > 0) {
        toast.success(`${successCount} processos atualizados com sucesso`)
        // Reload the process list to show updated data
        await fetchProcessos()
      } else if (processos.length === 0) {
        toast.info('Nenhum processo para atualizar')
      } else {
        toast.warning('Nenhum processo foi atualizado')
      }
      
    } catch (error) {
      console.error('Error refreshing processes:', error)
      toast.error('Erro ao atualizar processos')
    } finally {
      setIsRefreshing(false)
    }
  }

  // Filter processos based on search term
  const filteredProcessos = processos.filter(processo =>
    processo.numeroProcesso.toLowerCase().includes(searchTerm.toLowerCase()) ||
    processo.empresa.toLowerCase().includes(searchTerm.toLowerCase()) ||
    processo.responsavel.toLowerCase().includes(searchTerm.toLowerCase()) ||
    processo.descricao.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Handle processo click
  const handleProcessoClick = (processo: ProcessoImportacao) => {
    setSelectedProcesso(processo)
    setSelectedProcessId(processo.id)
    setIsEnhancedDetailsModalOpen(true)
  }
  
  // Handle connect document
  const handleConnectDocument = (processId: string) => {
    setIsUnknownDocumentModalOpen(true)
    // You can pass the processId to the modal if needed
  }

  // Handle new processo creation
  const handleNewProcesso = async (data: Record<string, any>) => {
    try {
      console.log('Creating processo:', data);
      
      // Transform data to NocoDB format - including ALL fields from the proforma
      const nocoData = {
        numero_processo: data.numero_processo,
        invoiceNumber: data.invoiceNumber,
        descricao: data.descricao,
        empresa: data.empresa,
        cnpj_empresa: data.cnpj_empresa, // Fixed typo
        responsavel: data.responsavel,
        email_responsavel: data.email_responsavel,
        data_inicio: data.data_inicio,
        data_conclusao: data.data_conclusao,
        status: data.status,
        etapa: data.etapa || 'solicitado', // Default Kanban stage
        valor_total_estimado: data.valor_total_estimado,
        moeda: data.moeda,
        porto_embarque: data.porto_embarque, // Added
        porto_destino: data.porto_destino, // Added
        condicoes_pagamento: data.condicoes_pagamento, // Added
        proforma_invoice_id: data.proforma_invoice_id, // Added
        proforma_invoice_doc_id: data.proforma_invoice_doc_id, // Added
        observacoes: data.observacoes,
        documentsPipeline: data.documentsPipeline || '[]', // Already stringified
        criado_por: 'sistema'
      }
      
      console.log('NocoDB data to create:', nocoData);

      await create(nocoData)
      toast.success('Processo criado com sucesso!')
      
      // Refresh the list
      await fetchProcessos()
      setIsNewProcessModalOpen(false)
    } catch (error) {
      console.error('Error creating processo:', error)
      toast.error('Erro ao criar processo')
    }
  }

  // Handle processo edit
  const handleEditProcesso = async (processo: ProcessoImportacao) => {
    // TODO: Implement edit functionality
    toast.info('Funcionalidade de edição em desenvolvimento')
  }

  // Handle processo delete
  const handleDeleteProcesso = async (processo: ProcessoImportacao) => {
    try {
      await remove(processo.id)
      toast.success('Processo excluído com sucesso!')
      await fetchProcessos()
      setIsDetailsModalOpen(false)
    } catch (error) {
      console.error('Error deleting processo:', error)
      toast.error('Erro ao excluir processo')
    }
  }

  // Handle document click
  const handleDocumentClick = (doc: DocumentPipelineStatus) => {
    // TODO: Navigate to document details
    console.log('Document clicked:', doc)
  }

  // Calculate statistics
  const totalProcessos = processos.length
  const processosAtivos = processos.filter(p => p.status === 'active').length
  const processosConcluidos = processos.filter(p => p.status === 'completed').length

  // Handle stage change for Kanban
  const handleStageChange = async (processId: string, newStage: string) => {
    try {
      const response = await fetch('/api/processo-importacao/update-stage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          processId,
          newStage
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update stage')
      }

      // Update local state
      setProcessos(prev => prev.map(p => 
        p.id === processId ? { ...p, etapa: newStage } : p
      ))
      
      toast.success('Etapa atualizada com sucesso')
    } catch (error) {
      console.error('Error updating stage:', error)
      toast.error('Erro ao atualizar etapa')
      throw error
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar processos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64 pl-10"
            />
          </div>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button 
            variant="outline" 
            size="default"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Atualizando...' : 'Atualizar'}
          </Button>
          <Button onClick={() => setIsNewProcessModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Processo
          </Button>
        </div>
      </div>

      {/* Process Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Total de Processos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProcessos}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Em Andamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {processosAtivos}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Concluídos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {processosConcluidos}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View Mode Tabs */}
      <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'list' | 'kanban')} className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-12 p-1 bg-zinc-100 dark:bg-zinc-800">
          <TabsTrigger 
            value="list" 
            className="flex items-center justify-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm transition-all"
          >
            <List className="h-5 w-5" />
            <span className="font-medium">Visualização em Lista</span>
          </TabsTrigger>
          <TabsTrigger 
            value="kanban" 
            className="flex items-center justify-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm transition-all"
          >
            <Layers className="h-5 w-5" />
            <span className="font-medium">Visualização Kanban</span>
          </TabsTrigger>
        </TabsList>

        {/* List View */}
        <TabsContent value="list" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Lista de Processos</CardTitle>
              <CardDescription>
                Gerencie todos os processos de importação
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProcessoImportacaoList
                processos={filteredProcessos}
                onProcessoClick={handleProcessoClick}
                onConnectDocument={handleConnectDocument}
                loading={isLoading}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Kanban View */}
        <TabsContent value="kanban" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Kanban de Processos</CardTitle>
              <CardDescription>
                Visualize os processos por etapa de importação
              </CardDescription>
            </CardHeader>
            <CardContent>
              <KanbanBoard
                processos={filteredProcessos}
                onProcessoClick={handleProcessoClick}
                onStageChange={handleStageChange}
                loading={isLoading}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Unknown Document Section */}
      <Card className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border-purple-700/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileQuestion className="h-5 w-5 text-purple-400" />
            Processar Documento Desconhecido
          </CardTitle>
          <CardDescription>
            Tem um documento mas não sabe qual o tipo? Use nossa IA para identificar automaticamente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={() => setIsUnknownDocumentModalOpen(true)}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            size="lg"
          >
            <FileQuestion className="h-5 w-5 mr-2" />
            Identificar Documento com IA
          </Button>
          <p className="text-xs text-muted-foreground mt-3 text-center">
            Nossa IA analisa o documento, identifica o tipo e busca processos relacionados automaticamente
          </p>
        </CardContent>
      </Card>

      {/* Enhanced Details Modal */}
      <ProcessoDetailsEnhancedModal
        isOpen={isEnhancedDetailsModalOpen}
        onClose={() => setIsEnhancedDetailsModalOpen(false)}
        processId={selectedProcessId || ''}
        onDocumentConnect={handleConnectDocument}
      />
      
      {/* Legacy Details Modal (for backward compatibility) */}
      <ProcessoImportacaoModal
        processo={selectedProcesso}
        open={isDetailsModalOpen}
        onOpenChange={setIsDetailsModalOpen}
        onEdit={handleEditProcesso}
        onDelete={handleDeleteProcesso}
        onDocumentClick={handleDocumentClick}
      />

      {/* New Process Modal */}
      <NovoProcessoModal
        open={isNewProcessModalOpen}
        onOpenChange={setIsNewProcessModalOpen}
        onSubmit={handleNewProcesso}
      />

      {/* Unknown Document Modal */}
      <UnknownDocumentModal
        open={isUnknownDocumentModalOpen}
        onOpenChange={setIsUnknownDocumentModalOpen}
        processos={processos}
        onProcessSelect={(processId) => {
          // Process selection is now handled within the modal
          // which navigates directly to OCR page
        }}
        onCreateNewProcess={() => {
          setIsUnknownDocumentModalOpen(false);
          setIsNewProcessModalOpen(true);
        }}
        onSuccessfulAttachment={() => {
          // Refresh process list after successful attachment
          loadProcessos();
        }}
      />
    </div>
  )
}