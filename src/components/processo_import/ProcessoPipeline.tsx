'use client';

import React from 'react';
import { DocumentPipelineStatus, documentTypeLabels, statusColors, statusLabels } from '@/types/processo-importacao';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle, Clock, Loader2, MinusCircle } from 'lucide-react';

interface ProcessoPipelineProps {
  pipeline: DocumentPipelineStatus[];
  onDocumentClick?: (doc: DocumentPipelineStatus) => void;
  className?: string;
}

export function ProcessoPipeline({ 
  pipeline, 
  onDocumentClick,
  className 
}: ProcessoPipelineProps) {
  const getStatusIcon = (status: DocumentPipelineStatus['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'error':
        return <XCircle className="h-4 w-4" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'not_applicable':
        return <MinusCircle className="h-4 w-4" />;
    }
  };

  return (
    <div className={cn('overflow-x-auto', className)}>
      <div className="min-w-max">
        <div className="flex items-center gap-2 p-4">
          {pipeline.map((doc, index) => (
            <React.Fragment key={doc.documentType}>
              {/* Document Status Box */}
              <div
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-lg border-2 min-w-[140px] transition-all',
                  'hover:shadow-md cursor-pointer',
                  doc.status === 'completed' && 'border-green-500 bg-green-50',
                  doc.status === 'error' && 'border-red-500 bg-red-50',
                  doc.status === 'processing' && 'border-blue-500 bg-blue-50',
                  doc.status === 'pending' && 'border-gray-300 bg-gray-50',
                  doc.status === 'not_applicable' && 'border-gray-200 bg-gray-50 opacity-60'
                )}
                onClick={() => onDocumentClick?.(doc)}
              >
                {/* Document Type */}
                <span className="text-sm font-medium text-center">
                  {documentTypeLabels[doc.documentType]}
                </span>

                {/* Status Icon */}
                <div className={cn(
                  'p-2 rounded-full',
                  doc.status === 'completed' && 'text-green-600',
                  doc.status === 'error' && 'text-red-600',
                  doc.status === 'processing' && 'text-blue-600',
                  doc.status === 'pending' && 'text-gray-600',
                  doc.status === 'not_applicable' && 'text-gray-400'
                )}>
                  {getStatusIcon(doc.status)}
                </div>

                {/* Status Badge */}
                <Badge 
                  variant="secondary" 
                  className={cn('text-xs', statusColors[doc.status])}
                >
                  {statusLabels[doc.status]}
                </Badge>

                {/* Additional Info */}
                {doc.processedAt && (
                  <span className="text-xs text-muted-foreground">
                    {new Date(doc.processedAt).toLocaleDateString('pt-BR')}
                  </span>
                )}
              </div>

              {/* Connector Line */}
              {index < pipeline.length - 1 && (
                <div className="flex items-center">
                  <div className={cn(
                    'h-0.5 w-8',
                    pipeline[index + 1].status === 'not_applicable' ? 'bg-gray-200' : 'bg-gray-400'
                  )} />
                  <div className={cn(
                    'w-0 h-0 border-t-4 border-b-4 border-l-4 border-transparent',
                    pipeline[index + 1].status === 'not_applicable' ? 'border-l-gray-200' : 'border-l-gray-400'
                  )} />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 px-4 pb-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span>Concluído</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span>Processando</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-gray-300" />
            <span>Pendente</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span>Erro</span>
          </div>
        </div>
      </div>
    </div>
  );
}