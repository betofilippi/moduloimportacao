'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ProcessoImportacao } from '@/types/processo-importacao';
import { Calendar, User, FileText, Package, GripVertical, AlertCircle, FileWarning, ChevronRight, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { KANBAN_CONFIG } from '@/config/nocodb-tables';

// Document type colors
const documentTypeColors: Record<string, string> = {
  proforma_invoice: 'bg-purple-500',
  commercial_invoice: 'bg-blue-500',
  packing_list: 'bg-green-500',
  swift: 'bg-orange-500',
  di: 'bg-red-500',
  numerario: 'bg-yellow-500',
  nota_fiscal: 'bg-pink-500',
  bl: 'bg-cyan-500',
  contrato_cambio: 'bg-indigo-500',
  unknown: 'bg-gray-400'
};

// Document type short labels
const documentTypeShortLabels: Record<string, string> = {
  proforma_invoice: 'PI',
  commercial_invoice: 'CI',
  packing_list: 'PL',
  swift: 'SW',
  di: 'DI',
  numerario: 'NUM',
  nota_fiscal: 'NF',
  bl: 'BL',
  contrato_cambio: 'CC',
  unknown: '?'
};

interface ProcessData {
  etapa?: string;
  stageInfo?: {
    id: string;
    title: string;
    color: string;
    description: string;
  };
}

interface BusinessRules {
  violations: Array<{
    ruleId: string;
    severity: 'error' | 'warning' | 'info';
    message: string;
  }>;
  suggestedStage?: string;
}

interface ProcessoImportacaoCardProps {
  processo: ProcessoImportacao;
  onClick?: () => void;
  onConnectDocument?: (processId: string) => void;
  onChangeStage?: (processId: string, currentStage: string) => void;
  className?: string;
  variant?: 'default' | 'compact';
  showGrip?: boolean;
}

export function ProcessoImportacaoCard({ 
  processo, 
  onClick,
  onConnectDocument,
  onChangeStage,
  className,
  variant = 'default',
  showGrip = false
}: ProcessoImportacaoCardProps) {
  const [documentData, setDocumentData] = useState<{
    total: number;
    types: string[];
    byType: Record<string, number>;
    missingTypes?: string[];
    missingDocumentsCount?: number;
  }>({ total: 0, types: [], byType: {} });
  const [processData, setProcessData] = useState<ProcessData>({});
  const [businessRules, setBusinessRules] = useState<BusinessRules>({ violations: [] });
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
            byType: data.documents.byType,
            missingTypes: data.documents.missingTypes,
            missingDocumentsCount: data.alerts.missingDocumentsCount
          });
          
          // Set process stage data
          if (data.process) {
            setProcessData({
              etapa: data.process.etapa,
              stageInfo: data.process.stageInfo
            });
          }
          
          // Set business rules data
          if (data.businessRules) {
            setBusinessRules({
              violations: data.businessRules.violations || [],
              suggestedStage: data.businessRules.suggestedStage
            });
          }
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

  const hasErrors = businessRules.violations.some(v => v.severity === 'error');
  const hasWarnings = businessRules.violations.some(v => v.severity === 'warning');

  return (
    <Card 
      className={cn(
        'cursor-pointer transition-all hover:shadow-lg',
        className
      )}
      onClick={onClick}
    >
      <CardHeader className={variant === 'compact' ? 'pb-3' : ''}>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-2 flex-1">
            {showGrip && (
              <GripVertical className="h-5 w-5 text-muted-foreground/50 flex-shrink-0 mt-0.5" />
            )}
            <div className="space-y-1 flex-1">
              <CardTitle className={cn(
                "flex items-center gap-2",
                variant === 'compact' ? 'text-base' : 'text-lg'
              )}>
                <FileText className="h-4 w-4" />
                {processo.numeroProcesso}
                {processo.invoiceNumber && (
                  <span className="text-sm text-muted-foreground">
                    ({processo.invoiceNumber})
                  </span>
                )}
              </CardTitle>
              {variant !== 'compact' && (
                <CardDescription className="line-clamp-2">
                  {processo.descricao}
                </CardDescription>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge className={cn(
              getStatusColor(processo.status),
              variant === 'compact' && 'text-xs'
            )}>
              {getStatusLabel(processo.status)}
            </Badge>
            
            {/* Stage Badge */}
            {processData.stageInfo && (
              <Badge 
                className={cn(
                  'text-white',
                  processData.stageInfo.color,
                  variant === 'compact' && 'text-xs'
                )}
              >
                <Layers className="h-3 w-3 mr-1" />
                {processData.stageInfo.title}
              </Badge>
            )}
          </div>
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

        {/* Business Rules Alerts */}
        {(hasErrors || hasWarnings) && (
          <div className="space-y-2">
            {hasErrors && (
              <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 p-2 rounded-md">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span className="text-xs">
                  {businessRules.violations.filter(v => v.severity === 'error').length} violação(ões) crítica(s)
                </span>
              </div>
            )}
            {hasWarnings && (
              <div className="flex items-start gap-2 text-sm text-yellow-600 bg-yellow-50 p-2 rounded-md">
                <FileWarning className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span className="text-xs">
                  {businessRules.violations.filter(v => v.severity === 'warning').length} alerta(s)
                </span>
              </div>
            )}
          </div>
        )}

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
            
            {/* Change Stage Button */}
            {onChangeStage && processData.etapa && (
              <Button
                size="sm"
                variant="ghost"
                className="h-auto p-1"
                onClick={(e) => {
                  e.stopPropagation();
                  onChangeStage(processo.id, processData.etapa || 'solicitado');
                }}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
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

        {/* Suggested Stage */}
        {businessRules.suggestedStage && 
         businessRules.suggestedStage !== processData.etapa && 
         !loading && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              Etapa sugerida: <span className="font-medium">
                {KANBAN_CONFIG.STAGES.find(s => s.id === businessRules.suggestedStage)?.title || businessRules.suggestedStage}
              </span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}