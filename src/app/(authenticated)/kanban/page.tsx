"use client"

import * as React from "react"
import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { KanbanBoard } from "@/components/processo_import/KanbanBoard"
import { ProcessoUnifiedModal } from "@/components/processo_import/ProcessoUnifiedModal"
import { StageChangeModal } from "@/components/processo_import/StageChangeModal"
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
  const [stageChangeModal, setStageChangeModal] = useState<{
    isOpen: boolean
    processId: string
    currentStage: string
    processNumber: string
    targetStage?: string
  }>({
    isOpen: false,
    processId: '',
    currentStage: '',
    processNumber: '',
    targetStage: undefined
  })

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
      invoiceNumber: record.invoiceNumber || '',
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

  // Handle stage change - check if modal is needed
  const handleStageChange = async (processId: string, newStage: string) => {
    const processo = processos.find(p => p.id === processId)
    if (!processo) return

    const currentStage = processo.etapa || KANBAN_CONFIG.DEFAULT_STAGE
    
    // First, check if this transition is allowed without violations
    try {
      const checkResponse = await fetch(`/api/processo-importacao/update-stage?processId=${processId}`)
      
      if (checkResponse.ok) {
        const checkData = await checkResponse.json()
        
        // Find if the new stage is allowed
        const targetStageInfo = checkData.canTransitionTo?.find((s: any) => s.stage === newStage)
        
        console.log('🔍 Stage transition check:', {
          targetStage: newStage,
          allowed: targetStageInfo?.allowed,
          violations: checkData.violations,
          attachedDocuments: checkData.attachedDocuments
        })
        
        // If transition is allowed, do direct update without modal
        if (targetStageInfo?.allowed) {
          const updateResponse = await fetch('/api/processo-importacao/update-stage', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              processId,
              newStage,
              forceUpdate: false,
              reason: 'Mudança automática - transição permitida',
              notes: ''
            })
          })

          if (updateResponse.ok) {
            const updateData = await updateResponse.json()
            
            // Update local state
            setProcessos(prev => prev.map(p => 
              p.id === processId ? { ...p, etapa: newStage } : p
            ))

            // Show success message
            toast.success(`Etapa atualizada: ${updateData.oldStage} → ${updateData.newStage}`)
            
            // Refresh data
            fetchProcessos()
            return
          }
        }
      }
    } catch (error) {
      console.error('Error checking stage transition:', error)
    }

    // If we reach here, open modal for stage change with the target stage
    setStageChangeModal({
      isOpen: true,
      processId,
      currentStage,
      processNumber: processo.numeroProcesso,
      targetStage: newStage // Add the target stage that user dragged to
    })
  }

  // Handle confirmed stage change from modal
  const handleConfirmStageChange = async (
    newStage: string, 
    forceUpdate: boolean, 
    reason: string, 
    notes: string
  ) => {
    try {
      // Call API to update stage with all parameters
      const response = await fetch('/api/processo-importacao/update-stage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          processId: stageChangeModal.processId,
          newStage,
          forceUpdate,
          reason,
          notes
        })
      })

      const data = await response.json()

      if (!response.ok) {
        // Show specific error message
        if (data.violations && data.violations.length > 0) {
          const violationMessages = data.violations.map((v: any) => v.message).join('\n')
          toast.error(`Mudança bloqueada:\n${violationMessages}`)
        } else {
          toast.error(data.message || 'Erro ao atualizar etapa')
        }
        throw new Error(data.message || 'Failed to update stage')
      }

      // Update local state
      setProcessos(prev => prev.map(p => 
        p.id === stageChangeModal.processId ? { ...p, etapa: newStage } : p
      ))

      // Show success with details
      toast.success(`Etapa atualizada: ${data.oldStage} → ${data.newStage}`)

      // Close modal
      setStageChangeModal({
        isOpen: false,
        processId: '',
        currentStage: '',
        processNumber: '',
        targetStage: undefined
      })

      // Refresh data to get latest state
      fetchProcessos()
    } catch (error) {
      console.error('Error updating stage:', error)
      // Error toast already shown above
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
      <Card className="border-0 shadow-none bg-transparent">
        <CardContent className="p-0">
          <KanbanBoard
            processos={processos}
            onProcessoClick={handleProcessoClick}
            onStageChange={handleStageChange}
            loading={isLoading}
          />
        </CardContent>
      </Card>

      {/* Details Modal */}
      <ProcessoUnifiedModal
        processo={selectedProcesso}
        open={isDetailsModalOpen}
        onOpenChange={setIsDetailsModalOpen}
        onEdit={() => {
          toast.info('Funcionalidade de edição em desenvolvimento')
        }}
        onDelete={async () => {
          toast.info('Funcionalidade de exclusão em desenvolvimento')
        }}
        onStageChange={handleStageChange}
      />

      {/* Stage Change Modal */}
      <StageChangeModal
        isOpen={stageChangeModal.isOpen}
        onClose={() => setStageChangeModal({
          isOpen: false,
          processId: '',
          currentStage: '',
          processNumber: '',
          targetStage: undefined
        })}
        onConfirm={handleConfirmStageChange}
        processId={stageChangeModal.processId}
        currentStage={stageChangeModal.currentStage}
        processNumber={stageChangeModal.processNumber}
        targetStage={stageChangeModal.targetStage}
      />
    </div>
  )
}