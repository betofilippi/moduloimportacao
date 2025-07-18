'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface NovoProcessoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: Record<string, any>) => void | Promise<void>;
}

export function NovoProcessoModal({
  open,
  onOpenChange,
  onSubmit,
}: NovoProcessoModalProps) {
  const router = useRouter();
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [numeroProcesso, setNumeroProcesso] = useState('IMP-[INVOICE]-[MM]-[AAAA]');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Gera o número do processo automaticamente em tempo real
  useEffect(() => {
    // Sempre mostra o formato, mesmo com campos vazios
    if (!invoiceNumber && !dataInicio) {
      setNumeroProcesso('IMP-[INVOICE]-[MM]-[AAAA]');
    } else if (invoiceNumber && !dataInicio) {
      setNumeroProcesso(`IMP-${invoiceNumber}-[MM]-[AAAA]`);
    } else if (!invoiceNumber && dataInicio) {
      const date = new Date(dataInicio);
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      setNumeroProcesso(`IMP-[INVOICE]-${month}-${year}`);
    } else {
      const date = new Date(dataInicio);
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      setNumeroProcesso(`IMP-${invoiceNumber}-${month}-${year}`);
    }
  }, [invoiceNumber, dataInicio]);

  // Limpa os campos quando o modal é fechado
  useEffect(() => {
    if (!open) {
      setInvoiceNumber('');
      setDataInicio('');
      setNumeroProcesso('IMP-[INVOICE]-[MM]-[AAAA]');
      setIsSubmitting(false);
    }
  }, [open]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Cria o processo com dados mínimos
      await onSubmit({
        numeroProcesso,
        invoice_number: invoiceNumber,
        data_inicio: dataInicio,
        descricao: `Processo de importação para invoice ${invoiceNumber}`,
        empresa: 'A definir', // Será preenchido posteriormente
        responsavel: 'Sistema' // Será atualizado pelo usuário logado
      });
      
      // Fecha o modal e redireciona para OCR com parâmetros
      onOpenChange(false);
      // Por padrão, vamos usar proforma_invoice como tipo inicial
      router.push('/ocr?documentType=proforma_invoice&from=new_process');
    } catch (error) {
      console.error('Erro ao criar processo:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = invoiceNumber && dataInicio;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!bg-zinc-900 max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Processo de Importação</DialogTitle>
          <DialogDescription>
            Informe o número da invoice e a data de início para criar o processo.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          {/* Campo Número do Processo (não editável) */}
          <div className="space-y-2">
            <Label>Número do Processo</Label>
            <div className="flex items-center gap-2 p-3 bg-zinc-800 rounded-md border border-zinc-700 transition-all duration-200">
              <FileText className="h-4 w-4 text-zinc-400" />
              <span className="text-sm font-mono transition-all duration-200">
                {numeroProcesso.split('').map((char, index) => (
                  <span 
                    key={index} 
                    className={
                      char === '[' || char === ']' 
                        ? 'text-zinc-500' 
                        : 'text-zinc-100'
                    }
                  >
                    {char}
                  </span>
                ))}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Gerado automaticamente com base na invoice e data
            </p>
          </div>

          {/* Campo Invoice Number */}
          <div className="space-y-2">
            <Label htmlFor="invoice">Número da Invoice *</Label>
            <Input
              id="invoice"
              type="text"
              placeholder="Ex: INV-2024-001"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              className="bg-zinc-800 border-zinc-700"
            />
          </div>

          {/* Campo Data de Início */}
          <div className="space-y-2">
            <Label htmlFor="data">Data de Início *</Label>
            <Input
              id="data"
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="bg-zinc-800 border-zinc-700"
              max={format(new Date(), 'yyyy-MM-dd')}
            />
          </div>
        </div>

        {/* Botões de ação */}
        <div className="flex justify-end gap-3 mt-6">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isFormValid || isSubmitting}
            className="bg-primary hover:bg-primary/90"
          >
            <FileText className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Criando...' : 'Criar e Ir para OCR'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}