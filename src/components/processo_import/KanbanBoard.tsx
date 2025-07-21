'use client';

import React, { useState, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ProcessoImportacaoCard } from './ProcessoImportacaoCard';
import { ProcessoImportacao } from '@/types/processo-importacao';
import { KANBAN_CONFIG } from '@/config/nocodb-tables';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface KanbanBoardProps {
  processos: ProcessoImportacao[];
  onProcessoClick: (processo: ProcessoImportacao) => void;
  onStageChange?: (processId: string, newStage: string) => Promise<void>;
  loading?: boolean;
}

export function KanbanBoard({
  processos,
  onProcessoClick,
  onStageChange,
  loading = false
}: KanbanBoardProps) {
  const [isDragging, setIsDragging] = useState(false);
  
  // Group processes by stage
  const processesByStage = KANBAN_CONFIG.STAGES.reduce((acc, stage) => {
    acc[stage.id] = processos.filter(p => 
      (p.etapa || KANBAN_CONFIG.DEFAULT_STAGE) === stage.id
    );
    return acc;
  }, {} as Record<string, ProcessoImportacao[]>);

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragEnd = async (result: DropResult) => {
    setIsDragging(false);
    
    const { destination, source, draggableId } = result;
    
    // Dropped outside list
    if (!destination) return;
    
    // No movement
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }
    
    // Find the process that was moved
    const processId = draggableId;
    const newStage = destination.droppableId;
    
    // Call the stage change handler
    if (onStageChange) {
      try {
        await onStageChange(processId, newStage);
        toast.success('Etapa atualizada com sucesso');
      } catch (error) {
        console.error('Error updating stage:', error);
        toast.error('Erro ao atualizar etapa');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {KANBAN_CONFIG.STAGES.map((stage) => (
          <div key={stage.id} className="min-w-[350px]">
            <div className="h-12 bg-zinc-800 rounded-t-lg animate-pulse" />
            <div className="bg-zinc-900 min-h-[400px] rounded-b-lg p-2">
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-32 bg-zinc-800 rounded animate-pulse" />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {KANBAN_CONFIG.STAGES.map((stage) => {
          const stageProcesses = processesByStage[stage.id] || [];
          
          return (
            <div key={stage.id} className="min-w-[350px] flex flex-col">
              {/* Column Header */}
              <div className={cn(
                "rounded-t-lg p-3 text-white",
                stage.color
              )}>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{stage.title}</h3>
                  <Badge variant="secondary" className="bg-white/20 text-white">
                    {stageProcesses.length}
                  </Badge>
                </div>
                <p className="text-xs text-white/80 mt-1">
                  {stage.description}
                </p>
              </div>
              
              {/* Column Content */}
              <Droppable droppableId={stage.id}>
                {(provided, snapshot) => (
                  <ScrollArea
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "flex-1 bg-zinc-900/50 rounded-b-lg p-2 min-h-[400px] max-h-[calc(100vh-300px)]",
                      snapshot.isDraggingOver && "bg-zinc-800/50 ring-2 ring-blue-500/50"
                    )}
                  >
                    <div className="space-y-2">
                      {stageProcesses.map((processo, index) => (
                        <Draggable
                          key={processo.id}
                          draggableId={processo.id}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={cn(
                                "transition-all",
                                snapshot.isDragging && "rotate-2 scale-105"
                              )}
                            >
                              <ProcessoImportacaoCard
                                processo={processo}
                                onClick={() => onProcessoClick(processo)}
                                variant="compact"
                                className={cn(
                                  "cursor-pointer hover:shadow-lg transition-shadow",
                                  snapshot.isDragging && "shadow-xl"
                                )}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                    
                    {/* Empty state */}
                    {stageProcesses.length === 0 && !snapshot.isDraggingOver && (
                      <div className="flex items-center justify-center h-32 text-zinc-500 text-sm">
                        Nenhum processo nesta etapa
                      </div>
                    )}
                  </ScrollArea>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}