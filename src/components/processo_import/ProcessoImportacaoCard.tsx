'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProcessoImportacao } from '@/types/processo-importacao';
import { Calendar, User, FileText, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  // Calculate progress
  const totalDocs = processo.documentsPipeline.length;
  const completedDocs = processo.documentsPipeline.filter(d => d.status === 'completed').length;
  const progressPercentage = totalDocs > 0 ? (completedDocs / totalDocs) * 100 : 0;

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

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-medium">{completedDocs}/{totalDocs} documentos</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Document Summary */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <TrendingUp className="h-4 w-4" />
          <span>
            {processo.documentsPipeline.filter(d => d.status === 'processing').length} em processamento
          </span>
          {processo.documentsPipeline.filter(d => d.status === 'error').length > 0 && (
            <Badge variant="destructive" className="text-xs">
              {processo.documentsPipeline.filter(d => d.status === 'error').length} erro(s)
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}