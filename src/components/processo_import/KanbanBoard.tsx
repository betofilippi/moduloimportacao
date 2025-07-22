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
  
  // Helper function to normalize stage names for comparison
  const normalizeStage = (stage: string): string => {
    return stage
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/\s+/g, '_'); // Replace spaces with underscores
  };
  
  // Group processes by stage
  const processesByStage = KANBAN_CONFIG.STAGES.reduce((acc, stage) => {
    acc[stage.id] = processos.filter(p => {
      const processStage = p.etapa || KANBAN_CONFIG.DEFAULT_STAGE;
      return normalizeStage(processStage) === stage.id;
    });
    return acc;
  }, {} as Record<string, ProcessoImportacao[]>);

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragEnd = async (result: DropResult) => {
    setIsDragging(false);
    
    const { destination, source, draggableId } = result;
    
    // Dropped outside list
    if (!destination) {
      console.log('Dropped outside of any droppable area');
      return;
    }
    
    // No movement - same column and position
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      console.log('No movement detected');
      return;
    }
    
    // Log the drag operation
    console.log('Drag operation:', {
      processId: draggableId,
      from: source.droppableId,
      to: destination.droppableId
    });
    
    // Find the process that was moved
    const processId = draggableId;
    const newStage = destination.droppableId;
    const oldStage = source.droppableId;
    
    // Only update if stage actually changed
    if (oldStage !== newStage && onStageChange) {
      try {
        // Show loading toast
        const toastId = toast.loading('Atualizando etapa...');
        
        await onStageChange(processId, newStage);
        
        // Update success toast
        toast.success('Etapa atualizada com sucesso', { id: toastId });
      } catch (error) {
        console.error('Error updating stage:', error);
        toast.error('Erro ao atualizar etapa');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex gap-6 overflow-x-auto pb-4">
        {KANBAN_CONFIG.STAGES.map((stage) => (
          <div key={stage.id} className="min-w-[420px] w-[420px]">
            <div className="h-12 bg-zinc-800 rounded-t-lg animate-pulse" />
            <div className="bg-zinc-900 min-h-[500px] rounded-b-lg p-3">
              <div className="space-y-3">
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
      <div className="flex gap-6 overflow-x-auto pb-4">
        {KANBAN_CONFIG.STAGES.map((stage) => {
          const stageProcesses = processesByStage[stage.id] || [];
          
          return (
            <div key={stage.id} className="min-w-[420px] w-[420px] flex flex-col">
              {/* Column Header */}
              <div className={cn(
                "rounded-t-lg p-4 text-white",
                stage.color
              )}>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">{stage.title}</h3>
                  <Badge variant="secondary" className="bg-white/20 text-white">
                    {stageProcesses.length}
                  </Badge>
                </div>
                <p className="text-sm text-white/80 mt-1">
                  {stage.description}
                </p>
              </div>
              
              {/* Column Content */}
              <Droppable droppableId={stage.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "flex-1 bg-zinc-900/50 rounded-b-lg p-3 min-h-[500px]",
                      snapshot.isDraggingOver && "bg-zinc-800/50 ring-2 ring-blue-500/50"
                    )}
                  >
                    <div className="space-y-3">
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
                              style={{
                                ...provided.draggableProps.style,
                                userSelect: 'none'
                              }}
                              className={cn(
                                "transition-all cursor-move select-none",
                                snapshot.isDragging && "rotate-2 scale-105 z-50 opacity-90"
                              )}
                              onMouseDown={(e) => {
                                // Prevent text selection
                                e.preventDefault();
                              }}
                              onClick={(e) => {
                                // Only trigger click if not dragging
                                if (!snapshot.isDragging && !isDragging) {
                                  e.stopPropagation();
                                  onProcessoClick(processo);
                                }
                              }}
                            >
                              <ProcessoImportacaoCard
                                processo={processo}
                                onClick={() => {}} // Disable card's own onClick
                                variant="compact"
                                showGrip={true}
                                className={cn(
                                  "hover:shadow-lg transition-shadow pointer-events-auto",
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
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}