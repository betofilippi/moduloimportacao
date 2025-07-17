'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, ArrowUp, ArrowDown, Calculator } from 'lucide-react';

interface CommercialInvoiceItem {
  invoice_number?: string;
  item_number?: string | number;
  reference?: string;
  name_chinese?: string;
  name_english?: string;
  quantity?: string | number;
  unit?: string;
  unit_price_usd?: string | number;
  amount_usd?: string | number;
  // Normalized fields
  lineNumber?: number;
  description?: string;
  descriptionChinese?: string;
  unitPrice?: number;
  totalPrice?: number;
}

interface PriceDivisionModalProps {
  item: CommercialInvoiceItem;
  itemAbove: CommercialInvoiceItem | null;
  itemBelow: CommercialInvoiceItem | null;
  onDivide: (item: CommercialInvoiceItem, direction: 'above' | 'below') => void;
  onCancel: () => void;
}

export function PriceDivisionModal({ 
  item, 
  itemAbove, 
  itemBelow, 
  onDivide, 
  onCancel 
}: PriceDivisionModalProps) {
  const [selectedDirection, setSelectedDirection] = useState<'above' | 'below' | null>(null);

  // Format currency
  const formatCurrency = (value: number | undefined): string => {
    if (value === undefined || value === null) return '$0.00';
    return `$${value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

  // Check if item has valid prices for division
  // Item must have BOTH valid unit price AND total price for division
  const hasValidPrices = (sourceItem: CommercialInvoiceItem | null): boolean => {
    if (!sourceItem) return false;
    
    // Check normalized fields first
    if (sourceItem.unitPrice && sourceItem.unitPrice > 0 && 
        sourceItem.totalPrice && sourceItem.totalPrice > 0) {
      return true;
    }
    
    // Check original fields
    const unitPrice = parseFloat(String(sourceItem.unit_price_usd || '0'));
    const totalPrice = parseFloat(String(sourceItem.amount_usd || '0'));
    
    return unitPrice > 0 && totalPrice > 0;
  };

  // Calculate divided prices
  const calculateDividedPrices = (sourceItem: CommercialInvoiceItem) => {
    // Use normalized fields if available, otherwise use original fields
    const unitPrice = sourceItem.unitPrice || parseFloat(String(sourceItem.unit_price_usd || '0'));
    const totalPrice = sourceItem.totalPrice || parseFloat(String(sourceItem.amount_usd || '0'));
    
    return {
      unitPrice: unitPrice / 2,
      totalPrice: totalPrice / 2
    };
  };

  // Handle division
  const handleDivide = () => {
    if (!selectedDirection) return;
    onDivide(item, selectedDirection);
  };

  // Get preview of division
  const getPreview = () => {
    if (!selectedDirection) return null;
    
    const sourceItem = selectedDirection === 'above' ? itemAbove : itemBelow;
    if (!sourceItem || !hasValidPrices(sourceItem)) return null;
    
    return calculateDividedPrices(sourceItem);
  };

  const preview = getPreview();

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Divisão de Preços - Item #{item.lineNumber}
          </DialogTitle>
          <DialogDescription>
            Este item tem preços em branco. Escolha um item adjacente para dividir os valores igualmente.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Current Item Info */}
          <div className="p-4 border border-yellow-400  rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <span className="font-medium text-yellow-700">Item Atual (Preços em Branco)</span>
            </div>
            <div className="text-sm">
              <p className="font-medium">{item.description || item.name_english}</p>
              <div className="flex gap-4 mt-1 text-muted-foreground">
                <span>Quantidade: {item.quantity}</span>
                <span>Preço Unit.: {formatCurrency(item.unitPrice || parseFloat(String(item.unit_price_usd || '0')))}</span>
                <span>Total: {formatCurrency(item.totalPrice || parseFloat(String(item.amount_usd || '0')))}</span>
              </div>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-4">
            <h4 className="font-medium">Escolha o item fonte para divisão:</h4>
            
            {/* Item Above Option */}
            {itemAbove ? (
              <div 
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedDirection === 'above' 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' 
                    : hasValidPrices(itemAbove) 
                      ? 'hover:border-gray-300' 
                      : 'border-red-500 bg-red-100 dark:bg-red-900'
                }`}
                onClick={() => hasValidPrices(itemAbove) && setSelectedDirection('above')}
              >
                <div className="flex items-center gap-2 mb-2 ">
                  <ArrowUp className="h-4 w-4" />
                  <span className="font-medium">Item Acima (#{itemAbove.lineNumber})</span>
                  {!hasValidPrices(itemAbove) && (
                    <Badge variant="destructive" className="text-xs">Sem preços válidos</Badge>
                  )}
                </div>
                <div className="text-sm">
                  <p className="font-medium">{itemAbove.description || itemAbove.name_english}</p>
                  <div className="flex gap-4 mt-1 text-muted-foreground">
                    <span>Preço Unit.: {formatCurrency(itemAbove.unitPrice || parseFloat(String(itemAbove.unit_price_usd || '0')))}</span>
                    <span>Total: {formatCurrency(itemAbove.totalPrice || parseFloat(String(itemAbove.amount_usd || '0')))}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 text-gray-500">
                <div className="flex items-center gap-2">
                  <ArrowUp className="h-4 w-4" />
                  <span>Não há item acima disponível</span>
                </div>
              </div>
            )}

            {/* Item Below Option */}
            {itemBelow ? (
              <div 
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedDirection === 'below' 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' 
                    : hasValidPrices(itemBelow) 
                      ? 'hover:border-gray-300' 
                      : 'border-red-500 bg-red-100 dark:bg-red-900'
                }`}
                onClick={() => hasValidPrices(itemBelow) && setSelectedDirection('below')}
              >
                <div className="flex items-center gap-2 mb-2">
                  <ArrowDown className="h-4 w-4" />
                  <span className="font-medium">Item Abaixo (#{itemBelow.lineNumber})</span>
                  {!hasValidPrices(itemBelow) && (
                    <Badge variant="destructive" className="text-xs">Sem preços válidos</Badge>
                  )}
                </div>
                <div className="text-sm">
                  <p className="font-medium">{itemBelow.description || itemBelow.name_english}</p>
                  <div className="flex gap-4 mt-1 text-muted-foreground">
                    <span>Preço Unit.: {formatCurrency(itemBelow.unitPrice || parseFloat(String(itemBelow.unit_price_usd || '0')))}</span>
                    <span>Total: {formatCurrency(itemBelow.totalPrice || parseFloat(String(itemBelow.amount_usd || '0')))}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 text-gray-500">
                <div className="flex items-center gap-2">
                  <ArrowDown className="h-4 w-4" />
                  <span>Não há item abaixo disponível</span>
                </div>
              </div>
            )}
          </div>

          {/* Preview */}
          {preview && selectedDirection && (
            <div className="p-4 border border-green-200">
              <h4 className="font-medium text-green-800 mb-2">Preview da Divisão:</h4>
              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span>Novo preço unitário para ambos os itens:</span>
                  <span className="font-mono font-medium">{formatCurrency(preview.unitPrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Novo preço total para ambos os itens:</span>
                  <span className="font-mono font-medium">{formatCurrency(preview.totalPrice)}</span>
                </div>
                <div className="text-xs text-green-600 mt-2">
                  💡 Os valores serão divididos igualmente entre os dois itens
                </div>
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button 
            onClick={handleDivide}
            disabled={!selectedDirection || !preview}
          >
            Dividir Preços
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}