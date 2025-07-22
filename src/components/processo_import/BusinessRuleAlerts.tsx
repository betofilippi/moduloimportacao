'use client';

import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  AlertCircle, 
  FileWarning, 
  Info, 
  CheckCircle,
  FileText,
  ChevronRight,
  Eye,
  EyeOff
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProcessBusinessRules } from '@/lib/services/ProcessBusinessRules';

interface Violation {
  ruleId: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  requiredDocuments?: string[];
  suggestedStage?: string;
}

interface BusinessRuleAlertsProps {
  violations: Violation[];
  currentStage: string;
  suggestedStage?: string;
  requiredDocuments?: any[];
  onFixViolation?: (violation: Violation) => void;
  onChangeStage?: () => void;
  className?: string;
  showDetails?: boolean;
}

export function BusinessRuleAlerts({
  violations,
  currentStage,
  suggestedStage,
  requiredDocuments = [],
  onFixViolation,
  onChangeStage,
  className,
  showDetails = true
}: BusinessRuleAlertsProps) {
  const [expandedRules, setExpandedRules] = React.useState<Set<string>>(new Set());

  if (!violations || violations.length === 0) {
    return null;
  }

  const errorViolations = violations.filter(v => v.severity === 'error');
  const warningViolations = violations.filter(v => v.severity === 'warning');
  const infoViolations = violations.filter(v => v.severity === 'info');

  const toggleRule = (ruleId: string) => {
    const newExpanded = new Set(expandedRules);
    if (newExpanded.has(ruleId)) {
      newExpanded.delete(ruleId);
    } else {
      newExpanded.add(ruleId);
    }
    setExpandedRules(newExpanded);
  };

  const getSeverityIcon = (severity: string) => {
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

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'info':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getRuleDetails = (ruleId: string): string => {
    switch (ruleId) {
      case 'RN-01':
        return 'Todo processo de importação deve ter uma Proforma Invoice anexada. Este é um documento fundamental que detalha os termos comerciais da importação.';
      case 'RN-02':
        return 'A etapa "Solicitado" requer pelo menos uma Proforma Invoice ou Commercial Invoice para prosseguir.';
      case 'RN-04':
        return 'O processo pode avançar para "Em Transporte Internacional" quando o Bill of Lading (BL) for anexado.';
      case 'RN-05':
        return 'A Declaração de Importação (DI) permite que o processo avance para "Processamento Nacional".';
      case 'RN-07':
        return 'A Nota Fiscal indica que a mercadoria foi recebida e o processo pode ser marcado como "Recebido".';
      case 'RN-10':
        return 'Para auditar o processo, todos os documentos obrigatórios devem estar anexados e validados.';
      default:
        return '';
    }
  };

  const renderViolationGroup = (
    title: string, 
    violations: Violation[], 
    icon: React.ReactNode,
    colorClass: string
  ) => {
    if (violations.length === 0) return null;

    return (
      <div className="space-y-2">
        <h4 className="text-sm font-medium flex items-center gap-2">
          {icon}
          {title} ({violations.length})
        </h4>
        <div className="space-y-2">
          {violations.map((violation, index) => {
            const isExpanded = expandedRules.has(violation.ruleId);
            
            return (
              <Alert key={index} className={cn(colorClass)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <AlertDescription className="flex items-start gap-2">
                      {getSeverityIcon(violation.severity)}
                      <div className="flex-1">
                        <p className="font-medium">{violation.message}</p>
                        
                        {violation.requiredDocuments && violation.requiredDocuments.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            <span className="text-sm">Documentos necessários:</span>
                            {violation.requiredDocuments.map((docType) => {
                              const docInfo = ProcessBusinessRules.getDocumentTypeInfo(docType);
                              return (
                                <Badge key={docType} variant="outline" className="text-xs">
                                  <FileText className="h-3 w-3 mr-1" />
                                  {docInfo?.name || docType}
                                </Badge>
                              );
                            })}
                          </div>
                        )}
                        
                        {showDetails && getRuleDetails(violation.ruleId) && (
                          <>
                            {isExpanded && (
                              <p className="mt-2 text-sm opacity-80">
                                {getRuleDetails(violation.ruleId)}
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    </AlertDescription>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {showDetails && getRuleDetails(violation.ruleId) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => toggleRule(violation.ruleId)}
                      >
                        {isExpanded ? (
                          <EyeOff className="h-3 w-3" />
                        ) : (
                          <Eye className="h-3 w-3" />
                        )}
                      </Button>
                    )}
                    
                    {onFixViolation && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2"
                        onClick={() => onFixViolation(violation)}
                      >
                        Corrigir
                        <ChevronRight className="h-3 w-3 ml-1" />
                      </Button>
                    )}
                  </div>
                </div>
              </Alert>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Análise de Regras de Negócio
        </CardTitle>
        <CardDescription>
          Verificação automática de conformidade do processo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="flex items-center gap-4 p-3 bg-muted rounded-md">
          <div className="flex items-center gap-2">
            <Badge variant={errorViolations.length > 0 ? "destructive" : "secondary"}>
              {errorViolations.length} Erros
            </Badge>
            <Badge variant={warningViolations.length > 0 ? "outline" : "secondary"} 
                   className="border-yellow-600 text-yellow-700">
              {warningViolations.length} Avisos
            </Badge>
            <Badge variant="secondary">
              {infoViolations.length} Informações
            </Badge>
          </div>
          
          {suggestedStage && suggestedStage !== currentStage && onChangeStage && (
            <Button
              size="sm"
              variant="outline"
              onClick={onChangeStage}
              className="ml-auto"
            >
              <CheckCircle className="h-4 w-4 mr-1 text-green-600" />
              Avançar para etapa sugerida
            </Button>
          )}
        </div>

        {/* Violations by severity */}
        <div className="space-y-4">
          {renderViolationGroup(
            'Erros Críticos',
            errorViolations,
            <AlertCircle className="h-4 w-4 text-red-600" />,
            'text-red-600 bg-red-50 border-red-200'
          )}
          
          {renderViolationGroup(
            'Avisos',
            warningViolations,
            <FileWarning className="h-4 w-4 text-yellow-600" />,
            'text-yellow-600 bg-yellow-50 border-yellow-200'
          )}
          
          {renderViolationGroup(
            'Informações',
            infoViolations,
            <Info className="h-4 w-4 text-blue-600" />,
            'text-blue-600 bg-blue-50 border-blue-200'
          )}
        </div>

        {/* No violations message */}
        {violations.length === 0 && (
          <Alert className="bg-green-50 border-green-200 text-green-700">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Todas as regras de negócio estão sendo cumpridas. O processo está em conformidade.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}