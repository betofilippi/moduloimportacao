'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProcessoImportacao } from '@/types/processo-importacao';
import { Calendar, User, FileText, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

// Document type colors
const documentTypeColors: Record<string, string> = {
  proforma_invoice: 'bg-purple-500',
  commercial_invoice: 'bg-blue-500',
  packing_list: 'bg-green-500',
  swift: 'bg-orange-500',
  di: 'bg-red-500',
  numerario: 'bg-yellow-500',
  nota_fiscal: 'bg-pink-500',
  unknown: 'bg-gray-400'
};

// Document type short labels
const documentTypeShortLabels: Record<string, string> = {
  proforma_invoice: 'PI',
  commercial_invoice: 'COMMERCIAL',
  packing_list: 'PL',
  swift: 'SW',
  di: 'DI',
  numerario: 'NUM',
  nota_fiscal: 'NF',
  unknown: '?'
};

interface ProcessoImportacaoCardProps {
  processo: ProcessoImportacao;
  onClick?: () => void;
  className?: string;
}

export function ProcessoImportacaoCard({ 
  processo, 
  onClick,
  className 
}: ProcessoImportacaoCardProps) {
  const [documentData, setDocumentData] = useState<{
    total: number;
    types: string[];
    byType: Record<string, number>;
  }>({ total: 0, types: [], byType: {} });
  const [loading, setLoading] = useState(false);
  const loadedRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Only load if not already loaded
    if (!loadedRef.current) {
      loadedRef.current = true;
      loadDocumentData();
    }

    // Cleanup function
    return () => {
      // Cancel any pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      loadedRef.current = false;
    };
  }, [processo.id]);

  const loadDocumentData = async () => {
    // Prevent duplicate requests
    if (loading) return;

    // Cancel previous request if exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new AbortController
    abortControllerRef.current = new AbortController();

    try {
      setLoading(true);
      const response = await fetch('/api/processo-importacao/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ processId: processo.id }),
        signal: abortControllerRef.current.signal
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setDocumentData({
            total: data.documents.total,
            types: data.documents.types,
            byType: data.documents.byType
          });
        }
      }
    } catch (error) {
      // Ignore abort errors
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Error loading document data:', error);
      }
    } finally {
      setLoading(false);
    }
  };

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
    <Card 
      className={cn(
        'cursor-pointer transition-all hover:shadow-lg',
        className
      )}
      onClick={onClick}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {processo.numeroProcesso}
            </CardTitle>
            <CardDescription className="line-clamp-2">
              {processo.descricao}
            </CardDescription>
          </div>
          <Badge className={getStatusColor(processo.status)}>
            {getStatusLabel(processo.status)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Company and Responsible */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="h-4 w-4" />
            <span className="truncate">{processo.responsavel}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{new Date(processo.dataInicio).toLocaleDateString('pt-BR')}</span>
          </div>
        </div>

        {/* Document Count and Type Badges */}
        <div className="space-y-3">
          {/* Document Count */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Package className="h-4 w-4" />
              <span>
                {loading ? (
                  <span className="animate-pulse">Carregando...</span>
                ) : (
                  <span className="font-medium text-foreground">
                    {documentData.total} {documentData.total === 1 ? 'documento' : 'documentos'}
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Document Type Badges */}
          {!loading && documentData.types.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {documentData.types.map((type) => (
                <div
                  key={type}
                  className={cn(
                    "inline-flex items-center justify-center rounded-md px-2 py-1 text-xs font-medium text-white",
                    documentTypeColors[type] || 'bg-gray-400'
                  )}
                  title={`${documentData.byType[type]} ${type}`}
                >
                  <span className="font-bold">
                    {documentTypeShortLabels[type] || type.substring(0, 2).toUpperCase()}
                  </span>
                  {documentData.byType[type] > 1 && (
                    <span className="ml-1 text-xs opacity-90">
                      {documentData.byType[type]}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* No documents message */}
          {!loading && documentData.total === 0 && (
            <div className="text-sm text-muted-foreground italic">
              Nenhum documento anexado
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}