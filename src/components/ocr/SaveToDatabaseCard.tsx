'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Database, Save, CheckCircle, AlertCircle, Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import { SaveStatus } from '@/components/documents/SaveStatus';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface SaveToDatabaseCardProps {
  documentType: string | null;
  hasData: boolean;
  saving: boolean;
  error: string | null;
  lastSaveResult: any;
  lastSaveTime?: Date;
  isAlreadySaved?: boolean;
  fileHash?: string;
  hasChanges?: boolean;
  onSave: () => void;
  onUpdate?: () => void;
  onReset?: () => void;
  resetting?: boolean;
}

export function SaveToDatabaseCard({
  documentType,
  hasData,
  saving,
  error,
  lastSaveResult,
  lastSaveTime,
  isAlreadySaved = false,
  fileHash,
  hasChanges = false,
  onSave,
  onUpdate,
  onReset,
  resetting = false
}: SaveToDatabaseCardProps) {
  const [showResetDialog, setShowResetDialog] = useState(false);
  
  const getDocumentTypeLabel = (type: string | null) => {
    if (!type) return 'Nenhum documento';
    
    const labels: Record<string, string> = {
      'commercial_invoice': 'Commercial Invoice',
      'di': 'Declaração de Importação (DI)',
      'packing_list': 'Packing List',
      'proforma_invoice': 'Proforma Invoice',
      'swift': 'SWIFT',
      'numerario': 'Numerário'
    };
    
    return labels[type] || type.replace(/_/g, ' ').toUpperCase();
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Salvar no Sistema
        </CardTitle>
        <CardDescription>
          Persista os dados processados no banco de dados
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Document Type */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Tipo de Documento:</span>
          <Badge variant={documentType ? "default" : "secondary"}>
            {getDocumentTypeLabel(documentType)}
          </Badge>
        </div>

        {/* Status Information */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Status:</span>
            <span className="flex items-center gap-2">
              {!hasData && (
                <>
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                  <span className="text-yellow-600">Nenhum dado processado</span>
                </>
              )}
              {hasData && isAlreadySaved && !hasChanges && (
                <>
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span className="text-amber-600">Dados já salvos no banco</span>
                </>
              )}
              {hasData && isAlreadySaved && hasChanges && (
                <>
                  <AlertCircle className="h-4 w-4 text-blue-500" />
                  <span className="text-blue-600">Dados editados - pronto para atualizar</span>
                </>
              )}
              {hasData && !isAlreadySaved && !lastSaveResult && (
                <>
                  <AlertCircle className="h-4 w-4 text-blue-500" />
                  <span className="text-blue-600">Pronto para salvar</span>
                </>
              )}
              {hasData && lastSaveResult?.success && (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-green-600">Salvo com sucesso</span>
                </>
              )}
              {hasData && lastSaveResult && !lastSaveResult.success && (
                <>
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span className="text-red-600">Erro ao salvar</span>
                </>
              )}
            </span>
          </div>

          {/* Last Save Info */}
          {lastSaveTime && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Último salvamento:</span>
              <span className="text-xs">
                {lastSaveTime.toLocaleString('pt-BR')}
              </span>
            </div>
          )}

          {/* Document ID */}
          {lastSaveResult?.documentId && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">ID do Documento:</span>
              <span className="font-mono text-xs">
                {lastSaveResult.documentId}
              </span>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Save/Update Button */}
        {isAlreadySaved && hasChanges && onUpdate ? (
          <Button 
            onClick={onUpdate} 
            disabled={!hasData || saving}
            className="w-full border-2"
            size="lg"
            variant="default"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Atualizando...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar Registros
              </>
            )}
          </Button>
        ) : (
          <Button 
            onClick={onSave} 
            disabled={!hasData || !!lastSaveResult || saving || isAlreadySaved}
            className="w-full border-2"
            size="lg"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvar no Banco de Dados
              </>
            )}
          </Button>
        )}

        {/* Reset Data Section */}
        {isAlreadySaved && hasData && (
          <div className="space-y-3 pt-4 border-t">
            <p className="text-sm text-muted-foreground text-center">
              Deseja atualizar os dados do arquivo carregado?
            </p>
            <Button
              onClick={() => setShowResetDialog(true)}
              disabled={resetting}
              variant="outline"
              className="w-full"
              size="sm"
            >
              {resetting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Resetando...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Resetar Dados
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Isso irá limpar os dados salvos e permitir novo processamento
            </p>
          </div>
        )}

        {/* Additional Info */}
        <div className="text-xs text-muted-foreground text-center">
          Os dados serão salvos no NocoDB e ficarão disponíveis para consulta e relatórios
        </div>
      </CardContent>

      {/* Reset Confirmation Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent className='bg-neutral-900'>
          <DialogHeader>
            <DialogTitle>Confirmar Reset de Dados</DialogTitle>
            <DialogDescription>
              Esta ação irá:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Deletar todos os dados salvos deste documento</li>
                <li>Permitir novo processamento do arquivo</li>
                <li>Limpar o histórico de salvamento</li>
              </ul>
              <br />
              Esta ação não pode ser desfeita. Tem certeza que deseja continuar?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowResetDialog(false)}
              disabled={resetting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setShowResetDialog(false);
                onReset?.();
              }}
              disabled={resetting}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Confirmar Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}