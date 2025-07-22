'use client';

import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Download, Eye, Trash2, Calendar, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DocumentData {
  id: string;
  hashArquivo: string;
  nomeArquivoOriginal: string;
  tipoDocumento: string;
  statusProcessamento: string;
  dataUpload: string;
  idDocumento?: string;
  header?: any;
}

interface DocumentsTableProps {
  documents: DocumentData[];
  onViewDocument?: (document: DocumentData) => void;
  onDeleteDocument?: (document: DocumentData) => void;
  onDownloadDocument?: (document: DocumentData) => void;
  loading?: boolean;
  className?: string;
}

// Document type labels in Portuguese
const documentTypeLabels: Record<string, string> = {
  proforma_invoice: 'Proforma Invoice',
  commercial_invoice: 'Commercial Invoice',
  packing_list: 'Packing List',
  swift: 'SWIFT',
  di: 'Declaração de Importação',
  numerario: 'Numerário',
  nota_fiscal: 'Nota Fiscal',
  bl: 'Bill of Lading',
  contrato_cambio: 'Contrato de Câmbio',
  unknown: 'Desconhecido'
};

// Document type colors
const documentTypeColors: Record<string, string> = {
  proforma_invoice: 'bg-purple-100 text-purple-800',
  commercial_invoice: 'bg-blue-100 text-blue-800',
  packing_list: 'bg-green-100 text-green-800',
  swift: 'bg-orange-100 text-orange-800',
  di: 'bg-red-100 text-red-800',
  numerario: 'bg-yellow-100 text-yellow-800',
  nota_fiscal: 'bg-pink-100 text-pink-800',
  bl: 'bg-cyan-100 text-cyan-800',
  contrato_cambio: 'bg-indigo-100 text-indigo-800',
  unknown: 'bg-gray-100 text-gray-800'
};

// Status colors
const statusColors: Record<string, string> = {
  pendente: 'bg-yellow-100 text-yellow-800',
  processando: 'bg-blue-100 text-blue-800',
  completo: 'bg-green-100 text-green-800',
  erro: 'bg-red-100 text-red-800'
};

export function DocumentsTable({
  documents,
  onViewDocument,
  onDeleteDocument,
  onDownloadDocument,
  loading = false,
  className
}: DocumentsTableProps) {
  if (loading) {
    return (
      <div className={cn("w-full p-8 text-center", className)}>
        <p className="text-muted-foreground animate-pulse">Carregando documentos...</p>
      </div>
    );
  }

  if (!documents || documents.length === 0) {
    return (
      <div className={cn("w-full p-8 text-center", className)}>
        <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground">Nenhum documento anexado a este processo</p>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  const getKeyInfo = (document: DocumentData): string => {
    if (!document.header) return '-';
    
    switch (document.tipoDocumento) {
      case 'proforma_invoice':
        return document.header.proformaNumber || document.header.invoiceNumber || '-';
      case 'commercial_invoice':
        return document.header.invoiceNumber || '-';
      case 'packing_list':
        return document.header.packingListNumber || document.header.invoiceNumber || '-';
      case 'swift':
        return document.header.referenceNumber || document.header.swiftCode || '-';
      case 'di':
        return document.header.diNumber || '-';
      case 'bl':
        return document.header.blNumber || '-';
      case 'contrato_cambio':
        return document.header.contrato || '-';
      case 'numerario':
        return document.header.invoiceNumber || document.header.nfeNumber || '-';
      case 'nota_fiscal':
        return document.header.nfeNumber || '-';
      default:
        return '-';
    }
  };

  return (
    <div className={cn("w-full rounded-md border", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40%]">Documento</TableHead>
            <TableHead className="w-[15%]">Tipo</TableHead>
            <TableHead className="w-[15%]">Referência</TableHead>
            <TableHead className="w-[15%]">Data Upload</TableHead>
            <TableHead className="w-[10%]">Status</TableHead>
            <TableHead className="w-[5%] text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((document) => (
            <TableRow key={document.id}>
              <TableCell>
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {document.nomeArquivoOriginal}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Hash className="h-3 w-3" />
                      <span className="font-mono truncate">
                        {document.hashArquivo.substring(0, 8)}...
                      </span>
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge 
                  variant="secondary"
                  className={cn(
                    documentTypeColors[document.tipoDocumento] || 'bg-gray-100'
                  )}
                >
                  {documentTypeLabels[document.tipoDocumento] || document.tipoDocumento}
                </Badge>
              </TableCell>
              <TableCell>
                <span className="text-sm font-mono">
                  {getKeyInfo(document)}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>{formatDate(document.dataUpload)}</span>
                </div>
              </TableCell>
              <TableCell>
                <Badge 
                  variant="secondary"
                  className={cn(
                    statusColors[document.statusProcessamento] || 'bg-gray-100'
                  )}
                >
                  {document.statusProcessamento}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-1">
                  {onViewDocument && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => onViewDocument(document)}
                      title="Visualizar documento"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                  {onDownloadDocument && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => onDownloadDocument(document)}
                      title="Baixar documento"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                  {onDeleteDocument && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      onClick={() => onDeleteDocument(document)}
                      title="Remover documento"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}