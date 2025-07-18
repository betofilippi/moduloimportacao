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

  // Mock data for development - replace with actual NocoDB integration
  useEffect(() => {
    loadProcessos();
  }, []);

  const loadProcessos = async () => {
    setLoading(true);
    try {
      // TODO: Replace with actual NocoDB query
      // const nocodb = getNocoDBService();
      // const result = await nocodb.find('processo_importacao_table_id');
      
      // Mock data for now
      const mockProcessos: ProcessoImportacao[] = [
        {
          id: '1',
          numeroProcesso: 'IMP-2024-001',
          descricao: 'Importação de equipamentos eletrônicos da China',
          empresa: 'Tech Import Ltda',
          dataInicio: '2024-01-15',
          dataPrevisaoTermino: '2024-02-15',
          status: 'active',
          responsavel: 'João Silva',
          observacoes: 'Processo em andamento conforme cronograma',
          documentsPipeline: [
            { documentType: 'proforma_invoice' as DocumentType, status: 'completed', processedAt: '2024-01-16' },
            { documentType: 'commercial_invoice' as DocumentType, status: 'completed', processedAt: '2024-01-18' },
            { documentType: 'packing_list' as DocumentType, status: 'completed', processedAt: '2024-01-18' },
            { documentType: 'swift' as DocumentType, status: 'processing' },
            { documentType: 'di' as DocumentType, status: 'pending' },
            { documentType: 'numerario' as DocumentType, status: 'pending' },
            { documentType: 'nota_fiscal' as DocumentType, status: 'not_applicable' },
          ],
          createdAt: '2024-01-15',
          updatedAt: '2024-01-20',
          createdBy: 'admin',
        },
        {
          id: '2',
          numeroProcesso: 'IMP-2024-002',
          descricao: 'Importação de matéria-prima têxtil',
          empresa: 'Textil Brasil SA',
          dataInicio: '2024-01-20',
          status: 'active',
          responsavel: 'Maria Santos',
          documentsPipeline: [
            { documentType: 'proforma_invoice' as DocumentType, status: 'completed' },
            { documentType: 'commercial_invoice' as DocumentType, status: 'error', error: 'Valor divergente' },
            { documentType: 'packing_list' as DocumentType, status: 'pending' },
            { documentType: 'swift' as DocumentType, status: 'pending' },
            { documentType: 'di' as DocumentType, status: 'pending' },
            { documentType: 'numerario' as DocumentType, status: 'pending' },
            { documentType: 'nota_fiscal' as DocumentType, status: 'pending' },
          ],
          createdAt: '2024-01-20',
          updatedAt: '2024-01-21',
          createdBy: 'admin',
        },
      ];

      setProcessos(mockProcessos);
    } catch (error) {
      console.error('Error loading processos:', error);
      toast.error('Erro ao carregar processos');
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