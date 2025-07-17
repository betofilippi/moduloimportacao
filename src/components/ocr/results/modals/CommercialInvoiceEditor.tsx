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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

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

interface CommercialInvoiceEditorProps {
  item: CommercialInvoiceItem;
  onSave: (item: CommercialInvoiceItem) => void;
  onCancel: () => void;
}

export function CommercialInvoiceEditor({ item, onSave, onCancel }: CommercialInvoiceEditorProps) {
  const [editedItem, setEditedItem] = useState<CommercialInvoiceItem>({ ...item });

  // Parse monetary value
  const parseMonetaryValue = (value: string): number => {
    const cleaned = value.replace(/[$,]/g, '');
    return parseFloat(cleaned) || 0;
  };

  // Format monetary value
  const formatMonetaryValue = (value: number): string => {
    return value.toFixed(2);
  };

  // Handle field changes
  const handleChange = (field: keyof CommercialInvoiceItem, value: any) => {
    setEditedItem(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-calculate total when quantity or unit price changes
      if (field === 'quantity' || field === 'unitPrice') {
        const qty = parseFloat(updated.quantity?.toString() || '0') || 0;
        const price = updated.unitPrice || 0;
        updated.totalPrice = qty * price;
      }
      
      return updated;
    });
  };

  // Handle save
  const handleSave = () => {
    // Ensure all numeric fields are properly parsed
    const finalItem = {
      ...editedItem,
      quantity: parseFloat(editedItem.quantity?.toString() || '0') || 0,
      unitPrice: editedItem.unitPrice || 0,
      totalPrice: editedItem.totalPrice || 0
    };
    
    onSave(finalItem);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Item #{editedItem.lineNumber || editedItem.item_number}</DialogTitle>
          <DialogDescription>
            Edite as informações do item da commercial invoice
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {/* Reference */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="reference">Referência</Label>
              <Input
                id="reference"
                value={editedItem.reference || ''}
                onChange={(e) => handleChange('reference', e.target.value)}
                placeholder="Ex: REF001"
              />
            </div>
            
            {/* Item Number */}
            <div>
              <Label htmlFor="itemNumber">Número do Item</Label>
              <Input
                id="itemNumber"
                value={editedItem.item_number || editedItem.lineNumber || ''}
                onChange={(e) => handleChange('item_number', e.target.value)}
                disabled
              />
            </div>
          </div>
          
          {/* Description English */}
          <div>
            <Label htmlFor="descriptionEn">Descrição (Inglês)</Label>
            <Textarea
              id="descriptionEn"
              value={editedItem.description || editedItem.name_english || ''}
              onChange={(e) => {
                handleChange('description', e.target.value);
                handleChange('name_english', e.target.value);
              }}
              placeholder="Product description in English"
              rows={2}
            />
          </div>
          
          {/* Description Chinese */}
          <div>
            <Label htmlFor="descriptionCn">Descrição (Chinês)</Label>
            <Textarea
              id="descriptionCn"
              value={editedItem.descriptionChinese || editedItem.name_chinese || ''}
              onChange={(e) => {
                handleChange('descriptionChinese', e.target.value);
                handleChange('name_chinese', e.target.value);
              }}
              placeholder="产品描述"
              rows={2}
            />
          </div>
          
          {/* Quantity and Unit */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="quantity">Quantidade</Label>
              <Input
                id="quantity"
                type="number"
                value={editedItem.quantity || ''}
                onChange={(e) => handleChange('quantity', parseFloat(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
            
            <div>
              <Label htmlFor="unit">Unidade</Label>
              <Input
                id="unit"
                value={editedItem.unit || ''}
                onChange={(e) => handleChange('unit', e.target.value)}
                placeholder="Ex: pcs, kg, set"
              />
            </div>
          </div>
          
          {/* Prices */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="unitPrice">Preço Unitário (USD)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="unitPrice"
                  type="number"
                  step="0.01"
                  value={formatMonetaryValue(editedItem.unitPrice || 0)}
                  onChange={(e) => handleChange('unitPrice', parseFloat(e.target.value) || 0)}
                  className="pl-8"
                  placeholder="0.00"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="totalPrice">Preço Total (USD)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="totalPrice"
                  type="number"
                  step="0.01"
                  value={formatMonetaryValue(editedItem.totalPrice || 0)}
                  onChange={(e) => handleChange('totalPrice', parseFloat(e.target.value) || 0)}
                  className="pl-8"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>
          
          {/* Calculation Note */}
          <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded">
            <p>💡 O preço total é calculado automaticamente (Quantidade × Preço Unitário)</p>
            <p className="mt-1">
              Cálculo atual: {editedItem.quantity || 0} × ${formatMonetaryValue(editedItem.unitPrice || 0)} = 
              <span className="font-semibold ml-1">
                ${formatMonetaryValue(editedItem.totalPrice || 0)}
              </span>
            </p>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}