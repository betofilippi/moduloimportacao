'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Package } from 'lucide-react';
import { PackingListViewer } from './results/viewers/PackingListViewer';
import { CommercialInvoiceViewer } from './results/viewers/CommercialInvoiceViewer';
import { ProformaInvoiceViewer } from './results/viewers/ProformaInvoiceViewer';
import { SwiftViewer } from './results/viewers/SwiftViewer';
import { DIViewer } from './results/viewers/DIViewer';
import { NumerarioViewer } from './results/viewers/NumerarioViewer';
import { NotaFiscalViewer } from './results/viewers/NotaFiscalViewer';

interface OCRResultsViewerProps {
  results: {
    upload?: any;
    ocr?: any;
    extraction?: any;
  };
  onSave?: (data: any) => void;
  variant?: 'summary' | 'detailed';
}

export function OCRResultsViewer({ results, variant = 'summary', onSave }: OCRResultsViewerProps) {
  // Acessar dados de forma segura
  console.log('OCRResultsViewer results:', results);
  
  // Obter o tipo de documento - verificar múltiplas localizações
  const documentType = results?.ocr?.data?.documentType || 
                      results?.extraction?.documentType || 
                      results?.ocr?.data?.multiPrompt?.documentType || 
                      '';
  
  console.log('Detected documentType:', documentType);
  console.log('Has multiPrompt:', !!results?.ocr?.data?.multiPrompt);
  
  // Se for detailed view e packing list, renderizar componente específico
  if (variant === 'detailed' && documentType === 'packing_list') {
    console.log('Rendering PackingListViewer detailed');
    return <PackingListViewer data={results?.ocr?.data} variant="detailed" onSave={onSave} onSaveToDatabase={onSave} />;
  }
  
  // Se for summary view e packing list
  if (variant === 'summary' && documentType === 'packing_list') {
    console.log('Rendering PackingListViewer summary');
    return <PackingListViewer data={results?.ocr?.data} variant="summary" onSave={onSave} />;
  }
  
  // Se for commercial invoice
  if (variant === 'detailed' && documentType === 'commercial_invoice') {
    console.log('Rendering CommercialInvoiceViewer detailed');
    return <CommercialInvoiceViewer data={results?.ocr?.data} results={results} variant="detailed" onSave={onSave} onSaveToDatabase={onSave} />;
  }
  
  if (variant === 'summary' && documentType === 'commercial_invoice') {
    console.log('Rendering CommercialInvoiceViewer summary');
    return <CommercialInvoiceViewer data={results?.ocr?.data} results={results} variant="summary" onSave={onSave} />;
  }

  // Se for proforma invoice
  if (variant === 'detailed' && documentType === 'proforma_invoice') {
    console.log('Rendering ProformaInvoiceViewer detailed');
    return <ProformaInvoiceViewer data={results?.ocr?.data} variant="detailed" onSave={onSave} />;
  }
  
  if (variant === 'summary' && documentType === 'proforma_invoice') {
    console.log('Rendering ProformaInvoiceViewer summary');
    return <ProformaInvoiceViewer data={results?.ocr?.data} variant="summary" onSave={onSave} />;
  }

  // Se for swift
  if (variant === 'detailed' && documentType === 'swift') {
    console.log('Rendering SwiftViewer detailed');
    return <SwiftViewer data={results?.ocr?.data} variant="detailed" onSave={onSave} onSaveToDatabase={onSave} />;
  }
  
  if (variant === 'summary' && documentType === 'swift') {
    console.log('Rendering SwiftViewer summary');
    return <SwiftViewer data={results?.ocr?.data} variant="summary" onSave={onSave} onSaveToDatabase={onSave} />;
  }

  // Se for DI
  if (variant === 'detailed' && documentType === 'di') {
    console.log('Rendering DIViewer detailed');
    return <DIViewer data={results?.ocr?.data} results={results} variant="detailed" onSave={onSave} />;
  }
  
  if (variant === 'summary' && documentType === 'di') {
    console.log('Rendering DIViewer summary');
    return <DIViewer data={results?.ocr?.data} results={results} variant="summary" onSave={onSave} />;
  }

  // Se for Numerário
  if (variant === 'detailed' && documentType === 'numerario') {
    console.log('Rendering NumerarioViewer detailed');
    return <NumerarioViewer data={results?.ocr?.data} results={results} variant="detailed" onSave={onSave} onSaveToDatabase={onSave} />;
  }
  
  if (variant === 'summary' && documentType === 'numerario') {
    console.log('Rendering NumerarioViewer summary');
    return <NumerarioViewer data={results?.ocr?.data} results={results} variant="summary" onSave={onSave} onSaveToDatabase={onSave} />;
  }

  // Se for Nota Fiscal
  if (variant === 'detailed' && documentType === 'nota_fiscal') {
    console.log('Rendering NotaFiscalViewer detailed');
    return <NotaFiscalViewer data={results?.ocr?.data} results={results} variant="detailed" onSave={onSave} onSaveToDatabase={onSave} />;
  }
  
  if (variant === 'summary' && documentType === 'nota_fiscal') {
    console.log('Rendering NotaFiscalViewer summary');
    return <NotaFiscalViewer data={results?.ocr?.data} results={results} variant="summary" onSave={onSave} onSaveToDatabase={onSave} />;
  }
  
  // Fallback: Se temos extractedData como array ou multiPrompt, provavelmente é packing list
  const extractedData = results?.ocr?.data?.extractedData || results?.ocr?.extractedData || {};
  const hasMultiPrompt = !!results?.ocr?.data?.multiPrompt;
  const isArrayData = Array.isArray(extractedData);
  
  console.log('extractedData type:', typeof extractedData, 'isArray:', isArrayData);
  console.log('hasMultiPrompt:', hasMultiPrompt);
  
  // Fallback: Se parece com resultado de multi-prompt, usar PackingListViewer
  if ((hasMultiPrompt || isArrayData) && variant === 'detailed') {
    console.log('Fallback: Using PackingListViewer for detailed view');
    return <PackingListViewer data={results} variant="detailed" />;
  }
  
  if ((hasMultiPrompt || isArrayData) && variant === 'summary') {
    console.log('Fallback: Using PackingListViewer for summary view');
    return <PackingListViewer data={results} variant="summary" />;
  }
  
  const invoice = extractedData.invoice || extractedData.header?.invoice || 'N/A';
  const itemsQty = extractedData.items_qty_total || extractedData.header?.total_itens || 0;

  // Se for detailed view para outros tipos, não renderizar nada por enquanto
  if (variant === 'detailed') {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Resultado da Extração
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Invoice</span>
            </div>
            <span className="text-lg font-semibold">{invoice}</span>
          </div>
          
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Número de Itens</span>
            </div>
            <span className="text-lg font-semibold">{itemsQty}</span>
          </div>
        </div>
        
        {/* Mostrar tipo de documento */}
        <div className="mt-4 text-sm text-muted-foreground">
          Tipo de documento: {documentType || 'Não identificado'}
        </div>
      </CardContent>
    </Card>
  );
}