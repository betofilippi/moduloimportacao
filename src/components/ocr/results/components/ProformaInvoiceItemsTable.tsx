
'use client';

import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2, Plus } from 'lucide-react';
import { ProformaInvoiceItem } from '@/services/documents/proforma-invoice/types';

interface ProformaInvoiceItemsTableProps {
  items: ProformaInvoiceItem[];
  isEditing: boolean;
  onFieldChange: (index: number, field: keyof ProformaInvoiceItem, value: any) => void;
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
}

export function ProformaInvoiceItemsTable({ items, isEditing, onFieldChange, onAddItem, onRemoveItem }: ProformaInvoiceItemsTableProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);
  };

  const calculateTotal = (item: ProformaInvoiceItem) => {
    return (item.quantity || 0) * (item.unit_price || 0);
  };

  const overallTotal = items.reduce((sum, item) => sum + calculateTotal(item), 0);

  return (
    <div className="mt-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Items ({items.length})</h3>
        {isEditing && (
          <Button onClick={onAddItem} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        )}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead>Description (EN)</TableHead>
            <TableHead>Description (CN)</TableHead>
            <TableHead>Specifications</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">Unit Price</TableHead>
            <TableHead className="text-right">Total</TableHead>
            {isEditing && <TableHead className="text-center">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item, index) => (
            <TableRow key={index}>
              <TableCell>
                {isEditing ? (
                  <Input
                    value={item.item || ''}
                    onChange={(e) => onFieldChange(index, 'item', e.target.value)}
                  />
                ) : (
                  item.item
                )}
              </TableCell>
              <TableCell>
                {isEditing ? (
                  <Input
                    value={item.description_in_english || ''}
                    onChange={(e) => onFieldChange(index, 'description_in_english', e.target.value)}
                  />
                ) : (
                  item.description_in_english
                )}
              </TableCell>
              <TableCell>
                {isEditing ? (
                  <Input
                    value={item.description_in_chinese || ''}
                    onChange={(e) => onFieldChange(index, 'description_in_chinese', e.target.value)}
                  />
                ) : (
                  item.description_in_chinese
                )}
              </TableCell>
              <TableCell>
                {isEditing ? (
                  <Input
                    value={item.specifications || ''}
                    onChange={(e) => onFieldChange(index, 'specifications', e.target.value)}
                  />
                ) : (
                  item.specifications
                )}
              </TableCell>
              <TableCell className="text-right">
                {isEditing ? (
                  <Input
                    type="number"
                    value={item.quantity || 0}
                    onChange={(e) => onFieldChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                    className="text-right"
                  />
                ) : (
                  item.quantity
                )}
              </TableCell>
              <TableCell className="text-right">
                {isEditing ? (
                  <Input
                    type="number"
                    step="0.01"
                    value={item.unit_price || 0}
                    onChange={(e) => onFieldChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                    className="text-right"
                  />
                ) : (
                  formatCurrency(item.unit_price)
                )}
              </TableCell>
              <TableCell className="text-right font-medium">{formatCurrency(calculateTotal(item))}</TableCell>
              {isEditing && (
                <TableCell className="text-center">
                  <Button variant="ghost" size="icon" onClick={() => onRemoveItem(index)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="text-right mt-4 pr-4 font-bold text-lg">
        Total: {formatCurrency(overallTotal)}
      </div>
    </div>
  );
}
