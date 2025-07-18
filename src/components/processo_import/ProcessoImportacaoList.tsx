'use client';

import React from 'react';
import { ProcessoImportacao } from '@/types/processo-importacao';
import { ProcessoImportacaoCard } from './ProcessoImportacaoCard';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface ProcessoImportacaoListProps {
  processos: ProcessoImportacao[];
  onProcessoClick: (processo: ProcessoImportacao) => void;
  loading?: boolean;
  className?: string;
}

export function ProcessoImportacaoList({
  processos,
  onProcessoClick,
  loading = false,
  className,
}: ProcessoImportacaoListProps) {
  if (loading) {
    return (
      <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6', className)}>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-[200px] w-full rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (processos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-gray-100 p-4 mb-4">
          <svg
            className="h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">
          Nenhum processo encontrado
        </h3>
        <p className="text-sm text-gray-500">
          Clique em "Novo Processo" para criar o primeiro processo de importação.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6', className)}>
      {processos.map((processo) => (
        <ProcessoImportacaoCard
          key={processo.id}
          processo={processo}
          onClick={() => onProcessoClick(processo)}
        />
      ))}
    </div>
  );
}