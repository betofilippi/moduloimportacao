'use client';

import React from 'react';
import { DocumentType, DocumentTypeInfo } from '@/services/documents/base/types';
import { getAllDocumentTypeInfos } from '@/services/documents';

// Get document types from the factory
const DOCUMENT_TYPES: DocumentTypeInfo[] = getAllDocumentTypeInfos();
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface DocumentTypeSelectorProps {
  value: DocumentType | '';
  onChange: (value: DocumentType) => void;
  disabled?: boolean;
  availableTypes?: DocumentTypeInfo[];
}

export function DocumentTypeSelector({
  value,
  onChange,
  disabled = false,
  availableTypes = DOCUMENT_TYPES,
}: DocumentTypeSelectorProps) {
  return (
    <div className="space-y-2 bg-amber-900">
      
      <Label htmlFor="document-type">Tipo de Documentos *</Label>
      <Select
        value={value}
        onValueChange={onChange}
        disabled={disabled}
      >
        <SelectTrigger 
          id="document-type" 
          className="w-full "
        >
          <SelectValue placeholder="Selecione o tipo de documento" />
        </SelectTrigger>
        <SelectContent>
          {availableTypes.map((type) => (
            <SelectItem key={type.value} value={type.value}>
              <div className="flex flex-col">
                <span className="font-medium">{type.label}</span>
                <span className="text-">
                  {type.description}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}