'use client';

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

export interface ColumnDefinition {
  key: string;
  header: string;
  accessor?: (item: any) => any;
  className?: string;
  render?: (value: any, item: any, index: number) => React.ReactNode;
}

interface TableViewLayoutProps {
  columns: ColumnDefinition[];
  data: any[];
  actionRenderer?: (item: any, index: number) => React.ReactNode;
  className?: string;
  tableClassName?: string;
  emptyMessage?: string;
}

export function TableViewLayout({
  columns,
  data,
  actionRenderer,
  className,
  tableClassName,
  emptyMessage = 'Nenhum item encontrado'
}: TableViewLayoutProps) {
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
              {columns.map((column) => {
                const value = column.accessor 
                  ? column.accessor(item) 
                  : item[column.key];
                
                return (
                  <TableCell key={column.key} className={column.className}>
                    {column.render 
                      ? column.render(value, item, index)
                      : value || '-'
                    }
                  </TableCell>
                );
              })}
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