'use client';

import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export interface EditColumnDefinition {
  key: string;
  header: string;
  accessor?: (item: any) => any;
  className?: string;
  inputType?: 'text' | 'number' | 'textarea' | 'date' | 'custom';
  render?: (value: any, item: any, index: number, onChange: (newValue: any) => void) => React.ReactNode;
  readOnly?: boolean;
}

interface TableEditLayoutProps {
  columns: EditColumnDefinition[];
  data: any[];
  onDataChange: (updatedData: any[]) => void;
  actionRenderer?: (item: any, index: number) => React.ReactNode;
  className?: string;
  tableClassName?: string;
  emptyMessage?: string;
}

export function TableEditLayout({
  columns,
  data,
  onDataChange,
  actionRenderer,
  className,
  tableClassName,
  emptyMessage = 'Nenhum item para editar'
}: TableEditLayoutProps) {
  const handleCellChange = (rowIndex: number, columnKey: string, newValue: any) => {
    const updatedData = [...data];
    updatedData[rowIndex] = {
      ...updatedData[rowIndex],
      [columnKey]: newValue
    };
    
    onDataChange(updatedData);
  };

  const renderEditableCell = (column: EditColumnDefinition, item: any, rowIndex: number) => {
    const value = column.accessor ? column.accessor(item) : item[column.key];
    
    if (column.readOnly) {
      return <span className="text-muted-foreground">{value || '-'}</span>;
    }
    
    if (column.render) {
      return column.render(
        value,
        item,
        rowIndex,
        (newValue) => handleCellChange(rowIndex, column.key, newValue)
      );
    }
    
    const commonProps = {
      value: value || '',
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => 
        handleCellChange(rowIndex, column.key, e.target.value),
      className: "w-full"
    };

    switch (column.inputType) {
      case 'textarea':
        return <Textarea {...commonProps} rows={2} />;
      
      case 'number':
        return (
          <Input 
            {...commonProps}
            type="number"
            step="0.01"
            onChange={(e) => handleCellChange(rowIndex, column.key, e.target.value)}
          />
        );
      
      case 'date':
        return <Input {...commonProps} type="date" />;
      
      case 'text':
      default:
        return <Input {...commonProps} type="text" />;
    }
  };

  if (!data || data.length === 0) {
    return (
      <div className={cn("flex items-center justify-center p-8 text-muted-foreground", className)}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn("w-full overflow-auto", className)}>
      <Table className={tableClassName}>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.key} className={column.className}>
                {column.header}
              </TableHead>
            ))}
            {actionRenderer && (
              <TableHead className="text-right sticky right-0 bg-background">
                Ações
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item, index) => (
            <TableRow key={index}>
              {columns.map((column) => (
                <TableCell key={column.key} className={column.className}>
                  {renderEditableCell(column, item, index)}
                </TableCell>
              ))}
              {actionRenderer && (
                <TableCell className="text-right sticky right-0 bg-background">
                  {actionRenderer(item, index)}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}