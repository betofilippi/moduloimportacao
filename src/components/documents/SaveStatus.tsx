/**
 * Save Status Component
 * 
 * Visual indicator for document save operations
 * Shows current status, last save time, and error messages
 */

import React from 'react';
import { CheckCircle, AlertCircle, Loader2, Save, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { SaveResult } from '@/services/documents/DocumentSaveService';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface SaveStatusProps {
  saving: boolean;
  error: string | null;
  lastSaveResult: SaveResult | null;
  lastSaveTime?: Date;
  onRetry?: () => void;
  onSave?: () => void;
  documentType?: string;
  autoSaveEnabled?: boolean;
  autoSaveInterval?: number;
}

export function SaveStatus({
  saving,
  error,
  lastSaveResult,
  lastSaveTime,
  onRetry,
  onSave,
  documentType,
  autoSaveEnabled = false,
  autoSaveInterval = 130000,
}: SaveStatusProps) {
  const getStatusIcon = () => {
    if (saving) {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    }
    if (error || (lastSaveResult && !lastSaveResult.success)) {
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
    if (lastSaveResult?.success) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    return <Save className="h-4 w-4 text-gray-400" />;
  };

  const getStatusText = () => {
    if (saving) {
      return 'Salvando...';
    }
    if (error) {
      return 'Erro ao salvar';
    }
    if (lastSaveResult?.success && lastSaveTime) {
      return `Salvo ${formatDistanceToNow(lastSaveTime, { 
        addSuffix: true, 
        locale: ptBR 
      })}`;
    }
    if (lastSaveResult && !lastSaveResult.success) {
      return 'Falha ao salvar';
    }
    return 'Não salvo';
  };

  const getStatusVariant = (): "default" | "secondary" | "destructive" | "outline" => {
    if (error || (lastSaveResult && !lastSaveResult.success)) {
      return 'destructive';
    }
    if (lastSaveResult?.success) {
      return 'secondary';
    }
    return 'outline';
  };

  return (
    <div className="flex items-center gap-4">
      {/* Status Badge */}
      <Badge variant={getStatusVariant()} className="flex items-center gap-2">
        {getStatusIcon()}
        <span>{getStatusText()}</span>
      </Badge>

      {/* Auto-save indicator */}
      {autoSaveEnabled && (
        <Badge variant="outline" className="text-xs">
          <RefreshCw className="h-3 w-3 mr-1" />
          Auto-save {autoSaveInterval / 1000}s
        </Badge>
      )}

      {/* Document ID */}
      {lastSaveResult?.success && lastSaveResult.documentId && (
        <span className="text-sm text-muted-foreground">
          ID: {lastSaveResult.documentId}
        </span>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        {/* Save button */}
        {onSave && (
          <Button
            onClick={onSave}
            disabled={saving}
            size="sm"
            variant="outline"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar
              </>
            )}
          </Button>
        )}

        {/* Retry button */}
        {error && onRetry && (
          <Button
            onClick={onRetry}
            disabled={saving}
            size="sm"
            variant="destructive"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Tentar novamente
          </Button>
        )}
      </div>

      {/* Error details */}
      {error && (
        <div className="absolute top-full left-0 mt-2 z-10">
          <Card className="shadow-lg">
            <CardContent className="p-3">
              <p className="text-sm text-red-600">{error}</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

/**
 * Compact version for inline use
 */
export function SaveStatusCompact({
  saving,
  error,
  lastSaveResult,
  lastSaveTime,
}: Pick<SaveStatusProps, 'saving' | 'error' | 'lastSaveResult' | 'lastSaveTime'>) {
  const getIcon = () => {
    if (saving) {
      return <Loader2 className="h-3 w-3 animate-spin" />;
    }
    if (error || (lastSaveResult && !lastSaveResult.success)) {
      return <AlertCircle className="h-3 w-3 text-red-500" />;
    }
    if (lastSaveResult?.success) {
      return <CheckCircle className="h-3 w-3 text-green-500" />;
    }
    return null;
  };

  const icon = getIcon();
  if (!icon) return null;

  return (
    <div className="inline-flex items-center gap-1" title={error || undefined}>
      {icon}
      {lastSaveTime && lastSaveResult?.success && (
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(lastSaveTime, { addSuffix: true, locale: ptBR })}
        </span>
      )}
    </div>
  );
}

/**
 * Save History Component
 * Shows recent save operations
 */
export interface SaveHistoryItem {
  id: string;
  documentType: string;
  documentId: string;
  timestamp: Date;
  success: boolean;
  error?: string;
}

export interface SaveHistoryProps {
  history: SaveHistoryItem[];
  maxItems?: number;
}

export function SaveHistory({ history, maxItems = 5 }: SaveHistoryProps) {
  const recentHistory = history.slice(0, maxItems);

  if (recentHistory.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center p-4">
        Nenhum salvamento recente
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {recentHistory.map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
        >
          <div className="flex items-center gap-2">
            {item.success ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-500" />
            )}
            <div>
              <p className="text-sm font-medium">{item.documentType}</p>
              <p className="text-xs text-muted-foreground">
                {item.documentId} • {formatDistanceToNow(item.timestamp, { 
                  addSuffix: true, 
                  locale: ptBR 
                })}
              </p>
            </div>
          </div>
          {item.error && (
            <span className="text-xs text-red-600" title={item.error}>
              Erro
            </span>
          )}
        </div>
      ))}
    </div>
  );
}