'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  History, 
  User, 
  Calendar,
  ChevronRight,
  Shield,
  AlertTriangle,
  FileText,
  Eye,
  EyeOff
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { KANBAN_CONFIG } from '@/config/nocodb-tables';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AuditLogEntry {
  id: string;
  hash_arquivo_origem: string;
  numero_processo: string;
  responsavel: string;
  ultima_etapa: string;
  nova_etapa: string;
  descricao_regra: string;
  created_at: string;
  updated_at: string;
}

interface StageAuditLogProps {
  processId: string;
  processNumber?: string;
  className?: string;
  maxHeight?: string;
}

export function StageAuditLog({
  processId,
  processNumber,
  className,
  maxHeight = '400px'
}: StageAuditLogProps) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (processId) {
      loadAuditLogs();
    }
  }, [processId]);

  const loadAuditLogs = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/processo-importacao/audit-logs?processId=${processId}`);
      
      if (!response.ok) {
        throw new Error('Erro ao carregar histórico de mudanças');
      }
      
      const data = await response.json();
      setLogs(data.logs || []);
    } catch (err) {
      console.error('Error loading audit logs:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const toggleLog = (logId: string) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedLogs(newExpanded);
  };

  const getStageInfo = (stageId: string) => {
    const stage = KANBAN_CONFIG.STAGES.find(s => s.id === stageId);
    return stage || { id: stageId, title: stageId, color: 'bg-gray-500', description: '' };
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return dateString;
    }
  };


  if (loading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Mudanças
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Mudanças
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            {error}
          </p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadAuditLogs}
            className="w-full"
          >
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Histórico de Mudanças
        </CardTitle>
        <CardDescription>
          {processNumber && `Processo: ${processNumber} • `}
          {logs.length} mudança(s) registrada(s)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhuma mudança de etapa registrada
          </p>
        ) : (
          <ScrollArea className="w-full pr-4" style={{ maxHeight }}>
            <div className="space-y-3">
              {logs.map((log) => {
                const isExpanded = expandedLogs.has(log.id);
                const fromStage = getStageInfo(log.ultima_etapa);
                const toStage = getStageInfo(log.nova_etapa);
                
                return (
                  <div
                    key={log.id}
                    className="relative pl-6 pb-3 border-l-2 border-muted last:border-l-0"
                  >
                    {/* Timeline dot */}
                    <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-background border-2 border-primary" />
                    
                    {/* Log entry */}
                    <div className="space-y-2">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge 
                              variant="outline"
                              className={cn('text-white border-0', fromStage.color)}
                            >
                              {fromStage.title}
                            </Badge>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            <Badge 
                              variant="outline"
                              className={cn('text-white border-0', toStage.color)}
                            >
                              {toStage.title}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {log.responsavel}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(log.created_at)}
                            </span>
                          </div>
                        </div>
                        
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => toggleLog(log.id)}
                        >
                          {isExpanded ? (
                            <EyeOff className="h-3 w-3" />
                          ) : (
                            <Eye className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                      
                      {/* Reason */}
                      {log.descricao_regra && (
                        <p className="text-sm">
                          <span className="font-medium">Motivo:</span> {log.descricao_regra}
                        </p>
                      )}
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}