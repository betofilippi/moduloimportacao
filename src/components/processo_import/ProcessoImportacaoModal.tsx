'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ProcessoPipeline } from './ProcessoPipeline';
import { ProcessoImportacao, DocumentPipelineStatus } from '@/types/processo-importacao';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar, User, Building, FileText, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ProcessoImportacaoModalProps {
  processo: ProcessoImportacao | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (processo: ProcessoImportacao) => void;
  onDelete?: (processo: ProcessoImportacao) => void;
  onDocumentClick?: (doc: DocumentPipelineStatus) => void;
}

export function ProcessoImportacaoModal({
  processo,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  onDocumentClick,
}: ProcessoImportacaoModalProps) {
  if (!processo) return null;

  const getStatusColor = (status: ProcessoImportacao['status']) => {
    switch (status) {
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'on_hold':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: ProcessoImportacao['status']) => {
    switch (status) {
      case 'active':
        return 'Ativo';
      case 'completed':
        return 'Concluído';
      case 'on_hold':
        return 'Em Espera';
      case 'cancelled':
        return 'Cancelado';
      default:
        return status;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <DialogTitle className="text-2xl flex items-center gap-2">
                <FileText className="h-6 w-6" />
                {processo.numeroProcesso}
              </DialogTitle>
              <DialogDescription className="text-base">
                {processo.descricao}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={getStatusColor(processo.status)}>
                {getStatusLabel(processo.status)}
              </Badge>
              {onEdit && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => onEdit(processo)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => onDelete(processo)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-8rem)]">
          <div className="space-y-6">
            {/* Process Information */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Building className="h-4 w-4" />
                  <span>Empresa</span>
                </div>
                <p className="font-medium">{processo.empresa}</p>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>Responsável</span>
                </div>
                <p className="font-medium">{processo.responsavel}</p>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Data de Início</span>
                </div>
                <p className="font-medium">
                  {new Date(processo.dataInicio).toLocaleDateString('pt-BR')}
                </p>
              </div>
              
              {processo.dataPrevisaoTermino && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Previsão de Término</span>
                  </div>
                  <p className="font-medium">
                    {new Date(processo.dataPrevisaoTermino).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              )}
            </div>

            {processo.observacoes && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h3 className="font-medium">Observações</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {processo.observacoes}
                  </p>
                </div>
              </>
            )}

            <Separator />

            {/* Documents Pipeline */}
            <div className="space-y-4">
              <h3 className="font-medium text-lg">Pipeline de Documentos</h3>
              <ProcessoPipeline
                pipeline={processo.documentsPipeline}
                onDocumentClick={onDocumentClick}
              />
            </div>

            {/* Summary Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold">
                  {processo.documentsPipeline.filter(d => d.status === 'completed').length}
                </p>
                <p className="text-sm text-muted-foreground">Concluídos</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">
                  {processo.documentsPipeline.filter(d => d.status === 'processing').length}
                </p>
                <p className="text-sm text-muted-foreground">Processando</p>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <p className="text-2xl font-bold text-yellow-600">
                  {processo.documentsPipeline.filter(d => d.status === 'pending').length}
                </p>
                <p className="text-sm text-muted-foreground">Pendentes</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-2xl font-bold text-red-600">
                  {processo.documentsPipeline.filter(d => d.status === 'error').length}
                </p>
                <p className="text-sm text-muted-foreground">Erros</p>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}