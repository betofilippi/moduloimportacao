'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DynamicForm } from '@/components/ui/DynamicForm';
import { defaultProcessoFormConfig } from '@/types/processo-importacao';

interface NovoProcessoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: Record<string, any>) => void | Promise<void>;
}

export function NovoProcessoModal({
  open,
  onOpenChange,
  onSubmit,
}: NovoProcessoModalProps) {
  const handleSubmit = async (values: Record<string, any>) => {
    await onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Processo de Importação</DialogTitle>
          <DialogDescription>
            Preencha os dados para criar um novo processo de importação. 
            Todos os campos marcados com * são obrigatórios.
          </DialogDescription>
        </DialogHeader>
        
        <DynamicForm
          config={defaultProcessoFormConfig}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          submitLabel="Criar Processo"
        />
      </DialogContent>
    </Dialog>
  );
}