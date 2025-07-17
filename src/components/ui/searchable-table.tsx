'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search } from 'lucide-react';
import { debounce } from 'lodash';

export interface SearchableTableColumn<T> {
  key: keyof T;
  header: string;
  searchable?: boolean;
  render?: (value: any, item: T) => React.ReactNode;
  className?: string;
}

interface SearchableTableProps<T> {
  data: T[];
  columns: SearchableTableColumn<T>[];
  searchPlaceholder?: string;
  minSearchLength?: number;
  emptyMessage?: string;
  className?: string;
}

export function SearchableTable<T extends Record<string, any>>({
  data,
  columns,
  searchPlaceholder = 'Pesquisar...',
  minSearchLength = 3,
  emptyMessage = 'Nenhum item encontrado',
  className = '',
}: SearchableTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // Debounce search input
  const debouncedSearch = useCallback(
    debounce((value: string) => {
      setDebouncedSearchTerm(value);
    }, 300),
    []
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    debouncedSearch(value);
  };

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (debouncedSearchTerm.length < minSearchLength) {
      return data;
    }

    const searchLower = debouncedSearchTerm.toLowerCase();
    const searchableColumns = columns.filter(col => col.searchable !== false);

    return data.filter(item => {
      return searchableColumns.some(col => {
        const value = item[col.key];
        if (value == null) return false;
        return String(value).toLowerCase().includes(searchLower);
      });
    });
  }, [data, debouncedSearchTerm, minSearchLength, columns]);

  // Highlight search term in text
  const highlightText = (text: string) => {
    if (debouncedSearchTerm.length < minSearchLength) {
      return text;
    }

    const parts = text.split(new RegExp(`(${debouncedSearchTerm})`, 'gi'));
    return (
      <>
        {parts.map((part, index) => 
          part.toLowerCase() === debouncedSearchTerm.toLowerCase() ? (
            <mark key={index} className="bg-yellow-200 dark:bg-yellow-800">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder={searchPlaceholder}
          value={searchTerm}
          onChange={handleSearchChange}
          className="pl-9"
        />
        {searchTerm.length > 0 && searchTerm.length < minSearchLength && (
          <p className="mt-1 text-xs text-muted-foreground">
            Digite pelo menos {minSearchLength} caracteres para pesquisar
          </p>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={String(column.key)} className={column.className}>
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((item, index) => (
                <TableRow key={index}>
                  {columns.map((column) => {
                    const value = item[column.key];
                    const displayValue = column.render ? column.render(value, item) : String(value || '');
                    
                    return (
                      <TableCell key={String(column.key)} className={column.className}>
                        {column.searchable !== false && typeof displayValue === 'string' 
                          ? highlightText(displayValue)
                          : displayValue
                        }
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Results count */}
      {debouncedSearchTerm.length >= minSearchLength && (
        <p className="text-sm text-muted-foreground">
          {filteredData.length} {filteredData.length === 1 ? 'resultado' : 'resultados'} encontrado{filteredData.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}