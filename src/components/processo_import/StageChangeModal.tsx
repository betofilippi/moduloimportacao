'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { KANBAN_CONFIG } from '@/config/nocodb-tables';
import { ProcessBusinessRules } from '@/lib/services/ProcessBusinessRules';
import { 
  AlertCircle, 
  FileWarning, 
  Info, 
  Layers,
  ChevronRight,
  FileText,
  CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface StageInfo {
  stage: string;
  title: string;
  allowed: boolean;
  requiredDocs?: string[];
  violations?: RuleViolation[];
}

interface Violation {
  ruleId: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  requiredDocuments?: string[];
}

interface StageChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (newStage: string, forceUpdate: boolean, reason: string, notes: string) => Promise<void>;
  processId: string;
  currentStage: string;
  processNumber: string;
  targetStage?: string;
}

export function StageChangeModal({
  isOpen,
  onClose,
  onConfirm,
  processId,
  currentStage,
  processNumber,
  targetStage
}: StageChangeModalProps) {
  const [selectedStage, setSelectedStage] = useState<string>('');
  const [forceUpdate, setForceUpdate] = useState(false);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [stageData, setStageData] = useState<{
    stages: StageInfo[];
    violations: Violation[];
    requiredDocuments: any[];
    suggestedStage?: string;
    attachedDocuments?: any[];
  }>({
    stages: [],
    violations: [],
    requiredDocuments: [],
    attachedDocuments: []
  });

  useEffect(() => {
    if (isOpen && processId) {
      checkStageRules();
      
      // If targetStage is provided (from drag and drop), pre-select it
      if (targetStage) {
        setSelectedStage(targetStage);
      }
    }
  }, [isOpen, processId, targetStage]);

  const checkStageRules = async () => {
    setChecking(true);
    try {
      const response = await fetch(`/api/processo-importacao/update-stage?processId=${processId}`);
      if (response.ok) {
        const data = await response.json();
        // Store detailed information for each stage
        const stagesWithDetails = data.canTransitionTo?.map((s: any) => {
          const stageConfig = KANBAN_CONFIG.STAGES.find(st => st.id === s.stage);
          return {
            ...s,
            title: stageConfig?.title || s.stage
          };
        }) || [];
        
        setStageData({
          stages: stagesWithDetails,
          violations: data.violations || [],
          requiredDocuments: data.requiredDocuments || [],
          suggestedStage: data.suggestedStage,
          attachedDocuments: data.attachedDocuments || []
        });
        
        // If targetStage is provided, check if force update is needed
        if (targetStage) {
          const targetStageInfo = stagesWithDetails.find((s: any) => s.stage === targetStage);
          if (targetStageInfo && !targetStageInfo.allowed) {
            setForceUpdate(true);
          }
        } else if (data.suggestedStage && data.suggestedStage !== currentStage) {
          setSelectedStage(data.suggestedStage);
        }
      }
    } catch (error) {
      console.error('Error checking stage rules:', error);
    } finally {
      setChecking(false);
    }
  };

  const handleConfirm = async () => {
    if (!selectedStage) return;

    setLoading(true);
    try {
      await onConfirm(selectedStage, forceUpdate, reason || 'Mudança manual de etapa', notes);
      handleClose();
    } catch (error) {
      console.error('Error updating stage:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedStage('');
    setForceUpdate(false);
    setReason('');
    setNotes('');
    setStageData({
      stages: [],
      violations: [],
      requiredDocuments: []
    });
    onClose();
  };

  const getStageIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <AlertCircle className="h-4 w-4" />;
      case 'warning':
        return <FileWarning className="h-4 w-4" />;
      case 'info':
        return <Info className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getStageColor = (stageId: string) => {
    const stage = KANBAN_CONFIG.STAGES.find(s => s.id === stageId);
    return stage?.color || 'bg-gray-500';
  };

  const currentStageInfo = KANBAN_CONFIG.STAGES.find(s => s.id === currentStage);
  const selectedStageInfo = KANBAN_CONFIG.STAGES.find(s => s.id === selectedStage);
  const selectedStageData = stageData.stages.find(s => s.stage === selectedStage);
  const hasViolations = stageData.violations.length > 0;
  const hasErrors = stageData.violations.some(v => v.severity === 'error');

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-neutral-950 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Alterar Etapa do Processo</DialogTitle>
          <DialogDescription>
            Processo: <span className="font-medium">{processNumber}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Stage */}
          <div className="space-y-2">
            <Label>Etapa Atual</Label>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
              <Layers className="h-4 w-4" />
              <Badge className={cn('text-white', getStageColor(currentStage))}>
                {currentStageInfo?.title || currentStage}
              </Badge>
              {currentStageInfo?.description && (
                <span className="text-sm text-muted-foreground">
                  - {currentStageInfo.description}
                </span>
              )}
            </div>
          </div>

          {/* Current Violations */}
          {hasViolations && (
            <Alert variant={hasErrors ? 'destructive' : 'warning'}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium mb-2">Inconsistências na etapa atual:</p>
                <ul className="space-y-1">
                  {stageData.violations.map((violation, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      {getStageIcon(violation.severity)}
                      <span>{violation.message}</span>
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Suggested Stage */}
          {stageData.suggestedStage && stageData.suggestedStage !== currentStage && !checking && (
            <Alert className="border-green-500 bg-green-50/10">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-900">
                <span className="font-medium">Etapa recomendada: </span>
                {KANBAN_CONFIG.STAGES.find(s => s.id === stageData.suggestedStage)?.title || stageData.suggestedStage}
              </AlertDescription>
            </Alert>
          )}

          {/* Stage Selection */}
          <div className="space-y-2">
            <Label>Nova Etapa</Label>
            {checking ? (
              <p className="text-sm text-muted-foreground animate-pulse">
                Verificando etapas disponíveis...
              </p>
            ) : (
              <RadioGroup value={selectedStage} onValueChange={setSelectedStage}>
                {stageData.stages.map((stage) => {
                  const stageInfo = KANBAN_CONFIG.STAGES.find(s => s.id === stage.stage);
                  const isSuggested = stage.stage === stageData.suggestedStage;
                  
                  return (
                    <div
                      key={stage.stage}
                      className={cn(
                        "flex items-start space-x-3 p-4 rounded-lg border transition-colors cursor-pointer",
                        'border-border hover:border-primary/50',
                        selectedStage === stage.stage && 'border-primary bg-primary/5',
                        isSuggested && !selectedStage && 'border-green-500/50'
                      )}
                      onClick={() => setSelectedStage(stage.stage)}
                    >
                      <RadioGroupItem 
                        value={stage.stage} 
                        className="mt-0.5"
                      />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {stageInfo?.title || stage.stage}
                          </span>
                          {isSuggested && (
                            <Badge variant="outline" className="text-green-600 border-green-600 bg-green-50">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Recomendado
                            </Badge>
                          )}
                        </div>
                        {stageInfo?.description && (
                          <p className="text-sm text-muted-foreground">
                            {stageInfo.description}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </RadioGroup>
            )}
          </div>

          {/* Force Update Option */}
          {selectedStage && selectedStageData && !selectedStageData.allowed && (
            <Alert variant="warning">
              <FileWarning className="h-4 w-4" />
              <AlertDescription>
                {(() => {
                  // Get the transition info from API
                  const transition = stageData.stages.find(s => s.stage === selectedStage);
                  const missingDocs = transition?.requiredDocs || [];
                  
                  if (missingDocs.length > 0) {
                    return (
                      <>
                        <p className="font-medium mb-2">
                          Documentos necessários para esta etapa:
                        </p>
                        <ul className="list-disc list-inside text-sm space-y-1">
                          {missingDocs.map((docType) => {
                            const docInfo = ProcessBusinessRules.getDocumentTypeInfo(docType);
                            return (
                              <li key={docType}>{docInfo?.name || docType}</li>
                            );
                          })}
                        </ul>
                      </>
                    );
                  } else {
                    return (
                      <p className="font-medium">
                        Esta transição requer aprovação manual.
                      </p>
                    );
                  }
                })()}
                <div className="flex items-center space-x-3 mt-4 p-3 border rounded-md bg-orange-50/50 border-orange-200">
                  <Checkbox 
                    id="force" 
                    checked={forceUpdate}
                    onCheckedChange={(checked) => setForceUpdate(checked as boolean)}
                    className="h-5 w-5"
                  />
                  <Label htmlFor="force" className="text-sm font-medium cursor-pointer flex-1">
                    Forçar mudança de etapa (requer justificativa)
                  </Label>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Reason Field */}
          <div className="space-y-2">
            <Label htmlFor="reason">
              Motivo da Mudança {forceUpdate && <span className="text-red-500">*</span>}
            </Label>
            <Textarea
              id="reason"
              placeholder={
                forceUpdate 
                  ? "Justifique por que está forçando a mudança de etapa..."
                  : "Descreva o motivo da mudança de etapa..."
              }
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className={cn(
                forceUpdate && !reason && "border-red-500"
              )}
              rows={3}
            />
          </div>

          {/* Additional Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observações Adicionais</Label>
            <Textarea
              id="notes"
              placeholder="Adicione observações relevantes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={
              loading || 
              !selectedStage || 
              selectedStage === currentStage ||
              (forceUpdate && !reason)
            }
          >
            {loading ? (
              <>Atualizando...</>
            ) : (
              <>
                <ChevronRight className="h-4 w-4 mr-1" />
                Confirmar Mudança
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}