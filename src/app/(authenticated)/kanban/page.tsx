"use client"

import * as React from "react"
import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { KanbanBoard } from "@/components/processo_import/KanbanBoard"
import { ProcessoImportacaoModal } from "@/components/processo_import/ProcessoImportacaoModal"
import { ProcessoImportacao } from "@/types/processo-importacao"
import { useNocoDB } from "@/hooks/useNocoDB"
import { NOCODB_TABLES, KANBAN_CONFIG } from "@/config/nocodb-tables"
import { toast } from "sonner"
import { NocoDBRecord } from "@/types/nocodb"
import { Layers } from "lucide-react"

export default function KanbanPage() {
  const [processos, setProcessos] = useState<ProcessoImportacao[]>([])
  const [selectedProcesso, setSelectedProcesso] = useState<ProcessoImportacao | null>(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const { find, update } = useNocoDB(NOCODB_TABLES.PROCESSOS_IMPORTACAO)

  // Transform NocoDB record to ProcessoImportacao format
  const transformToProcesso = useCallback((record: NocoDBRecord): ProcessoImportacao => {
    // Parse documentsPipeline if it's a string
    let documentsPipeline: any[] = []
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
      id: String(record.Id || record.id),
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

  // Handle stage change
  const handleStageChange = async (processId: string, newStage: string) => {
    try {
      // Call API to update stage
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
    } catch (error) {
      console.error('Error updating stage:', error)
      throw error // Re-throw to be handled by KanbanBoard
    }
  }

  // Handle processo click
  const handleProcessoClick = (processo: ProcessoImportacao) => {
    setSelectedProcesso(processo)
    setIsDetailsModalOpen(true)
  }

  // Calculate statistics
  const stats = KANBAN_CONFIG.STAGES.map(stage => ({
    ...stage,
    count: processos.filter(p => (p.etapa || KANBAN_CONFIG.DEFAULT_STAGE) === stage.id).length
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Layers className="h-8 w-8" />
          Kanban de Processos
        </h1>
        <p className="text-muted-foreground mt-2">
          Visualize e gerencie os processos de importação em diferentes etapas
        </p>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-6 mb-6">
        {stats.map((stage) => (
          <Card key={stage.id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                {stage.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${stage.color}`} />
                <span className="text-2xl font-bold">{stage.count}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Kanban Board */}
      <Card>
        <CardContent className="p-6">
          <KanbanBoard
            processos={processos}
            onProcessoClick={handleProcessoClick}
            onStageChange={handleStageChange}
            loading={isLoading}
          />
        </CardContent>
      </Card>

      {/* Details Modal */}
      <ProcessoImportacaoModal
        processo={selectedProcesso}
        open={isDetailsModalOpen}
        onOpenChange={setIsDetailsModalOpen}
        onEdit={() => {
          toast.info('Funcionalidade de edição em desenvolvimento')
        }}
        onDelete={async () => {
          toast.info('Funcionalidade de exclusão em desenvolvimento')
        }}
        onDocumentClick={(doc) => {
          console.log('Document clicked:', doc)
        }}
      />
    </div>
  )
}