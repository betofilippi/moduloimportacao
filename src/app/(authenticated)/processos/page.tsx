"use client"

import * as React from "react"
import { useState, useEffect, useCallback } from "react"
import { Plus, Search, Filter, Download, FileQuestion } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ProcessoImportacaoList } from "@/components/processo_import/ProcessoImportacaoList"
import { ProcessoImportacaoModal } from "@/components/processo_import/ProcessoImportacaoModal"
import { NovoProcessoModal } from "@/components/processo_import/NovoProcessoModal"
import { UnknownDocumentModal } from "@/components/processo_import/UnknownDocumentModal"
import { ProcessoImportacao, DocumentPipelineStatus } from "@/types/processo-importacao"
import { useNocoDB } from "@/hooks/useNocoDB"
import { NOCODB_TABLES, TABLE_FIELD_MAPPINGS } from "@/config/nocodb-tables"
import { toast } from "sonner"
import { NocoDBRecord } from "@/types/nocodb"

export default function ProcessosPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [processos, setProcessos] = useState<ProcessoImportacao[]>([])
  const [selectedProcesso, setSelectedProcesso] = useState<ProcessoImportacao | null>(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [isNewProcessModalOpen, setIsNewProcessModalOpen] = useState(false)
  const [isUnknownDocumentModalOpen, setIsUnknownDocumentModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

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
      dataInicio: record.data_inicio || new Date().toISOString(),
      dataPrevisaoTermino: record.data_previsao_termino,
      status: record.status || 'active',
      responsavel: record.responsavel || '',
      observacoes: record.observacoes,
      documentsPipeline,
      createdAt: record.CreatedAt || record.criado_em || new Date().toISOString(),
      updatedAt: record.UpdatedAt || record.atualizado_em || new Date().toISOString(),
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
    setIsDetailsModalOpen(true)
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

      {/* Processes List */}
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
            loading={isLoading}
          />
        </CardContent>
      </Card>

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

      {/* Details Modal */}
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
      />
    </div>
  )
}