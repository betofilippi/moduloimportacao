'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ProcessoImportacaoList } from '@/components/processo_import/ProcessoImportacaoList';
import { ProcessoImportacaoModal } from '@/components/processo_import/ProcessoImportacaoModal';
import { NovoProcessoModal } from '@/components/processo_import/NovoProcessoModal';
import { ProcessoImportacao, DocumentPipelineStatus, DocumentType } from '@/types/processo-importacao';
import { Plus, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { getNocoDBService } from '@/lib/services/nocodb';
import { cn } from '@/lib/utils';

export default function ProcessoImportacaoPage() {
  const [processos, setProcessos] = useState<ProcessoImportacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProcesso, setSelectedProcesso] = useState<ProcessoImportacao | null>(null);
  const [showNovoModal, setShowNovoModal] = useState(false);
  const [showProcessoModal, setShowProcessoModal] = useState(false);

  useEffect(() => {
    loadProcessos();
  }, []);

  const loadProcessos = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/processo-importacao/list', {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Failed to load processes');
      }

      const data = await response.json();
      
      if (data.success) {
        // Convert backend data to frontend format
        const formattedProcessos: ProcessoImportacao[] = data.processes.map((p: any) => ({
          id: p.Id,
          numeroProcesso: p.numero_processo,
          descricao: p.descricao || '',
          empresa: p.empresa,
          dataInicio: p.data_inicio,
          dataPrevisaoTermino: p.data_previsao_termino,
          status: p.status || 'active',
          responsavel: p.responsavel,
          observacoes: p.observacoes,
          documentsPipeline: [], // This will be loaded by the card component
          createdAt: p.criado_em || p.data_inicio,
          updatedAt: p.atualizado_em || p.data_inicio,
          createdBy: p.criado_por || 'sistema',
        }));
        
        setProcessos(formattedProcessos);
      } else {
        throw new Error(data.error || 'Failed to load processes');
      }
    } catch (error) {
      console.error('Error loading processos:', error);
      toast.error('Erro ao carregar processos');
      setProcessos([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProcesso = async (values: Record<string, any>) => {
    try {
      // TODO: Save to NocoDB
      console.log('Creating processo:', values);
      
      // Create initial pipeline with all documents as pending
      const documentTypes: DocumentType[] = [
        'proforma_invoice',
        'commercial_invoice',
        'packing_list',
        'swift',
        'di',
        'numerario',
        'nota_fiscal',
      ];

      const newProcesso: ProcessoImportacao = {
        id: Date.now().toString(),
        ...values,
        documentsPipeline: documentTypes.map(type => ({
          documentType: type,
          status: 'pending' as const,
        })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'current_user', // TODO: Get from auth context
      };

      setProcessos(prev => [newProcesso, ...prev]);
      toast.success('Processo criado com sucesso!');
    } catch (error) {
      console.error('Error creating processo:', error);
      toast.error('Erro ao criar processo');
    }
  };

  const handleProcessoClick = (processo: ProcessoImportacao) => {
    setSelectedProcesso(processo);
    setShowProcessoModal(true);
  };

  const handleDocumentClick = (doc: DocumentPipelineStatus) => {
    // TODO: Navigate to document page or open document modal
    console.log('Document clicked:', doc);
    toast.info(`Documento ${doc.documentType} clicado`);
  };

  const handleEditProcesso = (processo: ProcessoImportacao) => {
    // TODO: Implement edit functionality
    console.log('Edit processo:', processo);
    toast.info('Funcionalidade de edição em desenvolvimento');
  };

  const handleDeleteProcesso = (processo: ProcessoImportacao) => {
    // TODO: Implement delete functionality
    console.log('Delete processo:', processo);
    toast.info('Funcionalidade de exclusão em desenvolvimento');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Processos de Importação</h1>
          <p className="text-muted-foreground">
            Gerencie e acompanhe todos os processos de importação
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={loadProcessos}
            disabled={loading}
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
          <Button onClick={() => setShowNovoModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Processo
          </Button>
        </div>
      </div>

      {/* Process List */}
      <ProcessoImportacaoList
        processos={processos}
        onProcessoClick={handleProcessoClick}
        loading={loading}
      />

      {/* Modals */}
      <NovoProcessoModal
        open={showNovoModal}
        onOpenChange={setShowNovoModal}
        onSubmit={handleCreateProcesso}
      />

      <ProcessoImportacaoModal
        processo={selectedProcesso}
        open={showProcessoModal}
        onOpenChange={setShowProcessoModal}
        onEdit={handleEditProcesso}
        onDelete={handleDeleteProcesso}
        onDocumentClick={handleDocumentClick}
      />
    </div>
  );
}